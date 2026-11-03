import { useEffect, useMemo, useState } from "react";
import { Crown, Mail, Phone, Search } from "lucide-react";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { formatRand, parseRand } from "../../../lib/business";
import { getTierForPoints } from "../../../lib/rewards";
import type { AdminAppointment } from "../../../lib/appointmentSlots";
import { useAllAppointments } from "../../../hooks/useOperations";
import { Badge, Card, EmptyState, Modal, StatTile } from "../../../components/admin/AdminUI";
import { inputClass } from "../../../components/admin/adminStyles";
import UserAvatar from "../../../components/ui/UserAvatar";
import { avatarUrl } from "../../../lib/cloudinary";

type CustomerRow = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  photoURL?: string;
  member: boolean;
  joined?: number;
  bookings: AdminAppointment[];
  spent: number;
  lastBooking?: number;
};

function toMillis(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return undefined;
}

export default function AdminCustomers() {
  const { appointments } = useAllAppointments();
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [membersOnly, setMembersOnly] = useState(false);
  const [open, setOpen] = useState<CustomerRow | null>(null);

  useEffect(
    () =>
      onSnapshot(
        collection(db, "users"),
        (snap) => setUsers(snap.docs.map((d) => ({ ...d.data(), uid: d.id }))),
        () => setUsers([])
      ),
    []
  );

  const customers = useMemo<CustomerRow[]>(() => {
    return users
      .filter((u) => u.role !== "admin" && u.role !== "staff")
      .map((u) => {
        const uid = u.uid as string;
        const bookings = appointments.filter((a) => a.customerUid === uid);
        const paid = bookings.filter((b) => b.status !== "Cancelled");
        return {
          uid,
          name: (u.fullName || u.displayName || u.email || "Customer") as string,
          email: (u.email || "") as string,
          phone: (u.phoneNumber || u.phone || "") as string,
          photoURL: u.photoURL as string | undefined,
          member: u.hasMembership === true,
          joined: toMillis(u.createdAt),
          bookings,
          spent: paid.reduce((sum, b) => sum + parseRand(b.price), 0),
          lastBooking: bookings.length ? Math.max(...bookings.map((b) => b.createdAt || 0)) : undefined,
        };
      })
      .sort((a, b) => (b.lastBooking ?? 0) - (a.lastBooking ?? 0) || a.name.localeCompare(b.name));
  }, [users, appointments]);

  const visible = customers
    .filter((c) => !membersOnly || c.member)
    .filter((c) => !search.trim() || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(search.trim().toLowerCase()));
  const members = customers.filter((c) => c.member).length;
  const totalSpent = customers.reduce((sum, c) => sum + c.spent, 0);

  return (
    <div className="flex flex-col gap-6 pb-10 text-[#F5F5F5]">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="Customers" value={customers.length} />
        <StatTile label="Members" value={members} hint={customers.length ? `${Math.round((members / customers.length) * 100)}% of customers` : undefined} tone="green" />
        <StatTile label="Spent with you" value={formatRand(totalSpent)} hint="Online bookings, excluding cancellations" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or phone" className={`${inputClass} pl-9`} />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-[#A1A1AA] cursor-pointer">
          <input type="checkbox" checked={membersOnly} onChange={(e) => setMembersOnly(e.target.checked)} className="w-4 h-4 accent-[#E86A33]" />
          Members only
        </label>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-[#71717A] text-xs">
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-3 py-3 font-medium">Membership</th>
              <th className="px-3 py-3 font-medium">Bookings</th>
              <th className="px-3 py-3 font-medium">Spent</th>
              <th className="px-3 py-3 font-medium">Last booked</th>
              <th className="px-5 py-3 font-medium text-right" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6}><EmptyState title={search ? `No customers match “${search}”` : "No customers yet"} /></td>
              </tr>
            )}
            {visible.map((c) => (
              <tr key={c.uid} className="border-t border-[#2C2C2C] hover:bg-white/[0.02]">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <UserAvatar photoURL={avatarUrl(c.photoURL, 64)} />
                    <div className="min-w-0">
                      <p className="font-semibold text-[#F5F5F5] truncate">{c.name}</p>
                      <p className="text-xs text-[#71717A] truncate">{c.email}{c.phone && ` · ${c.phone}`}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5">{c.member ? <Badge tone="green"><Crown className="w-3 h-3" /> Member</Badge> : <span className="text-[#71717A]">None</span>}</td>
                <td className="px-3 py-3.5 text-[#D4D4D4]">{c.bookings.length}</td>
                <td className="px-3 py-3.5 font-semibold">{formatRand(c.spent)}</td>
                <td className="px-3 py-3.5 text-[#A1A1AA]">
                  {c.lastBooking ? new Date(c.lastBooking).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "Never"}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button onClick={() => setOpen(c)} className="text-sm font-semibold text-[#E86A33] underline underline-offset-4 decoration-[#E86A33]/40 hover:decoration-[#E86A33] cursor-pointer">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {open && <CustomerModal customer={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function CustomerModal({ customer, onClose }: { customer: CustomerRow; onClose: () => void }) {
  const [points, setPoints] = useState<number | null>(null);
  useEffect(() => {
    getDoc(doc(db, "users", customer.uid, "rewards", "summary"))
      .then((snap) => setPoints(snap.exists() ? Number(snap.data().lifetimePoints ?? snap.data().pointsBalance ?? 0) : 0))
      .catch(() => setPoints(0));
  }, [customer.uid]);

  const tier = points === null ? null : getTierForPoints(points);
  const sorted = [...customer.bookings].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const tone = (status: string) =>
    status === "Completed" ? "neutral" : status === "Cancelled" ? "red" : status === "Confirmed" ? "green" : "amber";

  return (
    <Modal wide title={customer.name} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#D4D4D4]">
          {customer.email && <span className="inline-flex items-center gap-1.5"><Mail className="w-4 h-4 text-[#71717A]" />{customer.email}</span>}
          {customer.phone && <span className="inline-flex items-center gap-1.5"><Phone className="w-4 h-4 text-[#71717A]" />{customer.phone}</span>}
          {customer.joined && <span className="text-[#71717A]">Joined {new Date(customer.joined).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}</span>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#101010] border border-[#2C2C2C] p-3.5">
            <p className="text-xs text-[#71717A]">Membership</p>
            <p className="text-[15px] font-semibold mt-0.5">{customer.member ? "Member" : "Free tier"}</p>
          </div>
          <div className="rounded-xl bg-[#101010] border border-[#2C2C2C] p-3.5">
            <p className="text-xs text-[#71717A]">Reward points</p>
            <p className="text-[15px] font-semibold mt-0.5">{points === null ? "…" : `${points} · ${tier?.name}`}</p>
          </div>
          <div className="rounded-xl bg-[#101010] border border-[#2C2C2C] p-3.5">
            <p className="text-xs text-[#71717A]">Spent</p>
            <p className="text-[15px] font-semibold mt-0.5">{formatRand(customer.spent)}</p>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-2">Bookings ({sorted.length})</h3>
          {sorted.length === 0 ? (
            <p className="text-sm text-[#71717A]">No bookings yet.</p>
          ) : (
            <div className="rounded-xl border border-[#2C2C2C] overflow-hidden">
              {sorted.map((b) => (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#2C2C2C] last:border-b-0 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#F5F5F5] truncate">{b.packageName} · {b.serviceType}</p>
                    <p className="text-xs text-[#71717A] truncate">{b.date}, {b.time}{b.unitLabel || (b.confirmed && b.staffName) ? ` · ${b.unitLabel || b.staffName}` : ""}</p>
                  </div>
                  <span className="font-semibold">{b.price}</span>
                  <Badge tone={tone(b.status)}>{b.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
