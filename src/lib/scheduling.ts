import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import type { Crew, DaySchedule, StaffSettings, WorkType } from './staffOps';
import { DEFAULT_LUNCH_HOUR, defaultStaffSettings } from './staffOps';

/**
 * Capacity rules
 * - A unit is a crew (2–3 staff working together) or one solo staff member. A unit takes one job at a time.
 * - Bay units handle drive-ins, mobile units handle call-outs.
 * - A booking blocks its work hours; mobile bookings also block one buffer hour after (travel/overruns).
 * - Lunch removes a unit for one hour. Unavailable staff don't count that day.
 * - An hour is greyed out for customers once every unit of that type is booked, in a buffer, or on lunch.
 */

export interface StaffIdentity {
  uid: string;
  name: string;
}

export interface Unit {
  /** "crew:<crewId>" or "staff:<uid>" */
  id: string;
  kind: 'crew' | 'solo';
  crewId?: string;
  memberUids: string[];
  memberNames: string[];
  label: string;
  workType: WorkType;
  lunchHour: number;
}

/** Public, PII-free record of a booking's time, used for availability. Doc id = appointment id. */
export interface BookedSlot {
  id: string;
  customerUid: string;
  date: string;
  startHour: number;
  workHours: number;
  type: WorkType;
  unitId: string | null;
}

export function workTypeForService(serviceType?: string): WorkType {
  return serviceType === 'Drive-in' ? 'bay' : 'mobile';
}

export function bufferHours(type: WorkType): number {
  return type === 'mobile' ? 1 : 0;
}

/** Hours a booking keeps its unit busy, including the mobile buffer hour. */
export function occupiedHours(slot: Pick<BookedSlot, 'startHour' | 'workHours' | 'type'>): number[] {
  const total = slot.workHours + bufferHours(slot.type);
  return Array.from({ length: total }, (_, i) => slot.startHour + i);
}

function workHoursOf(slot: Pick<BookedSlot, 'startHour' | 'workHours'>): number[] {
  return Array.from({ length: slot.workHours }, (_, i) => slot.startHour + i);
}

export function buildUnits(input: {
  date: string;
  staff: StaffIdentity[];
  settings: Record<string, StaffSettings>;
  crews: Crew[];
  day?: DaySchedule;
}): Unit[] {
  const { date, staff, settings, crews } = input;
  const unavailable = new Set(input.day?.unavailableUids ?? []);
  const nameOf = (uid: string) => staff.find((s) => s.uid === uid)?.name || 'Staff';
  const isWorking = (uid: string) =>
    staff.some((s) => s.uid === uid) && (settings[uid]?.active ?? true) && !unavailable.has(uid);

  const units: Unit[] = [];
  const crewed = new Set<string>();

  for (const crew of crews) {
    crew.memberUids.forEach((uid) => crewed.add(uid));
    // If someone in the crew is off today, the rest of the crew still works
    const members = crew.memberUids.filter(isWorking);
    if (members.length === 0) continue;
    const names = members.map(nameOf);
    units.push({
      id: `crew:${crew.id}`,
      kind: 'crew',
      crewId: crew.id,
      memberUids: members,
      memberNames: names,
      label: names.map((n) => n.split(' ')[0]).join(' + '),
      workType: crew.workType,
      lunchHour: crew.lunchOverrides?.[date] ?? crew.lunchHour ?? DEFAULT_LUNCH_HOUR,
    });
  }

  for (const person of staff) {
    if (crewed.has(person.uid) || !isWorking(person.uid)) continue;
    const s = settings[person.uid] ?? defaultStaffSettings(person.uid);
    units.push({
      id: `staff:${person.uid}`,
      kind: 'solo',
      memberUids: [person.uid],
      memberNames: [person.name],
      label: person.name,
      workType: s.workType,
      lunchHour: s.lunchOverrides?.[date] ?? s.usualLunch ?? DEFAULT_LUNCH_HOUR,
    });
  }

  return units.sort((a, b) => a.workType.localeCompare(b.workType) || a.label.localeCompare(b.label));
}

