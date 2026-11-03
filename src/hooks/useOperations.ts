import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_BUSINESS_SETTINGS,
  subscribeToBusinessSettings,
  subscribeToServices,
  type BusinessSettings,
  type ServicesSnapshot,
  DEFAULT_SERVICES,
} from '../lib/business';
import {
  subscribeToCrews,
  subscribeToDaySchedule,
  subscribeToStaffSettings,
  type Crew,
  type DaySchedule,
  type StaffSettings,
} from '../lib/staffOps';
import { buildUnits, subscribeToBookedSlots, type BookedSlot, type StaffIdentity, type Unit } from '../lib/scheduling';
import { subscribeToAllAppointments, subscribeToStaffMembers, type StaffMember } from '../lib/appointments';
import type { AdminAppointment } from '../lib/appointmentSlots';

export function useBusinessSettings(): BusinessSettings {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_BUSINESS_SETTINGS);
  useEffect(() => subscribeToBusinessSettings(setSettings), []);
  return settings;
}

export function useServices(): ServicesSnapshot {
  const [snapshot, setSnapshot] = useState<ServicesSnapshot>({ items: DEFAULT_SERVICES, usingDefaults: true });
  useEffect(() => subscribeToServices(setSnapshot), []);
  return snapshot;
}

export function useStaffSettings(): Record<string, StaffSettings> {
  const [settings, setSettings] = useState<Record<string, StaffSettings>>({});
  useEffect(() => subscribeToStaffSettings(setSettings), []);
  return settings;
}

export function useCrews(): Crew[] {
  const [crews, setCrews] = useState<Crew[]>([]);
  useEffect(() => subscribeToCrews(setCrews), []);
  return crews;
}

export function useDaySchedule(date: string): DaySchedule {
  const [day, setDay] = useState<DaySchedule>({ date, unavailableUids: [] });
  useEffect(() => subscribeToDaySchedule(date, setDay), [date]);
  return day.date === date ? day : { date, unavailableUids: [] };
}

export function useBookedSlots(date: string): BookedSlot[] {
  const [state, setState] = useState<{ date: string; slots: BookedSlot[] }>({ date, slots: [] });
  useEffect(() => subscribeToBookedSlots(date, (slots) => setState({ date, slots })), [date]);
  return state.date === date ? state.slots : [];
}

/** Admin-only: the staff directory (approved emails matched to activated accounts). */
export function useStaffDirectory(): { staff: StaffMember[]; loading: boolean } {
  const [state, setState] = useState<{ staff: StaffMember[]; loading: boolean }>({ staff: [], loading: true });
  useEffect(
    () =>
      subscribeToStaffMembers(
        (staff) => setState({ staff, loading: false }),
        () => setState((s) => ({ ...s, loading: false }))
      ),
    []
  );
  return state;
}

/**
 * Units (crews + solo staff) working on a date.
 * Admin views pass the staff directory for names; customer views can't read staff
 * profiles, so they fall back to the staff settings records (uids only).
 */
export function useUnits(date: string, directory?: StaffMember[]): Unit[] {
  const settings = useStaffSettings();
  const crews = useCrews();
  const day = useDaySchedule(date);

  return useMemo(() => {
    const staff: StaffIdentity[] = directory
      ? directory.filter((s) => s.isActivated && s.uid).map((s) => ({ uid: s.uid, name: s.name }))
      : Object.keys(settings).map((uid) => ({ uid, name: settings[uid].name || 'Staff' }));
    return buildUnits({ date, staff, settings, crews, day });
  }, [date, directory, settings, crews, day]);
}

/** Admin-only: every booking across all customers, live. */
export function useAllAppointments(): { appointments: AdminAppointment[]; loading: boolean } {
  const [state, setState] = useState<{ appointments: AdminAppointment[]; loading: boolean }>({ appointments: [], loading: true });
  useEffect(
    () =>
      subscribeToAllAppointments(
        (appointments) => setState({ appointments, loading: false }),
        () => setState((s) => ({ ...s, loading: false }))
      ),
    []
  );
  return state;
}
