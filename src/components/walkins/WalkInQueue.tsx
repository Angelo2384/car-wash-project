import { useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, CreditCard, Play, Plus, UserX } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { activeAddons, activePackages, formatRand, toIsoDate } from "../../lib/business";
import {
  createWalkIn,
  subscribeToWalkIns,
  updateWalkInStatus,
  type WalkInPayment,
  type WalkInTicket,
} from "../../lib/walkIns";
import { useServices } from "../../hooks/useOperations";
import { Badge, Card, EmptyState, Field, Modal, SectionHeading } from "../admin/AdminUI";
import { inputClass, primaryButton, secondaryButton, smallButton } from "../admin/adminStyles";

function minutesSince(ts?: number) {
  if (!ts) return 0;
  return Math.max(0, Math.round((Date.now() - ts) / 60000));
}

/** Today's walk-in queue: add tickets, start the next car, mark done or left. */
export default function WalkInQueue({ bayWorkers = [] }: { bayWorkers?: string[] }) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [today] = useState(() => toIsoDate(new Date()));
  const [tickets, setTickets] = useState<WalkInTicket[]>([]);
  const [adding, setAdding] = useState(false);
  useEffect(() => subscribeToWalkIns(today, setTickets), [today]);

  const waiting = tickets.filter((t) => t.status === "waiting");
  const inProgress = tickets.filter((t) => t.status === "in_progress");
  const finished = tickets.filter((t) => t.status === "done" || t.status === "left").reverse();
  const done = tickets.filter((t) => t.status === "done");
  const takings = done.reduce((sum, t) => sum + t.total, 0);
  const cash = done.filter((t) => t.paymentMethod === "cash").reduce((sum, t) => sum + t.total, 0);

  const move = (t: WalkInTicket, status: WalkInTicket["status"]) =>
    updateWalkInStatus(t, status, bayWorkers[0] || currentUser?.displayName || undefined).catch((e) =>
      showToast(e instanceof Error ? e.message : "Couldn't update the ticket.", "error")
    );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Waiting" value={waiting.length} />
        <Stat label="In progress" value={inProgress.length} />
        <Stat label="Done today" value={done.length} />
        <Stat label="Taken today" value={formatRand(takings)} hint={`${formatRand(cash)} cash · ${formatRand(takings - cash)} card`} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SectionHeading title="Queue" subtitle="Walk-ins don't block online bookings; staff fit them around booked drive-ins" />
        <div className="flex gap-2">
          <button className={secondaryButton} disabled={waiting.length === 0} onClick={() => waiting[0] && move(waiting[0], "in_progress")}>
            <Play className="w-4 h-4" />
            Start next
          </button>
          <button className={primaryButton} onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4" />
            New ticket
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <Column title="Waiting" count={waiting.length}>
          {waiting.length === 0 ? (
            <EmptyState title="No one waiting" />
          ) : (
            waiting.map((t, i) => (
              <TicketCard key={t.id} ticket={t} meta={i === 0 ? "Next up" : `Position ${i + 1}`} waitedMins={minutesSince(t.createdAt)}>
                <button className={smallButton} onClick={() => move(t, "in_progress")}>
                  <Play className="w-3.5 h-3.5" />
                  Start
                </button>
                <button className={`${smallButton} hover:!border-red-500 hover:text-red-400`} onClick={() => move(t, "left")}>
                  <UserX className="w-3.5 h-3.5" />
                  Left
                </button>
              </TicketCard>
            ))
          )}
        </Column>
        <Column title="In progress" count={inProgress.length}>
          {inProgress.length === 0 ? (
            <EmptyState title="Nothing being washed" />
          ) : (
            inProgress.map((t) => (
              <TicketCard key={t.id} ticket={t} meta={t.handledByName ? `With ${t.handledByName}` : "In progress"} waitedMins={minutesSince(t.startedAt)} waitedLabel="started">
                <button className={`${primaryButton} py-1.5 px-3 text-[13px]`} onClick={() => move(t, "done")}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Done
                </button>
              </TicketCard>
            ))
          )}
        </Column>
        <Column title="Finished today" count={finished.length}>
          {finished.length === 0 ? (
            <EmptyState title="None finished yet" />
          ) : (
            finished.map((t) => (
              <TicketCard key={t.id} ticket={t} meta={t.status === "left" ? "Left without a wash" : "Done"} muted />
            ))
          )}
        </Column>
      </div>

      {adding && <NewTicketModal today={tickets} onClose={() => setAdding(false)} />}
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

function Column({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <Card className="p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-[#F5F5F5]">
        {title} <span className="text-[#71717A] font-medium">{count}</span>
      </h3>
      {children}
    </Card>
  );
}

