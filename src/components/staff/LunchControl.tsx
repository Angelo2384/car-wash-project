import { useState } from "react";
import { Coffee, Lock } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { formatHour } from "../../lib/business";
import { lunchClash } from "../../lib/staffJobs";
import {
  cancelCrewLunchProposal,
  isProposalLive,
  LUNCH_HOURS,
  proposeCrewLunch,
  respondToCrewLunch,
  setOwnLunch,
  type LunchProposal,
} from "../../lib/staffOps";
import type { StaffWorkday } from "../../hooks/useStaffWorkday";
import { Card } from "../admin/AdminUI";

/**
 * Pick a lunch hour (11, 12 or 13). Hours with a job in them are locked.
 * Solo staff change it straight away; a crew member proposes and the others accept.
 * mode "today" changes today only; "usual" changes the everyday time.
 */
export default function LunchControl({ day, mode }: { day: StaffWorkday; mode: "today" | "usual" }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => new Date());
  const { crew, own, uid, today, jobs } = day;
  const nowHour = now.getHours();

  const current = mode === "today" ? day.lunchToday : crew ? crew.lunchHour : own.usualLunch;
  const started = mode === "today" && nowHour >= current;
  const overridden = Object.keys((crew ? crew.lunchOverrides : own.lunchOverrides) ?? {});
  const slots = jobs.map((j) => j.slot);
  const proposal = crew && isProposalLive(crew.lunchProposal, today, nowHour) ? crew.lunchProposal : null;
  const myProposal = proposal && (mode === "today" ? proposal.date === today : !proposal.date) ? proposal : null;

  const lockReason = (hour: number): string | null => {
    if (mode === "today" && hour <= nowHour) return "That hour has started";
    const clash = lunchClash({ hour, date: mode === "today" ? today : undefined, today, jobs: slots, overriddenDates: overridden });
    if (clash) return `You have a job then (${clash.date === today ? "today" : clash.date} at ${formatHour(clash.startHour)})`;
    return null;
  };

  const pick = async (hour: number) => {
    setBusy(true);
    try {
      if (crew) {
        await proposeCrewLunch(crew, uid, hour, mode === "today" ? today : null);
        showToast("Proposed to your crew. It changes once everyone accepts.", "success");
      } else {
        await setOwnLunch(uid, hour, mode === "today" ? today : undefined);
        showToast(mode === "today" ? `Lunch today moved to ${formatHour(hour)}.` : `Usual lunch set to ${formatHour(hour)}.`, "success");
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't change lunch.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-bold text-[#F5F5F5] flex items-center gap-2">
            <Coffee className="w-4 h-4 text-[#E86A33]" />
            {mode === "today" ? "Lunch today" : crew ? "Crew lunch" : "Usual lunch"}
          </p>
          <p className="text-xs text-[#71717A] mt-0.5">
            {crew
              ? "Your crew shares one lunch. A change needs everyone to accept."
              : mode === "today"
                ? "One hour. Changing it here only affects today."
                : "The hour you normally take. The owner sees it when assigning jobs."}
          </p>
        </div>
        <span className="text-sm font-bold text-[#F5F5F5] whitespace-nowrap">
          {formatHour(current)}–{formatHour(current + 1)}
        </span>
      </div>

      {myProposal ? (
        <ProposalBox proposal={myProposal} day={day} busy={busy} setBusy={setBusy} />
      ) : started ? (
        <p className="text-xs text-[#A1A1AA]">Lunch time has started for today.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {LUNCH_HOURS.map((h) => {
            const reason = h === current ? null : lockReason(h);
            const active = h === current;
            return (
              <button
                key={h}
                onClick={() => pick(h)}
                disabled={busy || active || Boolean(reason)}
                title={reason ?? undefined}
                className={`h-10 rounded-lg border text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed ${
                  active
                    ? "border-[#E86A33] bg-[#E86A33]/10 text-[#E86A33]"
                    : reason
                      ? "border-[#2C2C2C] text-[#71717A] line-through"
                      : "border-[#2C2C2C] text-[#D4D4D4] hover:border-[#E86A33]/60"
                }`}
              >
                {reason && <Lock className="w-3 h-3 no-underline" />}
                {formatHour(h)}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ProposalBox({
  proposal,
  day,
  busy,
  setBusy,
}: {
  proposal: LunchProposal;
  day: StaffWorkday;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const { showToast } = useToast();
  const { crew, uid, nameOf } = day;
  if (!crew) return null;
  const accepted = proposal.acceptedUids ?? [proposal.byUid];
  const waitingOn = crew.memberUids.filter((m) => !accepted.includes(m));
  const mine = proposal.byUid === uid;
  const iAccepted = accepted.includes(uid);
  const when = proposal.date ? "today" : "from now on";

  /** fn resolves to the message to show */
  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      showToast(await fn(), "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't update the lunch change.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#E86A33]/30 bg-[#E86A33]/[0.06] px-4 py-3 flex flex-col gap-2.5">
      <p className="text-sm text-[#F5F5F5]">
        {mine ? "You" : nameOf(proposal.byUid).split(" ")[0]} proposed lunch at <strong>{formatHour(proposal.hour)}</strong> {when}.
      </p>
      <p className="text-xs text-[#A1A1AA]">
        {waitingOn.length ? `Waiting on ${waitingOn.map((m) => nameOf(m).split(" ")[0]).join(" and ")}.` : "Everyone agreed."} Until
        then the crew keeps its current lunch.
      </p>
      <div className="flex gap-2">
        {!iAccepted && (
          <>
            <button
              disabled={busy}
              onClick={() =>
                run(async () =>
                  (await respondToCrewLunch(crew, uid, true)) === "applied"
                    ? `Lunch changed to ${formatHour(proposal.hour)}.`
                    : "Accepted. Waiting on the rest of the crew."
                )
              }
              className="h-9 px-3.5 rounded-lg bg-[#E86A33] hover:bg-[#d65f2c] text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50"
            >
              Accept
            </button>
            <button
              disabled={busy}
              onClick={() => run(async () => (await respondToCrewLunch(crew, uid, false), "Declined. Lunch stays the same."))}
              className="h-9 px-3.5 rounded-lg border border-[#2C2C2C] text-[13px] font-semibold text-[#D4D4D4] hover:border-red-500 hover:text-red-400 cursor-pointer disabled:opacity-50"
            >
              Decline
            </button>
          </>
        )}
        {mine && (
          <button
            disabled={busy}
            onClick={() => run(async () => (await cancelCrewLunchProposal(crew), "Proposal withdrawn."))}
            className="h-9 px-3.5 rounded-lg border border-[#2C2C2C] text-[13px] font-semibold text-[#D4D4D4] hover:border-[#3C3C3C] cursor-pointer disabled:opacity-50"
          >
            Withdraw
          </button>
        )}
      </div>
    </div>
  );
}
