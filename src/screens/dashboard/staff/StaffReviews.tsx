import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { subscribeToStaffReviews, type CustomerReview } from "../../../lib/reviews";
import { Card, EmptyState, Segmented, StatTile } from "../../../components/admin/AdminUI";

type Filter = "all" | "good" | "low";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? "text-[#E86A33] fill-[#E86A33]" : "text-[#3C3C3C]"}`} />
      ))}
    </span>
  );
}

/** Reviews customers left on jobs this staff member worked on. */
export default function StaffReviews() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid || "";
  const [state, setState] = useState<{ uid: string; reviews: CustomerReview[] } | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  useEffect(() => subscribeToStaffReviews(uid, (reviews) => setState({ uid, reviews })), [uid]);

  const reviews = useMemo(() => (state?.uid === uid ? state.reviews : []), [state, uid]);
  const loading = state?.uid !== uid;
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const fiveStar = reviews.filter((r) => r.rating === 5).length;
  const visible = reviews.filter((r) => (filter === "good" ? r.rating >= 4 : filter === "low" ? r.rating <= 3 : true));

  return (
    <div className="flex flex-col gap-5 pb-10 text-[#F5F5F5]">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatTile label="Average rating" value={reviews.length ? avg.toFixed(1) : "–"} tone={avg >= 4 ? "green" : "neutral"} hint="Out of 5" />
        <StatTile label="Reviews" value={reviews.length} hint="On jobs you worked" />
        <StatTile label="5-star reviews" value={fiveStar} hint={reviews.length ? `${Math.round((fiveStar / reviews.length) * 100)}% of them` : undefined} />
      </div>

      <div className="self-start">
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "All" },
          { id: "good", label: "4–5 stars" },
          { id: "low", label: "3 stars or less" },
        ]}
      />
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            title={loading ? "Loading reviews…" : reviews.length ? "No reviews match this filter" : "No reviews yet"}
            body={loading || reviews.length ? undefined : "When customers review a job you worked on, it shows up here."}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((r) => (
            <Card key={r.id} className="p-5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Stars rating={r.rating} />
                  <span className="text-sm font-semibold">{r.customerName || "Customer"}</span>
                  <span className="text-xs text-[#71717A]">{r.serviceName}</span>
                </div>
                <span className="text-xs text-[#71717A]">
                  {r.appointmentDate || new Date(r.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {r.comment && <p className="text-sm text-[#D4D4D4] leading-relaxed">{r.comment}</p>}
              {r.ownerReply && (
                <p className="text-sm text-[#A1A1AA] border-l-2 border-[#E86A33] pl-3">
                  <span className="text-xs font-semibold text-[#E86A33] block mb-0.5">Owner replied</span>
                  {r.ownerReply}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
