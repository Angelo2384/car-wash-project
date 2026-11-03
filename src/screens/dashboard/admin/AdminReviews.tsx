import { useEffect, useMemo, useState } from "react";
import { EyeOff, Eye, MessageSquareReply, Star } from "lucide-react";
import { collectionGroup, doc, onSnapshot, query, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useToast } from "../../../contexts/ToastContext";
import { Badge, Card, EmptyState, Field, Modal, Segmented, StatTile } from "../../../components/admin/AdminUI";
import { inputClass, primaryButton, secondaryButton, smallButton } from "../../../components/admin/adminStyles";

interface AdminReview {
  id: string;
  customerUid: string;
  customerName: string;
  serviceName: string;
  rating: number;
  comment: string;
  status?: string;
  hiddenByAdmin?: boolean;
  ownerReply?: string;
  ownerRepliedAt?: number;
  createdAt?: number;
}

type Filter = "all" | "low" | "unreplied" | "hidden";

/** The admin may only change these moderation fields on a customer's review. */
function saveReviewModeration(r: AdminReview, patch: Partial<Pick<AdminReview, "hiddenByAdmin" | "ownerReply" | "ownerRepliedAt">>) {
  return setDoc(doc(db, "users", r.customerUid, "reviews", r.id), { ...patch, updatedAt: Date.now() }, { merge: true });
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-4 h-4 ${i <= rating ? "text-amber-400 fill-amber-400" : "text-[#3A3A3A]"}`} />
      ))}
    </span>
  );
}

export default function AdminReviews() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [replying, setReplying] = useState<AdminReview | null>(null);

  useEffect(
    () =>
      onSnapshot(
        query(collectionGroup(db, "reviews")),
        (snap) =>
          setReviews(
            snap.docs
              .map((d) => ({
                ...(d.data() as Omit<AdminReview, "id" | "customerUid">),
                id: d.id,
                customerUid: d.ref.parent.parent?.id || "",
              }))
              .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          ),
        (err) => showToast(`Couldn't load reviews: ${err.message}`, "error")
      ),
    [showToast]
  );

  const stats = useMemo(() => {
    const visible = reviews.filter((r) => !r.hiddenByAdmin);
    const avg = visible.length ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : 0;
    return { avg, total: reviews.length, low: reviews.filter((r) => r.rating <= 2).length, unreplied: reviews.filter((r) => !r.ownerReply).length };
  }, [reviews]);

  const shown = reviews.filter((r) => {
    if (filter === "low") return r.rating <= 2;
    if (filter === "unreplied") return !r.ownerReply;
    if (filter === "hidden") return r.hiddenByAdmin;
    return true;
  });

  async function setHidden(r: AdminReview, hidden: boolean) {
    try {
      await saveReviewModeration(r, { hiddenByAdmin: hidden });
      showToast(hidden ? "Review hidden from other customers." : "Review visible again.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't update the review.", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-10 text-[#F5F5F5]">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Average rating" value={stats.avg ? stats.avg.toFixed(1) : "–"} hint={stats.avg ? <Stars rating={Math.round(stats.avg)} /> : "No reviews yet"} />
        <StatTile label="Reviews" value={stats.total} />
        <StatTile label="2 stars or less" value={stats.low} tone={stats.low ? "red" : "neutral"} />
        <StatTile label="Without a reply" value={stats.unreplied} tone={stats.unreplied ? "amber" : "neutral"} />
      </div>

      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "All" },
          { id: "low", label: "Low ratings" },
          { id: "unreplied", label: "Needs a reply" },
          { id: "hidden", label: "Hidden" },
        ]}
      />

      {shown.length === 0 ? (
        <Card><EmptyState title="No reviews here" /></Card>
      ) : (
        <div className="flex flex-col gap-4">
          {shown.map((r) => (
            <Card key={`${r.customerUid}/${r.id}`} className={`p-5 flex flex-col gap-3 ${r.hiddenByAdmin ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#F5F5F5]">{r.customerName}</span>
                    <Stars rating={r.rating} />
                    {r.hiddenByAdmin && <Badge>Hidden</Badge>}
                  </div>
                  <p className="text-xs text-[#71717A] mt-1">
                    {r.serviceName}
                    {r.createdAt && ` · ${new Date(r.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setReplying(r)} className={smallButton}>
                    <MessageSquareReply className="w-3.5 h-3.5" />
                    {r.ownerReply ? "Edit reply" : "Reply"}
                  </button>
                  <button onClick={() => setHidden(r, !r.hiddenByAdmin)} className={smallButton}>
                    {r.hiddenByAdmin ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {r.hiddenByAdmin ? "Show" : "Hide"}
                  </button>
                </div>
              </div>
              <p className="text-[15px] text-[#D4D4D4] leading-relaxed">{r.comment}</p>
              {r.ownerReply && (
                <div className="rounded-xl bg-[#101010] border border-[#2C2C2C] px-4 py-3">
                  <p className="text-xs font-semibold text-[#E86A33] mb-1">Your reply</p>
                  <p className="text-sm text-[#D4D4D4]">{r.ownerReply}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {replying && <ReplyModal review={replying} onClose={() => setReplying(null)} />}
    </div>
  );
}

function ReplyModal({ review, onClose }: { review: AdminReview; onClose: () => void }) {
  const { showToast } = useToast();
  const [text, setText] = useState(review.ownerReply || "");
  const save = async () => {
    try {
      await saveReviewModeration(review, { ownerReply: text.trim(), ownerRepliedAt: Date.now() });
      showToast("Reply saved.", "success");
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't save the reply.", "error");
    }
  };
  return (
    <Modal
      title={`Reply to ${review.customerName}`}
      description={`“${review.comment}”`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={secondaryButton}>Cancel</button>
          <button onClick={save} disabled={!text.trim()} className={primaryButton}>Save reply</button>
        </>
      }
    >
      <Field label="Your reply" hint="Keep it short and specific: thank them, say what you'll do.">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className={inputClass} autoFocus />
      </Field>
    </Modal>
  );
}
