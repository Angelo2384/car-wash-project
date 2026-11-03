import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Car, ChevronRight, Coffee, MapPin, Phone, StickyNote, Ticket, UsersRound } from "lucide-react";
import { useStaffWorkday, type StaffJob } from "../../../hooks/useStaffWorkday";
import { formatHour, fromIsoDate, toIsoDate } from "../../../lib/business";
import { jobStepOf, STEP_LABEL } from "../../../lib/staffJobs";
import { WORK_TYPE_LABELS } from "../../../lib/staffOps";
import { workTypeForService } from "../../../lib/scheduling";
import { subscribeToStaffReviews, type CustomerReview } from "../../../lib/reviews";
import { Badge, Card, EmptyState, StatTile } from "../../../components/admin/AdminUI";
import JobStatusControl from "../../../components/staff/JobStatusControl";
import LunchControl from "../../../components/staff/LunchControl";
import { subscribeToWalkIns, type WalkInTicket } from "../../../lib/walkIns";

function greeting(hour: number) {
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** Monday of this week, as YYYY-MM-DD */
function weekStart(today: string) {
  const d = fromIsoDate(today);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toIsoDate(d);
}

export default function StaffDashboard() {
  const day = useStaffWorkday();
  const { today, todayJobs, jobs, crew, partnerNames, workType, offToday, lunchToday, myName } = day;
  const [now] = useState(() => new Date());
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  useEffect(() => subscribeToStaffReviews(day.uid, setReviews), [day.uid]);

  const crewLabel = crew ? [myName, ...partnerNames].map((n) => n.split(" ")[0]).join(" + ") : myName;
  const doneToday = todayJobs.filter((j) => jobStepOf(j.appt) === "done").length;
  const monday = weekStart(today);
  const doneThisWeek = jobs.filter((j) => j.slot.date >= monday && j.slot.date <= today && jobStepOf(j.appt) === "done").length;
  const rating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const nextUp = jobs.find((j) => j.slot.date > today && jobStepOf(j.appt) !== "done");

  // The job to focus on: one in progress, else the next one not done today
  const focus =
    todayJobs.find((j) => ["on_way", "arrived", "washing"].includes(jobStepOf(j.appt))) ??
    todayJobs.find((j) => jobStepOf(j.appt) !== "done");

  // Today's plan: jobs and lunch in time order
  const plan = useMemo(() => {
    const items: ({ kind: "job"; hour: number; job: StaffJob } | { kind: "lunch"; hour: number })[] = todayJobs.map((job) => ({
      kind: "job" as const,
      hour: job.slot.startHour,
      job,
    }));
    if (!offToday) items.push({ kind: "lunch", hour: lunchToday });
    return items.sort((a, b) => a.hour - b.hour);
  }, [todayJobs, lunchToday, offToday]);

  const dateLabel = fromIsoDate(today).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex flex-col gap-6 pb-10 text-[#F5F5F5]">
      {/* Who, where, with whom */}
      <Card className="px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-[#71717A]">{dateLabel}</p>
          <h2 className="text-xl font-bold font-display mt-0.5">
            {greeting(now.getHours())}, {myName.split(" ")[0]}
          </h2>
        </div>
        {offToday ? (
          <Badge tone="red">You're off today</Badge>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={workType === "bay" ? "blue" : "orange"}>
              {workType === "bay" ? "On the bay" : "Mobile call-outs"}
            </Badge>
            {crew && (
              <span className="inline-flex items-center gap-1.5 text-sm text-[#D4D4D4]">
                <UsersRound className="w-4 h-4 text-[#E86A33]" />
                With {partnerNames.join(" and ")}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-sm text-[#A1A1AA]">
              <Coffee className="w-4 h-4" />
              Lunch {formatHour(lunchToday)}
            </span>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Jobs today" value={`${doneToday} / ${todayJobs.length}`} hint={todayJobs.length ? "done" : "Nothing booked yet"} />
        <StatTile label="Done this week" value={doneThisWeek} hint="Since Monday" />
        <StatTile
          label="Your rating"
          value={rating ? rating.toFixed(1) : "–"}
          hint={reviews.length ? `${reviews.length} review${reviews.length > 1 ? "s" : ""}` : "No reviews yet"}
          tone={rating && rating >= 4 ? "green" : "neutral"}
        />
        <StatTile
          label="Next job after today"
          value={nextUp ? formatHour(nextUp.slot.startHour) : "–"}
          hint={nextUp ? fromIsoDate(nextUp.slot.date).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" }) : "None booked"}
        />
      </div>

      {offToday ? (
        <Card>
          <EmptyState title="Enjoy your day off" body="The owner marked you as off today, so you won't get any jobs." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
          <div className="xl:col-span-2 flex flex-col gap-5">
            {focus ? (
              <FocusJob job={focus} byName={crew ? crewLabel : myName} />
            ) : (
              <Card>
                <EmptyState
                  title={todayJobs.length ? "All of today's jobs are done" : "No jobs booked for you today"}
                  body={workType === "bay" ? "Walk-ins below still need a hand." : "The owner assigns jobs. They'll show up here."}
                />
              </Card>
            )}

            <Card className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-bold">Today's plan</h3>
                <Link to="/dashboard/staff/appointments" className="text-xs text-[#E86A33] hover:underline">All my jobs</Link>
              </div>
              {plan.map((item) =>
                item.kind === "lunch" ? (
                  <div key="lunch" className="flex items-center gap-4 py-2 border-t border-[#2C2C2C]">
                    <span className="w-24 text-sm font-semibold text-[#A1A1AA]">
                      {formatHour(item.hour)}–{formatHour(item.hour + 1)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm text-[#A1A1AA]">
                      <Coffee className="w-4 h-4" /> Lunch
                    </span>
                  </div>
                ) : (
                  <div key={item.job.appt.id} className="flex items-center gap-4 py-2 border-t border-[#2C2C2C]">
                    <span className="w-24 text-sm font-semibold">
                      {formatHour(item.job.slot.startHour)}–{formatHour(item.job.slot.startHour + item.job.slot.workHours)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {item.job.appt.customerName} · {item.job.appt.packageName}
                      </p>
                      <p className="text-xs text-[#71717A] truncate">
                        {item.job.slot.type === "bay" ? "At the bay" : item.job.appt.address || item.job.appt.location}
                      </p>
                    </div>
                    <Badge tone={jobStepOf(item.job.appt) === "done" ? "green" : jobStepOf(item.job.appt) === "assigned" ? "neutral" : "orange"}>
                      {STEP_LABEL[jobStepOf(item.job.appt)]}
                    </Badge>
                  </div>
                )
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-5">
            <LunchControl day={day} mode="today" />
            <Card className="p-5 flex flex-col gap-2">
              <h3 className="text-[15px] font-bold">Your setup</h3>
              <p className="text-sm text-[#A1A1AA]">
                {WORK_TYPE_LABELS[workType]} {crew ? `crew: ${crewLabel}` : "· working solo"}
              </p>
              <p className="text-xs text-[#71717A]">The owner sets your work type and crew. Ask them if something's wrong.</p>
            </Card>
          </div>
        </div>
      )}

      {!offToday && workType === "bay" && <WalkInSummary today={today} />}
    </div>
  );
}

function FocusJob({ job, byName }: { job: StaffJob; byName: string }) {
  const { appt, slot } = job;
  const type = slot.type ?? workTypeForService(appt.serviceType);
  const address = appt.address || appt.location;
  const started = jobStepOf(appt) !== "assigned";
  return (
    <Card className="p-6 flex flex-col gap-5 border-[#E86A33]/40">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#E86A33]">{started ? "Current job" : "Next job"}</p>
          <h3 className="text-xl font-bold font-display mt-1">
            {formatHour(slot.startHour)}–{formatHour(slot.startHour + slot.workHours)} · {appt.customerName}
          </h3>
          <p className="text-sm text-[#A1A1AA] mt-0.5">
            {appt.packageName}
            {appt.customServiceNames?.length ? ` (${appt.customServiceNames.join(", ")})` : ""}
          </p>
        </div>
        <Badge tone={type === "bay" ? "blue" : "orange"}>{type === "bay" ? "Drive-in" : "Call-out"}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <p className="flex items-center gap-2 text-[#D4D4D4]">
          <Car className="w-4 h-4 text-[#71717A]" />
          {appt.vehicle}
        </p>
        {appt.customerPhone && (
          <a href={`tel:${appt.customerPhone}`} className="flex items-center gap-2 text-[#D4D4D4] hover:text-[#E86A33]">
            <Phone className="w-4 h-4 text-[#71717A]" />
            {appt.customerPhone}
          </a>
        )}
        {type === "mobile" && address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-[#D4D4D4] hover:text-[#E86A33] sm:col-span-2"
          >
            <MapPin className="w-4 h-4 text-[#71717A] shrink-0" />
            {address} <span className="text-xs text-[#71717A]">· open in Maps</span>
          </a>
        )}
        {appt.notes && (
          <p className="flex items-start gap-2 text-[#A1A1AA] sm:col-span-2">
            <StickyNote className="w-4 h-4 text-[#71717A] shrink-0 mt-0.5" />
            {appt.notes}
          </p>
        )}
      </div>

      <div className="border-t border-[#2C2C2C] pt-4">
        <JobStatusControl appt={appt} type={type} byName={byName} />
      </div>
    </Card>
  );
}

/** Walk-ins at a glance for bay staff, linking to the full queue. */
function WalkInSummary({ today }: { today: string }) {
  const [tickets, setTickets] = useState<WalkInTicket[]>([]);
  useEffect(() => subscribeToWalkIns(today, setTickets), [today]);
  const waiting = tickets.filter((t) => t.status === "waiting");
  const washing = tickets.filter((t) => t.status === "in_progress");
  return (
    <Link to="/dashboard/staff/walk-ins" className="block">
      <Card className="px-5 py-4 flex items-center gap-4 hover:border-[#E86A33]/50 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-[#E86A33]/10 flex items-center justify-center shrink-0">
          <Ticket className="w-5 h-5 text-[#E86A33]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-[#F5F5F5]">Walk-ins</p>
          <p className="text-sm text-[#A1A1AA]">
            {waiting.length === 0 && washing.length === 0
              ? "No one waiting. Create a ticket when someone drives in."
              : `${waiting.length} waiting${waiting[0] ? ` · next up ${waiting[0].ticketNumber}` : ""} · ${washing.length} being washed`}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#E86A33]">
          Open queue <ChevronRight className="w-4 h-4" />
        </span>
      </Card>
    </Link>
  );
}
