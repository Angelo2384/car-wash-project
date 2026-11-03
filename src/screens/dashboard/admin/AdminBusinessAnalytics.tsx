import { useEffect, useMemo, useState } from "react";
import { formatHour, formatRand, fromIsoDate, parseRand, toIsoDate } from "../../../lib/business";
import { appointmentSlot } from "../../../lib/appointmentSlots";
import { subscribeToWalkInsRange, type WalkInTicket } from "../../../lib/walkIns";
import { useAllAppointments, useServices } from "../../../hooks/useOperations";
import { Card, EmptyState, SectionHeading, Segmented, StatTile } from "../../../components/admin/AdminUI";

type Range = "7" | "30" | "90";

function daysBack(today: string, n: number) {
  const d = fromIsoDate(today);
  d.setDate(d.getDate() - n);
  return toIsoDate(d);
}

function shortDate(iso: string) {
  return fromIsoDate(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

export default function AdminBusinessAnalytics() {
  const [range, setRange] = useState<Range>("30");
  const [today] = useState(() => toIsoDate(new Date()));
  const days = Number(range);
  const from = daysBack(today, days - 1);
  const { items: services } = useServices();
  const { appointments } = useAllAppointments();
  const [walkIns, setWalkIns] = useState<WalkInTicket[]>([]);
  useEffect(() => subscribeToWalkInsRange(from, today, setWalkIns), [from, today]);

  const data = useMemo(() => {
    const inRange = appointments
      .map((a) => ({ a, slot: appointmentSlot(a, services) }))
      .filter(({ slot }) => slot && slot.date >= from && slot.date <= today);
    const kept = inRange.filter(({ a }) => a.status !== "Cancelled");
    const cancelled = inRange.length - kept.length;
    const doneWalkIns = walkIns.filter((t) => t.status === "done");

    const dates = Array.from({ length: days }, (_, i) => daysBack(today, days - 1 - i));
    const perDay = dates.map((date) => {
      const online = kept.filter(({ slot }) => slot!.date === date).reduce((s, { a }) => s + parseRand(a.price), 0);
      const walkIn = doneWalkIns.filter((t) => t.date === date).reduce((s, t) => s + t.total, 0);
      return { date, online, walkIn, total: online + walkIn };
    });

    const byPackage: Record<string, number> = {};
    kept.forEach(({ a }) => (byPackage[a.packageName] = (byPackage[a.packageName] || 0) + 1));
    doneWalkIns.forEach((t) => t.serviceNames.forEach((n) => (byPackage[n] = (byPackage[n] || 0) + 1)));
    const packages = Object.entries(byPackage)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const hourCounts: Record<number, number> = {};
    kept.forEach(({ slot }) => (hourCounts[slot!.startHour] = (hourCounts[slot!.startHour] || 0) + 1));
    const hourKeys = Object.keys(hourCounts).map(Number);
    const minH = Math.min(8, ...hourKeys);
    const maxH = Math.max(16, ...hourKeys);
    const hours = Array.from({ length: maxH - minH + 1 }, (_, i) => ({ hour: minH + i, count: hourCounts[minH + i] || 0 }));

    const bay = kept.filter(({ slot }) => slot!.type === "bay").length + doneWalkIns.length;
    const mobile = kept.filter(({ slot }) => slot!.type === "mobile").length;

    const onlineTotal = perDay.reduce((s, d) => s + d.online, 0);
    const walkInTotal = perDay.reduce((s, d) => s + d.walkIn, 0);
    return {
      perDay,
      packages,
      hours,
      bay,
      mobile,
      onlineTotal,
      walkInTotal,
      bookings: kept.length,
      walkInCount: doneWalkIns.length,
      cancelRate: inRange.length ? Math.round((cancelled / inRange.length) * 100) : 0,
      cancelled,
      avg: kept.length ? onlineTotal / kept.length : 0,
    };
  }, [appointments, services, walkIns, from, today, days]);

  const empty = data.bookings === 0 && data.walkInCount === 0;

  return (
    <div className="viz-root flex flex-col gap-6 pb-10 text-[#F5F5F5]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-[#A1A1AA]">
          {shortDate(from)} – {shortDate(today)}
        </p>
        <Segmented<Range>
          value={range}
          onChange={setRange}
          options={[
            { id: "7", label: "7 days" },
            { id: "30", label: "30 days" },
            { id: "90", label: "90 days" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Taken" value={formatRand(data.onlineTotal + data.walkInTotal)} hint={`${formatRand(data.walkInTotal)} from walk-ins`} />
        <StatTile label="Online bookings" value={data.bookings} hint={`${formatRand(data.avg)} on average`} />
        <StatTile label="Walk-ins washed" value={data.walkInCount} />
        <StatTile
          label="Cancellation rate"
          value={`${data.cancelRate}%`}
          tone={data.cancelRate >= 20 ? "red" : "neutral"}
          hint={`${data.cancelled} cancelled`}
        />
      </div>

      {empty ? (
        <Card><EmptyState title="Nothing to show for this period yet" body="Bookings and walk-ins will appear here as they happen." /></Card>
      ) : (
        <>
          <Card className="p-6 flex flex-col gap-4">
            <SectionHeading title="Takings per day" subtitle="Online bookings plus walk-ins, by booking date" />
            <ColumnChart
              items={data.perDay.map((d) => ({
                key: d.date,
                value: d.total,
                label: shortDate(d.date),
                tooltip: (
                  <>
                    <p className="font-semibold text-[#F5F5F5]">{shortDate(d.date)}: {formatRand(d.total)}</p>
                    <p className="text-[#A1A1AA]">Online {formatRand(d.online)} · Walk-ins {formatRand(d.walkIn)}</p>
                  </>
                ),
              }))}
              format={formatRand}
              labelEvery={days <= 7 ? 1 : days <= 30 ? 5 : 15}
            />
            <details className="text-sm">
              <summary className="cursor-pointer text-[#A1A1AA] hover:text-[#F5F5F5]">Show as table</summary>
              <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-[#2C2C2C]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[#71717A]">
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium text-right">Online</th>
                      <th className="px-4 py-2 font-medium text-right">Walk-ins</th>
                      <th className="px-4 py-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.perDay].reverse().map((d) => (
                      <tr key={d.date} className="border-t border-[#2C2C2C]">
                        <td className="px-4 py-2 text-[#D4D4D4]">{shortDate(d.date)}</td>
                        <td className="px-4 py-2 text-right">{formatRand(d.online)}</td>
                        <td className="px-4 py-2 text-right">{formatRand(d.walkIn)}</td>
                        <td className="px-4 py-2 text-right font-semibold">{formatRand(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Card className="p-6 flex flex-col gap-4">
              <SectionHeading title="Most booked" subtitle="Packages and services, online and walk-in" />
              <BarList items={data.packages.map((p) => ({ key: p.name, label: p.name, value: p.count }))} />
            </Card>
            <Card className="p-6 flex flex-col gap-4">
              <SectionHeading title="Busiest start times" subtitle="Online bookings by the hour they start" />
              <ColumnChart
                items={data.hours.map((h) => ({
                  key: String(h.hour),
                  value: h.count,
                  label: formatHour(h.hour),
                  tooltip: <p className="font-semibold text-[#F5F5F5]">{formatHour(h.hour)}: {h.count} booking{h.count === 1 ? "" : "s"}</p>,
                }))}
                format={(n) => String(Math.round(n))}
                labelEvery={1}
                height={160}
              />
            </Card>
          </div>

          <Card className="p-6 flex flex-col gap-4">
            <SectionHeading title="Bay vs mobile" subtitle="Drive-ins and walk-ins at the bay against call-outs" />
            <SplitBar
              parts={[
                { key: "mobile", label: "Mobile call-outs", value: data.mobile, color: "var(--series-1)" },
                { key: "bay", label: "Bay (drive-ins + walk-ins)", value: data.bay, color: "var(--series-2)" },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Chart pieces ────────────────────────────────────────────────────────────

type ColumnItem = { key: string; value: number; label: string; tooltip: React.ReactNode };

/** Rounds an axis maximum up to an even step (2, 4, 6, 8, 10 × 10ⁿ) so the halfway gridline is a whole number. */
function niceCeil(value: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const step = [1, 2, 4, 6, 8, 10].find((m) => m * exp >= value) ?? 10;
  return step * exp;
}

/** Single-series columns: thin, rounded at the data end, 2px gaps, tooltip per column. */
function ColumnChart({
  items,
  format,
  labelEvery,
  height = 200,
}: {
  items: ColumnItem[];
  format: (n: number) => string;
  labelEvery: number;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceCeil(Math.max(1, ...items.map((i) => i.value)));
  const ticks = [max, max / 2, 0];

  return (
    <div className="flex gap-3">
      <div className="flex flex-col justify-between text-[11px] text-[#71717A] text-right shrink-0 pb-6" style={{ height: height + 24 }}>
        {ticks.map((t) => (
          <span key={t}>{format(t)}</span>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className="relative" style={{ height }}>
          {[0, 0.5, 1].map((f) => (
            <div key={f} className="absolute inset-x-0 border-t" style={{ top: `${f * 100}%`, borderColor: "var(--viz-grid)" }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {items.map((item, i) => (
              <div
                key={item.key}
                className="relative flex-1 h-full flex items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${item.label}: ${format(item.value)}`}
              >
                <div
                  className="w-full max-w-[24px] rounded-t-[4px] transition-opacity"
                  style={{
                    height: `${(item.value / max) * 100}%`,
                    minHeight: item.value > 0 ? 2 : 0,
                    background: "var(--series-1)",
                    opacity: hover === null || hover === i ? 1 : 0.45,
                  }}
                />
                {hover === i && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-lg border border-[#2C2C2C] bg-[#1F1F1F] px-3 py-2 text-xs shadow-xl pointer-events-none">
                    {item.tooltip}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-[2px] mt-2 h-4">
          {items.map((item, i) => (
            <span key={item.key} className="flex-1 text-center text-[11px] text-[#71717A] whitespace-nowrap overflow-visible">
              {i % labelEvery === 0 ? item.label : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Horizontal bars with the value at the bar end. */
function BarList({ items }: { items: { key: string; label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="text-sm text-[#71717A]">No bookings yet.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.key} className="grid grid-cols-[minmax(0,160px)_1fr] items-center gap-3">
          <span className="text-sm text-[#D4D4D4] truncate" title={item.label}>{item.label}</span>
          <span className="flex items-center gap-2 min-w-0">
            <span
              className="h-5 rounded-r-[4px]"
              style={{ width: `${(item.value / max) * 85}%`, minWidth: 4, background: "var(--series-1)" }}
            />
            <span className="text-sm font-semibold text-[#F5F5F5]">{item.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** One whole split into parts, with a legend that names each part. */
function SplitBar({ parts }: { parts: { key: string; label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (total === 0) return <p className="text-sm text-[#71717A]">No bookings yet.</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-6 gap-[2px] rounded-[4px] overflow-hidden" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <div key={p.key} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} />
          ))}
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {parts.map((p) => (
          <li key={p.key} className="inline-flex items-center gap-2 text-[#D4D4D4]">
            <span className="w-3 h-3 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
            {p.label}
            <span className="font-semibold text-[#F5F5F5]">
              {p.value} ({Math.round((p.value / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
