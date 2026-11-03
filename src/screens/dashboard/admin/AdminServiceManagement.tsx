import { useEffect, useMemo, useState } from "react";
import { Archive, ArchiveRestore, CalendarX, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useToast } from "../../../contexts/ToastContext";
import {
  DAY_NAMES,
  deleteService,
  formatDuration,
  formatHour,
  formatRand,
  saveBusinessSettings,
  saveService,
  seedDefaultServices,
  SERVICE_CATEGORIES,
  bookingCountsByService,
  mostBookedIds,
  toIsoDate,
  type BusinessSettings,
  type ServiceCategory,
  type ServiceItem,
  type ServiceKind,
} from "../../../lib/business";
import { subscribeToAllAppointments, type StoredAppointment } from "../../../lib/appointments";
import { useBusinessSettings, useServices } from "../../../hooks/useOperations";
import { Badge, Card, EmptyState, Field, Modal, SectionHeading, Tabs } from "../../../components/admin/AdminUI";
import { inputClass, primaryButton, secondaryButton, smallButton } from "../../../components/admin/adminStyles";

type Tab = "packages" | "services" | "hours" | "fees";

/**
 * Services & Business: the catalogue customers book from (packages and individual
 * services), plus opening days and fees. Everything here is saved to Firestore.
 */
export default function AdminServiceManagement() {
  const [tab, setTab] = useState<Tab>("packages");
  const { items, usingDefaults } = useServices();
  const settings = useBusinessSettings();
  const [appointments, setAppointments] = useState<StoredAppointment[]>([]);
  useEffect(() => subscribeToAllAppointments(setAppointments), []);

  const bookedCount = useMemo(() => bookingCountsByService(appointments), [appointments]);
  const mostBooked = useMemo(() => mostBookedIds(items, bookedCount), [items, bookedCount]);

  const packages = items.filter((s) => s.kind === "package");
  const addons = items.filter((s) => s.kind === "addon");

  return (
    <div className="flex flex-col gap-6 pb-10 text-[#F5F5F5]">
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "packages", label: "Packages", count: packages.length },
          { id: "services", label: "Individual services", count: addons.length },
          { id: "hours", label: "Opening days" },
          { id: "fees", label: "Fees" },
        ]}
      />
      {(tab === "packages" || tab === "services") && usingDefaults && <DefaultsBanner />}
      {tab === "packages" && (
        <CatalogueTab kind="package" items={packages} bookedCount={bookedCount} mostBooked={mostBooked} usingDefaults={usingDefaults} />
      )}
      {tab === "services" && (
        <CatalogueTab kind="addon" items={addons} bookedCount={bookedCount} mostBooked={mostBooked} usingDefaults={usingDefaults} />
      )}
      {tab === "hours" && <HoursTab settings={settings} />}
      {tab === "fees" && <FeesTab settings={settings} />}
    </div>
  );
}

function DefaultsBanner() {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Card className="p-5 flex items-center justify-between gap-4 flex-wrap border-[#E86A33]/30">
      <div>
        <p className="text-[15px] font-semibold text-[#F5F5F5]">Customers are seeing the built-in catalogue</p>
        <p className="text-sm text-[#A1A1AA] mt-0.5">It's saved to your database the first time you add, edit or archive something. You can also save it now.</p>
      </div>
      <button
        className={primaryButton}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await seedDefaultServices();
            showToast("Catalogue saved. You can edit it now.", "success");
          } catch (e) {
            showToast(e instanceof Error ? e.message : "Couldn't save the catalogue.", "error");
          } finally {
            setBusy(false);
          }
        }}
      >
        Start editing the catalogue
      </button>
    </Card>
  );
}

// ─── Packages / individual services ──────────────────────────────────────────

