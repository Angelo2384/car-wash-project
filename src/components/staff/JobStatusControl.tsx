import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import {
  advanceJob,
  jobStepOf,
  JOB_STEPS,
  nextStep,
  snapshotJob,
  STEP_ACTION,
  STEP_LABEL,
} from "../../lib/staffJobs";
import { offerUndo } from "./undoStore";
import type { AdminAppointment } from "../../lib/appointmentSlots";
import type { WorkType } from "../../lib/staffOps";

/**
 * The job's progress (On my way → Arrived → Washing → Done) and a button for the next step.
 * Steps only go forward, with a few seconds to undo a mistaken tap. Any crew member
 * can tap it; everyone sees the same status.
 */
export default function JobStatusControl({
  appt,
  type,
  byName,
  canStart = true,
  notStartedHint,
  compact = false,
}: {
  appt: AdminAppointment;
  type: WorkType;
  byName: string;
  /** false before the job's day: the steps show but can't be tapped yet */
  canStart?: boolean;
  notStartedHint?: string;
  compact?: boolean;
}) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const current = jobStepOf(appt);
  const steps = JOB_STEPS[type];
  const next = current === "done" ? null : nextStep(type, current);
  const reached = (step: (typeof steps)[number]) =>
    current === "done" || (current !== "assigned" && steps.indexOf(step) <= steps.indexOf(current));

  const go = async () => {
    if (!next) return;
    setSaving(true);
    const before = snapshotJob(appt);
    try {
      await advanceJob(appt, next, byName);
      offerUndo({
        appt,
        before,
        message: next === "done" ? `${appt.customerName}'s job marked done.` : `${appt.customerName}: ${STEP_LABEL[next]}.`,
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't update the job.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`flex items-center gap-3 flex-wrap ${compact ? "" : "justify-between"}`}>
      <ol className="flex items-center gap-1 text-xs" aria-label="Job progress">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-[#3C3C3C]" aria-hidden />}
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border font-medium ${
                reached(step)
                  ? step === "done"
                    ? "bg-[#35B86B]/15 border-[#35B86B]/40 text-[#35B86B]"
                    : "bg-[#E86A33]/15 border-[#E86A33]/40 text-[#E86A33]"
                  : "border-[#2C2C2C] text-[#71717A]"
              }`}
            >
              {reached(step) && <Check className="w-3 h-3" />}
              {STEP_LABEL[step]}
            </span>
          </li>
        ))}
      </ol>
      {next && (
        <div className="flex items-center gap-2">
          {!canStart && notStartedHint && <span className="text-xs text-[#71717A]">{notStartedHint}</span>}
          <button
            onClick={go}
            disabled={saving || !canStart}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 h-9 text-[13px] font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              next === "done" ? "bg-[#35B86B] hover:bg-[#2da15d]" : "bg-[#E86A33] hover:bg-[#d65f2c]"
            }`}
          >
            {saving ? "Saving…" : STEP_ACTION[next]}
          </button>
        </div>
      )}
    </div>
  );
}
