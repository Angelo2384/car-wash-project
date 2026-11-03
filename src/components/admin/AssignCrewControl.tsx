import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { confirmAppointmentWithUnit } from "../../lib/appointments";
import { freeUnitsFor, suggestUnit, type BookedSlot, type Unit } from "../../lib/scheduling";
import type { AdminAppointment } from "../../lib/appointmentSlots";
import { WORK_TYPE_LABELS } from "../../lib/staffOps";
import { inputClass, primaryButton } from "./adminStyles";

/**
 * Pick a crew (or solo staff member) that's free for a booking and confirm it.
 * Only units of the right type (Bay/Mobile) that aren't on lunch or already busy are offered.
 */
export default function AssignCrewControl({
  appt,
  slot,
  units,
  daySlots,
  confirmLabel = "Assign & confirm",
  onDone,
}: {
  appt: AdminAppointment;
  slot: BookedSlot;
  units: Unit[];
  daySlots: BookedSlot[];
  confirmLabel?: string;
  onDone?: () => void;
}) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const free = freeUnitsFor({ units, slots: daySlots, booking: slot });
  const suggested = suggestUnit({ units, slots: daySlots, booking: slot });
  const [picked, setPicked] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const chosen = free.find((u) => u.id === (picked || suggested?.id));

  if (free.length === 0) {
    return (
      <p className="text-sm text-amber-400 max-w-xs">
        No {WORK_TYPE_LABELS[slot.type].toLowerCase()} crew is free at this time. Reschedule the booking or free someone up.
      </p>
    );
  }

  const assign = async () => {
    if (!chosen || !currentUser) return;
    setSaving(true);
    try {
      await confirmAppointmentWithUnit(appt.customerUid, appt.id, chosen, {
        uid: currentUser.uid,
        name: currentUser.displayName || "Owner",
      });
      showToast(`Confirmed. ${chosen.label} ${chosen.kind === "crew" ? "are" : "is"} on the job.`, "success");
      onDone?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't assign the crew.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      <select
        value={picked || suggested?.id || ""}
        onChange={(e) => setPicked(e.target.value)}
        className={`${inputClass} !h-9 !py-0 !w-[250px] text-sm`}
        aria-label="Crew to assign"
        title={suggested ? `Suggested: ${suggested.label}, the fewest jobs that day` : undefined}
      >
        {free.map((u) => (
          <option key={u.id} value={u.id}>
            {u.label}
            {u.kind === "crew" ? " (crew)" : ""}
            {u.id === suggested?.id ? " (suggested)" : ""}
          </option>
        ))}
      </select>
      <button onClick={assign} disabled={!chosen || saving} className={`${primaryButton} !h-9 !py-0 !px-3.5 text-[13px] whitespace-nowrap`}>
        <CheckCircle2 className="w-4 h-4" />
        {saving ? "Assigning…" : confirmLabel}
      </button>
    </div>
  );
}
