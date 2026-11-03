import { useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sendWelcomeEmail, welcomeEmailEnabled } from '../lib/emails';

const NEW_ACCOUNT_DAYS = 7;

/**
 * Sends the welcome email the first time a new customer reaches their dashboard
 * (after verifying their email, or straight after a Google sign-up). A flag on the
 * account stops it sending twice; accounts older than a week are just flagged, so
 * existing customers don't get a surprise "welcome".
 */
export function useWelcomeEmail(user: { uid: string; email: string | null; displayName: string | null } | null) {
  const started = useRef(false);
  useEffect(() => {
    // Not set up yet: leave accounts unflagged so they still get it once it is
    if (!welcomeEmailEnabled || !user?.uid || !user.email || started.current) return;
    started.current = true;
    (async () => {
      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        const data = snap.data();
        if (!data || data.role !== 'customer' || data.welcomeEmailSentAt) return;
        const created = typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : Number(data.createdAt) || 0;
        const isNew = Date.now() - created < NEW_ACCOUNT_DAYS * 24 * 60 * 60 * 1000;
        // Flag first so a second open tab can't send it again
        await setDoc(ref, { welcomeEmailSentAt: Date.now() }, { merge: true });
        if (isNew) {
          await sendWelcomeEmail({
            toEmail: user.email!,
            customerName: (data.fullName || user.displayName || 'there').split(' ')[0],
          });
        }
      } catch (e) {
        console.warn('Welcome email check skipped:', e);
      }
    })();
  }, [user?.uid, user?.email, user?.displayName]);
}
