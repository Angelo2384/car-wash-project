import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Staff operations owned by the admin: each staff member's work type and lunch,
 * crews (2–3 staff who work as one unit), and who is unavailable on a given day.
 */

export type WorkType = 'bay' | 'mobile';

export const WORK_TYPE_LABELS: Record<WorkType, string> = { bay: 'Bay', mobile: 'Mobile' };

/** Lunch is one full hour starting at one of these times. */
export const LUNCH_HOURS = [11, 12, 13];
export const DEFAULT_LUNCH_HOUR = 12;
export const CREW_MIN_SIZE = 2;
export const CREW_MAX_SIZE = 3;

export interface StaffSettings {
  uid: string;
  /** Copied from the staff directory by the admin's app, so crew partners can see each other's names */
  name?: string;
  workType: WorkType;
  usualLunch: number;
  /** false = deactivated: can't sign in to the staff area or be assigned */
  active: boolean;
  /** One-day lunch changes, keyed by YYYY-MM-DD */
  lunchOverrides?: Record<string, number>;
  updatedAt?: number;
}

export interface Crew {
  id: string;
  memberUids: string[];
  workType: WorkType;
  lunchHour: number;
  lunchOverrides?: Record<string, number>;
  /** A crew lunch change one member proposed and the others still need to accept */
  lunchProposal?: LunchProposal | null;
  createdAt: number;
  createdBy?: string;
  updatedAt?: number;
}

/**
 * A crew lunch change. It only takes effect once every member has accepted;
 * until then the crew keeps its current lunch. With a date it changes that day only.
 */
export interface LunchProposal {
  hour: number;
  byUid: string;
  date?: string | null;
  acceptedUids?: string[];
  createdAt?: number;
}

export interface DaySchedule {
  date: string;
  unavailableUids: string[];
}

export function defaultStaffSettings(uid: string): StaffSettings {
  return { uid, workType: 'mobile', usualLunch: DEFAULT_LUNCH_HOUR, active: true };
}

// ─── Staff settings ──────────────────────────────────────────────────────────

export function subscribeToStaffSettings(
  callback: (settings: Record<string, StaffSettings>) => void
): () => void {
  return onSnapshot(
    collection(db, 'staffSettings'),
    (snap) => {
      const map: Record<string, StaffSettings> = {};
      snap.forEach((d) => {
        map[d.id] = { ...defaultStaffSettings(d.id), ...(d.data() as Partial<StaffSettings>), uid: d.id };
      });
      callback(map);
    },
    (err) => console.warn('Staff settings unavailable:', err.message)
  );
}

export function subscribeToOwnStaffSettings(
  uid: string,
  callback: (settings: StaffSettings) => void
): () => void {
  return onSnapshot(
    doc(db, 'staffSettings', uid),
    (snap) =>
      callback({ ...defaultStaffSettings(uid), ...(snap.exists() ? (snap.data() as Partial<StaffSettings>) : {}), uid }),
    (err) => console.warn('Own staff settings unavailable:', err.message)
  );
}

export async function saveStaffSettings(uid: string, partial: Partial<StaffSettings>): Promise<void> {
  await setDoc(doc(db, 'staffSettings', uid), { ...partial, uid, updatedAt: Date.now() }, { merge: true });
}

// ─── Crews ───────────────────────────────────────────────────────────────────

export function subscribeToCrews(callback: (crews: Crew[]) => void): () => void {
  return onSnapshot(
    collection(db, 'crews'),
    (snap) => {
      const list = snap.docs.map((d) => ({ ...(d.data() as Omit<Crew, 'id'>), id: d.id }));
      list.sort((a, b) => a.createdAt - b.createdAt);
      callback(list);
    },
    (err) => console.warn('Crews unavailable:', err.message)
  );
}

function validateCrew(memberUids: string[], crews: Crew[], editingId?: string) {
  const unique = Array.from(new Set(memberUids));
  if (unique.length < CREW_MIN_SIZE || unique.length > CREW_MAX_SIZE) {
    throw new Error(`A crew needs ${CREW_MIN_SIZE}–${CREW_MAX_SIZE} staff members.`);
  }
  const clash = crews.find((c) => c.id !== editingId && c.memberUids.some((uid) => unique.includes(uid)));
  if (clash) throw new Error('Someone you picked is already in another crew. Unpair them first.');
  return unique;
}

