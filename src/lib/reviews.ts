import {
  collection,
  collectionGroup,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { recordReviewPoints } from './rewards';
import type { StoredAppointment } from './appointments';

export interface CustomerReview {
  id: string;
  customerId: string;
  customerName: string;
  serviceId?: string;
  serviceName: string;
  appointmentId?: string;
  appointmentDate?: string;
  assignedStaffUid?: string;
  staffName?: string;
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

export interface StaffReviewStats {
  totalReviews: number;
  thisMonthCount: number;
  averageRating: number;
  averageRatingDisplay: string;
  ratingDistribution: Record<number, number>;
}

export function getReviewsStorageKey(uid?: string | null): string {
  return uid ? `ww_reviews_${uid}` : 'ww_reviews_guest';
}

export function getStaffReviewsStorageKey(staffUid?: string | null): string {
  return staffUid ? `ww_staff_reviews_${staffUid}` : 'ww_staff_reviews_default';
}

/**
 * Retrieves stored customer reviews for a given user from localStorage.
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
 * Retrieves cached reviews for a staff member from localStorage.
 */
export function getStoredStaffReviews(staffUid?: string | null): CustomerReview[] {
  try {
    const key = getStaffReviewsStorageKey(staffUid);
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      }
    }
  } catch (e) {
    console.error('Failed to load staff reviews from localStorage', e);
  }
  return [];
}

/**
 * Calculates review statistics dynamically from an array of customer reviews.
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
 * Calculates staff review statistics dynamically for reviews assigned to a staff member.
 */
export function calculateStaffReviewStats(reviews: CustomerReview[]): StaffReviewStats {
  if (!reviews || reviews.length === 0) {
    return {
      totalReviews: 0,
      thisMonthCount: 0,
      averageRating: 0,
      averageRatingDisplay: '0.0',
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let totalRating = 0;
  let thisMonthCount = 0;
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  reviews.forEach((rev) => {
    totalRating += rev.rating;
    const rInt = Math.min(5, Math.max(1, Math.round(rev.rating)));
    ratingDistribution[rInt] = (ratingDistribution[rInt] || 0) + 1;

    if (rev.createdAt) {
      const date = new Date(rev.createdAt);
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        thisMonthCount += 1;
      }
    }
  });

  const avg = reviews.length > 0 ? totalRating / reviews.length : 0;
  const avgDisplay = avg.toFixed(1);

  return {
    totalReviews: reviews.length,
    thisMonthCount,
    averageRating: Math.round(avg * 10) / 10,
    averageRatingDisplay: avgDisplay,
    ratingDistribution,
  };
}

/**
 * Saves a new review or updates an existing one in Firestore and localStorage.
 * Enforces one review per booking: if a review for this appointmentId already exists,
 * it updates that record. Failed writes throw/return an error so the UI reflects true state.
 */
export async function saveCustomerReview(
  review: CustomerReview,
  uid?: string | null
): Promise<{ success: boolean; pointsAwarded?: number; error?: string; reviewId?: string }> {
  try {
    const current = getStoredReviews(uid);

    // Identify if updating existing review by ID or by appointmentId
    const existingByIdIdx = current.findIndex((r) => r.id === review.id);
    const existingByApptIdx = review.appointmentId
      ? current.findIndex((r) => r.appointmentId === review.appointmentId)
      : -1;

    const matchedIdx = existingByIdIdx !== -1 ? existingByIdIdx : existingByApptIdx;
    const isNew = matchedIdx === -1;
    const targetId = matchedIdx !== -1 ? current[matchedIdx].id : review.id;

    const finalReview: CustomerReview = {
      ...review,
      id: targetId,
      customerId: uid || review.customerId || 'guest',
      createdAt: matchedIdx !== -1 ? (current[matchedIdx].createdAt || review.createdAt) : (review.createdAt || Date.now()),
      updatedAt: Date.now(),
    };

    // 1. Authoritative write to Firestore FIRST (awaiting completion)
    if (uid) {
      const reviewDocRef = doc(db, 'users', uid, 'reviews', targetId);
      const firestorePayload: Record<string, unknown> = {
        ...finalReview,
        updatedAt: serverTimestamp(),
      };
      // Clean undefined keys before writing to Firestore
      Object.keys(firestorePayload).forEach((key) => {
        if (firestorePayload[key] === undefined) {
          delete firestorePayload[key];
        }
      });

      await setDoc(reviewDocRef, firestorePayload, { merge: true });
    }

    // 2. Update local storage cache
    let updated: CustomerReview[];
    if (matchedIdx !== -1) {
      updated = current.map((r, idx) => (idx === matchedIdx ? finalReview : r));
    } else {
      updated = [finalReview, ...current];
    }

    const key = getReviewsStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(updated));

    // Dispatch global event for realtime sync across components (e.g. Profile)
    window.dispatchEvent(new CustomEvent('ww_reviews_changed', { detail: { uid } }));

    // 3. Award loyalty points only for newly submitted reviews (not updates/edits)
    let pointsAwarded = 0;
    if (isNew) {
      try {
        const reviewKey = finalReview.appointmentId || targetId;
        const ptsRes = await recordReviewPoints(uid, reviewKey, finalReview.rating);
        if (ptsRes.success) {
          pointsAwarded = ptsRes.points;
        }
      } catch (e) {
        console.warn('Failed to record review points:', e);
      }
    }

    return { success: true, pointsAwarded, reviewId: targetId };
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : 'Failed to save review to Firestore.';
    console.error('Failed to save review:', e);
    return { success: false, error: errorMsg };
  }
}