function CatalogueTab({
  kind,
  items,
  bookedCount,
  mostBooked,
  usingDefaults,
}: {
  kind: ServiceKind;
  items: ServiceItem[];
  bookedCount: Record<string, number>;
  mostBooked: Set<string>;
  usingDefaults: boolean;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState<ServiceItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<ServiceItem | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const noun = kind === "package" ? "package" : "service";

  const visible = items
    .filter((s) => showArchived || s.status === "active")
    .filter((s) => !search.trim() || `${s.name} ${s.category}`.toLowerCase().includes(search.trim().toLowerCase()));
  const archivedCount = items.filter((s) => s.status === "archived").length;

  const setStatus = (s: ServiceItem, status: ServiceItem["status"]) =>
    (usingDefaults ? seedDefaultServices() : Promise.resolve())
      .then(() => saveService({ ...s, status }))
      .then(() => showToast(status === "archived" ? `${s.name} archived. Customers can't book it.` : `${s.name} is bookable again.`, "success"))
      .catch((e) => showToast(e.message, "error"));

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        title={kind === "package" ? "Packages" : "Individual services"}
        subtitle={
          kind === "package"
            ? "The wash packages customers choose from. Price changes apply to new bookings only."
            : "Services customers combine into a custom package, and staff add to walk-in tickets"
        }
        action={
          <button className={primaryButton} onClick={() => setEditing("new")}>
            <Plus className="w-4 h-4" />
            Add {noun}
          </button>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${noun}s`} className={`${inputClass} pl-9`} />
        </div>
        {archivedCount > 0 && (
          <label className="inline-flex items-center gap-2 text-sm text-[#A1A1AA] cursor-pointer">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="w-4 h-4 accent-[#E86A33]" />
            Show archived ({archivedCount})
          </label>
        )}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-[#71717A] text-xs">
              <th className="px-5 py-3 font-medium">{kind === "package" ? "Package" : "Service"}</th>
              {kind === "addon" && <th className="px-3 py-3 font-medium">Category</th>}
              <th className="px-3 py-3 font-medium">Price</th>
              <th className="px-3 py-3 font-medium">Duration</th>
              <th className="px-3 py-3 font-medium">Booked</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState title={search ? `No ${noun}s match “${search}”` : `No ${noun}s yet`} />
                </td>
              </tr>
            )}
            {visible.map((s) => {
              const booked = bookedCount[s.name.toLowerCase()] || 0;
              return (
                <tr key={s.id} className={`border-t border-[#2C2C2C] ${s.status === "archived" ? "opacity-60" : ""}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#F5F5F5]">{s.name}</span>
                      {mostBooked.has(s.id) && <Badge tone="orange">Most booked</Badge>}
                    </div>
                    {(s.tagline || s.description) && (
                      <p className="text-xs text-[#71717A] mt-0.5 max-w-md truncate">{s.tagline || s.description}</p>
                    )}
                  </td>
                  {kind === "addon" && <td className="px-3 py-3.5 text-[#D4D4D4]">{s.category}</td>}
                  <td className="px-3 py-3.5 font-semibold text-[#F5F5F5]">{formatRand(s.price)}</td>
                  <td className="px-3 py-3.5 text-[#D4D4D4]">{formatDuration(s.durationMinutes)}</td>
                  <td className="px-3 py-3.5 text-[#D4D4D4]">{booked}</td>
                  <td className="px-3 py-3.5">
                    {s.status === "active" ? <Badge tone="green">Bookable</Badge> : <Badge>Archived</Badge>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button className={smallButton} onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      {s.status === "active" ? (
                        <button className={smallButton} onClick={() => setStatus(s, "archived")} title="Hide from customers, keep history">
                          <Archive className="w-3.5 h-3.5" />
                          Archive
                        </button>
                      ) : (
                        <button className={smallButton} onClick={() => setStatus(s, "active")}>
                          <ArchiveRestore className="w-3.5 h-3.5" />
                          Restore
                        </button>
                      )}
                      <button
                        className={`${smallButton} hover:!border-red-500 hover:text-red-400`}
                        disabled={booked > 0}
                        title={booked > 0 ? "Booked before. Archive it instead so receipts keep their details." : "Delete permanently"}
                        onClick={() => setDeleting(s)}
                        aria-label={`Delete ${s.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {editing && (
        <ServiceModal
          kind={kind}
          item={editing === "new" ? null : editing}
          nextOrder={Math.max(0, ...items.map((i) => i.sortOrder)) + 1}
          usingDefaults={usingDefaults}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <Modal
          title={`Delete ${deleting.name}?`}
          description="It has never been booked, so nothing else depends on it. This can't be undone."
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button onClick={() => setDeleting(null)} className={secondaryButton}>Keep it</button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 text-sm font-semibold cursor-pointer"
                onClick={async () => {
                  try {
                    if (usingDefaults) await seedDefaultServices();
                    await deleteService(deleting.id);
                    showToast(`${deleting.name} deleted.`, "success");
                  } catch (e) {
                    showToast(e instanceof Error ? e.message : "Couldn't delete it.", "error");
                  }
                  setDeleting(null);
                }}
              >
                Delete
              </button>
            </>
          }
        >
          <p className="text-sm text-[#D4D4D4]">{deleting.name} · {formatRand(deleting.price)}</p>
        </Modal>
      )}
    </div>
  );
}

function ServiceModal({
  kind,
  item,
  nextOrder,
  usingDefaults,
  onClose,
}: {
  kind: ServiceKind;
  item: ServiceItem | null;
  nextOrder: number;
  usingDefaults: boolean;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: item?.name ?? "",
    tagline: item?.tagline ?? "",
    description: item?.description ?? "",
    category: (item?.category ?? (kind === "package" ? "Full Detail" : "Exterior")) as ServiceCategory,
    price: item ? String(item.price) : "",
    durationMinutes: item ? String(item.durationMinutes) : "60",
    includes: (item?.includes ?? []).join("\n"),
  });
  const [saving, setSaving] = useState(false);
  const price = Number(form.price);
  const duration = Number(form.durationMinutes);
  const problem = !form.name.trim()
    ? "Add a name."
    : form.price === "" || !Number.isFinite(price) || price < 0
      ? "Add a price of R0 or more."
      : !Number.isFinite(duration) || duration < 5
        ? "Duration must be at least 5 minutes."
        : duration > 600
          ? "Duration can be at most 10 hours (600 minutes)."
          : null;

  const save = async () => {
    setSaving(true);
    try {
      // The first change saves the built-in catalogue to the database
      if (usingDefaults) await seedDefaultServices();
      const id =
        item?.id ??
        (form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `svc-${Date.now()}`) +
          `-${Date.now().toString(36).slice(-4)}`;
      await saveService({
        id,
        kind,
        name: form.name.trim(),
        tagline: form.tagline.trim(),
        description: form.description.trim(),
        category: form.category,
        price,
        durationMinutes: duration,
        includes: form.includes.split("\n").map((l) => l.trim()).filter(Boolean),
        popular: item?.popular ?? false,
        status: item?.status ?? "active",
        sortOrder: item?.sortOrder ?? nextOrder,
        createdAt: item?.createdAt || Date.now(),
      });
      showToast(item ? `${form.name.trim()} updated.` : `${form.name.trim()} added.`, "success");
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't save.", "error");
    } finally {
      setSaving(false);
    }
  };

  const hours = Math.max(1, Math.ceil(duration / 60));
  return (
    <Modal
      wide
      title={item ? `Edit ${item.name}` : `Add a ${kind === "package" ? "package" : "service"}`}
      onClose={onClose}
      footer={
        <>
          {problem && <p className="mr-auto self-center text-xs text-[#A1A1AA]">{problem}</p>}
          <button onClick={onClose} className={secondaryButton}>Cancel</button>
          <button onClick={save} disabled={!!problem || saving} className={primaryButton}>
            {item ? "Save changes" : "Add"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Name">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        </Field>
        {kind === "package" ? (
          <Field label="Tagline">
            <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className={inputClass} placeholder="Spotless inside and out" />
          </Field>
        ) : (
          <Field label="Category">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ServiceCategory })} className={inputClass}>
              {SERVICE_CATEGORIES.filter((c) => c !== "Full Detail").map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Price (R)">
          <input type="number" min={0} step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Duration (minutes)" hint={`Blocks ${hours} hour${hours > 1 ? "s" : ""} in the schedule${kind === "package" ? ", plus 1 travel hour for call-outs" : ""}`}>
          <input type="number" min={5} max={600} step="5" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} className={inputClass} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputClass} />
          </Field>
        </div>
        {kind === "package" && (
          <div className="md:col-span-2">
            <Field label="What's included" hint="One item per line; shown on the package card">
              <textarea value={form.includes} onChange={(e) => setForm({ ...form, includes: e.target.value })} rows={5} className={inputClass} />
            </Field>
          </div>
        )}
        <p className="md:col-span-2 text-xs text-[#71717A]">
          The “Most booked” tag is added automatically to whichever {kind === "package" ? "package" : "service"} customers book most.
        </p>
      </div>
    </Modal>
  );
}

// ─── Opening days ────────────────────────────────────────────────────────────

const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00–22:00

function HoursTab({ settings }: { settings: BusinessSettings }) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState<BusinessSettings | null>(null);
  const [newDate, setNewDate] = useState("");
  const current = draft ?? settings;
  const dirty = draft !== null;
  const today = toIsoDate(new Date());
  // Monday first, Sunday last
  const order = [1, 2, 3, 4, 5, 6, 0];

  const setDay = (i: number, patch: Partial<BusinessSettings["days"][number]>) =>
    setDraft({ ...current, days: current.days.map((d, j) => (j === i ? { ...d, ...patch } : d)) });

  const save = async () => {
    const bad = current.days.find((d) => d.open && d.end <= d.start);
    if (bad) {
      showToast("Closing time must be after opening time.", "error");
      return;
    }
    try {
      await saveBusinessSettings({ days: current.days, closedDates: current.closedDates });
      showToast("Opening days saved. Customers see the new times straight away.", "success");
      setDraft(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't save.", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
      <Card className="xl:col-span-2 p-6 flex flex-col gap-4">
        <SectionHeading
          title="Weekly hours"
          subtitle="Customers can book from opening time until an hour before closing"
          action={
            dirty && (
              <div className="flex gap-2">
                <button onClick={() => setDraft(null)} className={secondaryButton}>Discard</button>
                <button onClick={save} className={primaryButton}>Save hours</button>
              </div>
            )
          }
        />
        <div className="flex flex-col">
          {order.map((i) => {
            const d = current.days[i];
            return (
              <div key={i} className="flex items-center gap-4 py-3 border-t border-[#2C2C2C] first:border-t-0 flex-wrap">
                <label className="flex items-center gap-3 w-40 cursor-pointer">
                  <input type="checkbox" checked={d.open} onChange={(e) => setDay(i, { open: e.target.checked })} className="w-4 h-4 accent-[#E86A33]" />
                  <span className="text-sm font-semibold text-[#F5F5F5]">{DAY_NAMES[i]}</span>
                </label>
                {d.open ? (
                  <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                    <select value={d.start} onChange={(e) => setDay(i, { start: Number(e.target.value) })} className={`${inputClass} w-auto py-1.5`} aria-label={`${DAY_NAMES[i]} opens`}>
                      {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{formatHour(h)}</option>)}
                    </select>
                    to
                    <select value={d.end} onChange={(e) => setDay(i, { end: Number(e.target.value) })} className={`${inputClass} w-auto py-1.5`} aria-label={`${DAY_NAMES[i]} closes`}>
                      {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{formatHour(h)}</option>)}
                    </select>
                  </div>
                ) : (
                  <span className="text-sm text-[#71717A]">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 flex flex-col gap-4">
        <SectionHeading title="Closed dates" subtitle="Public holidays or one-off closures" />
        <div className="flex gap-2">
          <input type="date" min={today} value={newDate} onChange={(e) => setNewDate(e.target.value)} className={inputClass} aria-label="Date to close" />
          <button
            className={secondaryButton}
            disabled={!newDate || current.closedDates.includes(newDate)}
            onClick={() => {
              setDraft({ ...current, closedDates: [...current.closedDates, newDate].sort() });
              setNewDate("");
            }}
          >
            Add
          </button>
        </div>
        {current.closedDates.filter((d) => d >= today).length === 0 ? (
          <p className="text-sm text-[#71717A]">No upcoming closures.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {current.closedDates
              .filter((d) => d >= today)
              .map((d) => (
                <li key={d} className="flex items-center gap-3 rounded-xl bg-[#101010] border border-[#2C2C2C] px-3 py-2.5">
                  <CalendarX className="w-4 h-4 text-[#E86A33]" />
                  <span className="flex-1 text-sm text-[#F5F5F5]">
                    {new Date(d + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <button
                    onClick={() => setDraft({ ...current, closedDates: current.closedDates.filter((x) => x !== d) })}
                    className="p-1.5 rounded-lg text-[#71717A] hover:text-red-400 cursor-pointer"
                    aria-label="Remove closed date"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
          </ul>
        )}
        {dirty && (
          <button onClick={save} className={primaryButton}>Save closures</button>
        )}
      </Card>
    </div>
  );
}

// ─── Fees ────────────────────────────────────────────────────────────────────

function FeesTab({ settings }: { settings: BusinessSettings }) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const values = draft ?? {
    callOutFee: String(settings.callOutFee),
    membershipMonthly: String(settings.membershipMonthly),
    membershipAnnual: String(settings.membershipAnnual),
  };
  const set = (k: string, v: string) => setDraft({ ...values, [k]: v });

  const save = async () => {
    const parsed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Number(v)]));
    if (Object.values(parsed).some((n) => !Number.isFinite(n) || n < 0)) {
      showToast("Enter amounts of R0 or more.", "error");
      return;
    }
    try {
      await saveBusinessSettings(parsed);
      showToast("Fees saved. New bookings use the new amounts.", "success");
      setDraft(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't save.", "error");
    }
  };

  return (
    <Card className="p-6 flex flex-col gap-5 max-w-2xl">
      <SectionHeading title="Fees" subtitle="Applied to new bookings and sign-ups. Existing bookings keep what the customer agreed to." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Call-out fee (R)" hint="Charged to non-members for mobile washes">
          <input type="number" min={0} value={values.callOutFee} onChange={(e) => set("callOutFee", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Membership, monthly (R)">
          <input type="number" min={0} value={values.membershipMonthly} onChange={(e) => set("membershipMonthly", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Membership, yearly (R)">
          <input type="number" min={0} value={values.membershipAnnual} onChange={(e) => set("membershipAnnual", e.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={!draft} className={primaryButton}>Save fees</button>
        {draft && <button onClick={() => setDraft(null)} className={secondaryButton}>Discard</button>}
      </div>
    </Card>
  );
}