export async function createCrew(
  input: { memberUids: string[]; workType: WorkType; lunchHour: number },
  existingCrews: Crew[],
  adminUid: string
): Promise<void> {
  const memberUids = validateCrew(input.memberUids, existingCrews);
  await addDoc(collection(db, 'crews'), {
    memberUids,
    workType: input.workType,
    lunchHour: input.lunchHour,
    lunchProposal: null,
    createdAt: Date.now(),
    createdBy: adminUid,
  });
}

export async function updateCrew(
  crew: Crew,
  partial: Partial<Pick<Crew, 'memberUids' | 'workType' | 'lunchHour'>>,
  existingCrews: Crew[]
): Promise<void> {
  const next = { ...partial };
  if (partial.memberUids) next.memberUids = validateCrew(partial.memberUids, existingCrews, crew.id);
  await setDoc(doc(db, 'crews', crew.id), { ...next, updatedAt: Date.now() }, { merge: true });
}

/** Unpairing removes the crew; its members go back to working solo. */
export async function unpairCrew(crewId: string): Promise<void> {
  await deleteDoc(doc(db, 'crews', crewId));
}

// ─── Day availability ────────────────────────────────────────────────────────

export function subscribeToDaySchedule(date: string, callback: (day: DaySchedule) => void): () => void {
  callback({ date, unavailableUids: [] });
  if (!date) return () => {};
  return onSnapshot(
    doc(db, 'schedule', date),
    (snap) =>
      callback({
        date,
        unavailableUids: snap.exists() && Array.isArray(snap.data().unavailableUids) ? snap.data().unavailableUids : [],
      }),
    (err) => console.warn('Day schedule unavailable:', err.message)
  );
}

export async function setStaffUnavailable(date: string, uid: string, unavailable: boolean): Promise<void> {
  await setDoc(
    doc(db, 'schedule', date),
    { date, unavailableUids: unavailable ? arrayUnion(uid) : arrayRemove(uid), updatedAt: Date.now() },
    { merge: true }
  );
}

// ─── Sign-up access (access code + approved staff emails) ────────────────────

export function subscribeToAccessCode(callback: (code: string) => void): () => void {
  return onSnapshot(
    doc(db, 'settings', 'auth'),
    (snap) => callback(snap.exists() ? (snap.data().staffAccessCode as string) || '' : ''),
    (err) => console.warn('Access code unavailable:', err.message)
  );
}

export async function saveAccessCode(code: string): Promise<void> {
  const trimmed = code.trim();
  if (trimmed.length < 4) throw new Error('Use at least 4 characters for the access code.');
  await setDoc(doc(db, 'settings', 'auth'), { staffAccessCode: trimmed, updatedAt: Date.now() }, { merge: true });
}

export interface PreRegisteredStaff {
  id: string;
  email: string;
  employeeId: string;
  fullName: string;
  createdAt?: number;
}

export function subscribeToPreRegisteredStaff(callback: (list: PreRegisteredStaff[]) => void): () => void {
  return onSnapshot(
    collection(db, 'pre_registered_staff'),
    (snap) =>
      callback(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            email: (data.email || '').toString().toLowerCase(),
            employeeId: (data.employeeId || '').toString(),
            fullName: (data.fullName || data.displayName || data.name || '').toString(),
            createdAt: data.createdAt,
          };
        })
      ),
    (err) => console.warn('Pre-registered staff unavailable:', err.message)
  );
}

/** Next free ID in the EMP-1001, EMP-1002… sequence. */
export function nextEmployeeId(existing: PreRegisteredStaff[]): string {
  const numbers = existing
    .map((s) => /^EMP-?(\d+)$/i.exec(s.employeeId)?.[1])
    .filter(Boolean)
    .map(Number);
  return `EMP-${Math.max(1000, ...numbers) + 1}`;
}

/**
 * Approves an email for staff sign-up. Refuses emails that already belong to a
 * customer account, since Firebase allows only one account per email.
 */
