import { useEffect, useState } from "react";
import { Undo2, X } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { undoJobStep } from "../../lib/staffJobs";
import { clearUndo, subscribeToUndo, type PendingUndo } from "./undoStore";

/** Bottom bar offering Undo for a few seconds after a job step is tapped. */
export default function StaffUndoBar() {
  const { showToast } = useToast();
  const [pending, setPending] = useState<PendingUndo | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => subscribeToUndo(setPending), []);

  useEffect(() => {
    if (!pending) return;
    const tick = () => {
      const left = Math.ceil((pending.expiresAt - Date.now()) / 1000);
      if (left <= 0) clearUndo();
      else setSecondsLeft(left);
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [pending]);

  if (!pending) return null;

  const undo = async () => {
    const { appt, before } = pending;
    clearUndo();
    try {
      await undoJobStep(appt, before);
      showToast("Undone. The job is back to where it was.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't undo.", "error");
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:ml-[120px] flex items-center gap-3 rounded-xl border border-[#2C2C2C] bg-[#1F1F1F] pl-4 pr-2 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.35)] text-sm text-[#F5F5F5]" role="status">
      <span>{pending.message}</span>
      <button
        onClick={undo}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#E86A33] hover:bg-[#d65f2c] text-white text-[13px] font-semibold cursor-pointer"
      >
        <Undo2 className="w-3.5 h-3.5" />
        Undo ({secondsLeft}s)
      </button>
      <button onClick={clearUndo} className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] cursor-pointer" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
