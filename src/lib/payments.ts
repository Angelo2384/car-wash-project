import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export interface SavedPaymentMethod {
  id: string;
  cardBrand: 'visa' | 'mastercard' | 'amex' | 'card';
  cardHolder: string;
  last4: string;
  expiry: string; // MM/YY
  isDefault?: boolean;
  createdAt: number;
}

export interface PaymentTransaction {
  id: string;
  title: string;
  appointmentId?: string;
  date: string;
  amount: string;
  type: 'payment' | 'refund';
  status: 'Completed' | 'Refunded' | 'Pending';
  cardLast4?: string;
  createdAt: number;
}

export function getPaymentMethodsStorageKey(uid?: string | null): string {
  return uid ? `ww_payment_methods_${uid}` : 'ww_payment_methods_guest';
}

export function getStoredPaymentMethods(uid?: string | null): SavedPaymentMethod[] {
  try {
    const key = getPaymentMethodsStorageKey(uid);
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load payment methods:', e);
  }
  return [];
}

/**
 * Saves a payment method SAFELY: Never stores raw card numbers or CVVs.
 */
export async function savePaymentMethod(
  method: SavedPaymentMethod,
  uid?: string | null
): Promise<boolean> {
  try {
    const current = getStoredPaymentMethods(uid);
    const updated = [method, ...current.filter((m) => m.id !== method.id)];
    const key = getPaymentMethodsStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('ww_payments_changed', { detail: { uid } }));

    if (uid) {
      const docRef = doc(db, 'users', uid, 'paymentMethods', method.id);
      setDoc(docRef, method, { merge: true }).catch((err) => {
        console.warn('Firestore paymentMethod sync error:', err);
      });
    }
    return true;
  } catch (e) {
    console.error('Failed to save payment method:', e);
    return false;
  }
}

export async function deletePaymentMethod(id: string, uid?: string | null): Promise<boolean> {
  try {
    const current = getStoredPaymentMethods(uid);
    const updated = current.filter((m) => m.id !== id);
    const key = getPaymentMethodsStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('ww_payments_changed', { detail: { uid } }));

    if (uid) {
      const docRef = doc(db, 'users', uid, 'paymentMethods', id);
      deleteDoc(docRef).catch((err) => {
        console.warn('Firestore paymentMethod delete error:', err);
      });
    }
    return true;
  } catch (e) {
    console.error('Failed to delete payment method:', e);
    return false;
  }
}

export function subscribeToPaymentMethods(
  uid: string | null | undefined,
  callback: (methods: SavedPaymentMethod[]) => void
): () => void {
  callback(getStoredPaymentMethods(uid));

  const handleCustomEvent = (e: Event) => {
    const customEvt = e as CustomEvent;
    if (!customEvt.detail || customEvt.detail.uid === uid) {
      callback(getStoredPaymentMethods(uid));
    }
  };

  window.addEventListener('ww_payments_changed', handleCustomEvent);
  window.addEventListener('storage', handleCustomEvent);

  if (!uid) {
    return () => {
      window.removeEventListener('ww_payments_changed', handleCustomEvent);
      window.removeEventListener('storage', handleCustomEvent);
    };
  }

  try {
    const colRef = collection(db, 'users', uid, 'paymentMethods');
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: SavedPaymentMethod[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          const key = getPaymentMethodsStorageKey(uid);
          localStorage.setItem(key, JSON.stringify(list));
          callback(list);
        }
      },
      (err) => console.warn('Firestore payments listener fallback:', err)
    );

    return () => {
      unsub();
      window.removeEventListener('ww_payments_changed', handleCustomEvent);
      window.removeEventListener('storage', handleCustomEvent);
    };
  } catch {
    return () => {
      window.removeEventListener('ww_payments_changed', handleCustomEvent);
      window.removeEventListener('storage', handleCustomEvent);
    };
  }
}
