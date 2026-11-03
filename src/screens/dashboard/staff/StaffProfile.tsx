import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { useStaffWorkday } from "../../../hooks/useStaffWorkday";
import { formatHour } from "../../../lib/business";
import { WORK_TYPE_LABELS } from "../../../lib/staffOps";
import { Badge, Card, Field } from "../../../components/admin/AdminUI";
import { inputClass, primaryButton } from "../../../components/admin/adminStyles";
import LunchControl from "../../../components/staff/LunchControl";

interface ProfileDoc {
  fullName?: string;
  displayName?: string;
  email?: string;
  employeeId?: string;
  phoneNumber?: string;
}

export default function StaffProfile() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const day = useStaffWorkday();
  const uid = currentUser?.uid || "";
  const [profile, setProfile] = useState<ProfileDoc>({});
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, "users", uid),
      (snap) => setProfile((snap.data() as ProfileDoc) || {}),
      (err) => console.warn("Profile unavailable:", err.message)
    );
  }, [uid]);

  const name = profile.fullName || profile.displayName || currentUser?.displayName || day.myName;
  const phone = phoneDraft ?? profile.phoneNumber ?? "";

  const savePhone = async () => {
    const value = phone.trim();
    if (value && !/^[+\d][\d\s-]{6,}$/.test(value)) {
      showToast("Enter a valid phone number.", "error");
      return;
    }
    try {
      await setDoc(doc(db, "users", uid), { phoneNumber: value, updatedAt: Date.now() }, { merge: true });
      setPhoneDraft(null);
      showToast("Phone number saved.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't save.", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start pb-10 text-[#F5F5F5]">
      <div className="xl:col-span-2 flex flex-col gap-5">
        <Card className="p-6 flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#1F1F1F] border border-[#2C2C2C] flex items-center justify-center text-lg font-bold text-[#E86A33]">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold font-display">{name}</h2>
              <p className="text-sm text-[#A1A1AA]">{profile.email || currentUser?.email}</p>
            </div>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-[#71717A]">Employee ID</dt>
              <dd className="font-mono mt-1">{profile.employeeId || "Not set"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#71717A]">Account</dt>
              <dd className="mt-1">{day.own.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Deactivated</Badge>}</dd>
            </div>
          </dl>
          <div className="flex items-end gap-2 max-w-md">
            <div className="flex-1">
              <Field label="Phone number" hint="So the owner can reach you about jobs">
                <input value={phone} onChange={(e) => setPhoneDraft(e.target.value)} className={inputClass} placeholder="082 555 0123" />
              </Field>
            </div>
            {phoneDraft !== null && phoneDraft !== (profile.phoneNumber ?? "") && (
              <button onClick={savePhone} className={`${primaryButton} mb-[22px]`}>Save</button>
            )}
          </div>
        </Card>

        <Card className="p-6 flex flex-col gap-3">
          <h3 className="text-[15px] font-bold">Work</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs text-[#71717A]">Works</dt>
              <dd className="mt-1">
                <Badge tone={day.workType === "bay" ? "blue" : "orange"}>{WORK_TYPE_LABELS[day.workType]}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#71717A]">Crew</dt>
              <dd className="mt-1">{day.crew ? `With ${day.partnerNames.join(" and ")}` : "Working solo"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#71717A]">Lunch today</dt>
              <dd className="mt-1">
                {formatHour(day.lunchToday)}–{formatHour(day.lunchToday + 1)}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-[#71717A]">Your work type and crew are set by the owner.</p>
        </Card>
      </div>

      <LunchControl day={day} mode="usual" />
    </div>
  );
}
