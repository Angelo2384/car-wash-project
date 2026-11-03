import { useState } from "react";
import { Clock } from "lucide-react";
import { formatHour, fromIsoDate, getDayHours } from "../../lib/business";
import { canStartAt, withResolvedUnits } from "../../lib/scheduling";
import type { WorkType } from "../../lib/staffOps";
import { useBookedSlots, useBusinessSettings, useUnits } from "../../hooks/useOperations";

type TimeSlotPickerProps = {
  date: string;
  type: WorkType;
  workHours: number;
  value: number | null;
  onChange: (hour: number) => void;
  /** The booking being moved, so its own time doesn't count as taken */
  excludeId?: string;
  /** Times before this moment can't be picked (e.g. now, or the reschedule cut-off) */
  notBefore?: Date;
};

/**
 * Hour buttons for a day. Times are greyed out when every crew of the right type
 * is booked, travelling or on lunch, when they're in the past, or after closing.
 */
export default function TimeSlotPicker({ date, type, workHours, value, onChange, excludeId, notBefore }: TimeSlotPickerProps) {
  const settings = useBusinessSettings();
  const units = useUnits(date);
  const slots = useBookedSlots(date);
  const hours = date ? getDayHours(settings, date) : null;
  // Captured once per mount; times before this are greyed out
  const [now] = useState(() => new Date());

  if (!date) {
    return <p className="text-sm text-[#71717A] py-2">Pick a date to see available times.</p>;
  }
  if (!hours) {
    return (
      <p className="text-sm text-amber-400 py-2">
        We're closed on {fromIsoDate(date).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}. Pick another
        date.
      </p>
    );
  }

  const resolved = withResolvedUnits(slots, units);
  const cutoff = notBefore && notBefore > now ? notBefore : now;
  const startHours = Array.from({ length: hours.end - hours.start }, (_, i) => hours.start + i);

  const options = startHours.map((hour) => {
    const startsAt = fromIsoDate(date);
    startsAt.setHours(hour, 0, 0, 0);
    const tooSoon = startsAt.getTime() <= cutoff.getTime();
    const free =
      !tooSoon &&
      canStartAt({ units, slots: resolved, type, startHour: hour, workHours, closeHour: hours.end, excludeId });
    return { hour, free };
  });
  const anyFree = options.some((o) => o.free);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {options.map(({ hour, free }) => {
          const selected = value === hour;
          return (
            <button
              key={hour}
              type="button"
              disabled={!free}
              onClick={() => onChange(hour)}
              aria-pressed={selected}
              title={free ? undefined : "Unavailable"}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-medium border transition-all duration-150 ${
                selected
                  ? "bg-[#E86A33] border-[#E86A33] text-white badge-solid"
                  : free
                    ? "bg-[#101010] border-[#2C2C2C] text-[#A1A1AA] hover:border-[#E86A33]/40 hover:text-[#F5F5F5] cursor-pointer"
                    : "bg-[#101010] border-[#2C2C2C] text-[#52525B] line-through opacity-50 cursor-not-allowed"
              }`}
            >
              <Clock className="w-3.5 h-3.5 opacity-70" />
              {formatHour(hour)}
            </button>
          );
        })}
      </div>
      {!anyFree && (
        <p className="text-sm text-amber-400">
          No times left on this day{type === "bay" ? " at the wash bay" : ""}. Try another date
          {type === "bay" ? " or choose a call-out" : ""}.
        </p>
      )}
    </div>
  );
}
