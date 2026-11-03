import { parseAppointmentDateTime, type StoredAppointment } from './appointments';
import { toIsoDate, workHoursForPackageName, type ServiceItem } from './business';
import { workTypeForService, type BookedSlot } from './scheduling';

export type AdminAppointment = StoredAppointment & { customerUid: string };

/**
 * Time block for a booking, from its scheduling fields, or (for bookings made before
 * crews existed) from its display date/time and package. Null if it can't be placed.
 */
export function appointmentSlot(appt: AdminAppointment, services: ServiceItem[]): BookedSlot | null {
  const when = parseAppointmentDateTime(appt.date, appt.time);
  const date = appt.bookingDate || (when ? toIsoDate(when) : '');
  const startHour = typeof appt.startHour === 'number' ? appt.startHour : when?.getHours();
  if (!date || typeof startHour !== 'number') return null;
  return {
    id: appt.id,
    customerUid: appt.customerUid,
    date,
    startHour,
    workHours: appt.workHours || workHoursForPackageName(services, appt.packageName),
    type: workTypeForService(appt.serviceType),
    unitId: effectiveUnitId(appt),
  };
}

/** Bookings on a date that still take up time (everything except cancelled ones). */
export function slotsForDate(appointments: AdminAppointment[], services: ServiceItem[], date: string) {
  return appointments
    .filter((a) => a.status !== 'Cancelled')
    .map((a) => ({ appt: a, slot: appointmentSlot(a, services) }))
    .filter((x): x is { appt: AdminAppointment; slot: BookedSlot } => x.slot !== null && x.slot.date === date);
}

/** A unit id for older bookings that only stored a single assigned staff member. */
export function effectiveUnitId(appt: AdminAppointment): string | null {
  if (appt.unitId) return appt.unitId;
  if (appt.assignedStaffUid && appt.confirmed) return `staff:${appt.assignedStaffUid}`;
  return null;
}
