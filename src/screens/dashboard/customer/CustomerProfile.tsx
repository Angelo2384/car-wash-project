import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  ShieldCheck,
  Award,
  Crown,
  Sparkles,
  Car,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  ArrowRight,
  CreditCard,
  CheckCircle2,
  RotateCcw,
  Camera,
  X,
  AlertTriangle,
  Receipt,
  FileText,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import { updateProfile } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";

// Interface Definitions
interface Vehicle {
  id: string;
  plate: string;
  make: string;
  model: string;
  color: string;
  preferredPackage: string;
}

interface RecentBooking {
  id: string;
  service: string;
  date: string;
  time: string;
  vehicle: string;
  status: "Completed" | "Upcoming" | "Staff on route" | "Cancelled";
  amount: string;
  isRefunded?: boolean;
}

interface Transaction {
  id: string;
  title: string;
  date: string;
  amount: string;
  type: "payment" | "refund";
  status: string;
  cardLast4: string;
}

const DEFAULT_VEHICLES: Vehicle[] = [
  {
    id: "veh-1",
    plate: "ABC-1234",
    make: "Tesla",
    model: "Model 3",
    color: "Metallic Silver",
    preferredPackage: "Ultimate Ceramic Wash",
  },
  {
    id: "veh-2",
    plate: "XYZ-7890",
    make: "Ford",
    model: "F-150 Raptor",
    color: "Midnight Black",
    preferredPackage: "Exterior & Interior Deep Clean",
  },
];

const INITIAL_BOOKINGS: RecentBooking[] = [
  {
    id: "WW-98214",
    service: "Premium Detail",
    date: "Today, Oct 24",
    time: "2:00 PM - 3:00 PM",
    vehicle: "Tesla Model 3 (ABC-1234)",
    status: "Staff on route",
    amount: "R120.00",
  },
  {
    id: "WW-98190",
    service: "Exterior & Interior Deep Clean",
    date: "Tomorrow, Oct 25",
    time: "10:00 AM - 11:30 AM",
    vehicle: "Ford F-150 (XYZ-7890)",
    status: "Upcoming",
    amount: "R150.00",
  },
  {
    id: "WW-97840",
    service: "Ultimate Ceramic Wash",
    date: "Oct 18, 2026",
    time: "1:00 PM - 2:30 PM",
    vehicle: "Tesla Model 3 (ABC-1234)",
    status: "Completed",
    amount: "R120.00",
  },
  {
    id: "WW-96420",
    service: "Standard Foam Wash",
    date: "Oct 12, 2026",
    time: "9:00 AM - 10:00 AM",
    vehicle: "Honda Civic (CA-5521)",
    status: "Cancelled",
    amount: "R85.00",
    isRefunded: true,
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "TXN-88412",
    title: "Monthly Plan Auto-pay",
    date: "Oct 20, 2026",
    amount: "R120.00",
    type: "payment",
    status: "Successful",
    cardLast4: "4242",
  },
  {
    id: "TXN-87950",
    title: "Add-on: Wheel Wax & Tire Polish",
    date: "Oct 18, 2026",
    amount: "R85.00",
    type: "payment",
    status: "Successful",
    cardLast4: "4242",
  },
  {
    id: "TXN-86510",
    title: "Refund: Cancelled Standard Wash",
    date: "Oct 12, 2026",
    amount: "R85.00",
    type: "refund",
    status: "Refunded to card",
    cardLast4: "4242",
  },
];

