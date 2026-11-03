import { useState, useEffect, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import {
  Star,
  MessageSquare,
  Filter,
  Calendar,
  Clock,
  Car,
  Image as ImageIcon,
  X,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { Button } from "../../../components/ui/Button";
import {
  subscribeToStaffReviews,
  calculateStaffReviewStats,
  getStoredStaffReviews,
  type CustomerReview,
  type StaffReviewStats,
} from "../../../lib/reviews";

type StarFilter = "all" | 5 | 4 | 3 | 2 | 1;
type SortOption = "newest" | "highest" | "lowest";

export default function StaffReviews() {
  const { currentUser, loading: authLoading } = useAuth();
  const uid = currentUser?.uid;

  // ─── Data State ───────────────────────────────────────────────────────────
  const [reviews, setReviews] = useState<CustomerReview[]>(() => {
    return uid ? getStoredStaffReviews(uid) : [];
  });
  const [isReviewsLoading, setIsReviewsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const authError = !authLoading && !currentUser?.uid
    ? "Authentication required: Please sign in to view your staff reviews."
    : null;
  const displayedError = authError || loadError;
  const isLoading = authLoading || (isReviewsLoading && !displayedError);

  // ─── Filter, Sort & Pagination ────────────────────────────────────────────
  const [starFilter, setStarFilter] = useState<StarFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // ─── Photo Lightbox State ─────────────────────────────────────────────────
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    url: string;
    customerName: string;
    serviceName: string;
  } | null>(null);

  // Subscribe in real-time to staff reviews ONLY after authentication resolves
  useEffect(() => {
    // 1. Wait for Firebase authentication to initialize
    if (authLoading || !currentUser?.uid) return;

    let isMounted = true;
    let unsub: (() => void) | null = null;

    // 2. Verify the logged-in account has the staff or admin role
    getDoc(doc(db, "users", currentUser.uid))
      .then((userSnap) => {
        if (!isMounted) return;
        const role = userSnap.data()?.role;
        if (role !== "staff" && role !== "admin") {
          setIsReviewsLoading(false);
          setIsPermissionError(true);
          setLoadError("Access denied: Your account role does not have permission to view staff reviews.");
          return;
        }

        // 3. User is authenticated and verified as staff -> subscribe to their reviews
        unsub = subscribeToStaffReviews(
          currentUser.uid,
          (list) => {
            if (!isMounted) return;
            setReviews(list);
            setIsReviewsLoading(false);
            setLoadError(null);
            setIsPermissionError(false);
          },
          (err: unknown) => {
            if (!isMounted) return;
            console.error("Staff reviews error:", err);
            const errObj = err as { code?: string; message?: string };
            const errMsg = errObj?.message || String(err);
            const isPerm =
              errObj?.code === "permission-denied" ||
              errMsg.toLowerCase().includes("permission") ||
              errMsg.toLowerCase().includes("missing or insufficient");

            setIsPermissionError(isPerm);
            if (isPerm) {
              setLoadError(
                "Missing or insufficient permissions: The live Firebase project has rejected the reviews query. Deploy the updated security rules using 'firebase deploy --only firestore:rules --project washwizzy-dev-49122'."
              );
            } else {
              setLoadError(errMsg || "Unable to load reviews. Please check your connection.");
            }
            setIsReviewsLoading(false);
          }
        );
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("User role verification warning:", err);
        // If checking role doc fails (e.g. offline/rules), still attempt subscription if staff UID is present
        unsub = subscribeToStaffReviews(
          currentUser.uid,
          (list) => {
            if (!isMounted) return;
            setReviews(list);
            setIsReviewsLoading(false);
            setLoadError(null);
          },
          (queryErr: unknown) => {
            if (!isMounted) return;
            console.error("Staff reviews subscription error:", queryErr);
            const errObj = queryErr as { code?: string; message?: string };
            const errMsg = errObj?.message || String(queryErr);
            const isPerm =
              errObj?.code === "permission-denied" ||
              errMsg.toLowerCase().includes("permission") ||
              errMsg.toLowerCase().includes("missing or insufficient");

            setIsPermissionError(isPerm);
            if (isPerm) {
              setLoadError(
                "Missing or insufficient permissions: Ensure your staff account is verified and the latest Firestore security rules are deployed."
              );
            } else {
              setLoadError(errMsg || "Unable to load reviews.");
            }
            setIsReviewsLoading(false);
          }
        );
      });

    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, [currentUser?.uid, authLoading, retryKey]);

  // Derived Review Statistics
  const stats: StaffReviewStats = useMemo(() => {
    return calculateStaffReviewStats(reviews);
  }, [reviews]);

  // Initials generator
  const getInitials = (name: string): string => {
    if (!name) return "CU";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Filter & Sort logic
  const filteredAndSortedReviews = useMemo(() => {
    let result = [...reviews];

    // Filter by Star Rating
    if (starFilter !== "all") {
      result = result.filter((r) => Math.round(r.rating) === starFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      if (sortBy === "highest") {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      if (sortBy === "lowest") {
        if (a.rating !== b.rating) return a.rating - b.rating;
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      return 0;
    });

    return result;
  }, [reviews, starFilter, sortBy]);

  const visibleReviews = filteredAndSortedReviews.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSortedReviews.length;

  return (
    <div className="w-full flex flex-col gap-6 pb-12">
      {/* ─── 1. Metrics & Rating Breakdown Header ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Overall Rating & Counts (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Average Rating Card */}
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
                Average Customer Rating
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
                <Star className="w-4 h-4 fill-[#F59E0B]" />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black font-display text-[#F5F5F5] tracking-tight">
                  {stats.totalReviews > 0 ? stats.averageRatingDisplay : "0.0"}
                </span>
                <span className="text-sm font-semibold text-[#71717A]">/ 5.0</span>
              </div>

              {/* 5-Star Row */}
              <div className="flex items-center gap-1.5 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      stats.totalReviews > 0 && s <= Math.round(stats.averageRating)
                        ? "text-[#E86A33] fill-[#E86A33]"
                        : "text-[#2C2C2C] fill-transparent"
                    }`}
                  />
                ))}
                <span className="text-xs text-[#A1A1AA] ml-1 font-medium">
                  {stats.totalReviews > 0
                    ? `(${stats.totalReviews} ${stats.totalReviews === 1 ? "rating" : "ratings"})`
                    : "No ratings yet"}
                </span>
              </div>
            </div>
          </div>

          {/* Total Reviews & Monthly Volume */}
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
                Review Volume
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#E86A33]/10 border border-[#E86A33]/20 flex items-center justify-center text-[#E86A33]">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-4xl sm:text-5xl font-black font-display text-[#F5F5F5] tracking-tight">
                {stats.totalReviews}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#35B86B]/15 text-[#35B86B] border border-[#35B86B]/30">
                  +{stats.thisMonthCount} this month
                </span>
                <span className="text-xs text-[#71717A]">Published feedback</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Simple 1–5 Star Rating Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
              Rating Breakdown
            </span>
            <span className="text-xs text-[#A1A1AA] font-medium">
              {stats.totalReviews} total
            </span>
          </div>

          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = stats.ratingDistribution[stars] || 0;
              const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

              return (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 w-10 shrink-0 text-[#A1A1AA] font-semibold">
                    <span>{stars}</span>
                    <Star className="w-3 h-3 text-[#E86A33] fill-[#E86A33]" />
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1 h-2 rounded-full bg-[#101010] border border-[#2C2C2C] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#E86A33] to-[#FFA26B] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Count & Percentage */}
                  <span className="w-8 text-right font-mono text-[#71717A] text-[11px] shrink-0">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 2. Controls Bar: Filter by Star & Sort ───────────────────────── */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Star Rating Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#71717A] mr-1 hidden sm:inline">
            Filter:
          </span>
          {(["all", 5, 4, 3, 2, 1] as StarFilter[]).map((filterVal) => {
            const isActive = starFilter === filterVal;
            const label = filterVal === "all" ? "All Stars" : `${filterVal}★`;

            return (
              <button
                key={String(filterVal)}
                type="button"
                onClick={() => {
                  setStarFilter(filterVal);
                  setVisibleCount(6);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#E86A33] text-white shadow-md shadow-[#E86A33]/20"
                    : "bg-[#101010] text-[#A1A1AA] border border-[#2C2C2C] hover:text-[#F5F5F5] hover:border-[#3C3C3C]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-[#71717A] hidden sm:inline">
            Sort by:
          </span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-[#101010] border border-[#2C2C2C] text-[#F5F5F5] rounded-xl pl-3.5 pr-8 py-2 text-xs font-semibold appearance-none outline-none focus:border-[#E86A33] transition-colors cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#71717A] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ─── 3. Main Reviews Display Area ─────────────────────────────────── */}
      {isLoading ? (
        // Loading Skeleton
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2C2C2C]" />
                  <div className="space-y-2">
                    <div className="w-28 h-3.5 bg-[#2C2C2C] rounded" />
                    <div className="w-20 h-2.5 bg-[#2C2C2C] rounded" />
                  </div>
                </div>
                <div className="w-16 h-4 bg-[#2C2C2C] rounded" />
              </div>
              <div className="w-full h-12 bg-[#101010] rounded-xl" />
            </div>
          ))}
        </div>
      ) : displayedError ? (
        // Error State
        <div className="bg-[#171717] border border-red-500/30 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#F5F5F5] mb-1">
            {isPermissionError ? "Permissions / Deployment Notice" : "Unable to Load Reviews"}
          </h3>
          <p className="text-xs text-[#A1A1AA] mb-4 max-w-lg leading-relaxed">{displayedError}</p>
          {isPermissionError && (
            <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-3.5 text-left mb-4 max-w-lg w-full">
              <span className="text-[11px] font-bold text-[#E86A33] uppercase tracking-wider block mb-1">
                Deploy Firestore Rules & Indexes:
              </span>
              <code className="text-xs text-[#35B86B] font-mono select-all block break-all bg-black/40 px-2.5 py-1.5 rounded">
                firebase deploy --only firestore:rules,firestore:indexes --project washwizzy-dev-49122
              </code>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => setRetryKey((k) => k + 1)}
            className="text-xs py-2 px-4"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      ) : reviews.length === 0 ? (
        // Empty State: Staff has no reviews yet
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-[#101010] border border-[#2C2C2C] flex items-center justify-center text-[#71717A] mb-4">
            <MessageSquare className="w-8 h-8 text-[#E86A33]/70" />
          </div>
          <h3 className="text-lg font-bold font-display text-[#F5F5F5] mb-1.5">
            You haven’t received any reviews yet
          </h3>
          <p className="text-xs text-[#A1A1AA] max-w-md leading-relaxed">
            As customers complete their wash services assigned to you, their ratings, comments, and photos will appear right here. Keep up the high standard of service!
          </p>
        </div>
      ) : filteredAndSortedReviews.length === 0 ? (
        // No filter results state
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-10 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-[#101010] border border-[#2C2C2C] flex items-center justify-center text-[#71717A] mb-3">
            <Filter className="w-6 h-6 text-[#71717A]" />
          </div>
          <h3 className="text-base font-bold text-[#F5F5F5] mb-1">
            No matching reviews found
          </h3>
          <p className="text-xs text-[#A1A1AA] mb-4 max-w-sm">
            There are no reviews with a {starFilter}-star rating.
          </p>
          <button
            type="button"
            onClick={() => setStarFilter("all")}
            className="text-xs font-bold text-[#E86A33] hover:underline"
          >
            Clear Filter & Show All Reviews
          </button>
        </div>
      ) : (
        // Reviews List (Readable Cards)
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleReviews.map((rev) => {
              const reviewDate = rev.createdAt
                ? new Date(rev.createdAt).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Recent";

              return (
                <div
                  key={rev.id}
                  className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-[#3C3C3C] transition-all"
                >
                  <div>
                    {/* Top Header: Customer Info & Rating */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Customer Avatar / Initials */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2C2C2C] to-[#1F1F1F] border border-[#3C3C3C] text-[#F5F5F5] font-bold text-sm flex items-center justify-center shrink-0">
                          {getInitials(rev.customerName || "Customer")}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-[#F5F5F5] truncate">
                            {rev.customerName || "Valued Customer"}
                          </h4>
                          <span className="text-[11px] text-[#71717A] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            Reviewed on {reviewDate}
                          </span>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-1 shrink-0 bg-[#101010] px-2.5 py-1.5 rounded-lg border border-[#2C2C2C]">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating
                                ? "text-[#E86A33] fill-[#E86A33]"
                                : "text-[#2C2C2C] fill-transparent"
                            }`}
                          />
                        ))}
                        <span className="text-xs font-bold text-[#F5F5F5] ml-1">
                          {rev.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Service & Booking Details Strip */}
                    <div className="flex flex-wrap items-center gap-2 mb-3 pt-2 border-t border-[#2C2C2C]/50 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E86A33]/10 text-[#E86A33] border border-[#E86A33]/20 font-semibold">
                        <Car className="w-3.5 h-3.5" />
                        {rev.serviceName || "Car Wash Service"}
                      </span>

                      {rev.appointmentDate && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#101010] text-[#A1A1AA] border border-[#2C2C2C]">
                          <Calendar className="w-3.5 h-3.5 text-[#71717A]" />
                          {rev.appointmentDate}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-[11px] text-[#35B86B] font-medium ml-auto">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified Completed Wash
                      </span>
                    </div>

                    {/* Customer Feedback Comment */}
                    <p className="text-sm text-[#D8D5CF] leading-relaxed whitespace-pre-line bg-[#101010]/50 p-3.5 rounded-xl border border-[#2C2C2C]/50">
                      "{rev.comment}"
                    </p>
                  </div>

                  {/* Customer Review Photos (with larger preview modal) */}
                  {rev.photos && rev.photos.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[#2C2C2C]/50">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] block mb-2">
                        Attached Photos ({rev.photos.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {rev.photos.map((photoUrl, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() =>
                              setLightboxPhoto({
                                url: photoUrl,
                                customerName: rev.customerName,
                                serviceName: rev.serviceName,
                              })
                            }
                            className="group relative w-16 h-16 rounded-xl overflow-hidden border border-[#2C2C2C] hover:border-[#E86A33] transition-all cursor-pointer"
                          >
                            <img
                              src={photoUrl}
                              alt={`Customer photo ${pIdx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <ImageIcon className="w-4 h-4 text-white drop-shadow" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVisibleCount((prev) => prev + 6)}
                className="px-8 py-3 text-xs font-bold uppercase tracking-wider"
              >
                Load More Reviews ({filteredAndSortedReviews.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── 4. Photo Lightbox Modal ──────────────────────────────────────── */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="bg-[#171717] border border-[#2C2C2C] rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#2C2C2C]">
              <div>
                <h4 className="text-sm font-bold text-[#F5F5F5]">
                  Photo from {lightboxPhoto.customerName}
                </h4>
                <p className="text-xs text-[#E86A33] font-medium">
                  {lightboxPhoto.serviceName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image Display */}
            <div className="p-4 bg-[#101010] flex items-center justify-center max-h-[75vh]">
              <img
                src={lightboxPhoto.url}
                alt="Enlarged review photo"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