export async function addApprovedStaff(
  input: { fullName: string; email: string; employeeId: string },
  existing: PreRegisteredStaff[],
  adminUid: string
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const employeeId = input.employeeId.trim().toUpperCase();

  if (!fullName) throw new Error('Enter the staff member’s full name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (!employeeId) throw new Error('Enter an employee ID.');
  if (existing.some((s) => s.email === email)) throw new Error('This email is already on the staff list.');
  if (existing.some((s) => s.employeeId.toUpperCase() === employeeId)) {
    throw new Error('That employee ID is already in use.');
  }

  const accounts = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
  const account = accounts.docs[0]?.data();
  if (account) {
    if (account.role === 'staff') throw new Error('This email already has an active staff account.');
    throw new Error('This email belongs to a customer account. Use a different email for staff.');
  }

  await addDoc(collection(db, 'pre_registered_staff'), {
    email,
    employeeId,
    fullName,
    createdAt: Date.now(),
    createdBy: adminUid,
  });
}

/** Saves or corrects the name on an approved staff email (older records were saved without one). */
export async function renameApprovedStaff(id: string, fullName: string): Promise<void> {
  const name = fullName.trim();
  if (!name) throw new Error('Enter a name.');
  await setDoc(doc(db, 'pre_registered_staff', id), { fullName: name, updatedAt: Date.now() }, { merge: true });
}

/** Removes an approved email that hasn't been used to sign up yet. */
export async function removeApprovedStaff(id: string): Promise<void> {
  await deleteDoc(doc(db, 'pre_registered_staff', id));
}

// ─── Lunch (staff side) ──────────────────────────────────────────────────────

/** The lunch hour that applies on a date: the crew's if they're in one, otherwise their own. */
export function lunchHourOn(date: string, own: StaffSettings, crew?: Crew | null): number {
  if (crew) return crew.lunchOverrides?.[date] ?? crew.lunchHour ?? DEFAULT_LUNCH_HOUR;
  return own.lunchOverrides?.[date] ?? own.usualLunch ?? DEFAULT_LUNCH_HOUR;
}

/** Changes a solo staff member's lunch, for one day (date) or as their usual time. */
export async function setOwnLunch(uid: string, hour: number, date?: string): Promise<void> {
  if (!LUNCH_HOURS.includes(hour)) throw new Error('Lunch can start at 11:00, 12:00 or 13:00.');
  await setDoc(
    doc(db, 'staffSettings', uid),
    date ? { lunchOverrides: { [date]: hour }, updatedAt: Date.now() } : { usualLunch: hour, updatedAt: Date.now() },
    { merge: true }
  );
}

/** A proposal still counts until its day has passed, or (for today) until the proposed hour starts. */
export function isProposalLive(p: LunchProposal | null | undefined, today: string, nowHour: number): p is LunchProposal {
  if (!p) return false;
  if (!p.date) return true;
  if (p.date < today) return false;
  return p.date > today || nowHour < p.hour;
}

export async function proposeCrewLunch(crew: Crew, byUid: string, hour: number, date: string | null): Promise<void> {
  if (!LUNCH_HOURS.includes(hour)) throw new Error('Lunch can start at 11:00, 12:00 or 13:00.');
  const proposal: LunchProposal = { hour, byUid, date, acceptedUids: [byUid], createdAt: Date.now() };
  await setDoc(doc(db, 'crews', crew.id), { lunchProposal: proposal, updatedAt: Date.now() }, { merge: true });
}

/** Accept or decline the crew's lunch proposal. The last member to accept applies it. */
export async function respondToCrewLunch(crew: Crew, uid: string, accept: boolean): Promise<'applied' | 'waiting' | 'declined'> {
  const p = crew.lunchProposal;
  if (!p) throw new Error('There is no lunch change to answer.');
  if (!accept) {
    await setDoc(doc(db, 'crews', crew.id), { lunchProposal: null, updatedAt: Date.now() }, { merge: true });
    return 'declined';
  }
  const accepted = Array.from(new Set([...(p.acceptedUids ?? [p.byUid]), uid]));
  const everyone = crew.memberUids.every((m) => accepted.includes(m));
  if (!everyone) {
    await setDoc(doc(db, 'crews', crew.id), { lunchProposal: { ...p, acceptedUids: accepted }, updatedAt: Date.now() }, { merge: true });
    return 'waiting';
  }
  await setDoc(
    doc(db, 'crews', crew.id),
    p.date
      ? { lunchOverrides: { [p.date]: p.hour }, lunchProposal: null, updatedAt: Date.now() }
      : { lunchHour: p.hour, lunchProposal: null, updatedAt: Date.now() },
    { merge: true }
  );
  return 'applied';
}

export async function cancelCrewLunchProposal(crew: Crew): Promise<void> {
  await setDoc(doc(db, 'crews', crew.id), { lunchProposal: null, updatedAt: Date.now() }, { merge: true });
}
