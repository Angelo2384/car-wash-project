import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  MessageSquare,
  Camera,
  X,
  Upload,
  Trash2,
  Edit3,
  ArrowUpDown,
  Car,
  Image as ImageIcon,
  ChevronDown,
  Award,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { Button } from '../../../components/ui/Button';
import { getStoredAppointments, type StoredAppointment } from '../../../lib/appointments';
import {
  getStoredReviews,
  saveCustomerReview,
  deleteCustomerReview,
  calculateReviewStats,
  subscribeToCustomerReviews,
  type CustomerReview,
  type ReviewStats,
} from '../../../lib/reviews';

type SortOption = 'recent' | 'oldest' | 'highest' | 'lowest';

const STANDARD_SERVICES = [
  'Express Wash',
  'Premium Wash',
  'Elite Wash',
  'Custom Package',
  'Mobile Call-out Detailing',
];

export default function CustomerReviews() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const uid = currentUser?.uid;

  // Realtime reviews state
  const [reviews, setReviews] = useState<CustomerReview[]>(() => getStoredReviews(uid));
  const [appointments, setAppointments] = useState<StoredAppointment[]>([]);
  const [stats, setStats] = useState<ReviewStats>(() => calculateReviewStats(getStoredReviews(uid)));

  // Form State
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [customServiceName, setCustomServiceName] = useState<string>('Express Wash');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{ service?: string; rating?: string; comment?: string }>({});

  // Sorting & Pagination State
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // Edit Modal State
  const [editingReview, setEditingReview] = useState<CustomerReview | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editHoverRating, setEditHoverRating] = useState<number>(0);
  const [editComment, setEditComment] = useState<string>('');
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Delete Confirmation Modal State
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Lightbox Photo Modal State
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Load appointments and subscribe to reviews
  useEffect(() => {
    const appts = getStoredAppointments(uid);
    setAppointments(appts);

    // Default to first appointment if available
    if (appts.length > 0) {
      setSelectedAppointmentId(appts[0].id);
      setCustomServiceName(appts[0].packageName || 'Express Wash');
    }

    const unsubscribe = subscribeToCustomerReviews(uid, (updatedReviews) => {
      setReviews(updatedReviews);
      setStats(calculateReviewStats(updatedReviews));
    });

    return () => unsubscribe();
  }, [uid]);

  // Handle appointment selection
  const handleAppointmentSelect = (apptId: string) => {
    setSelectedAppointmentId(apptId);
    if (formErrors.service) setFormErrors((prev) => ({ ...prev, service: undefined }));

    if (apptId.startsWith('std_')) {
      const sName = apptId.replace('std_', '');
      setCustomServiceName(sName);
    } else {
      const found = appointments.find((a) => a.id === apptId);
      if (found) {
        setCustomServiceName(found.packageName);
      }
    }
  };

  // Photo file upload & compression/conversion to base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentPhotos = isEdit ? editPhotos : photos;
    const remainingSlots = 5 - currentPhotos.length;

    if (remainingSlots <= 0) {
      showToast('Maximum 5 photos allowed per review.', 'error');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        showToast('Please upload a valid image file (PNG, JPG).', 'error');
        return;
      }

      // 5MB limit
      if (file.size > 5 * 1024 * 1024) {
        showToast(`Image "${file.name}" exceeds 5MB limit.`, 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const base64 = loadEvt.target?.result as string;
        if (base64) {
          if (isEdit) {
            setEditPhotos((prev) => (prev.length < 5 ? [...prev, base64] : prev));
          } else {
            setPhotos((prev) => (prev.length < 5 ? [...prev, base64] : prev));
          }
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number, isEdit = false) => {
    if (isEdit) {
      setEditPhotos((prev) => prev.filter((_, i) => i !== index));
    } else {
      setPhotos((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Submit new review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { service?: string; rating?: string; comment?: string } = {};

    if (!customServiceName.trim()) {
      errors.service = 'Please select a service.';
    }
    if (!rating || rating < 1 || rating > 5) {
      errors.rating = 'Please choose a rating from 1 to 5 stars.';
    }
    if (!comment.trim()) {
      errors.comment = 'Please provide your review feedback.';
    } else if (comment.trim().length < 5) {
      errors.comment = 'Feedback must be at least 5 characters long.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      if (errors.rating) showToast(errors.rating, 'error');
      else if (errors.comment) showToast(errors.comment, 'error');
      return;
    }

    setIsSubmitting(true);

    const appt = appointments.find((a) => a.id === selectedAppointmentId);
    const newReview: CustomerReview = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerId: uid || 'guest',
      customerName: currentUser?.displayName || 'Valued Customer',
      serviceName: appt?.packageName || customServiceName,
      serviceId: appt?.id || 'standard-service',
      appointmentId: appt ? appt.id : undefined,
      appointmentDate: appt ? `${appt.date} • ${appt.time}` : undefined,
      rating,
      comment: comment.trim(),
      photos,
      status: 'Published',
      createdAt: Date.now(),
    };

    try {
      const res = await saveCustomerReview(newReview, uid);
      if (res.success) {
        showToast(
          res.pointsAwarded
            ? `Review submitted successfully! +${res.pointsAwarded} loyalty points earned.`
            : 'Review submitted successfully!',
          'success'
        );
        // Reset form
        setComment('');
        setPhotos([]);
        setRating(5);
        setFormErrors({});
      } else {
        showToast('Failed to save review. Please try again.', 'error');
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (review: CustomerReview) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditHoverRating(0);
    setEditComment(review.comment);
    setEditPhotos(review.photos ? [...review.photos] : []);
  };

  // Save Edited Review
  const handleSaveEdit = async () => {
    if (!editingReview) return;
    if (!editComment.trim() || editComment.trim().length < 5) {
      showToast('Feedback must be at least 5 characters long.', 'error');
      return;
    }

    setIsSavingEdit(true);
    const updatedReview: CustomerReview = {
      ...editingReview,
      rating: editRating,
      comment: editComment.trim(),
      photos: editPhotos,
      updatedAt: Date.now(),
    };

    try {
      const res = await saveCustomerReview(updatedReview, uid);
      if (res.success) {
        showToast('Review updated successfully!', 'success');
        setEditingReview(null);
      } else {
        showToast('Failed to update review.', 'error');
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Confirm and delete review
  const handleConfirmDelete = async () => {
    if (!deletingReviewId) return;
    setIsDeleting(true);

    try {
      const ok = await deleteCustomerReview(deletingReviewId, uid);
      if (ok) {
        showToast('Review deleted successfully!', 'success');
        setDeletingReviewId(null);
      } else {
        showToast('Failed to delete review.', 'error');
      }
    } catch {
      showToast('Something went wrong deleting the review.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Sort reviews
  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'recent') return (b.createdAt || 0) - (a.createdAt || 0);
    if (sortBy === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
    if (sortBy === 'highest') return b.rating - a.rating;
    if (sortBy === 'lowest') return a.rating - b.rating;
    return 0;
  });

  const visibleReviews = sortedReviews.slice(0, visibleCount);

  // Rating labels helper
  const getRatingLabel = (r: number) => {
    switch (r) {
      case 5:
        return '5.0 — Exceptional & Pristine';
      case 4:
        return '4.0 — Very Good';
      case 3:
        return '3.0 — Average';
      case 2:
        return '2.0 — Below Expectations';
      case 1:
        return '1.0 — Poor';
      default:
        return 'Select a rating';
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-forwards text-[#F5F5F5] pb-16">
      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col gap-1.5 border-b border-[#2C2C2C] pb-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#E86A33]/15 text-[#E86A33] border border-[#E86A33]/30">
            <MessageSquare className="w-3.5 h-3.5 text-[#E86A33]" />
            Customer Voice
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-[#F5F5F5]">
          My Reviews
        </h1>
        <p className="text-[#A1A1AA] text-sm sm:text-[15px] max-w-2xl leading-relaxed">
          Manage and share feedback about your car wash experiences.
        </p>
      </div>

      {/* ─── 2. REVIEW STATISTICS CARDS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Reviews */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#3C3C3C] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
              Total Reviews
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E86A33]/10 border border-[#E86A33]/20 flex items-center justify-center text-[#E86A33]">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-4xl font-black font-display text-[#F5F5F5] tracking-tight">
              {stats.totalReviews}
            </div>
            <p className="text-xs text-[#35B86B] font-semibold mt-1 flex items-center gap-1">
              <span>+{stats.thisMonthCount} this month</span>
            </p>
          </div>
        </div>

        {/* Card 2: Average Rating */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#3C3C3C] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
              Average Rating
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
              <Star className="w-4 h-4 fill-[#F59E0B]" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black font-display text-[#F5F5F5] tracking-tight">
                {stats.averageRatingDisplay}
              </span>
              <span className="text-xs text-[#71717A] font-medium">/ 5.0</span>
            </div>
            {/* Stars display */}
            <div className="flex items-center gap-1 mt-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= Math.round(stats.averageRating)
                      ? 'text-[#E86A33] fill-[#E86A33]'
                      : 'text-[#2C2C2C] fill-transparent'
                  }`}
                />
              ))}
              <span className="text-[11px] text-[#A1A1AA] ml-1.5 font-medium">
                ({stats.totalReviews} {stats.totalReviews === 1 ? 'rating' : 'ratings'})
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Most Reviewed Service */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#3C3C3C] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
              Most Reviewed
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#35B86B]/10 border border-[#35B86B]/20 flex items-center justify-center text-[#35B86B]">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-lg font-bold font-display text-[#F5F5F5] truncate">
              {stats.mostReviewedService}
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1">
              {stats.mostReviewedCount > 0
                ? `${stats.mostReviewedCount} review${stats.mostReviewedCount > 1 ? 's' : ''} submitted for this service`
                : 'Share your first wash review'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. TWO-COLUMN WORKFLOW: WRITE REVIEW (LEFT) & PREVIOUS REVIEWS (RIGHT) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ────────── LEFT COLUMN: WRITE A REVIEW FORM ────────── */}
        <div className="lg:col-span-5 bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
          {/* Accent top line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E86A33] via-[#FFA26B] to-[#E86A33]" />

          <div className="flex items-center justify-between border-b border-[#2C2C2C] pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold font-display text-[#F5F5F5]">
                Write a Review
              </h2>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Share your feedback to help us continually elevate our craft.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#35B86B]/15 text-[#35B86B] border border-[#35B86B]/30">
              <Award className="w-3.5 h-3.5" />
              +50 PTS
            </span>
          </div>

          <form onSubmit={handleSubmitReview} className="flex flex-col gap-5">
            {/* Service / Appointment Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                Select Service *
              </label>

              <div className="relative">
                <select
                  value={selectedAppointmentId || `std_${customServiceName}`}
                  onChange={(e) => handleAppointmentSelect(e.target.value)}
                  className="w-full bg-[#101010] border border-[#2C2C2C] focus:border-[#E86A33] focus:ring-1 focus:ring-[#E86A33] text-[#F5F5F5] rounded-xl px-4 py-3 text-sm appearance-none outline-none transition-colors cursor-pointer"
                >
                  {appointments.length > 0 ? (
                    <>
                      <optgroup label="Your Booked Appointments">
                        {appointments.map((appt) => (
                          <option key={appt.id} value={appt.id}>
                            {appt.packageName} • {appt.vehicle} ({appt.date})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="General Services">
                        {STANDARD_SERVICES.map((svc) => (
                          <option key={`std_${svc}`} value={`std_${svc}`}>
                            {svc}
                          </option>
                        ))}
                      </optgroup>
                    </>
                  ) : (
                    STANDARD_SERVICES.map((svc) => (
                      <option key={`std_${svc}`} value={`std_${svc}`}>
                        {svc}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-[#71717A] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {formErrors.service && (
                <span className="text-xs text-red-400 mt-0.5">{formErrors.service}</span>
              )}
            </div>

            {/* Interactive 5-Star Rating */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                  Star Rating *
                </label>
                <span className="text-xs font-semibold text-[#E86A33]">
                  {getRatingLabel(hoverRating || rating)}
                </span>
              </div>

              <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-3.5 flex items-center justify-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= (hoverRating || rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setRating(star);
                        if (formErrors.rating) setFormErrors((prev) => ({ ...prev, rating: undefined }));
                      }}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-all transform hover:scale-125 active:scale-95 focus:outline-none"
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          isFilled
                            ? 'text-[#E86A33] fill-[#E86A33] filter drop-shadow-[0_0_8px_rgba(232,106,51,0.5)]'
                            : 'text-[#3C3C3C] fill-transparent hover:text-[#E86A33]/50'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Review Feedback Textarea */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                  Your Feedback *
                </label>
                <span className="text-xs text-[#71717A] font-mono">
                  {comment.length} / 500
                </span>
              </div>

              <textarea
                value={comment}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setComment(e.target.value);
                    if (formErrors.comment) setFormErrors((prev) => ({ ...prev, comment: undefined }));
                  }
                }}
                rows={4}
                placeholder="Describe your experience with our wash team, attention to detail, or results..."
                className={`w-full bg-[#101010] border ${
                  formErrors.comment ? 'border-red-500/80' : 'border-[#2C2C2C]'
                } focus:border-[#E86A33] focus:ring-1 focus:ring-[#E86A33] text-[#F5F5F5] rounded-xl p-3.5 text-sm outline-none resize-none transition-colors placeholder:text-[#52525B]`}
              />
              {formErrors.comment && (
                <span className="text-xs text-red-400 mt-0.5">{formErrors.comment}</span>
              )}
            </div>

            {/* Photo Upload (Optional) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#E86A33]" />
                  Add Photos (Optional)
                </label>
                <span className="text-xs text-[#71717A]">Up to 5 photos</span>
              </div>

              {/* Photo Previews Grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mb-1">
                  {photos.map((src, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden border border-[#2C2C2C] bg-[#101010] group"
                    >
                      <img
                        src={src}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/80 text-white hover:bg-red-500 transition-colors shadow-md"
                        aria-label="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Dropzone / Button */}
              {photos.length < 5 && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    multiple
                    onChange={(e) => handlePhotoUpload(e, false)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border border-dashed border-[#2C2C2C] hover:border-[#E86A33]/60 bg-[#101010] hover:bg-[#151515] rounded-xl p-3.5 flex items-center justify-center gap-2 text-xs text-[#A1A1AA] hover:text-[#F5F5F5] transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-[#E86A33]" />
                    <span>Upload photos from your device</span>
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isSubmitting}
              className="py-3.5 text-sm font-semibold shadow-lg shadow-[#E86A33]/20 mt-2"
            >
              <MessageSquare className="w-4 h-4" />
              Submit Review
            </Button>
          </form>
        </div>

        {/* ────────── RIGHT COLUMN: MY PREVIOUS REVIEWS ────────── */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#171717] border border-[#2C2C2C] p-4 rounded-2xl">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-display text-[#F5F5F5]">
                My Previous Reviews
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1F1F1F] text-[#A1A1AA] border border-[#2C2C2C]">
                {reviews.length}
              </span>
            </div>

            {/* Sort by dropdown */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-[#71717A] flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" />
                Sort by:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-[#101010] border border-[#2C2C2C] text-[#F5F5F5] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#E86A33] cursor-pointer"
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
          </div>

          {/* Review Cards List */}
          {sortedReviews.length === 0 ? (
            /* Empty state */
            <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-4 shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-[#1F1F1F] border border-[#2C2C2C] flex items-center justify-center text-[#71717A]">
                <MessageSquare className="w-8 h-8 text-[#E86A33]" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display text-[#F5F5F5]">
                  No Reviews Yet
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm">
                  Share your experience after your next car wash and earn +50 loyalty reward points.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => navigate('/dashboard/customer/appointments')}
                className="mt-2 text-xs py-2.5 px-5"
              >
                View My Appointments
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {visibleReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-[#171717] border border-[#2C2C2C] hover:border-[#3C3C3C] rounded-2xl p-5 sm:p-6 flex flex-col gap-4 shadow-lg transition-all group"
                >
                  {/* Top Row: Service name, Status, Rating & Actions */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-[#F5F5F5]">
                          {rev.serviceName}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#35B86B]/15 text-[#35B86B] border border-[#35B86B]/30">
                          {rev.status || 'Published'}
                        </span>
                      </div>

                      {/* Date & Service info */}
                      <span className="text-xs text-[#71717A] mt-0.5">
                        Submitted on{' '}
                        {new Date(rev.createdAt).toLocaleDateString('en-ZA', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                        {rev.appointmentDate ? ` • ${rev.appointmentDate}` : ''}
                      </span>
                    </div>

                    {/* Actions: Edit & Delete */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(rev)}
                        className="p-2 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-colors"
                        title="Edit Review"
                        aria-label="Edit Review"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingReviewId(rev.id)}
                        className="p-2 rounded-lg text-[#71717A] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Review"
                        aria-label="Delete Review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Star Rating row */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= rev.rating
                            ? 'text-[#E86A33] fill-[#E86A33]'
                            : 'text-[#2C2C2C] fill-transparent'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold text-[#E86A33] ml-1.5">
                      {rev.rating}.0 / 5.0
                    </span>
                  </div>

                  {/* Review Text */}
                  <p className="text-sm text-[#D4D4D4] leading-relaxed whitespace-pre-line bg-[#101010]/60 p-3.5 rounded-xl border border-[#2C2C2C]/50">
                    "{rev.comment}"
                  </p>

                  {/* Photos Grid if any */}
                  {rev.photos && rev.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {rev.photos.map((imgUrl, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => setPreviewPhotoUrl(imgUrl)}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-[#2C2C2C] bg-[#101010] cursor-pointer hover:border-[#E86A33] hover:scale-105 transition-all shadow-md group relative"
                        >
                          <img
                            src={imgUrl}
                            alt={`Review photo ${pIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ImageIcon className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Load More Button */}
              {visibleCount < sortedReviews.length && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount((prev) => prev + 4)}
                    className="text-xs py-2.5 px-6 !border-[#2C2C2C] hover:!border-[#E86A33] hover:!text-[#E86A33]"
                  >
                    Load More Reviews ({sortedReviews.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── 4. EDIT REVIEW MODAL ─── */}
      {editingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#171717] border border-[#2C2C2C] rounded-2xl shadow-2xl p-6 sm:p-7 flex flex-col gap-5 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E86A33] via-[#FFA26B] to-[#E86A33]" />

            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold font-display text-[#F5F5F5]">
                  Edit Review
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  {editingReview.serviceName}
                </p>
              </div>
              <button
                onClick={() => setEditingReview(null)}
                className="text-[#71717A] hover:text-[#F5F5F5] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Edit Star Rating */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                Rating
              </span>
              <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-3 flex items-center justify-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setEditRating(star)}
                    onMouseEnter={() => setEditHoverRating(star)}
                    onMouseLeave={() => setEditHoverRating(0)}
                    className="p-1 rounded-lg hover:bg-white/[0.06] transition-all transform hover:scale-125"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= (editHoverRating || editRating)
                          ? 'text-[#E86A33] fill-[#E86A33]'
                          : 'text-[#3C3C3C] fill-transparent'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Edit Feedback Comment */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                  Feedback
                </span>
                <span className="text-xs text-[#71717A] font-mono">
                  {editComment.length} / 500
                </span>
              </div>
              <textarea
                value={editComment}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setEditComment(e.target.value);
                  }
                }}
                rows={4}
                className="w-full bg-[#101010] border border-[#2C2C2C] focus:border-[#E86A33] text-[#F5F5F5] rounded-xl p-3.5 text-sm outline-none resize-none placeholder:text-[#52525B]"
              />
            </div>

            {/* Edit Photos */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                  Photos ({editPhotos.length} / 5)
                </span>
              </div>

              {editPhotos.length > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {editPhotos.map((src, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden border border-[#2C2C2C] bg-[#101010]"
                    >
                      <img src={src} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx, true)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/80 text-white hover:bg-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {editPhotos.length < 5 && (
                <div>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    multiple
                    onChange={(e) => handlePhotoUpload(e, true)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="w-full border border-dashed border-[#2C2C2C] hover:border-[#E86A33]/60 bg-[#101010] rounded-xl p-2.5 flex items-center justify-center gap-2 text-xs text-[#A1A1AA] hover:text-[#F5F5F5] transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#E86A33]" />
                    <span>Upload more photos</span>
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingReview(null)}
                disabled={isSavingEdit}
                className="flex-1 py-2.5 text-xs !border-[#2C2C2C]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveEdit}
                isLoading={isSavingEdit}
                className="flex-1 py-2.5 text-xs font-semibold"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. DELETE CONFIRMATION MODAL ─── */}
      {deletingReviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden text-center flex flex-col items-center">
            {/* Top red accent */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500" />

            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold font-display text-[#F5F5F5]">
              Delete this review?
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-1 mb-6 max-w-xs">
              This action cannot be undone and will permanently remove your feedback.
            </p>

            <div className="flex items-center gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingReviewId(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-xs !border-[#2C2C2C]"
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-red-600/20"
              >
                {isDeleting ? 'Deleting...' : 'Delete Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. LIGHTBOX PHOTO MODAL ─── */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden border border-[#2C2C2C] shadow-2xl">
            <img
              src={previewPhotoUrl}
              alt="Enlarged review photo"
              className="w-full h-full object-contain max-h-[80vh]"
            />
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-white hover:text-black transition-colors"
              aria-label="Close image preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