/** Units of a type that are working (not on lunch) at an hour. */
export function hourCapacity(units: Unit[], type: WorkType, hour: number): number {
  return units.filter((u) => u.workType === type && u.lunchHour !== hour).length;
}

/** Bookings of a type that occupy an hour (work or buffer). */
export function hourUsage(slots: BookedSlot[], type: WorkType, hour: number, excludeId?: string): number {
  return slots.filter((s) => s.type === type && s.id !== excludeId && occupiedHours(s).includes(hour)).length;
}

/**
 * Whether a new booking can start at `startHour`. Every hour it occupies (inside opening hours)
 * needs a spare unit of the right type. Work must finish by closing time.
 */
export function canStartAt(input: {
  units: Unit[];
  slots: BookedSlot[];
  type: WorkType;
  startHour: number;
  workHours: number;
  closeHour: number;
  excludeId?: string;
}): boolean {
  const { units, slots, type, startHour, workHours, closeHour, excludeId } = input;
  if (startHour + workHours > closeHour) return false;
  return occupiedHours({ startHour, workHours, type })
    .filter((h) => h < closeHour)
    .every((h) => hourUsage(slots, type, h, excludeId) < hourCapacity(units, type, h));
}

/** Units that could take a booking: right type, not on lunch during the work, and not already busy. */
export function freeUnitsFor(input: {
  units: Unit[];
  slots: BookedSlot[];
  booking: Pick<BookedSlot, 'id' | 'startHour' | 'workHours' | 'type'>;
}): Unit[] {
  const { units, slots, booking } = input;
  const needs = occupiedHours(booking);
  return units.filter((unit) => {
    if (unit.workType !== booking.type) return false;
    if (workHoursOf(booking).includes(unit.lunchHour)) return false;
    return !slots.some(
      (s) => s.id !== booking.id && s.unitId === unit.id && occupiedHours(s).some((h) => needs.includes(h))
    );
  });
}

/** The free unit with the fewest jobs that day, or null. */
export function suggestUnit(input: {
  units: Unit[];
  slots: BookedSlot[];
  booking: Pick<BookedSlot, 'id' | 'startHour' | 'workHours' | 'type'>;
}): Unit | null {
  const free = freeUnitsFor(input);
  if (free.length === 0) return null;
  const load = (u: Unit) => input.slots.filter((s) => s.unitId === u.id).length;
  return [...free].sort((a, b) => load(a) - load(b))[0];
}

// ─── Booked slots (public availability records) ─────────────────────────────

export function subscribeToBookedSlots(date: string, callback: (slots: BookedSlot[]) => void): () => void {
  if (!date) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    query(collection(db, 'bookedSlots'), where('date', '==', date)),
    (snap) => callback(snap.docs.map((d) => ({ ...(d.data() as Omit<BookedSlot, 'id'>), id: d.id }))),
    (err) => {
      console.warn('Booked slots unavailable:', err.message);
      callback([]);
    }
  );
}

export async function saveBookedSlot(slot: BookedSlot): Promise<void> {
  const { id, ...rest } = slot;
  await setDoc(doc(db, 'bookedSlots', id), { ...rest, updatedAt: Date.now() });
}

export async function removeBookedSlot(appointmentId: string): Promise<void> {
  await deleteDoc(doc(db, 'bookedSlots', appointmentId));
}

/**
 * Older bookings were assigned to one staff member ("staff:<uid>"). If that person is now
 * in a crew, the booking belongs to the crew's unit.
 */
export function resolveUnitId(units: Unit[], unitId: string | null): string | null {
  if (!unitId || units.some((u) => u.id === unitId)) return unitId;
  if (unitId.startsWith('staff:')) {
    const uid = unitId.slice('staff:'.length);
    return units.find((u) => u.memberUids.includes(uid))?.id ?? unitId;
  }
  return unitId;
}

export function withResolvedUnits(slots: BookedSlot[], units: Unit[]): BookedSlot[] {
  return slots.map((s) => ({ ...s, unitId: resolveUnitId(units, s.unitId) }));
}