/**
 * Deletes a review by ID from Firestore and localStorage.
 */
export async function deleteCustomerReview(id: string, uid?: string | null): Promise<boolean> {
  try {
    // 1. Authoritative delete from Firestore FIRST
    if (uid) {
      const reviewDocRef = doc(db, 'users', uid, 'reviews', id);
      await deleteDoc(reviewDocRef);
    }

    // 2. Update local storage cache
    const current = getStoredReviews(uid);
    const updated = current.filter((r) => r.id !== id);
    const key = getReviewsStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('ww_reviews_changed', { detail: { uid } }));
    return true;
  } catch (e) {
    console.error('Failed to delete review:', e);
    return false;
  }
}

/**
 * Subscribes to customer reviews for the current user in realtime.
 * Handles deletions and empty snapshots properly so stale reviews disappear.
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
        const key = getReviewsStorageKey(uid);
        if (snapshot.empty) {
          localStorage.setItem(key, JSON.stringify([]));
          callback([]);
          return;
        }

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
            assignedStaffUid: data.assignedStaffUid,
            staffName: data.staffName,
            rating: data.rating || 5,
            comment: data.comment || '',
            photos: Array.isArray(data.photos) ? data.photos : [],
            status: data.status || 'Published',
            createdAt: data.createdAt || Date.now(),
            updatedAt: data.updatedAt,
          });
        });

        localStorage.setItem(key, JSON.stringify(remoteReviews));
        callback(remoteReviews);
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

/**
 * Subscribes to published customer reviews assigned to a staff member across all customers.
 * Uses collectionGroup('reviews') scoped by assignedStaffUid.
 */
export function subscribeToStaffReviews(
  staffUid: string | null | undefined,
  callback: (reviews: CustomerReview[]) => void,
  onError?: (err: unknown) => void
): () => void {
  if (!staffUid) {
    callback([]);
    return () => {};
  }

  // Immediately return local cached data for staff
  const localCached = getStoredStaffReviews(staffUid);
  if (localCached.length > 0) {
    callback(localCached);
  }

  try {
    const q = query(
      collectionGroup(db, 'reviews'),
      where('assignedStaffUid', '==', staffUid),
      where('status', '==', 'Published')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: CustomerReview[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Partial<CustomerReview>;
          // Only published reviews belong in staff list & statistics
          if (data.status === 'Published') {
            list.push({
              id: docSnap.id,
              customerId: data.customerId || docSnap.ref.parent.parent?.id || '',
              customerName: data.customerName || 'Customer',
              serviceName: data.serviceName || 'Car Wash Service',
              serviceId: data.serviceId,
              appointmentId: data.appointmentId,
              appointmentDate: data.appointmentDate,
              assignedStaffUid: data.assignedStaffUid || staffUid,
              staffName: data.staffName,
              rating: typeof data.rating === 'number' ? data.rating : 5,
              comment: data.comment || '',
              photos: Array.isArray(data.photos) ? data.photos : [],
              status: 'Published',
              createdAt: data.createdAt || Date.now(),
              updatedAt: data.updatedAt,
            });
          }
        });

        // Client-side sort by newest first
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Update local cache for this staff member
        try {
          const key = getStaffReviewsStorageKey(staffUid);
          localStorage.setItem(key, JSON.stringify(list));
        } catch (storageErr) {
          console.warn('Failed to cache staff reviews in localStorage', storageErr);
        }

        callback(list);
      },
      (err) => {
        console.error('Staff reviews subscription error:', err);
        onError?.(err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Failed to initialize staff reviews query:', err);
    onError?.(err);
    return () => {};
  }
}

/**
 * Handles older reviews safely by backfilling staff attribution ONLY where a verified
 * completed booking establishes the assignment. Unlinked/unverifiable reviews are untouched.
 */
export async function backfillStaffAttribution(
  reviews: CustomerReview[],
  appointments: StoredAppointment[],
  customerUid: string
): Promise<void> {
  if (!customerUid || !reviews.length || !appointments.length) return;

  const apptMap = new Map<string, StoredAppointment>();
  appointments.forEach((a) => {
    if (a.id) apptMap.set(a.id, a);
  });

  for (const rev of reviews) {
    // Only process reviews that have an appointmentId but NO assignedStaffUid
    if (rev.appointmentId && !rev.assignedStaffUid) {
      const appt = apptMap.get(rev.appointmentId);
      const isCompleted = appt && (appt.completed === true || appt.status === 'Completed');
      if (isCompleted && appt.assignedStaffUid) {
        try {
          await saveCustomerReview(
            {
              ...rev,
              assignedStaffUid: appt.assignedStaffUid,
              staffName: appt.staffName || rev.staffName,
            },
            customerUid
          );
        } catch (e) {
          console.warn('Failed to backfill review staff attribution:', e);
        }
      }
    }
  }
}
