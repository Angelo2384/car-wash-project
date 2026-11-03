import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Phone,
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
  Camera,
  X,
  ChevronRight,
  MessageSquare,
  Star,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import UserAvatar from "../../../components/ui/UserAvatar";
import {
  getRewardsSummary,
  subscribeToRewards,
  getTierProgress,
  LOYALTY_TIERS,
  type RewardsSummary,
} from "../../../lib/rewards";
import {
  getStoredReviews,
  subscribeToCustomerReviews,
  calculateReviewStats,
  type ReviewStats,
} from "../../../lib/reviews";
import {
  getStoredAppointments,
  type StoredAppointment,
} from "../../../lib/appointments";
import {
  getStoredVehicles,
  saveCustomerVehicle,
  deleteCustomerVehicle,
  subscribeToCustomerVehicles,
  type CustomerVehicle,
} from "../../../lib/vehicles";
import { purgeSavedPaymentMethods } from "../../../lib/payments";
import EditProfileModal from "../../../components/customer/EditProfileModal";
import {
  avatarUrl,
  saveProfilePhotoUrl,
  uploadProfileImage,
  validateProfileImage,
} from "../../../lib/cloudinary";

const PREFERRED_PACKAGES = [
  "Express Wash",
  "Premium Wash",
  "Elite Wash",
  "Custom Package",
];

