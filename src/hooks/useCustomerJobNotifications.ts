import { useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNotifications } from '../contexts/NotificationsContext';

const RECENT_MS = 6 * 60 * 60 * 1000;

/**
 * Tells customers when their crew taps a step on the staff dashboard
 * (on the way, arrived, washing, done). Staff can't write customer
 * notifications, so the customer's own app creates them.
 */
export function useCustomerJobNotifications(uid?: string | null) {
  const { addNotification, allNotifications, clearedNotifications } = useNotifications();

  useEffect(() => {
    if (!uid) return;
    const known = new Set<string>();
    [...allNotifications, ...clearedNotifications].forEach((n) => n.eventId && known.add(n.eventId));

    return onSnapshot(
      collection(db, 'users', uid, 'appointments'),
      (snap) => {
        snap.docs.forEach((d) => {
          const a = d.data();
          const pkg = a.packageName || 'wash';
          const crew = a.staffName && a.staffName !== 'Pending Assignment' ? a.staffName : 'Your detailer';
          const status = String(a.staffStatus || '').toLowerCase();
          const at = Number(status === 'completed' ? a.completedAt : a.staffStatusAt) || 0;
          if (!at || Date.now() - at > RECENT_MS) return;

          const copy: { title: string; message: string; icon: 'check' | 'calendar' } | null =
            status === 'completed'
              ? { title: 'Your wash is done', message: `${crew} finished your ${pkg}. Thanks for washing with us!`, icon: 'check' }
              : status === 'washing'
                ? { title: 'Washing has started', message: `${crew} started on your ${pkg}.`, icon: 'calendar' }
                : status === 'arrived'
                  ? { title: 'Your detailer has arrived', message: `${crew} has arrived for your ${pkg}.`, icon: 'calendar' }
                  : status.includes('on route')
                    ? { title: 'Your detailer is on the way', message: `${crew} is heading to you for your ${pkg}.`, icon: 'calendar' }
                    : null;
          if (!copy) return;

          const eventId = `job-${d.id}-${status}`;
          if (known.has(eventId)) return;
          known.add(eventId);
          addNotification({
            category: 'appointments',
            icon: copy.icon,
            title: copy.title,
            message: copy.message,
            link: '/dashboard/customer/appointments',
            eventId,
          });
        });
      },
      (err) => console.warn('Job updates unavailable:', err.message)
    );
  }, [uid, addNotification, allNotifications, clearedNotifications]);
}
