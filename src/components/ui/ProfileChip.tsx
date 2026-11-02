import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import Tooltip from "./Tooltip";
import UserAvatar from "./UserAvatar";

type Role = "customer" | "staff" | "admin";

const ROLE_LABELS: Record<Role, { label: string; dot: string }> = {
  customer: { label: "Customer", dot: "bg-[#A1A1AA]" },
  staff: { label: "Staff", dot: "bg-sky-400" },
  admin: { label: "Admin", dot: "bg-[#E86A33]" },
};

/** The signed-in user's real role from users/{uid}.role, whichever dashboard they're on. */
function useUserRole(): Role | null {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        const value = snap.data()?.role;
        setRole(value === "admin" || value === "staff" ? value : "customer");
      },
      () => setRole(null)
    );
  }, [uid]);

  return uid ? role : null;
}


type ProfileChipProps = {
  name: string;
  photoURL?: string;
  /** Profile page to open; omit when the role has no profile page */
  to?: string;
  active?: boolean;
};

/** Top-bar identity block: avatar, name, and which kind of account is signed in. */
export default function ProfileChip({ name, photoURL, to, active = false }: ProfileChipProps) {
  const role = useUserRole();
  const roleInfo = role ? ROLE_LABELS[role] : null;

  const content = (
    <>
      <UserAvatar photoURL={photoURL} />
      <span className="hidden sm:flex flex-col min-w-0 leading-tight text-left">
        {/* Long names are cut off with "…"; the full name is always in the tooltip and label */}
        <span className="text-[13px] font-semibold text-[#F5F5F5] truncate max-w-[160px]">{name}</span>
        {roleInfo && (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#A1A1AA]">
            <span className={`w-1.5 h-1.5 rounded-full ${roleInfo.dot}`} aria-hidden="true" />
            <span className="sr-only">Account type: </span>
            {roleInfo.label}
          </span>
        )}
      </span>
    </>
  );

  const base = `flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border transition-colors ml-2 ${
    active ? "border-[#E86A33]/50 bg-[#E86A33]/[0.06]" : "border-[#2C2C2C]"
  }`;
  const label = roleInfo ? `${name}, ${roleInfo.label.toLowerCase()} account` : name;

  if (!to) {
    return (
      <Tooltip label={name} align="end">
        <div className={base} aria-label={label}>
          {content}
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip label={`${name}: view profile`} align="end">
      <Link
        to={to}
        aria-label={`${label}. Open your profile`}
        aria-current={active ? "page" : undefined}
        className={`${base} hover:border-[#E86A33] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E86A33]`}
      >
        {content}
      </Link>
    </Tooltip>
  );
}