export default function CustomerProfile() {
  const navigate = useNavigate();
  const { currentUser, refreshUser } = useAuth();
  const { showToast } = useToast();
  const uid = currentUser?.uid;

  // ─── Real Profile Data (Auth + Scoped LocalStorage) ──────────────────────
  const [profileName, setProfileName] = useState<string>(() => {
    if (!uid) return currentUser?.displayName || "Customer";
    return (
      localStorage.getItem(`ww_profile_name_${uid}`) ||
      currentUser?.displayName ||
      "Customer"
    );
  });

  const [profilePhone, setProfilePhone] = useState<string>(() => {
    if (!uid) return "";
    return localStorage.getItem(`ww_profile_phone_${uid}`) || "";
  });

  // Profile picture lives on Cloudinary; its URL is stored on users/{uid}.photoURL
  const [profileAvatar, setProfileAvatar] = useState<string | null>(() => currentUser?.photoURL || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // ─── Real Membership State ────────────────────────────────────────────────
  const [hasMembership, setHasMembership] = useState<boolean>(() => {
    if (!uid) return false;
    const cached = localStorage.getItem(`ww_has_membership_${uid}`);
    return cached ? JSON.parse(cached) : false;
  });

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const mem = data?.hasMembership === true;
          setHasMembership(mem);
          localStorage.setItem(`ww_has_membership_${uid}`, JSON.stringify(mem));

          if ((data?.fullName || data?.displayName) && !localStorage.getItem(`ww_profile_name_${uid}`)) {
            setProfileName(data.fullName || data.displayName);
          }
          if ((data?.phone || data?.phoneNumber) && !localStorage.getItem(`ww_profile_phone_${uid}`)) {
            setProfilePhone(data.phone || data.phoneNumber);
          }
          if (data?.photoURL) {
            setProfileAvatar(data.photoURL);
          }
        }
      },
      (err) => {
        console.warn("Firestore user profile sync warning:", err);
      }
    );
    return () => unsub();
  }, [uid]);

  // ─── Real Rewards State ───────────────────────────────────────────────────
  const [rewardsSummary, setRewardsSummary] = useState<RewardsSummary>(() =>
    getRewardsSummary(uid)
  );

  useEffect(() => {
    const unsub = subscribeToRewards(uid, (data) => {
      setRewardsSummary(data);
    });
    return () => unsub();
  }, [uid]);

  const tierProgress = getTierProgress(rewardsSummary.lifetimePoints);
  const currentTierObj =
    LOYALTY_TIERS[rewardsSummary.currentTier] || LOYALTY_TIERS.Unranked;
  const nextTierObj = tierProgress.nextTier;

  // ─── Real Reviews State ───────────────────────────────────────────────────
  const [reviewStats, setReviewStats] = useState<ReviewStats>(() =>
    calculateReviewStats(getStoredReviews(uid))
  );

  useEffect(() => {
    const unsub = subscribeToCustomerReviews(uid, (revs) => {
      setReviewStats(calculateReviewStats(revs));
    });
    return () => unsub();
  }, [uid]);

  // ─── Real Vehicles State ──────────────────────────────────────────────────
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>(() =>
    getStoredVehicles(uid)
  );

  useEffect(() => {
    const unsub = subscribeToCustomerVehicles(uid, (list) => {
      setVehicles(list);
    });
    return () => unsub();
  }, [uid]);

  // ─── Real Appointments State ──────────────────────────────────────────────
  const [appointments, setAppointments] = useState<StoredAppointment[]>(() =>
    getStoredAppointments(uid)
  );

  useEffect(() => {
    // Initial fetch and handle local changes
    const handleApptsChange = () => {
      setAppointments(getStoredAppointments(uid));
    };
    handleApptsChange();

    window.addEventListener("storage", handleApptsChange);
    return () => {
      window.removeEventListener("storage", handleApptsChange);
    };
  }, [uid]);

  // Paystack handles payments, so any card details saved by older versions are removed
  useEffect(() => {
    purgeSavedPaymentMethods(uid);
  }, [uid]);

  // ─── Modals State ─────────────────────────────────────────────────────────
  // Edit Profile Modal
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Add / Edit Vehicle Modal
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehMake, setVehMake] = useState("");
  const [vehModel, setVehModel] = useState("");
  const [vehPlate, setVehPlate] = useState("");
  const [vehColor, setVehColor] = useState("");
  const [vehPreferredPackage, setVehPreferredPackage] = useState("Express Wash");
  const [vehErrors, setVehErrors] = useState<Record<string, string>>({});
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);

  // Delete Vehicle Confirmation
  const [deletingVehicle, setDeletingVehicle] = useState<CustomerVehicle | null>(null);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false);



  // Receipt Modal
  const [viewingReceipt, setViewingReceipt] = useState<StoredAppointment | null>(null);

  // ─── Profile Photo Upload Handler ─────────────────────────────────────────
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file || !auth.currentUser) return;

    const problem = validateProfileImage(file);
    if (problem) {
      showToast(problem, "error");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const url = await uploadProfileImage(file);
      await saveProfilePhotoUrl(auth.currentUser, url);
      setProfileAvatar(url);
      refreshUser();
      showToast("Profile photo updated.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't update your photo. Try again.", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ─── Vehicle Handlers ─────────────────────────────────────────────────────
  const openAddVehicleModal = () => {
    setEditingVehicleId(null);
    setVehMake("");
    setVehModel("");
    setVehPlate("");
    setVehColor("");
    setVehPreferredPackage("Express Wash");
    setVehErrors({});
    setIsVehicleModalOpen(true);
  };

  const openEditVehicleModal = (veh: CustomerVehicle) => {
    setEditingVehicleId(veh.id);
    setVehMake(veh.make);
    setVehModel(veh.model);
    setVehPlate(veh.plate);
    setVehColor(veh.color);
    setVehPreferredPackage(veh.preferredPackage || "Express Wash");
    setVehErrors({});
    setIsVehicleModalOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!vehMake.trim()) errors.make = "Vehicle make is required";
    if (!vehModel.trim()) errors.model = "Vehicle model is required";
    if (!vehPlate.trim()) errors.plate = "Licence plate is required";
    if (!vehColor.trim()) errors.color = "Vehicle colour is required";

    if (Object.keys(errors).length > 0) {
      setVehErrors(errors);
      return;
    }

    setIsSavingVehicle(true);
    const vehicleData: CustomerVehicle = {
      id: editingVehicleId || `veh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      make: vehMake.trim(),
      model: vehModel.trim(),
      plate: vehPlate.trim().toUpperCase(),
      color: vehColor.trim(),
      preferredPackage: vehPreferredPackage,
      createdAt: Date.now(),
    };

    try {
      const ok = await saveCustomerVehicle(vehicleData, uid);
      if (ok) {
        showToast(
          editingVehicleId
            ? "Vehicle updated successfully!"
            : "Vehicle added to your account!",
          "success"
        );
        setIsVehicleModalOpen(false);
      } else {
        showToast("Failed to save vehicle.", "error");
      }
    } catch {
      showToast("Something went wrong saving vehicle.", "error");
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const handleConfirmDeleteVehicle = async () => {
    if (!deletingVehicle) return;
    setIsDeletingVehicle(true);
    try {
      const ok = await deleteCustomerVehicle(deletingVehicle.id, uid);
      if (ok) {
        showToast("Vehicle removed from account.", "success");
        setDeletingVehicle(null);
      } else {
        showToast("Failed to delete vehicle.", "error");
      }
    } catch {
      showToast("Error deleting vehicle.", "error");
    } finally {
      setIsDeletingVehicle(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-16 text-[#F5F5F5] animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-forwards">
      {/* ─── 2. SECTION 1: PROFILE OVERVIEW & LOYALTY REWARDS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Profile Overview Card (7 cols) */}
        <div className="lg:col-span-7 bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#3C3C3C] transition-all">
          {/* Subtle Top Accent */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E86A33] via-[#E86A33]/50 to-transparent" />

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              {/* Avatar + Main Details */}
              <div className="flex items-center gap-4">
                <div className="relative group/avatar">
                  <UserAvatar
                    photoURL={avatarUrl(profileAvatar, 160)}
                    className={`w-20 h-20 rounded-2xl shadow-md transition-opacity ${isUploadingAvatar ? "opacity-50" : ""}`}
                    iconClassName="w-9 h-9"
                  />

                  {/* Upload Avatar Overlay Button */}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-[#1F1F1F] border border-[#2C2C2C] text-[#A1A1AA] hover:text-[#E86A33] hover:border-[#E86A33] transition-colors shadow-lg cursor-pointer"
                    title={isUploadingAvatar ? "Uploading photo…" : "Change Profile Photo"}
                    aria-label={isUploadingAvatar ? "Uploading photo" : "Change Profile Photo"}
                  >
                    <Camera className={`w-3.5 h-3.5 ${isUploadingAvatar ? "animate-pulse" : ""}`} />
                  </button>
                </div>

                <div className="flex flex-col">
                  <h2 className="text-xl sm:text-2xl font-bold font-display text-[#F5F5F5] tracking-tight">
                    {profileName}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-[#A1A1AA] mt-1">
                    <Mail className="w-3.5 h-3.5 text-[#71717A]" />
                    <span className="truncate max-w-[200px] sm:max-w-none">
                      {currentUser?.email || "customer@washwizzy.com"}
                    </span>
                  </div>
                  {profilePhone ? (
                    <div className="flex items-center gap-2 text-xs text-[#A1A1AA] mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-[#71717A]" />
                      <span>{profilePhone}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#71717A] mt-0.5">
                      No phone number added
                    </span>
                  )}
                </div>
              </div>

              {/* Edit Profile Button */}
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditProfileOpen(true);
                }}
                className="text-xs py-2 px-4 !border-[#2C2C2C] hover:!border-[#E86A33] hover:!text-[#E86A33] self-start sm:self-auto"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Details
              </Button>
            </div>

            {/* Membership Summary Banner inside Profile Card */}
            <div className="mt-6 pt-5 border-t border-[#2C2C2C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101010]/80 p-4 rounded-xl border border-[#2C2C2C]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E86A33]/15 border border-[#E86A33]/30 flex items-center justify-center text-[#E86A33] shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-display text-[#F5F5F5]">
                      {hasMembership ? "Diamond Elite Membership" : "Free Tier"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        hasMembership
                          ? "bg-[#35B86B]/15 text-[#35B86B] border border-[#35B86B]/30"
                          : "bg-[#1F1F1F] text-[#A1A1AA] border border-[#2C2C2C]"
                      }`}
                    >
                      {hasMembership ? "Active" : "Standard"}
                    </span>
                  </div>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    {hasMembership
                      ? "Zero call-out fees, 20% savings & 1.5x rewards."
                      : "Upgrade for unlimited free call-outs & VIP savings."}
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate("/dashboard/customer/membership")}
                className="text-xs font-semibold text-[#E86A33] hover:text-[#FFA26B] transition-colors flex items-center gap-1 self-start sm:self-auto shrink-0 cursor-pointer"
              >
                {hasMembership ? "Manage Membership" : "Upgrade to VIP"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Loyalty Points Card (5 cols) */}
        <div className="lg:col-span-5 bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#3C3C3C] transition-all">
          {/* Top Green Accent */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#35B86B] via-[#35B86B]/50 to-transparent" />

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#71717A] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#35B86B]" />
                Loyalty Balance
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${currentTierObj.badgeColor}`}
              >
                {currentTierObj.name} Tier
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl sm:text-5xl font-black font-display text-[#F5F5F5] tracking-tight">
                  {rewardsSummary.pointsBalance.toLocaleString()}
                </span>
                <span className="text-sm text-[#35B86B] font-bold">PTS</span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Lifetime Points Earned:{" "}
                <strong className="text-[#F5F5F5]">
                  {rewardsSummary.lifetimePoints.toLocaleString()} PTS
                </strong>
              </p>
            </div>

            {/* Next Tier Progress Bar */}
            <div className="mt-5 bg-[#101010] p-3.5 rounded-xl border border-[#2C2C2C]">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="font-semibold text-[#F5F5F5]">
                  {tierProgress.isHighestTier ? (
                    "Maximum Tier Achieved"
                  ) : (
                    <>
                      Next Tier:{" "}
                      <span className="text-[#E86A33]">{nextTierObj?.name}</span>
                    </>
                  )}
                </span>
                <span className="text-[#35B86B] font-semibold text-[11px]">
                  {tierProgress.isHighestTier
                    ? "All perks unlocked"
                    : `${tierProgress.pointsToNext.toLocaleString()} pts to go`}
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#1F1F1F] rounded-full overflow-hidden p-0.5 border border-[#2C2C2C]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#E86A33] to-[#35B86B] transition-all duration-500"
                  style={{ width: `${tierProgress.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#2C2C2C]">
            <Button
              variant="outline"
              fullWidth
              onClick={() => navigate("/dashboard/customer/rewards")}
              className="py-2.5 text-xs font-semibold !border-[#2C2C2C] hover:!border-[#35B86B] hover:!text-[#35B86B] flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4 text-[#35B86B]" />
              View Rewards & Vouchers
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ─── 3. SECTION 2: MY VEHICLES & QUICK SHORTCUTS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: My Vehicles (8 cols) */}
        <div className="lg:col-span-8 bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-7 flex flex-col shadow-lg">
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
              onClick={openAddVehicleModal}
              className="text-xs py-2 px-3.5"
            >
              <Plus className="w-4 h-4" />
              Add Vehicle
            </Button>
          </div>

          {/* Vehicle Cards Grid */}
          {vehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="bg-[#101010] border border-[#2C2C2C] hover:border-[#E86A33]/50 rounded-xl p-4 flex flex-col justify-between transition-all group shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1F1F1F] border border-[#2C2C2C] flex items-center justify-center shrink-0 text-[#E86A33]">
                          <Car className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-mono text-xs font-bold tracking-wider px-2 py-0.5 rounded bg-[#1F1F1F] text-[#F5F5F5] border border-[#2C2C2C]">
                            {v.plate}
                          </span>
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
                          onClick={() => setDeletingVehicle(v)}
                          className="p-1.5 rounded-lg text-[#71717A] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete Vehicle"
                          aria-label="Delete Vehicle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3.5 flex flex-col gap-1.5 text-xs text-[#A1A1AA]">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#E86A33]" />
                        <span className="text-[#71717A]">Colour:</span>
                        <span className="font-medium text-[#D8D5CF]">{v.color}</span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-[#1F1F1F] flex items-center justify-between">
                        <span className="text-[11px] text-[#71717A]">
                          Preferred Package:
                        </span>
                        <span className="text-[11px] font-semibold text-[#E86A33] truncate max-w-[150px]">
                          {v.preferredPackage || "Express Wash"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 flex flex-col items-center justify-center text-center text-[#71717A] border border-dashed border-[#2C2C2C] rounded-xl mt-5">
              <div className="w-12 h-12 rounded-xl bg-[#1F1F1F] border border-[#2C2C2C] flex items-center justify-center text-[#71717A] mb-3">
                <Car className="w-6 h-6 text-[#E86A33]" />
              </div>
              <p className="text-sm font-semibold text-[#F5F5F5]">
                No vehicles added yet
              </p>
              <p className="text-xs text-[#71717A] mt-1 max-w-xs">
                Add your vehicle details once to enjoy automatic 1-click selection during booking.
              </p>
              <Button
                variant="outline"
                onClick={openAddVehicleModal}
                className="mt-4 text-xs py-2 px-4 !border-[#2C2C2C] hover:!border-[#E86A33]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Your First Vehicle
              </Button>
            </div>
          )}
        </div>

        {/* Right: Quick Book & My Reviews (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Quick Book Card */}
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-[#2C2C2C]">
                <Sparkles className="w-4 h-4 text-[#E86A33]" />
                <h2 className="text-base font-bold font-display text-[#F5F5F5]">
                  Quick Book
                </h2>
              </div>
              <p className="text-xs text-[#71717A] mt-2 mb-3">
                Instant booking for our most popular car care packages.
              </p>

              {/* Service 1: Express Wash */}
              <div className="flex flex-col gap-2.5">
                <div className="bg-[#101010] border border-[#2C2C2C] hover:border-[#E86A33]/50 rounded-xl p-3 flex items-center justify-between transition-all">
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-[#F5F5F5]">
                      Express Wash
                    </span>
                    <span className="text-[10px] text-[#71717A]">
                      Quick exterior & wheel clean
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-[#E86A33]">R75</span>
                    <button
                      onClick={() =>
                        navigate("/dashboard/customer/booking", {
                          state: { packageId: "express" },
                        })
                      }
                      className="px-2.5 py-1 text-xs font-semibold bg-[#E86A33]/15 text-[#E86A33] hover:bg-[#E86A33] hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Book
                    </button>
                  </div>
                </div>

                {/* Service 2: Premium Wash */}
                <div className="bg-[#101010] border border-[#2C2C2C] hover:border-[#E86A33]/50 rounded-xl p-3 flex items-center justify-between transition-all">
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-[#F5F5F5]">
                      Premium Wash
                    </span>
                    <span className="text-[10px] text-[#35B86B]">
                      Most Popular Detail
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-[#E86A33]">R275</span>
                    <button
                      onClick={() =>
                        navigate("/dashboard/customer/booking", {
                          state: { packageId: "premium" },
                        })
                      }
                      className="px-2.5 py-1 text-xs font-semibold bg-[#E86A33]/15 text-[#E86A33] hover:bg-[#E86A33] hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Book
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#2C2C2C]">
              <Button
                variant="outline"
                fullWidth
                onClick={() => navigate("/dashboard/customer/packages")}
                className="text-xs py-2 !border-[#2C2C2C] hover:!border-[#E86A33] hover:!text-[#E86A33]"
              >
                View All Wash Packages
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* My Reviews Card */}
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#E86A33]/40 transition-all">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#2C2C2C]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#E86A33]" />
                  <h2 className="text-base font-bold font-display text-[#F5F5F5]">
                    My Reviews
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1F1F1F] text-[#A1A1AA] border border-[#2C2C2C]">
                  {reviewStats.totalReviews}
                </span>
              </div>

              {reviewStats.totalReviews > 0 ? (
                <div className="mt-3.5 flex flex-col gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-display text-[#F5F5F5]">
                      {reviewStats.averageRatingDisplay}
                    </span>
                    <span className="text-xs text-[#71717A] font-medium">/ 5.0</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= Math.round(reviewStats.averageRating)
                            ? "text-[#E86A33] fill-[#E86A33]"
                            : "text-[#2C2C2C] fill-transparent"
                        }`}
                      />
                    ))}
                    <span className="text-xs text-[#A1A1AA] ml-1 font-medium">
                      ({reviewStats.totalReviews}{" "}
                      {reviewStats.totalReviews === 1 ? "Review" : "Reviews"})
                    </span>
                  </div>

                  <p className="text-xs text-[#71717A] mt-1 truncate">
                    Most reviewed:{" "}
                    <span className="text-[#D4D4D4] font-medium">
                      {reviewStats.mostReviewedService}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="mt-3.5 flex flex-col gap-1">
                  <p className="text-sm font-semibold text-[#F5F5F5]">
                    No reviews yet
                  </p>
                  <p className="text-xs text-[#71717A]">
                    Share feedback on your washes to earn loyalty points.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#2C2C2C]">
              <button
                onClick={() => navigate("/dashboard/customer/reviews")}
                className="w-full flex items-center justify-between text-xs font-semibold text-[#E86A33] hover:text-[#FFA26B] transition-colors py-1 cursor-pointer"
              >
                <span>
                  {reviewStats.totalReviews > 0
                    ? "View My Reviews"
                    : "Write your first review"}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. SECTION 3: RECENT BOOKINGS (CONNECTED TO REAL APPOINTMENTS) ─── */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-7 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-[#2C2C2C]">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[#E86A33]" />
            <h2 className="text-lg font-bold font-display text-[#F5F5F5]">
              Recent Bookings
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1F1F1F] text-[#A1A1AA] border border-[#2C2C2C]">
              {appointments.length}
            </span>
          </div>
          {appointments.length > 0 && (
            <button
              onClick={() => navigate("/dashboard/customer/appointments")}
              className="text-xs sm:text-sm font-semibold text-[#E86A33] hover:underline flex items-center gap-1 cursor-pointer"
            >
              View All Appointments
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {appointments.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2C2C2C] text-[11px] uppercase tracking-wider text-[#71717A]">
                  <th className="py-3 px-3">Service & Date</th>
                  <th className="py-3 px-3 hidden sm:table-cell">Vehicle</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2C2C2C] text-xs sm:text-sm">
                {appointments.slice(0, 5).map((appt) => {
                  const isCancelled = appt.status === "Cancelled";
                  const isCompleted = appt.status === "Completed";
                  const isWaiting = appt.confirmed === false;

                  const displayStatus = isWaiting
                    ? "Awaiting Confirmation"
                    : appt.status;

                  return (
                    <tr
                      key={appt.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-[#F5F5F5]">
                          {appt.packageName}
                        </div>
                        <div className="text-[11px] text-[#71717A] flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-[#E86A33]" />
                          {appt.date} • {appt.time}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 hidden sm:table-cell text-[#D8D5CF]">
                        {appt.vehicle || "Customer Vehicle"}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isCompleted
                              ? "bg-[#35B86B]/15 text-[#35B86B] border-[#35B86B]/30"
                              : isCancelled
                              ? "bg-red-500/15 text-red-400 border-red-500/30"
                              : isWaiting
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                              : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-[#F5F5F5]">
                        {appt.price}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isCompleted ? (
                            <button
                              onClick={() => setViewingReceipt(appt)}
                              className="text-xs font-semibold text-[#35B86B] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Receipt className="w-3 h-3" />
                              Receipt
                            </button>
                          ) : !isCancelled ? (
                            <button
                              onClick={() =>
                                navigate(
                                  "/dashboard/customer/appointments/reschedule",
                                  { state: { appointment: appt } }
                                )
                              }
                              className="text-xs font-semibold text-[#E86A33] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reschedule
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#71717A]">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center text-center text-[#71717A] border border-dashed border-[#2C2C2C] rounded-xl mt-4">
            <div className="w-12 h-12 rounded-xl bg-[#1F1F1F] border border-[#2C2C2C] flex items-center justify-center text-[#71717A] mb-3">
              <Calendar className="w-6 h-6 text-[#E86A33]" />
            </div>
            <p className="text-sm font-semibold text-[#F5F5F5]">
              No bookings yet
            </p>
            <p className="text-xs text-[#71717A] mt-1 max-w-xs">
              Book your first mobile wash or drive-in detail to see your real appointment schedule here.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate("/dashboard/customer/booking")}
              className="mt-4 text-xs py-2 px-4"
            >
              Book a Wash Now
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ─── 5. SECTION 4: PAYMENTS ─── */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-7 shadow-lg">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#2C2C2C]">
          <CreditCard className="w-5 h-5 text-[#E86A33]" />
          <h2 className="text-lg font-bold font-display text-[#F5F5F5]">Payments</h2>
        </div>
        <div className="flex items-start gap-3 mt-5">
          <ShieldCheck className="w-5 h-5 text-[#35B86B] shrink-0 mt-0.5" />
          <p className="text-sm text-[#A1A1AA] leading-relaxed">
            Payments are handled by <span className="text-[#F5F5F5] font-semibold">Paystack</span>. You pay in Paystack's secure
            window each time you book, and WashWizzy never sees or stores your card details.
          </p>
        </div>
      </div>

      {/* ─── 6. MODALS ─── */}

      {/* Modal 1: Edit Profile */}
      {isEditProfileOpen && (
        <EditProfileModal
          initialName={profileName}
          initialPhone={profilePhone}
          onClose={() => setIsEditProfileOpen(false)}
          onSaved={({ name, phone }) => {
            setProfileName(name);
            setProfilePhone(phone);
          }}
        />
      )}

      {/* Modal 2: Add / Edit Vehicle */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#171717] border border-[#2C2C2C] rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col gap-5 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E86A33] via-[#E86A33]/50 to-transparent" />

            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold font-display text-[#F5F5F5]">
                  {editingVehicleId ? "Edit Vehicle" : "Add New Vehicle"}
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  Save your car details for faster scheduling
                </p>
              </div>
              <button
                onClick={() => setIsVehicleModalOpen(false)}
                className="text-[#71717A] hover:text-[#F5F5F5] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Make *"
                  placeholder="e.g. BMW"
                  value={vehMake}
                  onChange={(e) => {
                    setVehMake(e.target.value);
                    if (vehErrors.make) setVehErrors((p) => ({ ...p, make: "" }));
                  }}
                  error={vehErrors.make}
                  required
                />
                <Input
                  label="Model *"
                  placeholder="e.g. M4"
                  value={vehModel}
                  onChange={(e) => {
                    setVehModel(e.target.value);
                    if (vehErrors.model) setVehErrors((p) => ({ ...p, model: "" }));
                  }}
                  error={vehErrors.model}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Licence Plate *"
                  placeholder="e.g. CA 123 456"
                  value={vehPlate}
                  onChange={(e) => {
                    setVehPlate(e.target.value);
                    if (vehErrors.plate) setVehErrors((p) => ({ ...p, plate: "" }));
                  }}
                  error={vehErrors.plate}
                  required
                />
                <Input
                  label="Colour *"
                  placeholder="e.g. Metallic Black"
                  value={vehColor}
                  onChange={(e) => {
                    setVehColor(e.target.value);
                    if (vehErrors.color) setVehErrors((p) => ({ ...p, color: "" }));
                  }}
                  error={vehErrors.color}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                  Preferred Wash Package
                </label>
                <select
                  value={vehPreferredPackage}
                  onChange={(e) => setVehPreferredPackage(e.target.value)}
                  className="w-full bg-[#101010] border border-[#2C2C2C] focus:border-[#E86A33] text-[#F5F5F5] rounded-xl px-3.5 py-2.5 text-xs outline-none cursor-pointer"
                >
                  {PREFERRED_PACKAGES.map((pkg) => (
                    <option key={pkg} value={pkg}>
                      {pkg}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVehicleModalOpen(false)}
                  disabled={isSavingVehicle}
                  className="flex-1 py-2.5 text-xs !border-[#2C2C2C]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSavingVehicle}
                  className="flex-1 py-2.5 text-xs font-semibold"
                >
                  {editingVehicleId ? "Save Changes" : "Add Vehicle"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Delete Vehicle Confirmation */}
      {deletingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden text-center flex flex-col items-center">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500" />
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold font-display text-[#F5F5F5]">
              Delete Vehicle?
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-1 mb-6 max-w-xs">
              Are you sure you want to remove{" "}
              <strong className="text-[#F5F5F5]">
                {deletingVehicle.make} {deletingVehicle.model} ({deletingVehicle.plate})
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="flex items-center gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingVehicle(null)}
                disabled={isDeletingVehicle}
                className="flex-1 py-2.5 text-xs !border-[#2C2C2C]"
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleConfirmDeleteVehicle}
                disabled={isDeletingVehicle}
                className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeletingVehicle ? "Deleting..." : "Delete Vehicle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Real Booking Receipt */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#171717] border border-[#2C2C2C] rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col gap-5 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#35B86B] via-[#35B86B]/50 to-transparent" />

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#35B86B]/15 border border-[#35B86B]/30 flex items-center justify-center text-[#35B86B]">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-[#F5F5F5]">
                    Service Receipt
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">
                    Appointment ID: {viewingReceipt.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingReceipt(null)}
                className="text-[#71717A] hover:text-[#F5F5F5] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                aria-label="Close receipt"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4 flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#2C2C2C]">
                <span className="text-[#71717A]">Package</span>
                <span className="font-bold text-[#F5F5F5]">
                  {viewingReceipt.packageName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">Date & Time</span>
                <span className="font-medium text-[#F5F5F5]">
                  {viewingReceipt.date} • {viewingReceipt.time}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">Vehicle</span>
                <span className="font-medium text-[#F5F5F5]">
                  {viewingReceipt.vehicle || "Customer Vehicle"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">Service Type</span>
                <span className="font-medium text-[#F5F5F5]">
                  {viewingReceipt.serviceType || "Mobile Call-out"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#2C2C2C]">
                <span className="text-sm font-bold text-[#F5F5F5]">
                  Amount Paid
                </span>
                <span className="text-base font-extrabold text-[#E86A33]">
                  {viewingReceipt.price}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              onClick={() => setViewingReceipt(null)}
              className="py-2.5 text-xs font-semibold"
            >
              Close Receipt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
