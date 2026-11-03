import { useState } from "react";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Phone, User, X } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useNotifications } from "../../contexts/NotificationsContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

/** 10-digit SA number (082 123 4567) or the +27 form of one */
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return digits;
  if (/^27\d{9}$/.test(digits)) return `0${digits.slice(2)}`;
  return null;
}

/**
 * The customer's "Edit Profile Details" popup (name and phone), used on the Profile page
 * and on the booking page when an account has no phone number yet.
 */
export default function EditProfileModal({
  initialName,
  initialPhone,
  onClose,
  onSaved,
  requirePhone = false,
  subtitle = "Update your contact information",
  saveLabel = "Save Details",
}: {
  initialName: string;
  initialPhone: string;
  onClose: () => void;
  onSaved?: (details: { name: string; phone: string }) => void;
  requirePhone?: boolean;
  subtitle?: string;
  saveLabel?: string;
}) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { addNotification } = useNotifications();
  const uid = currentUser?.uid;
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast("Name cannot be empty.", "error");
      return;
    }
    const cleanPhone = phone.trim() ? normalisePhone(phone) : "";
    if (cleanPhone === null) {
      showToast("Enter a 10-digit phone number, e.g. 082 123 4567.", "error");
      return;
    }
    if (requirePhone && !cleanPhone) {
      showToast("Add a phone number so our team can reach you about your wash.", "error");
      return;
    }

    setSaving(true);
    try {
      if (uid) {
        localStorage.setItem(`ww_profile_name_${uid}`, trimmedName);
        localStorage.setItem(`ww_profile_phone_${uid}`, cleanPhone);
        if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: trimmedName });
        // Sign-up and bookings read fullName/phoneNumber; older profile code reads displayName/phone
        await setDoc(
          doc(db, "users", uid),
          { displayName: trimmedName, fullName: trimmedName, phone: cleanPhone, phoneNumber: cleanPhone },
          { merge: true }
        );
      }
      addNotification({
        category: "system",
        icon: "check",
        title: "Account Updated",
        message: "Your account information was successfully updated.",
        link: "/dashboard/customer/profile",
        eventId: `profile-update-${Date.now()}`,
      });
      window.dispatchEvent(new Event("storage"));
      showToast("Profile details updated successfully!", "success");
      onSaved?.({ name: trimmedName, phone: cleanPhone });
      onClose();
    } catch (err) {
      console.error("Failed to update profile:", err);
      showToast("Could not update profile details.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#171717] border border-[#2C2C2C] rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col gap-5 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E86A33] via-[#E86A33]/50 to-transparent" />

        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold font-display text-[#F5F5F5]">Edit Profile Details</h3>
            <p className="text-xs text-[#A1A1AA]">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-[#F5F5F5] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={save} className="flex flex-col gap-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Alex Burns"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<User className="w-4 h-4" />}
            required
          />
          <Input
            label={requirePhone ? "Phone Number *" : "Phone Number"}
            type="tel"
            placeholder="e.g. 082 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            icon={<Phone className="w-4 h-4" />}
            required={requirePhone}
          />

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 text-xs !border-[#2C2C2C]"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving} className="flex-1 py-2.5 text-xs font-semibold">
              {saveLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