function TicketCard({
  ticket,
  meta,
  waitedMins,
  waitedLabel = "waiting",
  muted = false,
  children,
}: {
  ticket: WalkInTicket;
  meta: string;
  waitedMins?: number;
  waitedLabel?: string;
  muted?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl bg-[#101010] border border-[#2C2C2C] p-3.5 flex flex-col gap-2.5 ${muted ? "opacity-70" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-bold text-[#F5F5F5]">{ticket.ticketNumber}</span>
        <span className="flex items-center gap-1.5">
          <Badge tone={ticket.paymentMethod === "cash" ? "green" : "blue"}>
            {ticket.paymentMethod === "cash" ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
            {ticket.paymentMethod === "cash" ? "Cash" : "Card"}
          </Badge>
          <span className="text-sm font-semibold text-[#F5F5F5]">{formatRand(ticket.total)}</span>
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-[#F5F5F5]">{ticket.vehicle}</p>
        <p className="text-xs text-[#A1A1AA]">{ticket.serviceNames.join(", ")}</p>
      </div>
      <p className="text-xs text-[#71717A]">
        {meta}
        {typeof waitedMins === "number" && ` · ${waitedMins} min ${waitedLabel}`}
        {ticket.customerName && ` · ${ticket.customerName}`}
      </p>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}

function NewTicketModal({ today, onClose }: { today: WalkInTicket[]; onClose: () => void }) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { items } = useServices();
  const packages = activePackages(items);
  const addons = activeAddons(items);
  const [form, setForm] = useState({ vehicle: "", plate: "", customerName: "", phone: "" });
  const [picked, setPicked] = useState<string[]>([]);
  const [payment, setPayment] = useState<WalkInPayment>("cash");
  const [saving, setSaving] = useState(false);

  const chosen = useMemo(() => items.filter((s) => picked.includes(s.id)), [items, picked]);
  const total = chosen.reduce((sum, s) => sum + s.price, 0);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const save = async () => {
    setSaving(true);
    try {
      await createWalkIn(
        {
          date: toIsoDate(new Date()),
          vehicle: [form.vehicle.trim(), form.plate.trim() && `(${form.plate.trim().toUpperCase()})`].filter(Boolean).join(" "),
          plate: form.plate.trim().toUpperCase(),
          customerName: form.customerName.trim(),
          phone: form.phone.trim(),
          serviceIds: chosen.map((s) => s.id),
          serviceNames: chosen.map((s) => s.name),
          total,
          paymentMethod: payment,
          createdBy: currentUser?.uid || "",
          createdByName: currentUser?.displayName || "Staff",
        },
        today
      );
      showToast("Ticket added to the queue.", "success");
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't add the ticket.", "error");
    } finally {
      setSaving(false);
    }
  };

  const Option = ({ id, name, price }: { id: string; name: string; price: number }) => (
    <label
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
        picked.includes(id) ? "border-[#E86A33] bg-[#E86A33]/[0.06]" : "border-[#2C2C2C] hover:border-[#3C3C3C]"
      }`}
    >
      <input type="checkbox" checked={picked.includes(id)} onChange={() => toggle(id)} className="w-4 h-4 accent-[#E86A33]" />
      <span className="flex-1 text-sm text-[#F5F5F5]">{name}</span>
      <span className="text-sm text-[#A1A1AA]">{formatRand(price)}</span>
    </label>
  );

  return (
    <Modal
      wide
      title="New walk-in ticket"
      description="For customers who arrive at the bay without a booking. Walk-ins don't earn reward points."
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto self-center text-sm text-[#A1A1AA]">
            Total <strong className="text-[#F5F5F5] text-base">{formatRand(total)}</strong>
          </span>
          <button onClick={onClose} className={secondaryButton}>Cancel</button>
          <button onClick={save} disabled={saving || !form.vehicle.trim() || picked.length === 0} className={primaryButton}>
            Add to queue
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Vehicle">
            <input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} className={inputClass} placeholder="Toyota Hilux, white" />
          </Field>
          <Field label="Number plate (optional)">
            <input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} className={inputClass} placeholder="CA 123-456" />
          </Field>
          <Field label="Customer name (optional)">
            <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Phone (optional)">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[#D4D4D4]">Packages</span>
          {packages.map((s) => <Option key={s.id} id={s.id} name={s.name} price={s.price} />)}
        </div>
        {addons.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#D4D4D4]">Extras</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {addons.map((s) => <Option key={s.id} id={s.id} name={s.name} price={s.price} />)}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[#D4D4D4]">Payment</span>
          <div className="flex gap-2">
            {(["cash", "card"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPayment(m)}
                aria-pressed={payment === m}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold cursor-pointer transition-colors ${
                  payment === m ? "border-[#E86A33] bg-[#E86A33]/10 text-[#E86A33]" : "border-[#2C2C2C] text-[#A1A1AA] hover:border-[#3C3C3C]"
                }`}
              >
                {m === "cash" ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                {m === "cash" ? "Cash" : "Card"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