export default function CustomerProfile() {
  const navigate = useNavigate();
  const { currentUser, refreshUser } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-user localStorage key helper — prevents data leaking between accounts.
  const uid = currentUser?.uid;
  const nameKey    = uid ? `ww_profile_name_${uid}`   : null;
  const phoneKey   = uid ? `ww_profile_phone_${uid}`  : null;
  const avatarKey  = uid ? `ww_profile_avatar_${uid}` : null;

  // Profile Information State with local persistence fallback
  const [profileName, setProfileName] = useState(() => {
    // Firebase displayName is source of truth (kept in sync via updateProfile).
    // Fall back to uid-scoped localStorage only when Firebase has no value.
    return (
      currentUser?.displayName ||
      (nameKey ? localStorage.getItem(nameKey) : null) ||
      "Qaasim Isaacs"
    );
  });
  const [profilePhone, setProfilePhone] = useState(() => {
    return (phoneKey ? localStorage.getItem(phoneKey) : null) || "+27 82 123 4567";
  });
  const [profileEmail] = useState(() => {
    return currentUser?.email || "qaasim@gmail.com";
  });
  const [profileAvatar, setProfileAvatar] = useState<string>(() => {
    // localStorage leads for avatar: base64 uploads can't be stored in Firebase Auth photoURL.
    return (
      (avatarKey ? localStorage.getItem(avatarKey) : null) ||
      currentUser?.photoURL ||
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250"
    );
  });

  const [hasMembership, setHasMembership] = useState<boolean>(() => {
    if (!uid) return false;
    const cached = localStorage.getItem(`ww_has_membership_${uid}`);
    return cached ? JSON.parse(cached) : false;
  });

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      if (snap.exists()) {
        const mem = snap.data()?.hasMembership === true;
        setHasMembership(mem);
        localStorage.setItem(`ww_has_membership_${currentUser.uid}`, JSON.stringify(mem));
      }
    }, (err) => {
      console.error("Failed to load user profile doc:", err);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  // Vehicles State with local storage
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem("ww_vehicles");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved vehicles", e);
      }
    }
    return DEFAULT_VEHICLES;
  });

  useEffect(() => {
    localStorage.setItem("ww_vehicles", JSON.stringify(vehicles));
  }, [vehicles]);

  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFormName, setEditFormName] = useState(profileName);
  const [editFormPhone, setEditFormPhone] = useState(profilePhone);

  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehiclePackage, setVehiclePackage] = useState("Ultimate Ceramic Wash");

  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  const [activeReceipt, setActiveReceipt] = useState<RecentBooking | null>(null);
  const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvc, setNewCardCvc] = useState("");
  const [newCardHolder, setNewCardHolder] = useState(profileName);

  // Avatar Upload Handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("Image size must be less than 5MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProfileAvatar(result);
        if (avatarKey) localStorage.setItem(avatarKey, result);
        // Trigger re-render of all useAuth() consumers (e.g. sidebar) so they
        // re-read localStorage and display the updated avatar immediately.
        refreshUser();
        showToast("Profile image updated successfully!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  // Profile Edit Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormName.trim()) {
      showToast("Name cannot be empty", "error");
      return;
    }
    try {
      // Persist the display name to Firebase Auth so it propagates app-wide
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: editFormName.trim() });
      }
    } catch (err) {
      console.error("Failed to update Firebase Auth profile:", err);
      showToast("Failed to update profile. Please try again.", "error");
      return;
    }
    // Update local state and localStorage as fallback / offline cache
    setProfileName(editFormName);
    setProfilePhone(editFormPhone);
    if (nameKey)  localStorage.setItem(nameKey,  editFormName);
    if (phoneKey) localStorage.setItem(phoneKey, editFormPhone);
    // Force all useAuth() consumers (e.g. sidebar) to re-render with the new displayName
    refreshUser();
    setIsEditProfileOpen(false);
    showToast("Profile details updated successfully!", "success");
  };

  // Add Vehicle
  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehiclePlate.trim() || !vehicleMake.trim() || !vehicleModel.trim()) {
      showToast("Please fill in all required vehicle details", "error");
      return;
    }

    const newVeh: Vehicle = {
      id: `veh-${Date.now()}`,
      plate: vehiclePlate.toUpperCase().trim(),
      make: vehicleMake.trim(),
      model: vehicleModel.trim(),
      color: vehicleColor.trim() || "Black",
      preferredPackage: vehiclePackage,
    };

    setVehicles((prev) => [newVeh, ...prev]);
    setIsAddVehicleOpen(false);
    resetVehicleForm();
    showToast(`Vehicle ${newVeh.plate} added successfully!`, "success");
  };

  // Edit Vehicle Open
  const openEditVehicleModal = (v: Vehicle) => {
    setSelectedVehicle(v);
    setVehiclePlate(v.plate);
    setVehicleMake(v.make);
    setVehicleModel(v.model);
    setVehicleColor(v.color);
    setVehiclePackage(v.preferredPackage);
    setIsEditVehicleOpen(true);
  };

  // Save Edit Vehicle
  const handleSaveEditVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    if (!vehiclePlate.trim() || !vehicleMake.trim() || !vehicleModel.trim()) {
      showToast("Please fill in all required vehicle details", "error");
      return;
    }

    setVehicles((prev) =>
      prev.map((v) =>
        v.id === selectedVehicle.id
          ? {
              ...v,
              plate: vehiclePlate.toUpperCase().trim(),
              make: vehicleMake.trim(),
              model: vehicleModel.trim(),
              color: vehicleColor.trim() || "Black",
              preferredPackage: vehiclePackage,
            }
          : v
      )
    );

    setIsEditVehicleOpen(false);
    resetVehicleForm();
    showToast("Vehicle updated successfully!", "success");
  };

  // Delete Vehicle
  const handleConfirmDeleteVehicle = () => {
    if (!vehicleToDelete) return;
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleToDelete.id));
    showToast(`Vehicle ${vehicleToDelete.plate} removed`, "info");
    setVehicleToDelete(null);
  };

  const resetVehicleForm = () => {
    setSelectedVehicle(null);
    setVehiclePlate("");
    setVehicleMake("");
    setVehicleModel("");
    setVehicleColor("");
    setVehiclePackage("Ultimate Ceramic Wash");
  };

  // Save Card
  const handleSavePaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardNumber.trim() || !newCardExpiry.trim() || !newCardCvc.trim()) {
      showToast("Please complete all card details", "error");
      return;
    }
    setIsAddCardOpen(false);
    setNewCardNumber("");
    setNewCardExpiry("");
    setNewCardCvc("");
    showToast("Payment method saved securely!", "success");
  };

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in slide-in-from-bottom-3 duration-300 fill-mode-forwards text-[#F5F5F5]">
      {/* Top Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-[#F5F5F5]">
          My Profile
        </h1>
        <p className="text-[#A1A1AA] text-sm md:text-[15px]">
          Manage your account, vehicles and payment preferences.
        </p>
      </div>

      {/* SECTION 1: Profile Overview & Loyalty Points */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card (2 cols) */}
        <div className="lg:col-span-2 bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-lg">
          {/* Subtle Ambient Top Accent */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E86A33] via-[#E86A33]/50 to-transparent"></div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar with Upload */}
            <div className="relative group/avatar shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-[#2C2C2C] group-hover/avatar:border-[#E86A33] transition-colors bg-[#101010] shadow-md">
                <img
                  src={profileAvatar}
                  alt={profileName}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#E86A33] text-white flex items-center justify-center shadow-md hover:bg-[#cc5a2a] transition-all hover:scale-105 active:scale-95"
                title="Change profile photo"
                aria-label="Change profile photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Information */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold font-display text-[#F5F5F5] truncate">
                  {profileName}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#35B86B]/15 text-[#35B86B] border border-[#35B86B]/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E86A33]/15 text-[#E86A33] border border-[#E86A33]/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  Premium Support
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-[#A1A1AA]">
                <span className="flex items-center gap-1.5 truncate">
                  <Mail className="w-4 h-4 text-[#71717A]" />
                  {profileEmail}
                </span>
                <span className="text-[#3F3F46] hidden sm:inline">•</span>
                <span className="truncate">{profilePhone}</span>
              </div>

              {/* Membership details */}
              <div className="flex flex-wrap items-center gap-4 mt-2 pt-3 border-t border-[#2C2C2C]/80">
                {hasMembership ? (
                  <>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#71717A] font-semibold">
                        Membership
                      </p>
                      <p className="text-sm font-semibold text-[#E86A33] flex items-center gap-1 mt-0.5">
                        <Crown className="w-4 h-4" />
                        Diamond Elite
                      </p>
                    </div>

                    <div className="h-7 w-px bg-[#2C2C2C]"></div>

                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#71717A] font-semibold">
                        Member Since
                      </p>
                      <p className="text-sm font-medium text-[#F5F5F5] mt-0.5">
                        March 2026
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#71717A] font-semibold">
                      Membership
                    </p>
                    <p className="text-sm font-medium text-[#A1A1AA] flex items-center gap-1.5 mt-0.5">
                      <ShieldCheck className="w-4 h-4 text-[#71717A]" />
                      No active membership
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-6 pt-4 border-t border-[#2C2C2C] flex items-center justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setEditFormName(profileName);
                setEditFormPhone(profilePhone);
                setIsEditProfileOpen(true);
              }}
              className="text-xs sm:text-sm py-2 px-4 !border-[#2C2C2C] hover:!border-[#E86A33] hover:!text-[#E86A33]"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Loyalty Points Card (1 col) */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden">
          {/* Green Glow */}
          <div
            className="absolute top-0 right-0 w-32 h-32 pointer-events-none rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(53,184,107,0.12) 0%, transparent 70%)",
            }}
          ></div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#35B86B]" />
                Loyalty Points
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#35B86B]/15 text-[#35B86B] border border-[#35B86B]/30">
                Tier 3
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold font-display text-[#F5F5F5] tracking-tight">
                  2,450
                </span>
                <span className="text-xs text-[#35B86B] font-bold">PTS</span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-1">Total Points Earned</p>
            </div>

            {/* Next Tier Progress */}
            <div className="mt-6 bg-[#101010] p-3.5 rounded-xl border border-[#2C2C2C]">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="font-semibold text-[#F5F5F5]">
                  Next Tier: Ultimate
                </span>
                <span className="text-[#35B86B] font-medium">550 pts to go</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-[#1F1F1F] rounded-full overflow-hidden p-0.5 border border-[#2C2C2C]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#35B86B] to-[#35B86B]/80 transition-all duration-500"
                  style={{ width: "81%" }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#71717A] mt-1.5 font-medium">
                <span>Diamond Elite (2,000)</span>
                <span>Ultimate (3,000)</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3">
            <button
              onClick={() => {
                showToast(
                  "Rewards redemption center is coming soon! You have 2,450 points ready.",
                  "info"
                );
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-[#35B86B]/15 text-[#35B86B] hover:bg-[#35B86B]/25 border border-[#35B86B]/30 transition-all active:scale-[0.98]"
            >
              Redeem Rewards
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: My Vehicles & Quick Book */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Vehicles (2 cols) */}
        <div className="lg:col-span-2 bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 flex flex-col shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#2C2C2C]">
            <div className="flex items-center gap-2.5">
              <Car className="w-5 h-5 text-[#E86A33]" />
              <h2 className="text-lg font-bold font-display text-[#F5F5F5]">
                My Vehicles
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1F1F1F] text-[#A1A1AA] border border-[#2C2C2C]">
                {vehicles.length}
              </span>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                resetVehicleForm();
                setIsAddVehicleOpen(true);
              }}
              className="text-xs sm:text-sm py-2 px-3.5"
            >
              <Plus className="w-4 h-4" />
              Add Vehicle
            </Button>
          </div>

          {/* Vehicle Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="bg-[#101010] border border-[#2C2C2C] hover:border-[#E86A33]/40 rounded-xl p-4.5 flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-[#1F1F1F] border border-[#2C2C2C] flex items-center justify-center shrink-0 text-[#E86A33]">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold tracking-wider px-2 py-0.5 rounded bg-[#1F1F1F] text-[#F5F5F5] border border-[#2C2C2C]">
                            {v.plate}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-[#F5F5F5] mt-1 group-hover:text-[#E86A33] transition-colors">
                          {v.make} {v.model}
                        </h3>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditVehicleModal(v)}
                        className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-colors"
                        title="Edit Vehicle"
                        aria-label="Edit Vehicle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setVehicleToDelete(v)}
                        className="p-1.5 rounded-lg text-[#71717A] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Vehicle"
                        aria-label="Delete Vehicle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-1.5 text-xs text-[#A1A1AA]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#E86A33]"></span>
                      <span className="text-[#71717A]">Colour:</span>
                      <span className="font-medium text-[#D8D5CF]">{v.color}</span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#1F1F1F] flex items-center justify-between">
                      <span className="text-[11px] text-[#71717A]">
                        Preferred Package:
                      </span>
                      <span className="text-[11px] font-semibold text-[#E86A33] truncate max-w-[140px]">
                        {v.preferredPackage}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {vehicles.length === 0 && (
              <div className="md:col-span-2 py-8 flex flex-col items-center justify-center text-center text-[#71717A] border border-dashed border-[#2C2C2C] rounded-xl">
                <Car className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-medium text-[#A1A1AA]">No vehicles added yet</p>
                <p className="text-xs text-[#71717A] mt-0.5">
                  Add your primary car to enable instant 1-click booking.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Book (1 col) */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-[#2C2C2C]">
              <Sparkles className="w-4 h-4 text-[#E86A33]" />
              <h2 className="text-lg font-bold font-display text-[#F5F5F5]">
                Quick Book
              </h2>
            </div>
            <p className="text-xs text-[#71717A] mt-2 mb-4">
              Instant re-booking for your most frequent services.
            </p>

            {/* Quick Service Cards */}
            <div className="flex flex-col gap-3">
              {/* Service 1 */}
              <div className="bg-[#101010] border border-[#2C2C2C] hover:border-[#E86A33]/50 rounded-xl p-3.5 flex items-center justify-between transition-all">
                <div className="flex flex-col">
                  <span className="font-semibold text-xs sm:text-sm text-[#F5F5F5]">
                    Ceramic Coating Pro
                  </span>
                  <span className="text-[11px] text-[#71717A]">
                    Last booked 2 weeks ago
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#E86A33]">R120</span>
                  <button
                    onClick={() => navigate("/dashboard/customer/appointments")}
                    className="px-2.5 py-1 text-xs font-semibold bg-[#E86A33]/15 text-[#E86A33] hover:bg-[#E86A33] hover:text-white rounded-lg transition-colors"
                  >
                    Book
                  </button>
                </div>
              </div>

              {/* Service 2 */}
              <div className="bg-[#101010] border border-[#2C2C2C] hover:border-[#E86A33]/50 rounded-xl p-3.5 flex items-center justify-between transition-all">
                <div className="flex flex-col">
                  <span className="font-semibold text-xs sm:text-sm text-[#F5F5F5]">
                    Full Interior Detail
                  </span>
                  <span className="text-[11px] text-[#35B86B]">
                    Most popular add-on
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#E86A33]">R85</span>
                  <button
                    onClick={() => navigate("/dashboard/customer/appointments")}
                    className="px-2.5 py-1 text-xs font-semibold bg-[#E86A33]/15 text-[#E86A33] hover:bg-[#E86A33] hover:text-white rounded-lg transition-colors"
                  >
                    Book
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#2C2C2C]">
            <Button
              variant="outline"
              fullWidth
              onClick={() => navigate("/dashboard/customer/appointments")}
              className="text-xs sm:text-sm py-2.5 !border-[#2C2C2C] hover:!border-[#E86A33] hover:!text-[#E86A33]"
            >
              Explore All Services
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* SECTION 3: Recent Bookings */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-[#2C2C2C]">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[#E86A33]" />
            <h2 className="text-lg font-bold font-display text-[#F5F5F5]">
              Recent Bookings
            </h2>
          </div>
          <button
            onClick={() => navigate("/dashboard/customer/appointments")}
            className="text-xs sm:text-sm font-semibold text-[#E86A33] hover:underline flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bookings Table / Responsive List */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2C2C2C] text-[11px] uppercase tracking-wider text-[#71717A]">
                <th className="py-3 px-3">Service & Date</th>
                <th className="py-3 px-3 hidden md:table-cell">Vehicle</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2C2C2C] text-xs sm:text-sm">
              {INITIAL_BOOKINGS.map((b) => (
                <tr
                  key={b.id}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Service & Date */}
                  <td className="py-3.5 px-3">
                    <div className="font-semibold text-[#F5F5F5]">{b.service}</div>
                    <div className="text-xs text-[#71717A] flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-[#E86A33]" />
                      {b.date} • {b.time}
                    </div>
                  </td>

                  {/* Vehicle */}
                  <td className="py-3.5 px-3 hidden md:table-cell text-[#A1A1AA]">
                    {b.vehicle}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        b.status === "Completed"
                          ? "bg-[#35B86B]/15 text-[#35B86B] border-[#35B86B]/30"
                          : b.status === "Upcoming"
                          ? "bg-[#E86A33]/15 text-[#E86A33] border-[#E86A33]/30"
                          : b.status === "Staff on route"
                          ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                          : "bg-red-500/15 text-red-400 border-red-500/30"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>

                  {/* Payment */}
                  <td className="py-3.5 px-3">
                    <div className="font-bold text-[#F5F5F5]">{b.amount}</div>
                    {b.isRefunded && (
                      <span className="text-[10px] text-[#E86A33] font-medium">
                        Refunded
                      </span>
                    )}
                  </td>

                  {/* Contextual Action */}
                  <td className="py-3.5 px-3 text-right">
                    {b.status === "Completed" && (
                      <button
                        onClick={() => setActiveReceipt(b)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-[#1F1F1F] text-[#F5F5F5] hover:bg-[#2C2C2C] hover:text-[#E86A33] transition-colors border border-[#2C2C2C]"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Receipt
                      </button>
                    )}

                    {(b.status === "Upcoming" || b.status === "Staff on route") && (
                      <button
                        onClick={() =>
                          navigate("/dashboard/customer/appointments/reschedule")
                        }
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-[#E86A33]/15 text-[#E86A33] hover:bg-[#E86A33] hover:text-white transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reschedule
                      </button>
                    )}

                    {b.status === "Cancelled" && (
                      <button
                        onClick={() => setActiveReceipt(b)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-[#1F1F1F] text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#2C2C2C] transition-colors border border-[#2C2C2C]"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Details
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: Payments & Transactions */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 shadow-lg flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2C2C2C]">
          <div>
            <h2 className="text-lg font-bold font-display text-[#F5F5F5]">
              Payments & Transactions
            </h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              Secure billing methods and automatic receipts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                showToast(
                  "All past refunds are credited back to your original payment method.",
                  "info"
                );
              }}
              className="text-xs font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors px-3 py-2 rounded-lg border border-[#2C2C2C] hover:bg-white/[0.04]"
            >
              Refund Requests
            </button>
            <Button
              variant="primary"
              onClick={() => setIsAddCardOpen(true)}
              className="text-xs sm:text-sm py-2 px-3.5"
            >
              <CreditCard className="w-4 h-4" />
              Add Payment Method
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Primary Payment Card (1 col) */}
          <div className="bg-gradient-to-br from-[#1F1F1F] via-[#171717] to-[#101010] border border-[#2C2C2C] rounded-xl p-5 flex flex-col justify-between shadow-md relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E86A33]">
                  PRIMARY CARD
                </span>
                <p className="text-xs text-[#71717A] mt-0.5">WashWizzy Preferred</p>
              </div>
              <CreditCard className="w-6 h-6 text-[#E86A33]" />
            </div>

            {/* Masked Card Number */}
            <div className="my-6">
              <p className="font-mono text-base sm:text-lg tracking-widest text-[#F5F5F5] font-semibold">
                •••• •••• •••• 4242
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-[#A1A1AA] pt-3 border-t border-[#2C2C2C]">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-[#71717A] block">
                  Cardholder
                </span>
                <span className="font-medium text-[#F5F5F5]">{profileName}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-[#71717A] block">
                  Expires
                </span>
                <span className="font-medium text-[#F5F5F5]">12/26</span>
              </div>
            </div>
          </div>

          {/* Transactions List (2 cols) */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
              Recent Activity
            </h3>

            <div className="flex flex-col gap-2.5">
              {INITIAL_TRANSACTIONS.map((t) => (
                <div
                  key={t.id}
                  className="bg-[#101010] border border-[#2C2C2C] hover:border-[#2C2C2C]/80 rounded-xl p-3.5 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        t.type === "refund"
                          ? "bg-[#E86A33]/15 text-[#E86A33]"
                          : "bg-[#35B86B]/15 text-[#35B86B]"
                      }`}
                    >
                      {t.type === "refund" ? (
                        <RotateCcw className="w-4 h-4" />
                      ) : (
                        <DollarSign className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-[#F5F5F5]">
                        {t.title}
                      </p>
                      <p className="text-[11px] text-[#71717A]">
                        {t.date} • Card ending in {t.cardLast4}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p
                        className={`text-xs sm:text-sm font-bold ${
                          t.type === "refund"
                            ? "text-[#E86A33]"
                            : "text-[#F5F5F5]"
                        }`}
                      >
                        {t.type === "refund" ? `+${t.amount}` : t.amount}
                      </p>
                      <span className="text-[10px] text-[#35B86B] font-medium">
                        {t.status}
                      </span>
                    </div>

                    <button
                      onClick={() => setActiveTransaction(t)}
                      className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.05] transition-colors"
                      title="View Transaction Details"
                      aria-label="View Transaction Details"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* 1. Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#2C2C2C]">
              <h3 className="text-lg font-bold font-display text-[#F5F5F5]">
                Edit Profile
              </h3>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="text-[#71717A] hover:text-[#F5F5F5] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 mt-5">
              <Input
                label="Full Name *"
                value={editFormName}
                onChange={(e) => setEditFormName(e.target.value)}
                placeholder="Your full name"
                icon={<User className="w-4 h-4" />}
                required
              />

              <Input
                label="Phone Number"
                value={editFormPhone}
                onChange={(e) => setEditFormPhone(e.target.value)}
                placeholder="+27 82 123 4567"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-soft-gray ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  disabled
                  className="w-full bg-[#101010] border border-[#2C2C2C] text-[#71717A] rounded-lg px-4 py-3 cursor-not-allowed text-sm"
                />
                <span className="text-[11px] text-[#71717A] ml-1">
                  Email linked to your authentication account.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[#2C2C2C]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="text-xs sm:text-sm py-2.5 px-4 !border-[#2C2C2C]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="text-xs sm:text-sm py-2.5 px-5"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Vehicle Modal */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#2C2C2C]">
              <h3 className="text-lg font-bold font-display text-[#F5F5F5]">
                Add New Vehicle
              </h3>
              <button
                onClick={() => setIsAddVehicleOpen(false)}
                className="text-[#71717A] hover:text-[#F5F5F5] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddVehicle} className="flex flex-col gap-4 mt-5">
              <Input
                label="Registration Number *"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="e.g. ABC-1234"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Make *"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  placeholder="e.g. Tesla"
                  required
                />
                <Input
                  label="Model *"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="e.g. Model 3"
                  required
                />
              </div>

              <Input
                label="Colour"
                value={vehicleColor}
                onChange={(e) => setVehicleColor(e.target.value)}
                placeholder="e.g. Metallic Silver"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-soft-gray ml-1">
                  Preferred Wash Package
                </label>
                <select
                  value={vehiclePackage}
                  onChange={(e) => setVehiclePackage(e.target.value)}
                  className="w-full bg-[#101010] border border-[#2C2C2C] text-[#F5F5F5] rounded-lg px-4 py-3 outline-none focus:border-[#E86A33] text-sm"
                >
                  <option value="Standard Foam Wash">Standard Foam Wash</option>
                  <option value="Exterior & Interior Deep Clean">
                    Exterior & Interior Deep Clean
                  </option>
                  <option value="Ultimate Ceramic Wash">
                    Ultimate Ceramic Wash
                  </option>
                  <option value="Ceramic Coating Pro">
                    Ceramic Coating Pro
                  </option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[#2C2C2C]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="text-xs sm:text-sm py-2.5 px-4 !border-[#2C2C2C]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="text-xs sm:text-sm py-2.5 px-5"
                >
                  Add Vehicle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Edit Vehicle Modal */}
      {isEditVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#2C2C2C]">
              <h3 className="text-lg font-bold font-display text-[#F5F5F5]">
                Edit Vehicle
              </h3>
              <button
                onClick={() => setIsEditVehicleOpen(false)}
                className="text-[#71717A] hover:text-[#F5F5F5] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditVehicle} className="flex flex-col gap-4 mt-5">
              <Input
                label="Registration Number *"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="e.g. ABC-1234"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Make *"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  placeholder="e.g. Tesla"
                  required
                />
                <Input
                  label="Model *"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="e.g. Model 3"
                  required
                />
              </div>

              <Input
                label="Colour"
                value={vehicleColor}
                onChange={(e) => setVehicleColor(e.target.value)}
                placeholder="e.g. Metallic Silver"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-soft-gray ml-1">
                  Preferred Wash Package
                </label>
                <select
                  value={vehiclePackage}
                  onChange={(e) => setVehiclePackage(e.target.value)}
                  className="w-full bg-[#101010] border border-[#2C2C2C] text-[#F5F5F5] rounded-lg px-4 py-3 outline-none focus:border-[#E86A33] text-sm"
                >
                  <option value="Standard Foam Wash">Standard Foam Wash</option>
                  <option value="Exterior & Interior Deep Clean">
                    Exterior & Interior Deep Clean
                  </option>
                  <option value="Ultimate Ceramic Wash">
                    Ultimate Ceramic Wash
                  </option>
                  <option value="Ceramic Coating Pro">
                    Ceramic Coating Pro
                  </option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[#2C2C2C]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditVehicleOpen(false)}
                  className="text-xs sm:text-sm py-2.5 px-4 !border-[#2C2C2C]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="text-xs sm:text-sm py-2.5 px-5"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Delete Vehicle Confirmation Modal */}
      {vehicleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold font-display text-[#F5F5F5]">
              Remove Vehicle?
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-[#F5F5F5]">
                {vehicleToDelete.make} {vehicleToDelete.model} (
                {vehicleToDelete.plate})
              </strong>
              ? You can re-add it at any time.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setVehicleToDelete(null)}
                className="text-xs sm:text-sm py-2.5 !border-[#2C2C2C]"
              >
                Cancel
              </Button>
              <button
                onClick={handleConfirmDeleteVehicle}
                className="py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Booking Receipt / Details Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#2C2C2C]">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#E86A33]" />
                <h3 className="text-lg font-bold font-display text-[#F5F5F5]">
                  Booking Details
                </h3>
              </div>
              <button
                onClick={() => setActiveReceipt(null)}
                className="text-[#71717A] hover:text-[#F5F5F5] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 mt-5">
              <div className="flex justify-between items-center bg-[#101010] p-3.5 rounded-xl border border-[#2C2C2C]">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#71717A] block">
                    Order Ref
                  </span>
                  <span className="font-mono text-sm font-bold text-[#F5F5F5]">
                    {activeReceipt.id}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#35B86B]/15 text-[#35B86B] border border-[#35B86B]/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {activeReceipt.status}
                </span>
              </div>

              <div className="flex flex-col gap-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#2C2C2C]">
                  <span className="text-[#71717A]">Service Package</span>
                  <span className="font-semibold text-[#F5F5F5]">
                    {activeReceipt.service}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#2C2C2C]">
                  <span className="text-[#71717A]">Vehicle</span>
                  <span className="font-medium text-[#F5F5F5]">
                    {activeReceipt.vehicle}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#2C2C2C]">
                  <span className="text-[#71717A]">Date & Time</span>
                  <span className="font-medium text-[#F5F5F5]">
                    {activeReceipt.date} • {activeReceipt.time}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#71717A]">Total Paid</span>
                  <span className="font-bold text-[#E86A33] text-sm">
                    {activeReceipt.amount}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#2C2C2C] flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    showToast("Receipt downloaded as PDF", "success");
                    setActiveReceipt(null);
                  }}
                  className="w-full text-xs sm:text-sm py-2.5 !border-[#2C2C2C]"
                >
                  Download Receipt (PDF)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Transaction Details Modal */}
      {activeTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#2C2C2C]">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#E86A33]" />
                <h3 className="text-lg font-bold font-display text-[#F5F5F5]">
                  Transaction Receipt
                </h3>
              </div>
              <button
                onClick={() => setActiveTransaction(null)}
                className="text-[#71717A] hover:text-[#F5F5F5] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 mt-5 text-xs">
              <div className="bg-[#101010] p-4 rounded-xl border border-[#2C2C2C] flex flex-col items-center justify-center text-center">
                <span className="text-[11px] text-[#71717A]">Total Amount</span>
                <span className="text-2xl font-bold font-display text-[#F5F5F5] mt-1">
                  {activeTransaction.amount}
                </span>
                <span className="text-[11px] text-[#35B86B] font-medium mt-0.5">
                  {activeTransaction.status}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between py-1.5 border-b border-[#2C2C2C]">
                  <span className="text-[#71717A]">Description</span>
                  <span className="font-semibold text-[#F5F5F5]">
                    {activeTransaction.title}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#2C2C2C]">
                  <span className="text-[#71717A]">Transaction Ref</span>
                  <span className="font-mono text-[#F5F5F5]">
                    {activeTransaction.id}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#2C2C2C]">
                  <span className="text-[#71717A]">Date</span>
                  <span className="text-[#F5F5F5]">{activeTransaction.date}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#71717A]">Payment Method</span>
                  <span className="text-[#F5F5F5]">
                    Card ending in {activeTransaction.cardLast4}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  showToast("Invoice saved to downloads", "success");
                  setActiveTransaction(null);
                }}
                className="mt-4 text-xs sm:text-sm py-2.5 !border-[#2C2C2C]"
              >
                Download Statement
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Add Payment Card Modal */}
      {isAddCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#2C2C2C]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#E86A33]" />
                <h3 className="text-lg font-bold font-display text-[#F5F5F5]">
                  Add Card
                </h3>
              </div>
              <button
                onClick={() => setIsAddCardOpen(false)}
                className="text-[#71717A] hover:text-[#F5F5F5] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSavePaymentMethod}
              className="flex flex-col gap-4 mt-5"
            >
              <Input
                label="Cardholder Name *"
                value={newCardHolder}
                onChange={(e) => setNewCardHolder(e.target.value)}
                placeholder="Name on card"
                required
              />

              <Input
                label="Card Number *"
                value={newCardNumber}
                onChange={(e) => setNewCardNumber(e.target.value)}
                placeholder="4000 0000 0000 0000"
                maxLength={19}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Expires (MM/YY) *"
                  value={newCardExpiry}
                  onChange={(e) => setNewCardExpiry(e.target.value)}
                  placeholder="12/28"
                  maxLength={5}
                  required
                />
                <Input
                  label="CVC / CVV *"
                  type="password"
                  value={newCardCvc}
                  onChange={(e) => setNewCardCvc(e.target.value)}
                  placeholder="123"
                  maxLength={4}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[#2C2C2C]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddCardOpen(false)}
                  className="text-xs sm:text-sm py-2.5 px-4 !border-[#2C2C2C]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="text-xs sm:text-sm py-2.5 px-5"
                >
                  Save Card
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
