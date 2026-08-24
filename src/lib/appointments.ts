export interface StoredAppointment {
  id: string;
  packageName: string;
  price: string;
  date: string;
  time: string;
  location: string;
  vehicle: string;
  notes?: string;
  status: string;
  statusColor: string;
  staffName: string;
  staffStatus: string;
  isLocked: boolean;
  cancellationPolicy?: string;
  createdAt: number;
}

export function getAppointmentsStorageKey(uid?: string | null): string {
  return uid ? `ww_appointments_${uid}` : 'ww_appointments_default';
}

export function getStoredAppointments(uid?: string | null): StoredAppointment[] {
  try {
    const key = getAppointmentsStorageKey(uid);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load appointments from localStorage', e);
    return [];
  }
}

export function saveAppointment(appointment: StoredAppointment, uid?: string | null): void {
  try {
    const current = getStoredAppointments(uid);
    const updated = [appointment, ...current];
    const key = getAppointmentsStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save appointment to localStorage', e);
  }
}
