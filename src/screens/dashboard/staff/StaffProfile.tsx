import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
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
  Briefcase,
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
import { useStaffWorkday } from "../../../hooks/useStaffWorkday";
import { formatHour } from "../../../lib/business";
import { WORK_TYPE_LABELS } from "../../../lib/staffOps";
import LunchControl from "../../../components/staff/LunchControl";

export default function StaffProfile() {
  const { currentUser, refreshUser } = useAuth();
  const { showToast } = useToast();
  const day = useStaffWorkday();
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
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();

        const nameFromDb = data.fullName || data.name || data.displayName;
        if (nameFromDb) {
          setDisplayName(nameFromDb);
          localStorage.setItem(`ww_profile_name_${uid}`, nameFromDb);
        }

        const phoneFromDb = data.phoneNumber || data.phone;
        if (phoneFromDb) {
          setPhone(phoneFromDb);
          localStorage.setItem(`ww_profile_phone_${uid}`, phoneFromDb);
        }

        if (data.employeeId) {
          setEmployeeId(data.employeeId);
        }

        if (data.email) {
          setEmail(data.email);
        }

        if (data.photoURL || data.avatarUrl) {
          const remoteUrl = data.photoURL || data.avatarUrl;
          setPhotoURL(remoteUrl);
          localStorage.setItem(`ww_profile_avatar_${uid}`, remoteUrl);
        }

        // Account creation date calculation
        let createdDate: Date | null = null;
        if (data.createdAt?.toDate) {
          createdDate = data.createdAt.toDate();
        } else if (data.createdAt) {
          createdDate = new Date(data.createdAt);
        } else if (currentUser?.metadata?.creationTime) {
          createdDate = new Date(currentUser.metadata.creationTime);
        }

        if (createdDate && !isNaN(createdDate.getTime())) {
          setCreatedAtStr(
            createdDate.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          );
        }
      },
      (err) => {
        console.warn("Profile snapshot error:", err);
      }
    );

    return () => unsub();
  }, [uid, currentUser?.metadata?.creationTime]);

  // ─── Real-time Completed Appointments Subscription ────────────────────────
  useEffect(() => {
    if (!uid) return;

    const unsub = subscribeToStaffAppointments(uid, (appointments: StoredAppointment[]) => {
      const completed = appointments.filter((app) => app.completed || app.status === "Completed");
      setCompletedWashesCount(completed.length);
    });

    return () => unsub();
  }, [uid]);

  // ─── Real-time Published Reviews Subscription ──────────────────────────────
  useEffect(() => {
    if (!uid) return;

    const unsub = subscribeToStaffReviews(uid, (reviewsList: CustomerReview[]) => {
      setStaffReviews(reviewsList);
      setStats(calculateStaffReviewStats(reviewsList));
    });

    return () => unsub();
  }, [uid]);

  // ─── Validation Helpers ────────────────────────────────────────────────────
  const validateForm = () => {
    const errs: { name?: string; phone?: string } = {};
    if (!editName.trim()) {
      errs.name = "Full name is required.";
    } else if (editName.trim().length < 2) {
      errs.name = "Full name must be at least 2 characters.";
    }

    if (editPhone.trim()) {
      const cleanPhone = editPhone.trim();
      const phoneRegex = /^[\d\s+\-()]{7,20}$/;
      if (!phoneRegex.test(cleanPhone)) {
        errs.phone = "Please enter a valid phone number.";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Handle Profile Edit Save ──────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !uid) return;

    setIsSaving(true);
    try {
      const trimmedName = editName.trim();
      const trimmedPhone = editPhone.trim();

      // 1. Update Firebase Auth Profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: trimmedName,
        });
      }

      // 2. Persist to Firestore user document
      const userDocRef = doc(db, "users", uid);
      await setDoc(
        userDocRef,
        {
          fullName: trimmedName,
          name: trimmedName,
          displayName: trimmedName,
          phoneNumber: trimmedPhone,
          phone: trimmedPhone,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 3. Cache in localStorage for immediate sync across tabs
      localStorage.setItem(`ww_profile_name_${uid}`, trimmedName);
      localStorage.setItem(`ww_profile_phone_${uid}`, trimmedPhone);

      // 4. Update local state
      setDisplayName(trimmedName);
      setPhone(trimmedPhone);
      setIsEditing(false);

      // 5. Refresh AuthContext so sidebar/header update immediately
      await refreshUser();

      showToast("Profile details updated successfully!", "success");
    } catch (err: unknown) {
      console.error("Failed to update profile:", err);
      const errMsg = err instanceof Error ? err.message : "Failed to save profile changes.";
      showToast(errMsg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(displayName);
    setEditPhone(phone);
    setErrors({});
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setEditName(displayName);
    setEditPhone(phone);
    setErrors({});
    setIsEditing(true);
  };

  // ─── Handle Cloudinary Avatar Upload ───────────────────────────────────────
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    const validationError = validateProfileImage(file);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      // 1. Upload to Cloudinary using existing utility
      const secureUrl = await uploadProfileImage(file);

      // 2. Save URL persistently in Firebase Auth and Firestore
      if (auth.currentUser) {
        await saveProfilePhotoUrl(auth.currentUser, secureUrl);
      }

      // 3. Update localStorage and local state
      localStorage.setItem(`ww_profile_avatar_${uid}`, secureUrl);
      setPhotoURL(secureUrl);

      // 4. Refresh AuthContext so sidebar reflects new photo
      await refreshUser();

      showToast("Profile photo updated successfully!", "success");
    } catch (err: unknown) {
      console.error("Avatar upload failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to upload photo. Please try again.";
      showToast(msg, "error");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Fallback Initials
  const getInitials = (nameStr: string) => {
    if (!nameStr) return "ST";
    const parts = nameStr.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Up to 3 recent reviews
  const recentReviews = staffReviews.slice(0, 3);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ─── 1. Profile Header & Summary Card ─────────────────────────────── */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle orange accent gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#E86A33] via-[#FF8055] to-[#E86A33]" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with Initials Fallback & Cloudinary Upload */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-[#E86A33]/40 bg-[#101010] flex items-center justify-center shadow-lg relative">
                {photoURL ? (
                  <img
                    src={avatarUrl(photoURL, 180)}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-extrabold text-[#E86A33] tracking-wider select-none font-display">
                    {getInitials(displayName)}
                  </span>
                )}

                {/* Upload Overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                  title="Upload profile photo"
                >
                  <Camera className="w-6 h-6 text-white" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                    {isUploadingPhoto ? "Uploading..." : "Change"}
                  </span>
                </button>
              </div>

              {/* Mobile quick button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute -bottom-1.5 -right-1.5 sm:hidden p-1.5 rounded-full bg-[#E86A33] text-white shadow hover:bg-[#d55925] transition-colors"
                title="Change Photo"
              >
                <Camera className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>

            {/* Profile Info Summary */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-[#F5F5F5] tracking-tight">
                  {displayName}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E86A33]/15 text-[#E86A33] border border-[#E86A33]/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Staff
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#A1A1AA]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#71717A]">Employee ID:</span>
                  <span className="font-mono font-semibold text-[#F5F5F5]">
                    {employeeId || "Pending Verification"}
                  </span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#71717A]" />
                  <span>{email || currentUser?.email || "—"}</span>
                </div>
                {phone && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#71717A]" />
                      <span>{phone}</span>
                    </div>
                  </>
                )}
                {createdAtStr && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#71717A]" />
                      <span>Joined {createdAtStr}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action button */}
          {!isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={handleStartEdit}
              className="self-start md:self-center text-xs font-semibold px-4 py-2"
            >
              <Edit2 className="w-3.5 h-3.5 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* ─── Profile Edit Form (Toggled via isEditing) ───────────────────── */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-6 pt-6 border-t border-[#2C2C2C] space-y-5 animate-fadeIn"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Full Name *"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. John Doe"
                  error={errors.name}
                  className={errors.name ? "border-red-500 focus:ring-red-500" : ""}
                />
              </div>

              <div>
                <Input
                  label="Phone Number"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. +27 82 123 4567"
                  error={errors.phone}
                  className={errors.phone ? "border-red-500 focus:ring-red-500" : ""}
                />
              </div>
            </div>

            {/* Read-Only Notice */}
            <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-3 flex items-start gap-2 text-xs text-[#71717A]">
              <Lock className="w-4 h-4 text-[#71717A] shrink-0 mt-0.5" />
              <span>
                Employee ID, email address, and staff role are verified credentials managed by system administrators and cannot be altered directly.
              </span>
            </div>

            {/* Save & Cancel Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="text-xs px-4 py-2"
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
                className="text-xs px-5 py-2 font-semibold"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                )}
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* ─── 2. Three Summary Metric Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Completed Washes */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#35B86B]/10 border border-[#35B86B]/20 flex items-center justify-center text-[#35B86B] shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider block">
              Completed Washes
            </span>
            <div className="text-2xl font-black font-display text-[#F5F5F5] mt-0.5">
              {completedWashesCount}
            </div>
            <span className="text-[11px] text-[#71717A]">
              Assigned washes completed
            </span>
          </div>
        </div>

        {/* Customer Reviews Received */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#E86A33]/10 border border-[#E86A33]/20 flex items-center justify-center text-[#E86A33] shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider block">
              Reviews Received
            </span>
            <div className="text-2xl font-black font-display text-[#F5F5F5] mt-0.5">
              {stats.totalReviews}
            </div>
            <span className="text-[11px] text-[#71717A]">
              {stats.thisMonthCount} received this month
            </span>
          </div>
        </div>

        {/* Average Customer Rating */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B] shrink-0">
            <Star className="w-6 h-6 fill-[#F59E0B]" />
          </div>
          <div>
            <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider block">
              Average Rating
            </span>
            <div className="text-2xl font-black font-display text-[#F5F5F5] mt-0.5 flex items-center gap-2">
              {stats.totalReviews > 0 ? (
                <>
                  <span>{stats.averageRatingDisplay}</span>
                  <span className="text-xs font-normal text-[#71717A]">/ 5.0</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-[#71717A]">No ratings yet</span>
              )}
            </div>
            <span className="text-[11px] text-[#71717A]">
              {stats.totalReviews > 0
                ? `Based on ${stats.totalReviews} review${stats.totalReviews === 1 ? "" : "s"}`
                : "Awaiting customer reviews"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. Work Assignment, Crew & Lunch Schedule ───────────────────── */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="flex items-center gap-2.5 border-b border-[#2C2C2C] pb-4 mb-5">
          <div className="w-8 h-8 rounded-xl bg-[#E86A33]/10 border border-[#E86A33]/20 flex items-center justify-center text-[#E86A33]">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-[#F5F5F5]">
              Work Assignment & Schedule
            </h2>
            <p className="text-xs text-[#A1A1AA]">
              Your role assignment, crew pairing, and daily hours set by management
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] block mb-1">
              Work Type
            </span>
            <span className="text-sm font-semibold text-[#F5F5F5]">
              {WORK_TYPE_LABELS[day.workType] || "Mobile Crew"}
            </span>
          </div>

          <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] block mb-1">
              Crew Assignment
            </span>
            <span className="text-sm font-semibold text-[#F5F5F5]">
              {day.crew ? `With ${day.partnerNames.join(" and ")}` : "Working solo"}
            </span>
          </div>

          <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] block mb-1">
              Lunch Today
            </span>
            <span className="text-sm font-semibold text-[#E86A33]">
              {formatHour(day.lunchToday)}–{formatHour(day.lunchToday + 1)}
            </span>
          </div>
        </div>

        <LunchControl day={day} mode="usual" />
      </div>

      {/* ─── 4. Recent Reviews Section ───────────────────────────────────── */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#2C2C2C] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E86A33]/10 border border-[#E86A33]/20 flex items-center justify-center text-[#E86A33]">
              <Star className="w-4 h-4 fill-[#E86A33]" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-[#F5F5F5]">
                Recent Customer Reviews
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Verified feedback from completed washes assigned to you
              </p>
            </div>
          </div>

          <Link
            to="/dashboard/staff/reviews"
            className="text-xs font-semibold text-[#E86A33] hover:text-[#FF8055] transition-colors flex items-center gap-1 group"
          >
            <span>View all reviews</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {recentReviews.length > 0 ? (
          <div className="space-y-4">
            {recentReviews.map((rev) => {
              const reviewDate = rev.createdAt
                ? new Date(rev.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Recent";

              return (
                <div
                  key={rev.id}
                  className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4 sm:p-5 hover:border-[#E86A33]/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E86A33]/20 text-[#E86A33] font-bold text-xs flex items-center justify-center font-display">
                        {rev.customerName
                          ? rev.customerName.substring(0, 2).toUpperCase()
                          : "CU"}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-[#F5F5F5] block">
                          {rev.customerName || "Verified Customer"}
                        </span>
                        <span className="text-[11px] text-[#71717A] flex items-center gap-1">
                          <Car className="w-3 h-3" />
                          {rev.serviceName || "Car Wash Service"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rev.rating
                                ? "text-[#F59E0B] fill-[#F59E0B]"
                                : "text-[#3F3F46]"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-[#71717A]">{reviewDate}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#D4D4D4] leading-relaxed italic bg-[#171717]/60 p-3 rounded-lg border border-[#2C2C2C]/50">
                    "{rev.comment}"
                  </p>

                  {rev.ownerReply && (
                    <div className="mt-2.5 text-xs text-[#A1A1AA] border-l-2 border-[#E86A33] pl-3 py-1 bg-[#171717]/40 rounded-r">
                      <span className="font-semibold text-[#E86A33] block text-[11px]">Owner reply</span>
                      {rev.ownerReply}
                    </div>
                  )}

                  {rev.photos && rev.photos.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#2C2C2C]/40">
                      {rev.photos.slice(0, 3).map((photoUrl, pIdx) => (
                        <div
                          key={pIdx}
                          className="w-12 h-12 rounded-lg overflow-hidden border border-[#2C2C2C] bg-[#101010]"
                        >
                          <img
                            src={photoUrl}
                            alt={`Review photo ${pIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {rev.photos.length > 3 && (
                        <span className="text-[10px] text-[#71717A]">
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
