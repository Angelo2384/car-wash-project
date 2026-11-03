import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatRand, fromIsoDate, toIsoDate } from "../../lib/business";
import { subscribeToWalkInsRange, WALK_IN_STATUS_LABELS, type WalkInTicket } from "../../lib/walkIns";
import { Badge, Card, EmptyState, Segmented } from "../admin/AdminUI";
import { inputClass } from "../admin/adminStyles";

type Period = "today" | "7" | "30" | "90" | "custom";

const STATUS_TONE = { waiting: "amber", in_progress: "blue", done: "green", left: "red" } as const;

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toIsoDate(d);
}

function timeOf(ts?: number) {
  return ts ? new Date(ts).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : "";
}

/** Every walk-in ticket in a period, with totals: tickets, takings, cash vs card. */
export default function WalkInHistory() {
  const [today] = useState(() => toIsoDate(new Date()));
  const [period, setPeriod] = useState<Period>("7");
  const [custom, setCustom] = useState({ from: daysAgo(30), to: today });
  const [search, setSearch] = useState("");
  const [state, setState] = useState<{ key: string; tickets: WalkInTicket[] }>({ key: "", tickets: [] });

  const range = useMemo(() => {
    if (period === "custom") return custom.from <= custom.to ? custom : { from: custom.to, to: custom.from };
    if (period === "today") return { from: today, to: today };
    return { from: daysAgo(Number(period) - 1), to: today };
  }, [period, custom, today]);
  const key = `${range.from}_${range.to}`;

  useEffect(
    () => subscribeToWalkInsRange(range.from, range.to, (tickets) => setState({ key: `${range.from}_${range.to}`, tickets })),
    [range.from, range.to]
  );
  const loading = state.key !== key;
  const tickets = useMemo(
    () => (loading ? [] : [...state.tickets].sort((a, b) => b.createdAt - a.createdAt)),
    [loading, state.tickets]
  );

  const q = search.trim().toLowerCase();
  const visible = q
    ? tickets.filter((t) =>
        [t.ticketNumber, t.vehicle, t.plate, t.customerName, t.phone, ...t.serviceNames]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    : tickets;

  const done = tickets.filter((t) => t.status === "done");
  const left = tickets.filter((t) => t.status === "left").length;
  const takings = done.reduce((sum, t) => sum + t.total, 0);
  const cash = done.filter((t) => t.paymentMethod === "cash").reduce((sum, t) => sum + t.total, 0);
  const days = Math.round((fromIsoDate(range.to).getTime() - fromIsoDate(range.from).getTime()) / 86400000) + 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { id: "today", label: "Today" },
            { id: "7", label: "7 days" },
            { id: "30", label: "30 days" },
            { id: "90", label: "90 days" },
            { id: "custom", label: "Custom" },
          ]}
        />
        {period === "custom" && (
          <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
            <input
              type="date"
              max={today}
              value={custom.from}
              onChange={(e) => e.target.value && setCustom({ ...custom, from: e.target.value })}
              className={`${inputClass} w-auto py-1.5`}
              aria-label="From"
            />
            to
            <input
              type="date"
              max={today}
              value={custom.to}
              onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value })}
              className={`${inputClass} w-auto py-1.5`}
              aria-label="To"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Tickets" value={tickets.length} hint={days > 1 ? `${(tickets.length / days).toFixed(1)} a day on average` : undefined} />
        <Stat label="Washed" value={done.length} hint={left ? `${left} left without a wash` : "No one left without a wash"} />
        <Stat label="Taken" value={formatRand(takings)} hint={done.length ? `${formatRand(takings / done.length)} per car` : undefined} />
        <Stat label="Cash · card" value={`${formatRand(cash)} · ${formatRand(takings - cash)}`} hint="From washed cars only" />
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plate, vehicle, name or ticket" className={`${inputClass} pl-9`} />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[880px]">
          <thead>
            <tr className="text-left text-[#71717A] text-xs">
              <th className="px-5 py-3 font-medium">Ticket</th>
              <th className="px-3 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Vehicle</th>
              <th className="px-3 py-3 font-medium">Customer</th>
              <th className="px-3 py-3 font-medium">Services</th>
              <th className="px-3 py-3 font-medium">Paid</th>
              <th className="px-3 py-3 font-medium text-right">Total</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    title={loading ? "Loading walk-ins…" : q ? `No walk-ins match “${search}”` : "No walk-ins in this period"}
                    body={loading || q ? undefined : "Tickets created at the bay show up here."}
                  />
                </td>
              </tr>
            )}
            {visible.map((t) => (
              <tr key={t.id} className="border-t border-[#2C2C2C] align-top">
                <td className="px-5 py-3 font-mono font-semibold text-[#F5F5F5]">{t.ticketNumber}</td>
                <td className="px-3 py-3 text-[#D4D4D4] whitespace-nowrap">
                  {fromIsoDate(t.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                  <span className="block text-xs text-[#71717A]">{timeOf(t.createdAt)}</span>
                </td>
                <td className="px-3 py-3 text-[#F5F5F5]">
                  {t.vehicle}
                  {t.plate && <span className="block text-xs text-[#71717A]">{t.plate}</span>}
                </td>
                <td className="px-3 py-3 text-[#D4D4D4]">
                  {t.customerName || <span className="text-[#71717A]">Not given</span>}
                  {t.phone && <span className="block text-xs text-[#71717A]">{t.phone}</span>}
                </td>
                <td className="px-3 py-3 text-[#D4D4D4] max-w-[220px]">{t.serviceNames.join(", ")}</td>
                <td className="px-3 py-3 text-[#D4D4D4] capitalize">{t.paymentMethod}</td>
                <td className="px-3 py-3 text-right font-semibold text-[#F5F5F5]">{formatRand(t.total)}</td>
                <td className="px-5 py-3">
                  <Badge tone={STATUS_TONE[t.status]}>{WALK_IN_STATUS_LABELS[t.status]}</Badge>
                  {t.handledByName && <span className="block text-xs text-[#71717A] mt-1">{t.handledByName}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card className="p-4 flex flex-col gap-1">
      <span className="text-sm text-[#A1A1AA]">{label}</span>
      <span className="text-2xl font-black font-display text-[#F5F5F5]">{value}</span>
      {hint && <span className="text-xs text-[#71717A]">{hint}</span>}
    </Card>
  );
}
