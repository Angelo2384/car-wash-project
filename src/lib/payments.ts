import { collection, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Payments are handled entirely by Paystack, so WashWizzy keeps no card details.
 * Older versions saved card summaries (name, brand, last 4 digits, expiry) to
 * users/{uid}/paymentMethods and localStorage. This removes them.
 */
export async function purgeSavedPaymentMethods(uid?: string | null): Promise<void> {
  try {
    localStorage.removeItem(uid ? `ww_payment_methods_${uid}` : 'ww_payment_methods_guest');
  } catch {
    // storage unavailable; nothing to clear
  }
  if (!uid) return;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'paymentMethods'));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  } catch (err) {
    console.warn('Could not remove old saved cards:', err);
  }
}
