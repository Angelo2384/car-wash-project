import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Star,
  CheckCircle2,
  MessageSquare,
  Camera,
  Calendar,
  Lock,
  Edit2,
  X,
  Check,
  ArrowRight,
  Car,
} from "lucide-react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import {
  avatarUrl,
  uploadProfileImage,
  validateProfileImage,
  saveProfilePhotoUrl,
} from "../../../lib/cloudinary";
import {
  subscribeToStaffAppointments,
  type StoredAppointment,
} from "../../../lib/appointments";
import {
  subscribeToStaffReviews,
  calculateStaffReviewStats,
  type CustomerReview,
  type StaffReviewStats,
} from "../../../lib/reviews";

export default function StaffProfile() {
  const { currentUser, loading: authLoading, refreshUser } = useAuth();
  const { showToast } = useToast();
  const uid = currentUser?.uid;

  // ─── Profile State ────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState<string>(() => {
    if (!uid) return currentUser?.displayName || "Staff Member";
    return (
      localStorage.getItem(`ww_profile_name_${uid}`) ||
      currentUser?.displayName ||
      "Staff Member"
    );
  });

  const [phone, setPhone] = useState<string>(() => {
    if (!uid) return "";
    return localStorage.getItem(`ww_profile_phone_${uid}`) || "";
  });

  const [employeeId, setEmployeeId] = useState<string>("");
  const [email, setEmail] = useState<string>(currentUser?.email || "");
  const [createdAtStr, setCreatedAtStr] = useState<string>("");
  const [photoURL, setPhotoURL] = useState<string | null>(currentUser?.photoURL || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // ─── Edit Mode State ──────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(displayName);
  const [editPhone, setEditPhone] = useState(phone);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Metrics State ────────────────────────────────────────────────────────
  const [completedWashesCount, setCompletedWashesCount] = useState<number>(0);
  const [staffReviews, setStaffReviews] = useState<CustomerReview[]>([]);
  const [stats, setStats] = useState<StaffReviewStats>({
    totalReviews: 0,
    thisMonthCount: 0,
    averageRating: 0,
    averageRatingDisplay: "0.0",
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  // ─── Real-time Firestore Profile Sync ──────────────────────────────────────
  useEffect(() => {
    if (!uid) return;

    const userDocRef = doc(db, "users", uid);
    const unsub = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const name =
            data.displayName ||
            data.fullName ||
            currentUser?.displayName ||
            "Staff Member";
          const ph = data.phone || data.phoneNumber || "";
          const emp = data.employeeId || "";
          const em = data.email || currentUser?.email || "";

          setDisplayName(name);
          setPhone(ph);
          setEmployeeId(emp);
          setEmail(em);

          if (data.photoURL) {
            setPhotoURL(data.photoURL);
          } else if (currentUser?.photoURL) {
            setPhotoURL(currentUser.photoURL);
          }

          // Format account creation date
          if (data.createdAt?.toDate) {
            const dateObj = data.createdAt.toDate();
            setCreatedAtStr(
              dateObj.toLocaleDateString("en-ZA", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            );
          } else if (currentUser?.metadata?.creationTime) {
            const dateObj = new Date(currentUser.metadata.creationTime);
            setCreatedAtStr(
              dateObj.toLocaleDateString("en-ZA", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            );
          }
        }
      },
      (err) => {
        console.warn("Firestore staff profile sync error:", err);
      }
    );

    return () => unsub();
  }, [uid, currentUser]);

  const handleStartEditing = () => {
    setEditName(displayName);
    setEditPhone(phone);
    setErrors({});
    setIsEditing(true);
  };

  // ─── Real-time Appointments Sync for Completed Washes Count ───────────────
  useEffect(() => {
    if (authLoading || !uid) return;

    const unsub = subscribeToStaffAppointments(
      uid,
      (list: StoredAppointment[]) => {
        const completed = list.filter(
          (a) => a.completed === true || a.status === "Completed"
        );
        setCompletedWashesCount(completed.length);
      },
      (err) => {
        console.warn("Error fetching staff appointments for profile:", err);
      }
    );

    return () => unsub();
  }, [uid, authLoading]);

  // ─── Real-time Reviews Sync for Staff Review Stats ────────────────────────
  useEffect(() => {
    if (authLoading || !uid) return;

    const unsub = subscribeToStaffReviews(
      uid,
      (reviews: CustomerReview[]) => {
        setStaffReviews(reviews);
        setStats(calculateStaffReviewStats(reviews));
      },
      (err) => {
        console.warn("Error fetching staff reviews for profile:", err);
      }
    );

    return () => unsub();
  }, [uid, authLoading]);

  // ─── Photo Upload Handler ─────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !auth.currentUser) return;

    const problem = validateProfileImage(file);
    if (problem) {
      showToast(problem, "error");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const url = await uploadProfileImage(file);
      await saveProfilePhotoUrl(auth.currentUser, url);
      setPhotoURL(url);
      if (uid) {
        localStorage.setItem(`ww_profile_avatar_${uid}`, url);
      }
      refreshUser();
      showToast("Profile photo updated successfully!", "success");
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to update profile photo.",
        "error"
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // ─── Save Profile Details Handler ─────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; phone?: string } = {};

    const trimmedName = editName.trim();
    const trimmedPhone = editPhone.trim();

    if (!trimmedName) {
      newErrors.name = "Full name is required.";
    } else if (trimmedName.length < 2) {
      newErrors.name = "Full name must be at least 2 characters.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      if (uid && auth.currentUser) {
        // 1. Update Firebase Auth displayName
        await updateProfile(auth.currentUser, { displayName: trimmedName });

        // 2. Update Firestore user document persistently
        const userDocRef = doc(db, "users", uid);
        await setDoc(
          userDocRef,
          {
            displayName: trimmedName,
            fullName: trimmedName,
            phone: trimmedPhone,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // 3. Cache in localStorage so changes immediately persist across refresh and tabs
        localStorage.setItem(`ww_profile_name_${uid}`, trimmedName);
        localStorage.setItem(`ww_profile_phone_${uid}`, trimmedPhone);
      }

      setDisplayName(trimmedName);
      setPhone(trimmedPhone);
      refreshUser();
      window.dispatchEvent(new Event("storage"));
      showToast("Profile details updated successfully!", "success");
      setIsEditing(false);
    } catch (err: unknown) {
      console.error("Failed to update staff profile:", err);
      showToast("Could not save profile changes. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Initials Fallback ────────────────────────────────────────────────────
  const getInitials = (name: string): string => {
    if (!name) return "ST";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formattedAvatarUrl = avatarUrl(photoURL, 180);
  const recentReviews = staffReviews.slice(0, 3);

  return (
    <div className="w-full flex flex-col gap-6 pb-12">
      {/* ─── 1. Profile Header / Summary Card ─────────────────────────────── */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E86A33] via-[#FFA26B] to-[#E86A33]" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* Avatar with Initials Fallback and Upload Button */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-[#2C2C2C] bg-[#1F1F1F] flex items-center justify-center shadow-lg relative">
              {formattedAvatarUrl ? (
                <img
                  src={formattedAvatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#E86A33]/20 via-[#1F1F1F] to-[#101010] flex items-center justify-center">
                  <span className="text-2xl sm:text-3xl font-black font-display text-[#E86A33] tracking-wider">
                    {getInitials(displayName)}
                  </span>
                </div>
              )}

              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#E86A33] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {/* Camera action pill */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-[#E86A33] hover:bg-[#CC5A2A] text-white shadow-md transition-all transform hover:scale-110 active:scale-95 cursor-pointer disabled:opacity-50"
              title="Upload new profile picture"
              aria-label="Upload profile picture"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Identity & Status */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5">
                  <h1 className="text-2xl sm:text-3xl font-black font-display text-[#F5F5F5] tracking-tight truncate">
                    {displayName}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E86A33]/15 text-[#E86A33] border border-[#E86A33]/30">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Staff Member
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1">
                  <span>WashWizzy Certified Specialist</span>
                  {createdAtStr && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-[#71717A]">
                        <Calendar className="w-3.5 h-3.5" />
                        Joined {createdAtStr}
                      </span>
                    </>
                  )}
                </p>
              </div>

              {!isEditing && (
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#1F1F1F] hover:bg-[#2C2C2C] text-[#F5F5F5] border border-[#2C2C2C] hover:border-[#3C3C3C] transition-all cursor-pointer shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#E86A33]" />
                  Edit Profile
                </button>
              )}
            </div>

            {/* Quick Badges / Meta Strip */}
            <div className="mt-4 pt-4 border-t border-[#2C2C2C]/60 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-[#A1A1AA]">
              {employeeId && (
                <div className="flex items-center gap-1.5 bg-[#101010] px-3 py-1.5 rounded-lg border border-[#2C2C2C]">
                  <span className="text-[#71717A] font-medium">Employee ID:</span>
                  <span className="text-[#F5F5F5] font-mono font-bold">{employeeId}</span>
                </div>
              )}
              {email && (
                <div className="flex items-center gap-1.5 bg-[#101010] px-3 py-1.5 rounded-lg border border-[#2C2C2C]">
                  <Mail className="w-3.5 h-3.5 text-[#71717A]" />
                  <span className="text-[#F5F5F5]">{email}</span>
                </div>
              )}
              {phone ? (
                <div className="flex items-center gap-1.5 bg-[#101010] px-3 py-1.5 rounded-lg border border-[#2C2C2C]">
                  <Phone className="w-3.5 h-3.5 text-[#71717A]" />
                  <span className="text-[#F5F5F5]">{phone}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-[#101010] px-3 py-1.5 rounded-lg border border-[#2C2C2C] text-[#71717A] italic">
                  <Phone className="w-3.5 h-3.5" />
                  No phone set
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. Edit Profile Form (Inline when toggled) ───────────────────── */}
      {isEditing && (
        <div className="bg-[#171717] border border-[#E86A33]/40 rounded-2xl p-6 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#2C2C2C] pb-3 mb-5">
            <div className="flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-[#E86A33]" />
              <h2 className="text-base font-bold font-display text-[#F5F5F5]">
                Edit Personal Information
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-[#71717A] hover:text-[#F5F5F5] p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Editable Name */}
              <Input
                label="Full Name *"
                type="text"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                error={errors.name}
                icon={<User className="w-4 h-4" />}
                placeholder="Your full registered name"
              />

              {/* Editable Phone */}
              <Input
                label="Phone Number"
                type="tel"
                value={editPhone}
                onChange={(e) => {
                  setEditPhone(e.target.value);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                error={errors.phone}
                icon={<Phone className="w-4 h-4" />}
                placeholder="e.g. +27 82 123 4567"
              />

              {/* Read-only Employee ID */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-[#71717A] ml-1 flex items-center justify-between">
                  <span>Employee ID</span>
                  <span className="text-[11px] text-[#71717A] flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Read-only
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={employeeId || "Not assigned"}
                    className="w-full bg-[#101010]/60 border border-[#2C2C2C] text-[#A1A1AA] rounded-lg px-4 py-3 outline-none cursor-not-allowed font-mono text-sm"
                  />
                </div>
              </div>

              {/* Read-only Email */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-[#71717A] ml-1 flex items-center justify-between">
                  <span>Email Address</span>
                  <span className="text-[11px] text-[#71717A] flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Read-only
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={email || currentUser?.email || ""}
                    className="w-full bg-[#101010]/60 border border-[#2C2C2C] text-[#A1A1AA] rounded-lg px-4 py-3 outline-none cursor-not-allowed text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2C2C2C]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.04] transition-colors"
              >
                Cancel
              </button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSaving}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider"
              >
                <Check className="w-3.5 h-3.5" />
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ─── 3. Three Summary Performance Cards ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: Completed Washes */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-[#3C3C3C] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
              Completed Washes
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#35B86B]/10 border border-[#35B86B]/20 flex items-center justify-center text-[#35B86B]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black font-display text-[#F5F5F5] tracking-tight">
              {completedWashesCount}
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-[#35B86B]" />
              <span>Jobs assigned & completed</span>
            </p>
          </div>
        </div>

        {/* Card 2: Reviews Received */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-[#3C3C3C] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
              Customer Reviews
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#E86A33]/10 border border-[#E86A33]/20 flex items-center justify-center text-[#E86A33]">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black font-display text-[#F5F5F5] tracking-tight">
              {stats.totalReviews}
            </div>
            <p className="text-xs text-[#35B86B] font-semibold mt-1">
              +{stats.thisMonthCount} received this month
            </p>
          </div>
        </div>

        {/* Card 3: Average Rating */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-[#3C3C3C] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
              Average Rating
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
              <Star className="w-4 h-4 fill-[#F59E0B]" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black font-display text-[#F5F5F5] tracking-tight">
                {stats.totalReviews > 0 ? stats.averageRatingDisplay : "No ratings yet"}
              </span>
              {stats.totalReviews > 0 && (
                <span className="text-xs text-[#71717A] font-medium">/ 5.0</span>
              )}
            </div>
            {/* Stars visualization */}
            <div className="flex items-center gap-1 mt-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    stats.totalReviews > 0 && star <= Math.round(stats.averageRating)
                      ? "text-[#E86A33] fill-[#E86A33]"
                      : "text-[#2C2C2C] fill-transparent"
                  }`}
                />
              ))}
              <span className="text-[11px] text-[#A1A1AA] ml-1.5 font-medium">
                {stats.totalReviews > 0
                  ? `(${stats.totalReviews} ${stats.totalReviews === 1 ? "review" : "reviews"})`
                  : "Awaiting customer feedback"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. Recent Reviews Section ───────────────────────────────────── */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#2C2C2C] pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E86A33]/10 border border-[#E86A33]/20 flex items-center justify-center text-[#E86A33]">
              <Star className="w-4 h-4 fill-[#E86A33]" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-[#F5F5F5]">
                Recent Customer Reviews
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Latest verified customer ratings on washes completed by you
              </p>
            </div>
          </div>

          <Link
            to="/dashboard/staff/reviews"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E86A33] hover:text-[#FF8055] transition-colors group cursor-pointer"
          >
            <span>View all reviews</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {recentReviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentReviews.map((rev) => {
              const revDate = rev.createdAt
                ? new Date(rev.createdAt).toLocaleDateString("en-ZA", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Recent";

              return (
                <div
                  key={rev.id}
                  className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4 flex flex-col justify-between hover:border-[#3C3C3C] transition-all"
                >
                  <div>
                    {/* Top row: Customer Name & Rating */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#2C2C2C] text-[#F5F5F5] font-bold text-[11px] flex items-center justify-center shrink-0">
                          {getInitials(rev.customerName || "Customer")}
                        </div>
                        <span className="text-xs font-semibold text-[#F5F5F5] truncate">
                          {rev.customerName || "Customer"}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${
                              s <= rev.rating
                                ? "text-[#E86A33] fill-[#E86A33]"
                                : "text-[#2C2C2C] fill-transparent"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Service & Date Tag */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] mb-2.5">
                      <span className="text-[#E86A33] font-medium">{rev.serviceName}</span>
                      <span>•</span>
                      <span>{revDate}</span>
                    </div>

                    {/* Comment */}
                    <p className="text-xs text-[#D8D5CF] leading-relaxed line-clamp-3">
                      "{rev.comment}"
                    </p>
                  </div>

                  {/* Thumbnail previews if any */}
                  {rev.photos && rev.photos.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#2C2C2C]/50">
                      {rev.photos.slice(0, 3).map((photo, pIdx) => (
                        <img
                          key={pIdx}
                          src={photo}
                          alt="Review"
                          className="w-8 h-8 rounded-md object-cover border border-[#2C2C2C]"
                        />
                      ))}
                      {rev.photos.length > 3 && (
                        <span className="text-[10px] text-[#71717A] font-bold">
                          +{rev.photos.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#101010] border border-[#2C2C2C] flex items-center justify-center text-[#71717A] mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#F5F5F5] mb-1">
              No reviews received yet
            </h3>
            <p className="text-xs text-[#A1A1AA] max-w-sm">
              When customers submit reviews for washes assigned to you, your ratings and feedback will display here.
            </p>
          </div>
        )}
      </div>

      {/* ─── 5. Staff Account Information Card ────────────────────────────── */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="flex items-center gap-2.5 border-b border-[#2C2C2C] pb-4 mb-5">
          <div className="w-8 h-8 rounded-xl bg-[#E86A33]/10 border border-[#E86A33]/20 flex items-center justify-center text-[#E86A33]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-[#F5F5F5]">
              Account & Credentials
            </h2>
            <p className="text-xs text-[#A1A1AA]">
              Official employee identification and access details
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] block mb-1">
              Official Full Name
            </span>
            <span className="text-sm font-semibold text-[#F5F5F5]">{displayName}</span>
          </div>

          <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] block mb-1">
              Employee ID
            </span>
            <span className="text-sm font-mono font-bold text-[#E86A33]">
              {employeeId || "Pending Verification"}
            </span>
          </div>

          <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] block mb-1">
              Account Role
            </span>
            <span className="text-sm font-semibold text-[#35B86B] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#35B86B]" />
              Registered Staff
            </span>
          </div>

          <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] block mb-1">
              Primary Email
            </span>
            <span className="text-sm font-semibold text-[#F5F5F5] truncate block">
              {email || currentUser?.email || "—"}
            </span>
          </div>

          <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] block mb-1">
              Contact Phone
            </span>
            <span className="text-sm font-semibold text-[#F5F5F5]">
              {phone || "Not provided"}
            </span>
          </div>

          <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] block mb-1">
              Account Created
            </span>
            <span className="text-sm font-semibold text-[#F5F5F5]">
              {createdAtStr || "Active Member"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
