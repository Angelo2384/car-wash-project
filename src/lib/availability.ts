import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_BUSINESS_SETTINGS, getDayHours, type BusinessSettings } from './business';
import { defaultStaffSettings, type Crew, type StaffSettings, type WorkType } from './staffOps';
import { buildUnits, canStartAt, withResolvedUnits, type BookedSlot } from './scheduling';

/**
 * Fresh check, straight from the database, that a time can still be booked.
 * Run right before saving so two customers can't take the last spot at once from stale screens.
 */
export async function isSlotStillFree(input: {
  date: string;
  type: WorkType;
  startHour: number;
  workHours: number;
  excludeId?: string;
}): Promise<boolean> {
  const { date, type, startHour, workHours, excludeId } = input;
  const [settingsSnap, staffSnap, crewsSnap, daySnap, slotsSnap] = await Promise.all([
    getDoc(doc(db, 'settings', 'business')),
    getDocs(collection(db, 'staffSettings')),
    getDocs(collection(db, 'crews')),
    getDoc(doc(db, 'schedule', date)),
    getDocs(query(collection(db, 'bookedSlots'), where('date', '==', date))),
  ]);

  const business = { ...DEFAULT_BUSINESS_SETTINGS, ...(settingsSnap.data() as Partial<BusinessSettings> | undefined) };
  const hours = getDayHours(business, date);
  if (!hours) return false;

  const settings: Record<string, StaffSettings> = {};
  staffSnap.forEach((d) => (settings[d.id] = { ...defaultStaffSettings(d.id), ...(d.data() as Partial<StaffSettings>), uid: d.id }));
  const crews = crewsSnap.docs.map((d) => ({ ...(d.data() as Omit<Crew, 'id'>), id: d.id }));
  const units = buildUnits({
    date,
    staff: Object.keys(settings).map((uid) => ({ uid, name: 'Staff' })),
    settings,
    crews,
    day: { date, unavailableUids: daySnap.exists() ? daySnap.data().unavailableUids || [] : [] },
  });
  const slots = withResolvedUnits(
    slotsSnap.docs.map((d) => ({ ...(d.data() as Omit<BookedSlot, 'id'>), id: d.id })),
    units
  );
  return canStartAt({ units, slots, type, startHour, workHours, closeHour: hours.end, excludeId });
}
