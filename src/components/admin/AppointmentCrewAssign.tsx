import { useMemo } from "react";
import { buildUnits, withResolvedUnits } from "../../lib/scheduling";
import { appointmentSlot, slotsForDate, type AdminAppointment } from "../../lib/appointmentSlots";
import type { ServiceItem } from "../../lib/business";
import type { Crew, StaffSettings } from "../../lib/staffOps";
import type { StaffMember } from "../../lib/appointments";
import { useDaySchedule } from "../../hooks/useOperations";
import AssignCrewControl from "./AssignCrewControl";

/** Crew picker for one booking in the Appointments list, using that booking's own day. */
export default function AppointmentCrewAssign({
  appt,
  appointments,
  services,
  staff,
  settings,
  crews,
}: {
  appt: AdminAppointment;
  appointments: AdminAppointment[];
  services: ServiceItem[];
  staff: StaffMember[];
  settings: Record<string, StaffSettings>;
  crews: Crew[];
}) {
  const slot = appointmentSlot(appt, services);
  const date = slot?.date ?? "";
  const day = useDaySchedule(date);

  const { units, daySlots } = useMemo(() => {
    const identities = staff.filter((s) => s.isActivated && s.uid).map((s) => ({ uid: s.uid, name: s.name }));
    const units = buildUnits({ date, staff: identities, settings, crews, day });
    const daySlots = withResolvedUnits(slotsForDate(appointments, services, date).map((e) => e.slot), units);
    return { units, daySlots };
  }, [staff, settings, crews, day, date, appointments, services]);

  if (!slot) return <p className="text-xs text-[#71717A]">This booking has no time set, so it can't be assigned yet.</p>;
  const resolved = daySlots.find((s) => s.id === slot.id) ?? slot;
  return <AssignCrewControl appt={appt} slot={resolved} units={units} daySlots={daySlots} />;
}
