import { useEffect, useRef } from 'react';
import { collection, collectionGroup, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { parseAppointmentDateTime, subscribeToAllAppointments, type StoredAppointment } from '../lib/appointments';
import {
  bookingCountsByService,
  mostBookedIds,
  saveService,
  toIsoDate,
  workHoursForPackageName,
  type ServiceItem,
} from '../lib/business';
import { defaultStaffSettings, saveStaffSettings, type StaffSettings } from '../lib/staffOps';
import { saveBookedSlot, workTypeForService } from '../lib/scheduling';
import type { StaffMember } from '../lib/appointments';

/**
 * Keeps the data customers rely on for availability complete. Runs while an admin uses the app:
 * - every activated staff member gets a staff settings record (customers count capacity from these)
 * - upcoming bookings made before crews existed get a booked-slot record
 * - the "Popular" tag follows the most-booked package and service
 */
export function useAdminOpsSync(input: {
  enabled: boolean;
  staff: StaffMember[];
  staffLoading: boolean;
  settings: Record<string, StaffSettings>;
  services: ServiceItem[];
  usingDefaultServices: boolean;
}) {
  const { enabled, staff, staffLoading, settings, services, usingDefaultServices } = input;
  const syncedStaff = useRef(new Set<string>());
  const backfilled = useRef(false);
  const reviewsBackfilled = useRef(false);

  // Older reviews don't say who did the job; copy the crew over so staff can see their reviews
  useEffect(() => {
    if (!enabled || reviewsBackfilled.current) return;
    reviewsBackfilled.current = true;
    (async () => {
      try {
        const [reviewsSnap, apptsSnap] = await Promise.all([
          getDocs(collectionGroup(db, 'reviews')),
          getDocs(collectionGroup(db, 'appointments')),
        ]);
        const crewOf = new Map<string, { uids: string[]; name?: string }>();
        apptsSnap.docs.forEach((d) => {
          const a = d.data() as StoredAppointment;
          const uids = a.assignedStaffUids?.length ? a.assignedStaffUids : a.assignedStaffUid ? [a.assignedStaffUid] : [];
          if (uids.length) crewOf.set(d.id, { uids, name: a.staffName });
        });
        for (const r of reviewsSnap.docs) {
          const data = r.data();
          if (Array.isArray(data.staffUids) || !data.appointmentId) continue;
          const crew = crewOf.get(data.appointmentId);
          if (!crew) continue;
          await setDoc(
            r.ref,
            { staffUids: crew.uids, ...(crew.name ? { staffName: crew.name } : {}) },
            { merge: true }
          );
        }
      } catch (e) {
        console.warn('Review crew backfill skipped:', e);
      }
    })();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || staffLoading) return;
    staff
      .filter((s) => s.isActivated && s.uid)
      .forEach((s) => {
        const existing = settings[s.uid];
        const key = `${s.uid}:${s.name}`;
        if ((existing && existing.name === s.name) || syncedStaff.current.has(key)) return;
        syncedStaff.current.add(key);
        if (!existing) {
          const { uid, ...defaults } = defaultStaffSettings(s.uid);
          saveStaffSettings(uid, { ...defaults, name: s.name }).catch((e) => console.warn('Could not create staff settings:', e));
        } else {
          // Keep the name in step so crew partners and the staff dashboard can show it
          saveStaffSettings(s.uid, { name: s.name }).catch((e) => console.warn('Could not update staff name:', e));
        }
      });
  }, [enabled, staff, staffLoading, settings]);

  useEffect(() => {
    if (!enabled || backfilled.current) return;
    backfilled.current = true;
    const today = toIsoDate(new Date());

    (async () => {
      try {
        const [slotsSnap, apptsSnap] = await Promise.all([
          getDocs(query(collection(db, 'bookedSlots'), where('date', '>=', today))),
          getDocs(collectionGroup(db, 'appointments')),
        ]);
        const existing = new Set(slotsSnap.docs.map((d) => d.id));
        for (const d of apptsSnap.docs) {
          const appt = d.data() as StoredAppointment;
          if (existing.has(d.id) || appt.status === 'Cancelled' || appt.completed) continue;
          const when = parseAppointmentDateTime(appt.date, appt.time);
          if (!when) continue;
          const date = appt.bookingDate || toIsoDate(when);
          if (date < today) continue;
          const customerUid = appt.customerUid || d.ref.parent.parent?.id || '';
          if (!customerUid) continue;
          await saveBookedSlot({
            id: d.id,
            customerUid,
            date,
            startHour: typeof appt.startHour === 'number' ? appt.startHour : when.getHours(),
            workHours: appt.workHours || workHoursForPackageName(services, appt.packageName),
            type: workTypeForService(appt.serviceType),
            unitId: appt.unitId ?? null,
          });
        }
      } catch (e) {
        console.warn('Booked slot backfill skipped:', e);
      }
    })();
  }, [enabled, services]);

  useEffect(() => {
    if (!enabled || usingDefaultServices) return;
    return subscribeToAllAppointments((appointments) => {
      const popular = mostBookedIds(services, bookingCountsByService(appointments));
      services
        .filter((s) => Boolean(s.popular) !== popular.has(s.id))
        .forEach((s) =>
          saveService({ ...s, popular: popular.has(s.id) }).catch((e) => console.warn('Could not update popular tag:', e))
        );
    });
  }, [enabled, services, usingDefaultServices]);
}
