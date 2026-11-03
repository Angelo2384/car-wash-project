import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, CalendarClock, Coffee, MessageSquareWarning, Repeat, UsersRound } from "lucide-react";
import { collectionGroup, onSnapshot, query } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { formatHour, formatRand, fromIsoDate, getDayHours, parseRand, toIsoDate } from "../../../lib/business";
import { occupiedHours, withResolvedUnits, type Unit } from "../../../lib/scheduling";
import { slotsForDate, type AdminAppointment } from "../../../lib/appointmentSlots";
import { subscribeToWalkIns, type WalkInTicket } from "../../../lib/walkIns";
import { WORK_TYPE_LABELS } from "../../../lib/staffOps";
import {
  useAllAppointments,
  useBusinessSettings,
  useServices,
  useStaffDirectory,
  useUnits,
} from "../../../hooks/useOperations";
import { Badge, Card, EmptyState, SectionHeading, StatTile } from "../../../components/admin/AdminUI";
import { smallButton } from "../../../components/admin/adminStyles";

type Review = { id: string; customerName?: string; rating: number; comment?: string; ownerReply?: string; createdAt?: number; status?: string };

function addDays(iso: string, n: number) {
  const d = fromIsoDate(iso);
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
}

export default function AdminDashboard() {
  const [now] = useState(() => new Date());
  const today = toIsoDate(now);
  const tomorrow = addDays(today, 1);
  const currentHour = now.getHours();

  const settings = useBusinessSettings();
  const { items: services } = useServices();
  const { staff } = useStaffDirectory();
  const units = useUnits(today, staff);
  const unitsTomorrow = useUnits(tomorrow, staff);
  const { appointments } = useAllAppointments();
  const [walkIns, setWalkIns] = useState<WalkInTicket[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  useEffect(() => subscribeToWalkIns(today, setWalkIns), [today]);
  useEffect(
    () =>
      onSnapshot(
        query(collectionGroup(db, "reviews")),
        (snap) => setReviews(snap.docs.map((d) => ({ ...(d.data() as Omit<Review, "id">), id: d.id }))),
        () => setReviews([])
      ),
    []
  );

  const todays = useMemo(() => {
    const raw = slotsForDate(appointments, services, today);
    const resolved = withResolvedUnits(raw.map((r) => r.slot), units);
    return raw.map((r, i) => ({ appt: r.appt, slot: resolved[i] })).sort((a, b) => a.slot.startHour - b.slot.startHour);
  }, [appointments, services, today, units]);

  const upcomingUnassigned = useMemo(
    () =>
      appointments
        .map((a) => ({ a, slot: slotsForDate([a], services, a.bookingDate || "")[0]?.slot }))
        .filter(({ a }) => a.status === "Awaiting Confirmation" || (!a.confirmed && a.status !== "Cancelled" && !a.completed))
        .filter(({ a }) => {
          const d = a.bookingDate;
          return !d || d >= today;
        }),
    [appointments, services, today]
  );

  const customerMoves = appointments.filter(
    (a) => a.rescheduledByRole === "customer" && a.status === "Awaiting Confirmation" && (a.rescheduledAt || 0) > now.getTime() - 3 * 86400000
  );
  const lowReviews = reviews.filter((r) => r.rating <= 2 && !r.ownerReply && r.status !== "Rejected");

  const doneWalkIns = walkIns.filter((t) => t.status === "done");
  const bookedTakings = todays.filter((e) => e.appt.status !== "Cancelled").reduce((sum, e) => sum + parseRand(e.appt.price), 0);
  const walkInTakings = doneWalkIns.reduce((sum, t) => sum + t.total, 0);
  const openToday = getDayHours(settings, today);
  const bayCovered = units.some((u) => u.workType === "bay");
  const bayCoveredTomorrow = unitsTomorrow.some((u) => u.workType === "bay");
  const openTomorrow = getDayHours(settings, tomorrow);

  const attention: { key: string; icon: React.ReactNode; title: string; body: string; to: string; action: string }[] = [];
  if (openToday && !bayCovered)
    attention.push({ key: "bay-today", icon: <AlertTriangle />, title: "No one on the bay today", body: "Drive-in bookings are closed until you assign a bay worker.", to: "/dashboard/admin/staff", action: "Assign bay" });
  if (openTomorrow && !bayCoveredTomorrow)
    attention.push({ key: "bay-tomorrow", icon: <AlertTriangle />, title: "No one on the bay tomorrow", body: "Customers can't book drive-ins for tomorrow yet.", to: "/dashboard/admin/staff", action: "Assign bay" });
  if (upcomingUnassigned.length)
    attention.push({
      key: "unassigned",
      icon: <CalendarClock />,
      title: `${upcomingUnassigned.length} booking${upcomingUnassigned.length > 1 ? "s" : ""} need a crew`,
      body: "Assign a free crew to confirm them. Customers are waiting for confirmation.",
      to: "/dashboard/admin/appointments",
      action: "Assign crews",
    });
  if (customerMoves.length)
    attention.push({
      key: "moves",
      icon: <Repeat />,
      title: `${customerMoves.length} customer reschedule${customerMoves.length > 1 ? "s" : ""}`,
      body: "Customers moved these bookings themselves, so they need a crew again.",
      to: "/dashboard/admin/schedule",
      action: "Open schedule",
    });
  if (lowReviews.length)
    attention.push({
      key: "reviews",
      icon: <MessageSquareWarning />,
      title: `${lowReviews.length} low review${lowReviews.length > 1 ? "s" : ""} without a reply`,
      body: "A quick reply shows other customers you take feedback seriously.",
      to: "/dashboard/admin/reviews",
      action: "Reply",
    });

  return (
    <div className="flex flex-col gap-8 pb-10 text-[#F5F5F5]">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile
          label="Bookings today"
          value={todays.length}
          hint={`${todays.filter((e) => e.appt.status === "Completed").length} done · ${todays.filter((e) => e.slot.type === "bay").length} at the bay`}
        />
        <StatTile label="Taken today" value={formatRand(bookedTakings + walkInTakings)} hint={`${formatRand(walkInTakings)} from walk-ins`} />
        <StatTile
          label="Walk-ins"
          value={walkIns.filter((t) => t.status === "waiting").length}
          hint={`waiting · ${doneWalkIns.length} done today`}
        />
        <StatTile
          label="Awaiting confirmation"
          value={upcomingUnassigned.length}
          tone={upcomingUnassigned.length ? "amber" : "neutral"}
          hint={upcomingUnassigned.length ? "Assign crews to confirm" : "All bookings have a crew"}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 flex flex-col gap-4">
          <SectionHeading
            title="Crews today"
            subtitle={openToday ? `Open ${formatHour(openToday.start)}–${formatHour(openToday.end)}` : "Closed today"}
            action={<Link to="/dashboard/admin/schedule" className={smallButton}>Full schedule <ArrowUpRight className="w-3.5 h-3.5" /></Link>}
          />
          <Card className="overflow-hidden">
            {units.length === 0 ? (
              <EmptyState title="No one is working today" body="Set availability on the Staff page." />
            ) : (
              units.map((unit) => <UnitTodayRow key={unit.id} unit={unit} entries={todays.filter((e) => e.slot.unitId === unit.id)} currentHour={currentHour} />)
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <SectionHeading title="Needs your attention" />
          <Card className="overflow-hidden">
            {attention.length === 0 ? (
              <EmptyState title="All clear" body="Every booking has a crew and the bay is covered." />
            ) : (
              attention.map((a) => (
                <div key={a.key} className="flex gap-3 px-5 py-4 border-b border-[#2C2C2C] last:border-b-0">
                  <span className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4">
                    {a.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#F5F5F5]">{a.title}</p>
                    <p className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">{a.body}</p>
                    <Link to={a.to} className="inline-block mt-2 text-sm font-semibold text-[#E86A33] underline underline-offset-4 decoration-[#E86A33]/40 hover:decoration-[#E86A33]">
                      {a.action}
                    </Link>
                  </div>
                </div>
              ))
            )}
          </Card>

          <SectionHeading
            title="Walk-in queue"
            action={<Link to="/dashboard/admin/walk-ins" className={smallButton}>Manage <ArrowUpRight className="w-3.5 h-3.5" /></Link>}
          />
          <Card className="overflow-hidden">
            {walkIns.filter((t) => t.status === "waiting" || t.status === "in_progress").length === 0 ? (
              <EmptyState title="No walk-ins waiting" />
            ) : (
              walkIns
                .filter((t) => t.status === "waiting" || t.status === "in_progress")
                .map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3 border-b border-[#2C2C2C] last:border-b-0">
                    <span className="font-mono text-sm font-bold w-14">{t.ticketNumber}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#F5F5F5] truncate">{t.vehicle}</p>
                      <p className="text-xs text-[#71717A] truncate">{t.serviceNames.join(", ")}</p>
                    </div>
                    <Badge tone={t.status === "in_progress" ? "blue" : "amber"}>{t.status === "in_progress" ? "Washing" : "Waiting"}</Badge>
                  </div>
                ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function UnitTodayRow({
  unit,
  entries,
  currentHour,
}: {
  unit: Unit;
  entries: { appt: AdminAppointment; slot: ReturnType<typeof slotsForDate>[number]["slot"] }[];
  currentHour: number;
}) {
  const current = entries.find((e) => occupiedHours(e.slot).slice(0, e.slot.workHours).includes(currentHour));
  const next = entries.find((e) => e.slot.startHour > currentHour);
  const onLunch = unit.lunchHour === currentHour;
  const done = entries.filter((e) => e.appt.status === "Completed" || e.appt.completed).length;

  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-[#2C2C2C] last:border-b-0 flex-wrap">
      <div className="flex items-center gap-3 w-56 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#1F1F1F] border border-[#2C2C2C] flex items-center justify-center shrink-0">
          {unit.kind === "crew" ? <UsersRound className="w-4 h-4 text-[#E86A33]" /> : <span className="text-sm font-bold text-[#A1A1AA]">{unit.label.charAt(0)}</span>}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{unit.label}</p>
          <p className="text-xs text-[#71717A]">{WORK_TYPE_LABELS[unit.workType]} · lunch {formatHour(unit.lunchHour)}</p>
        </div>
      </div>
      <div className="flex-1 min-w-[200px] text-sm">
        {onLunch ? (
          <span className="inline-flex items-center gap-1.5 text-[#A1A1AA]"><Coffee className="w-4 h-4" /> On lunch until {formatHour(unit.lunchHour + 1)}</span>
        ) : current ? (
          <span className="text-[#F5F5F5]">
            Now: <strong>{current.appt.customerName}</strong> · {current.appt.packageName}
            {current.appt.staffStatus && current.appt.staffStatus !== "Assigned" && (
              <span className="text-[#A1A1AA]"> ({current.appt.staffStatus})</span>
            )}
          </span>
        ) : next ? (
          <span className="text-[#A1A1AA]">
            Next: <strong className="text-[#F5F5F5]">{formatHour(next.slot.startHour)}</strong> · {next.appt.customerName}, {next.appt.packageName}
          </span>
        ) : (
          <span className="text-[#71717A]">{unit.workType === "bay" ? "Free for walk-ins" : "No more jobs today"}</span>
        )}
      </div>
      <Badge tone={entries.length && done < entries.length ? "orange" : "neutral"}>
        {entries.length === 0 ? "No jobs" : `${done} of ${entries.length} done`}
      </Badge>
    </div>
  );
}
