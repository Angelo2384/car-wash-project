import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToStaffAppointments } from '../lib/appointments';
import { appointmentSlot, type AdminAppointment } from '../lib/appointmentSlots';
import { toIsoDate } from '../lib/business';
import type { BookedSlot } from '../lib/scheduling';
import {
  defaultStaffSettings,
  lunchHourOn,
  subscribeToOwnStaffSettings,
  type Crew,
  type StaffSettings,
  type WorkType,
} from '../lib/staffOps';
import { useCrews, useDaySchedule, useServices, useStaffSettings } from './useOperations';

export interface StaffJob {
  appt: AdminAppointment;
  slot: BookedSlot;
}

export interface StaffWorkday {
  uid: string;
  myName: string;
  today: string;
  own: StaffSettings;
  crew: Crew | null;
  partnerNames: string[];
  workType: WorkType;
  offToday: boolean;
  lunchToday: number;
  /** Every assigned job with a time, soonest first */
  jobs: StaffJob[];
  todayJobs: StaffJob[];
  loading: boolean;
  nameOf: (uid: string) => string;
}

/** Everything about a staff member's day: their crew, work type, lunch and jobs. */
export function useStaffWorkday(): StaffWorkday {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid || '';
  const [today] = useState(() => toIsoDate(new Date()));
  const [ownState, setOwnState] = useState<{ uid: string; settings: StaffSettings } | null>(null);
  const [apptState, setApptState] = useState<{ uid: string; list: AdminAppointment[] } | null>(null);
  const crews = useCrews();
  const allSettings = useStaffSettings();
  const day = useDaySchedule(today);
  const { items: services } = useServices();

  useEffect(() => {
    if (!uid) return;
    return subscribeToOwnStaffSettings(uid, (settings) => setOwnState({ uid, settings }));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    return subscribeToStaffAppointments(
      uid,
      (list) => setApptState({ uid, list }),
      () => setApptState({ uid, list: [] })
    );
  }, [uid]);

  const own = ownState?.uid === uid ? ownState.settings : defaultStaffSettings(uid);
  const appointments = useMemo(() => (apptState?.uid === uid ? apptState.list : []), [apptState, uid]);
  const crew = crews.find((c) => c.memberUids.includes(uid)) ?? null;

  const jobs = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== 'Cancelled')
        .map((appt) => ({ appt, slot: appointmentSlot(appt, services) }))
        .filter((j): j is StaffJob => j.slot !== null)
        .sort((a, b) => (a.slot.date === b.slot.date ? a.slot.startHour - b.slot.startHour : a.slot.date < b.slot.date ? -1 : 1)),
    [appointments, services]
  );

  const nameOf = (id: string) => (id === uid && currentUser?.displayName) || allSettings[id]?.name || 'Staff';
  const myName = allSettings[uid]?.name || currentUser?.displayName || 'Staff';

  return {
    uid,
    myName,
    today,
    own,
    crew,
    partnerNames: crew ? crew.memberUids.filter((m) => m !== uid).map(nameOf) : [],
    workType: crew?.workType ?? own.workType,
    offToday: day.unavailableUids.includes(uid),
    lunchToday: lunchHourOn(today, own, crew),
    jobs,
    todayJobs: jobs.filter((j) => j.slot.date === today),
    loading: !uid || ownState?.uid !== uid || apptState?.uid !== uid,
    nameOf,
  };
}
