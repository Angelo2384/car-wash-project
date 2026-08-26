import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { recordReviewPoints } from './rewards';

export interface CustomerReview {
  id: string;
  customerId: string;
  customerName: string;
  serviceId?: string;
  serviceName: string;
  appointmentId?: string;
  appointmentDate?: string;
  rating: number; // 1 to 5
  comment: string;
  photos?: string[]; // base64 or URLs
  status: 'Published' | 'Pending Approval' | 'Rejected';
  createdAt: number;
  updatedAt?: number;
}

export interface ReviewStats {
  totalReviews: number;
  thisMonthCount: number;
  averageRating: number;
  averageRatingDisplay: string;
  mostReviewedService: string;
  mostReviewedCount: number;
  ratingDistribution: Record<number, number>;
}

export function getReviewsStorageKey(uid?: string | null): string {
  return uid ? `ww_reviews_${uid}` : 'ww_reviews_guest';
}

/**
 * Retrieves stored reviews for a given user from localStorage.
 */
export function getStoredReviews(uid?: string | null): CustomerReview[] {
  try {
    const key = getReviewsStorageKey(uid);
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      }
    }
  } catch (e) {
    console.error('Failed to load reviews from localStorage', e);
  }
  return [];
}

/**
 * Calculates review statistics dynamically from an array of reviews.
 */
export function calculateReviewStats(reviews: CustomerReview[]): ReviewStats {
  if (!reviews || reviews.length === 0) {
    return {
      totalReviews: 0,
      thisMonthCount: 0,
      averageRating: 0,
      averageRatingDisplay: '0.0',
      mostReviewedService: 'No reviews yet',
      mostReviewedCount: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let totalRating = 0;
  let thisMonthCount = 0;
  const serviceCounts: Record<string, number> = {};
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  reviews.forEach((rev) => {
    totalRating += rev.rating;
    const rInt = Math.min(5, Math.max(1, Math.round(rev.rating)));
    ratingDistribution[rInt] = (ratingDistribution[rInt] || 0) + 1;

    // Check if created this month
    if (rev.createdAt) {
      const date = new Date(rev.createdAt);
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        thisMonthCount += 1;
      }
    }

    // Count by service
    const sName = rev.serviceName || 'Standard Wash';
    serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
  });

  const avg = reviews.length > 0 ? totalRating / reviews.length : 0;
  const avgDisplay = avg.toFixed(1);

  // Find most reviewed service
  let mostReviewed = 'No reviews yet';
  let maxCount = 0;
  Object.entries(serviceCounts).forEach(([svc, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostReviewed = svc;
    }
  });

  return {
    totalReviews: reviews.length,
    thisMonthCount,
    averageRating: Math.round(avg * 10) / 10,
    averageRatingDisplay: avgDisplay,
    mostReviewedService: mostReviewed,
    mostReviewedCount: maxCount,
    ratingDistribution,
  };
}

/**
 * Saves a new review or updates an existing one in localStorage and Firestore.
 * Also awards loyalty points if this review is associated with an appointment.
 */
export async function saveCustomerReview(
  review: CustomerReview,
  uid?: string | null
): Promise<{ success: boolean; pointsAwarded?: number }> {
  try {
    const current = getStoredReviews(uid);
    const existingIdx = current.findIndex((r) => r.id === review.id);

    let updated: CustomerReview[];
    if (existingIdx !== -1) {
      updated = current.map((r) => (r.id === review.id ? { ...r, ...review, updatedAt: Date.now() } : r));
    } else {
      updated = [{ ...review, createdAt: review.createdAt || Date.now() }, ...current];
    }

    const key = getReviewsStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(updated));

    // Dispatch global event for realtime sync across components (e.g. Profile)
    window.dispatchEvent(new CustomEvent('ww_reviews_changed', { detail: { uid } }));

    // Async sync to Firestore
    if (uid) {
      const reviewDocRef = doc(db, 'users', uid, 'reviews', review.id);
      setDoc(
        reviewDocRef,
        {
          ...review,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch((err) => {
        console.warn('Firestore review sync error (using local storage):', err.message);
      });
    }

    // Award loyalty points for new reviews if appointmentId is present
    let pointsAwarded = 0;
    if (existingIdx === -1 && review.appointmentId) {
      try {
        const ptsRes = await recordReviewPoints(uid, review.appointmentId, review.rating);
        if (ptsRes.success) {
          pointsAwarded = ptsRes.points;
        }
      } catch (e) {
        console.warn('Failed to record review points:', e);
      }
    }

    return { success: true, pointsAwarded };
  } catch (e) {
    console.error('Failed to save review:', e);
    return { success: false };
  }
}

/**
 * Deletes a review by ID from localStorage and Firestore.
 */
export async function deleteCustomerReview(id: string, uid?: string | null): Promise<boolean> {
  try {
    const current = getStoredReviews(uid);
    const updated = current.filter((r) => r.id !== id);
    const key = getReviewsStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('ww_reviews_changed', { detail: { uid } }));

    if (uid) {
      const reviewDocRef = doc(db, 'users', uid, 'reviews', id);
      deleteDoc(reviewDocRef).catch((err) => {
        console.warn('Firestore review deletion error:', err.message);
      });
    }

    return true;
  } catch (e) {
    console.error('Failed to delete review:', e);
    return false;
  }
}

/**
 * Subscribes to reviews for the current user in realtime.
 */
export function subscribeToCustomerReviews(
  uid: string | null | undefined,
  callback: (reviews: CustomerReview[]) => void
): () => void {
  // Immediately return local data
  const localReviews = getStoredReviews(uid);
  callback(localReviews);

  const handleCustomEvent = (e: Event) => {
    const customEvt = e as CustomEvent;
    if (!customEvt.detail || customEvt.detail.uid === uid) {
      callback(getStoredReviews(uid));
    }
  };

  window.addEventListener('ww_reviews_changed', handleCustomEvent);
  window.addEventListener('storage', handleCustomEvent);

  if (!uid) {
    return () => {
      window.removeEventListener('ww_reviews_changed', handleCustomEvent);
      window.removeEventListener('storage', handleCustomEvent);
    };
  }

  try {
    const reviewsColRef = collection(db, 'users', uid, 'reviews');
    const q = query(reviewsColRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteReviews: CustomerReview[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Partial<CustomerReview>;
            remoteReviews.push({
              id: docSnap.id,
              customerId: data.customerId || uid,
              customerName: data.customerName || 'Valued Customer',
              serviceName: data.serviceName || 'Car Wash Service',
              serviceId: data.serviceId,
              appointmentId: data.appointmentId,
              appointmentDate: data.appointmentDate,
              rating: data.rating || 5,
              comment: data.comment || '',
              photos: Array.isArray(data.photos) ? data.photos : [],
              status: data.status || 'Published',
              createdAt: data.createdAt || Date.now(),
              updatedAt: data.updatedAt,
            });
          });

          // Sync to localStorage
          const key = getReviewsStorageKey(uid);
          localStorage.setItem(key, JSON.stringify(remoteReviews));
          callback(remoteReviews);
        }
      },
      (err) => {
        console.warn('Firestore reviews onSnapshot fallback:', err.message);
      }
    );

    return () => {
      unsubscribe();
      window.removeEventListener('ww_reviews_changed', handleCustomEvent);
      window.removeEventListener('storage', handleCustomEvent);
    };
  } catch {
    return () => {
      window.removeEventListener('ww_reviews_changed', handleCustomEvent);
      window.removeEventListener('storage', handleCustomEvent);
    };
  }
}
