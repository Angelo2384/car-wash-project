import { useState, useEffect, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import {
  Star,
  MessageSquare,
  Filter,
  Calendar,
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
              setLoadError(`Failed to load reviews: ${errMsg}`);
            }
            setIsReviewsLoading(false);
          }
        );
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Role verification failed:", err);
        setLoadError("Failed to verify staff permissions. Please check your connection and retry.");
        setIsReviewsLoading(false);
      });

    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, [authLoading, currentUser?.uid, retryKey]);

  // Reset pagination on filter or sort change
  const handleFilterChange = (filter: StarFilter) => {
    setStarFilter(filter);
    setVisibleCount(6);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    setVisibleCount(6);
  };

  // ─── Filter & Sort Operations ─────────────────────────────────────────────
  const filteredAndSortedReviews = useMemo(() => {
    let result = [...reviews];

    // Filter by star rating
    if (starFilter !== "all") {
      result = result.filter((r) => r.rating === starFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "highest") {
        return b.rating - a.rating;
      }
      if (sortBy === "lowest") {
        return a.rating - b.rating;
      }
      // "newest" by default
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return result;
  }, [reviews, starFilter, sortBy]);

  // Visible sliced list for pagination
  const visibleReviews = filteredAndSortedReviews.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSortedReviews.length;

  // Review statistics calculation
  const stats: StaffReviewStats = useMemo(() => {
    return calculateStaffReviewStats(reviews);
  }, [reviews]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ─── 1. Review Summary Statistics (4 Cards) ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Average Rating */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider block">
              Average Rating
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black font-display text-[#F5F5F5]">
                {stats.totalReviews > 0 ? stats.averageRatingDisplay : "0.0"}
              </span>
              <span className="text-xs text-[#71717A]">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= Math.round(stats.averageRating);
                return (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      isFilled ? "text-[#F59E0B] fill-[#F59E0B]" : "text-[#3F3F46]"
                    }`}
                  />
                );
              })}
            </div>
          </div>
          <span className="text-[11px] text-[#71717A] mt-3">
            {stats.totalReviews > 0
              ? `Calculated across ${stats.totalReviews} review${stats.totalReviews === 1 ? "" : "s"}`
              : "No customer ratings yet"}
          </span>
        </div>

        {/* Card 2: Total Reviews */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider block">
              Total Reviews
            </span>
            <div className="text-3xl font-black font-display text-[#F5F5F5] mt-2">
              {stats.totalReviews}
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Published reviews attributed to your completed washes
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#35B86B] font-medium mt-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Customer Reviews</span>
          </div>
        </div>

        {/* Card 3: Reviews Received This Month */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider block">
              This Month
            </span>
            <div className="text-3xl font-black font-display text-[#E86A33] mt-2">
              {stats.thisMonthCount}
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Feedback submitted in the current calendar month
            </p>
          </div>
          <span className="text-[11px] text-[#71717A] mt-3">
            Updated in real time
          </span>
        </div>

        {/* Card 4: Star Rating Breakdown (1–5 Stars) */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider block mb-2">
            Rating Breakdown
          </span>
          <div className="space-y-1.5 flex-1 flex flex-col justify-center">
            {([5, 4, 3, 2, 1] as const).map((rating) => {
              const count = stats.ratingDistribution[rating] || 0;
              const percentage =
                stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

              return (
                <div key={rating} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right font-medium text-[#A1A1AA]">
                    {rating}★
                  </span>
                  <div className="flex-1 h-2 bg-[#262626] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E86A33] transition-all duration-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-6 text-right font-mono text-[11px] text-[#71717A]">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 2. Controls Bar: Star Filter, Sort & Count ─────────────────────── */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Star Rating Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-[#71717A] mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {(
            [
              { label: "All", value: "all" },
              { label: "5 ★", value: 5 },
              { label: "4 ★", value: 4 },
              { label: "3 ★", value: 3 },
              { label: "2 ★", value: 2 },
              { label: "1 ★", value: 1 },
            ] as const
          ).map((item) => {
            const isActive = starFilter === item.value;
            return (
              <button
                key={String(item.value)}
                type="button"
                onClick={() => handleFilterChange(item.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#E86A33] text-white shadow-sm"
                    : "bg-[#101010] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#202020] border border-[#2C2C2C]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <span className="text-xs font-medium text-[#71717A]">Sort by:</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="bg-[#101010] border border-[#2C2C2C] text-[#F5F5F5] text-xs font-semibold rounded-lg px-3 py-1.5 pr-8 appearance-none focus:outline-none focus:border-[#E86A33] transition-colors cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#71717A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ─── 3. Content States: Loading, Error, Empty, and Review List ──────── */}
      {isLoading ? (
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#E86A33] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-[#A1A1AA]">Loading your assigned customer reviews...</p>
        </div>
      ) : displayedError ? (
        <div className="bg-[#171717] border border-red-500/30 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#F5F5F5] mb-1">
            {isPermissionError ? "Permissions Notice" : "Unable to load reviews"}
          </h3>
          <p className="text-xs text-[#A1A1AA] max-w-md mb-4 leading-relaxed">
            {displayedError}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRetryKey((k) => k + 1)}
            className="text-xs px-4 py-2"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Retry Query
          </Button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#101010] border border-[#2C2C2C] flex items-center justify-center text-[#71717A] mb-3">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#F5F5F5] mb-1">
            You haven't received any reviews yet
          </h3>
          <p className="text-xs text-[#A1A1AA] max-w-sm leading-relaxed">
            When customers review washes you completed, their feedback, star ratings, and wash details will appear here automatically.
          </p>
        </div>
      ) : filteredAndSortedReviews.length === 0 ? (
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-10 text-center flex flex-col items-center justify-center">
          <p className="text-sm font-semibold text-[#F5F5F5] mb-1">
            No reviews match this filter
          </p>
          <p className="text-xs text-[#A1A1AA] mb-4">
            Try choosing a different star rating or resetting the filter.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleFilterChange("all")}
            className="text-xs px-4 py-2"
          >
            Reset Filter
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {visibleReviews.map((rev) => {
              const reviewDate = rev.createdAt
                ? new Date(rev.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Recent";

              const appointmentDate = rev.appointmentDate
                ? new Date(rev.appointmentDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : null;

              return (
                <div
                  key={rev.id}
                  className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col justify-between hover:border-[#E86A33]/40 transition-colors"
                >
                  <div>
                    {/* Top row: Customer Avatar & Name, Rating & Date */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#E86A33]/15 text-[#E86A33] font-bold text-sm flex items-center justify-center font-display border border-[#E86A33]/30">
                          {rev.customerName
                            ? rev.customerName.substring(0, 2).toUpperCase()
                            : "CU"}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#F5F5F5]">
                            {rev.customerName || "Verified Customer"}
                          </h4>
                          <span className="text-[11px] text-[#71717A] flex items-center gap-1 mt-0.5">
                            <Car className="w-3 h-3 text-[#E86A33]" />
                            {rev.serviceName || "Car Wash Service"}
                          </span>
                        </div>
                      </div>

                      {/* Stars & Review Date */}
                      <div className="text-right">
                        <div className="flex items-center gap-0.5 justify-end">
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
                        <span className="text-[10px] text-[#71717A] block mt-1">
                          {reviewDate}
                        </span>
                      </div>
                    </div>

                    {/* Metadata: Appointment Date if available */}
                    {appointmentDate && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] mb-3">
                        <Calendar className="w-3 h-3" />
                        <span>Wash completed on {appointmentDate}</span>
                      </div>
                    )}

                    {/* Review Feedback Comment */}
                    <p className="text-xs text-[#D4D4D4] leading-relaxed italic bg-[#101010] p-3.5 rounded-xl border border-[#2C2C2C]/50">
                      "{rev.comment}"
                    </p>

                    {/* Owner reply if present */}
                    {rev.ownerReply && (
                      <div className="mt-3 text-xs text-[#A1A1AA] border-l-2 border-[#E86A33] pl-3 py-1.5 bg-[#101010]/60 rounded-r">
                        <span className="font-semibold text-[#E86A33] block text-[11px] mb-0.5">
                          Owner replied
                        </span>
                        {rev.ownerReply}
                      </div>
                    )}
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
