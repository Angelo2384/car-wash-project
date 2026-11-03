import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronLeft, ChevronRight, Coffee, MapPin, UsersRound } from "lucide-react";
import { formatHour, fromIsoDate, getDayHours, toIsoDate } from "../../../lib/business";
import { withResolvedUnits, type BookedSlot, type Unit } from "../../../lib/scheduling";
import { slotsForDate, type AdminAppointment } from "../../../lib/appointmentSlots";
import { WORK_TYPE_LABELS } from "../../../lib/staffOps";
import {
  useAllAppointments,
  useBusinessSettings,
  useDaySchedule,
  useServices,
  useStaffDirectory,
  useUnits,
} from "../../../hooks/useOperations";
import { Badge, Card, EmptyState, Modal } from "../../../components/admin/AdminUI";
import { secondaryButton, smallButton } from "../../../components/admin/adminStyles";
import AssignCrewControl from "../../../components/admin/AssignCrewControl";

function shiftDate(iso: string, days: number) {
  const d = fromIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

const STATUS_TONE: Record<string, "green" | "amber" | "blue" | "neutral"> = {
  Confirmed: "green",
  "Awaiting Confirmation": "amber",
  "Staff on route": "blue",
  Completed: "neutral",
};

export default function AdminSchedule() {
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const today = toIsoDate(new Date());
  const settings = useBusinessSettings();
  const { items: services } = useServices();
  const { staff } = useStaffDirectory();
  const units = useUnits(date, staff);
  const day = useDaySchedule(date);
  const { appointments, loading } = useAllAppointments();
  const [selected, setSelected] = useState<{ appt: AdminAppointment; slot: BookedSlot } | null>(null);

  const hours = getDayHours(settings, date);
  const columns = hours ? Array.from({ length: hours.end - hours.start }, (_, i) => hours.start + i) : [];

  const entries = useMemo(() => {
    const raw = slotsForDate(appointments, services, date);
    const resolved = withResolvedUnits(raw.map((r) => r.slot), units);
    return raw.map((r, i) => ({ appt: r.appt, slot: resolved[i] }));
  }, [appointments, services, date, units]);
  const daySlots = entries.map((e) => e.slot);
  const unassigned = entries.filter((e) => !e.slot.unitId || !units.some((u) => u.id === e.slot.unitId));
  const offToday = staff.filter((s) => s.uid && day.unavailableUids.includes(s.uid));
  const bayUnits = units.filter((u) => u.workType === "bay");
  const mobileUnits = units.filter((u) => u.workType === "mobile");

  const label = fromIsoDate(date).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex flex-col gap-6 pb-10 text-[#F5F5F5]">
      {/* Date navigation */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(shiftDate(date, -1))} className={smallButton} aria-label="Previous day">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setDate(shiftDate(date, 1))} className={smallButton} aria-label="Next day">
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-bold font-display ml-2">
            {label}
            {date === today && <span className="ml-2 text-sm font-semibold text-[#E86A33]">Today</span>}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {date !== today && (
            <button onClick={() => setDate(today)} className={smallButton}>Today</button>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="bg-[#101010] border border-[#2C2C2C] rounded-lg px-3 py-1.5 text-sm text-[#F5F5F5]"
            aria-label="Pick a date"
          />
        </div>
      </div>

      {!hours ? (
        <Card>
          <EmptyState
            title="Closed on this day"
            body="Customers can't book this date. Change opening days or closed dates in Services & Business."
            action={<Link to="/dashboard/admin/service-management" className={secondaryButton}>Open Services & Business</Link>}
          />
        </Card>
      ) : (
        <>
          {/* Warnings */}
          {bayUnits.length === 0 && (
            <Warning>
              <strong className="text-[#F5F5F5]">No one is on the bay.</strong> Drive-in bookings are closed for this day until you set
              a working staff member or crew to Bay on the <Link to="/dashboard/admin/staff" className="underline">Staff page</Link>.
            </Warning>
          )}
          {/* Grid */}
          <Card className="overflow-x-auto">
            <div className="min-w-[900px] relative">
              <div className="grid border-b border-[#2C2C2C]" style={{ gridTemplateColumns: gridColumns(columns.length) }}>
                <div className="px-5 py-3 text-xs font-medium text-[#71717A]">Team</div>
                {columns.map((h) => (
                  <div key={h} className="px-2 py-3 text-xs font-medium text-[#71717A] border-l border-[#2C2C2C]">{formatHour(h)}</div>
                ))}
              </div>
              {units.length === 0 && (
                <EmptyState title="No one is working this day" body="Add staff, or mark people as working on the Staff page." />
              )}
              {[
                { title: "Bay · drive-ins", list: bayUnits },
                { title: "Mobile · call-outs", list: mobileUnits },
              ]
                .filter((group) => group.list.length > 0)
                .map((group) => (
                  <div key={group.title}>
                    <div className="px-5 py-2 bg-[#141414] border-b border-[#2C2C2C] text-[11px] font-semibold uppercase tracking-wide text-[#71717A]">
                      {group.title}
                    </div>
                    {group.list.map((unit) => (
                      <UnitRow
                        key={unit.id}
                        unit={unit}
                        columns={columns}
                        entries={entries.filter((e) => e.slot.unitId === unit.id)}
                        onOpen={setSelected}
                      />
                    ))}
                  </div>
                ))}
              {date === today && <NowLine columns={columns} />}
            </div>
          </Card>

          {/* Legend + off today */}
          <div className="flex items-start justify-between gap-6 flex-wrap text-xs text-[#A1A1AA]">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#E86A33]/20 border-l-2 border-[#E86A33]" /> Booked</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#35B86B]/15 border-l-2 border-[#35B86B]" /> Done</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border border-[#2C2C2C]" style={{ backgroundImage: LUNCH_HATCH }} /> Lunch</span>
            </div>
            <p>
              {offToday.length === 0
                ? "Everyone is working."
                : `Off: ${offToday.map((s) => s.name).join(", ")}.`}{" "}
              <Link to="/dashboard/admin/staff" className="text-[#E86A33] underline underline-offset-2">Manage availability</Link>
            </p>
          </div>
          {unassigned.length > 0 && (
            <Card className="px-5 py-4 flex flex-col">
              <div className="flex items-baseline justify-between gap-3 flex-wrap pb-2">
                <h3 className="text-[15px] font-bold text-[#F5F5F5]">Needs a crew ({unassigned.length})</h3>
                <p className="text-xs text-[#71717A]">Only crews free for the whole job are listed. The suggested one has the fewest jobs that day.</p>
              </div>
              {unassigned.map(({ appt, slot }) => (
                <div key={appt.id} className="flex items-center gap-4 py-2.5 border-t border-[#2C2C2C] flex-wrap md:flex-nowrap">
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-bold text-[#F5F5F5]">
                      {formatHour(slot.startHour)}–{formatHour(slot.startHour + slot.workHours)}
                    </p>
                    <p className="text-[11px] text-[#71717A]">{WORK_TYPE_LABELS[slot.type]}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#F5F5F5] truncate">
                      {appt.customerName} · {appt.packageName}
                      {appt.rescheduledByRole === "customer" && <span className="ml-2 text-xs font-medium text-amber-400">moved by customer</span>}
                    </p>
                    <p className="text-xs text-[#A1A1AA] truncate">{appt.serviceType === "Drive-in" ? "At the bay" : appt.address || appt.location}</p>
                  </div>
                  <AssignCrewControl appt={appt} slot={slot} units={units} daySlots={daySlots} />
                </div>
              ))}
            </Card>
          )}

          {loading && <p className="text-sm text-[#71717A]">Loading bookings…</p>}
        </>
      )}

      {selected && (
        <BookingModal
          entry={selected}
          units={units}
          daySlots={daySlots}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
      <p>{children}</p>
    </div>
  );
}

const UNIT_COLUMN = 200;
const gridColumns = (count: number) => `${UNIT_COLUMN}px repeat(${count}, minmax(72px, 1fr))`;
const LUNCH_HATCH = "repeating-linear-gradient(135deg, rgba(127,127,127,0.14) 0 6px, transparent 6px 12px)";

/** Orange line at the current time, across every row (today only). */
function NowLine({ columns }: { columns: number[] }) {
  const [now] = useState(() => new Date());
  const first = columns[0];
  const hour = now.getHours() + now.getMinutes() / 60;
  if (!columns.length || hour < first || hour >= first + columns.length) return null;
  const fraction = (hour - first) / columns.length;
  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-[#E86A33] pointer-events-none"
      style={{ left: `calc(${UNIT_COLUMN}px + (100% - ${UNIT_COLUMN}px) * ${fraction})` }}
      aria-hidden
    >
      <span className="absolute -top-0 -left-[3px] w-[7px] h-[7px] rounded-full bg-[#E86A33]" />
    </div>
  );
}

function UnitRow({
  unit,
  columns,
  entries,
  onOpen,
}: {
  unit: Unit;
  columns: number[];
  entries: { appt: AdminAppointment; slot: BookedSlot }[];
  onOpen: (e: { appt: AdminAppointment; slot: BookedSlot }) => void;
}) {
  const first = columns[0];
  const last = columns[columns.length - 1];
  const col = (hour: number) => hour - first + 2;
  const inRange = (h: number) => h >= first && h <= last;
  const jobs = entries.length;

  return (
    <div className="grid border-b border-[#2C2C2C] last:border-b-0 min-h-[64px]" style={{ gridTemplateColumns: gridColumns(columns.length) }}>
      <div className="px-5 py-2.5 flex items-center gap-3 min-w-0" style={{ gridColumn: 1, gridRow: 1 }}>
        <div className="w-8 h-8 rounded-full bg-[#1F1F1F] border border-[#2C2C2C] flex items-center justify-center shrink-0">
          {unit.kind === "crew" ? <UsersRound className="w-4 h-4 text-[#E86A33]" /> : <span className="text-xs font-bold text-[#A1A1AA]">{unit.label.charAt(0)}</span>}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{unit.label}</p>
          <p className="text-[11px] text-[#71717A] truncate">
            {unit.kind === "crew" ? `Crew of ${unit.memberUids.length}` : "Solo"} · {jobs === 0 ? "no jobs" : `${jobs} job${jobs > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {columns.map((h) => (
        <div key={h} className="border-l border-[#2C2C2C]" style={{ gridColumn: col(h), gridRow: 1 }} />
      ))}

      {inRange(unit.lunchHour) && (
        <div
          className="my-2 mx-1 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#71717A]"
          style={{ gridColumn: col(unit.lunchHour), gridRow: 1, backgroundImage: LUNCH_HATCH }}
        >
          <Coffee className="w-3.5 h-3.5" /> Lunch
        </div>
      )}

      {entries.map((entry) => {
        const { slot, appt } = entry;
        const start = Math.max(slot.startHour, first);
        const end = Math.min(slot.startHour + slot.workHours, last + 1);
        const done = appt.status === "Completed" || appt.completed;
        return (
          <button
            key={appt.id}
            onClick={() => onOpen(entry)}
            className={`my-2 mx-1 rounded-md border-l-[3px] px-2.5 py-1 text-left transition-colors cursor-pointer min-w-0 ${
              done
                ? "bg-[#35B86B]/15 border-[#35B86B] hover:bg-[#35B86B]/25"
                : "bg-[#E86A33]/15 border-[#E86A33] hover:bg-[#E86A33]/25"
            }`}
            style={{ gridColumn: `${col(start)} / ${col(end)}`, gridRow: 1 }}
            title={`${appt.customerName} · ${appt.packageName}`}
          >
            <p className="text-[11px] text-[#A1A1AA] truncate">
              {formatHour(slot.startHour)}–{formatHour(slot.startHour + slot.workHours)}
              {done ? " · done" : ""}
            </p>
            <p className="text-xs font-semibold text-[#F5F5F5] truncate">{appt.customerName}</p>
            <p className="text-[11px] text-[#A1A1AA] truncate">{appt.packageName}</p>
          </button>
        );
      })}
    </div>
  );
}

function BookingModal({
  entry,
  units,
  daySlots,
  onClose,
}: {
  entry: { appt: AdminAppointment; slot: BookedSlot };
  units: Unit[];
  daySlots: BookedSlot[];
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { appt, slot } = entry;
  const unit = units.find((u) => u.id === slot.unitId);
  const done = appt.status === "Completed" || appt.completed;

  return (
    <Modal
      title={`${appt.customerName} · ${appt.packageName}`}
      description={`${appt.date}, ${formatHour(slot.startHour)}–${formatHour(slot.startHour + slot.workHours)}`}
      onClose={onClose}
      footer={
        <>
          {!done && (
            <button
              onClick={() => navigate(`/dashboard/admin/appointments/reschedule/${appt.customerUid}/${appt.id}`, { state: { appointment: appt } })}
              className={secondaryButton}
            >
              Reschedule
            </button>
          )}
          <button onClick={() => navigate(`/dashboard/admin/appointments?search=${appt.id}`)} className={secondaryButton}>
            Open in Appointments
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={STATUS_TONE[appt.status] ?? "neutral"}>{appt.status}</Badge>
          <Badge tone={slot.type === "bay" ? "blue" : "orange"}>{appt.serviceType}</Badge>
          <span className="text-[#71717A] font-mono text-xs">#{appt.id}</span>
        </div>
        <dl className="grid grid-cols-[110px_1fr] gap-y-2">
          <dt className="text-[#71717A]">Vehicle</dt>
          <dd className="text-[#F5F5F5]">{appt.vehicle}</dd>
          <dt className="text-[#71717A]">Crew</dt>
          <dd className="text-[#F5F5F5]">{unit ? unit.memberNames.join(", ") : "Not assigned"}</dd>
          {appt.serviceType !== "Drive-in" && (
            <>
              <dt className="text-[#71717A]">Address</dt>
              <dd className="text-[#F5F5F5] flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-[#E86A33] shrink-0 mt-0.5" />
                {appt.address || appt.location}
              </dd>
            </>
          )}
          <dt className="text-[#71717A]">Phone</dt>
          <dd className="text-[#F5F5F5]">{appt.customerPhone || "Not given"}</dd>
        </dl>
        {!done && (
          <div className="border-t border-[#2C2C2C] pt-4 flex flex-col gap-2">
            <p className="font-semibold text-[#F5F5F5]">{unit ? "Change crew" : "Assign a crew"}</p>
            <AssignCrewControl
              appt={appt}
              slot={slot}
              units={units}
              daySlots={daySlots}
              confirmLabel={unit ? "Reassign" : "Assign & confirm"}
              onDone={onClose}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
