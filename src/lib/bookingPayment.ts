import { saveAppointment, type StoredAppointment } from './appointments';
import { formatBookingDate, type BookingPackage } from './business';
import { isSlotStillFree } from './availability';
import { payWithPaystack, paystackTestMode } from './paystack';
import { awardBookingPoints, markVoucherUsed, type RedeemedReward } from './rewards';
import { workTypeForService } from './scheduling';
import { sendBookingConfirmation } from './emails';
import type { NewNotificationInput } from '../contexts/NotificationsContext';

export const VAT_RATE = 0.15;

export function formatMoney(n: number) {
  return `R${n.toFixed(2)}`;
}

export interface BookingRequest {
  customer: { uid: string; name: string; email: string; phone: string };
  pkg: BookingPackage;
  serviceType: 'Call-out' | 'Drive-in';
  /** YYYY-MM-DD */
  date: string;
  startHour: number;
  workHours: number;
  time: string;
  address: string;
  vehicle: string;
  notes: string;
  total: number;
  /** Price lines for the confirmation email */
  breakdown: { packagePrice: number; callOutFee: number; discount: number; vat: number };
  customOptionCount: number;
  pointsEarned: number;
  voucher: RedeemedReward | null;
}

export type BookingResult =
  | { kind: 'paid'; appointment: StoredAppointment; reference: string }
  | { kind: 'cancelled' }
  | { kind: 'slot_taken' };

/**
 * Checks the time is still free, takes payment in Paystack's window, then saves the
 * booking with its points, voucher and notifications. Nothing is saved unless the payment succeeds.
 */
export async function payAndBook(
  req: BookingRequest,
  notify: (n: NewNotificationInput) => unknown
): Promise<BookingResult> {
  const { customer, pkg, serviceType, date, startHour, workHours, total } = req;

  const free = await isSlotStillFree({ date, type: workTypeForService(serviceType), startHour, workHours }).catch(() => true);
  if (!free) return { kind: 'slot_taken' };

  const apptId = `WW-${Math.floor(100000 + Math.random() * 900000)}`;
  const displayDate = formatBookingDate(date);
  const [firstName, ...otherNames] = customer.name.split(' ');

  const payment = await payWithPaystack({
    email: customer.email,
    amount: total,
    reference: apptId,
    firstName,
    lastName: otherNames.join(' ') || undefined,
    phone: customer.phone || undefined,
    description: `${pkg.name}, ${serviceType}, ${displayDate} at ${req.time}`,
  });
  if (!payment) return { kind: 'cancelled' };

  const appointment: StoredAppointment = {
    id: apptId,
    customerUid: customer.uid,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    packageName: pkg.name,
    ...(pkg.id === 'custom' ? { customServiceNames: pkg.includes } : {}),
    price: formatMoney(total),
    date: displayDate,
    time: req.time,
    bookingDate: date,
    startHour,
    workHours,
    serviceType,
    address: req.address,
    location: req.address,
    vehicle: req.vehicle,
    notes: req.notes,
    confirmed: false,
    status: 'Awaiting Confirmation',
    statusColor: 'amber',
    staffName: 'Pending Assignment',
    staffStatus: 'Finding Staff...',
    isLocked: false,
    cancellationPolicy: 'This booking is awaiting confirmation from our team.',
    createdAt: Date.now(),
    paymentProvider: paystackTestMode ? 'Paystack (test)' : 'Paystack',
    paymentReference: payment.reference,
    paidAt: Date.now(),
  };
  await saveAppointment(appointment, customer.uid);

  // Confirmation email with the booking details (doesn't block or fail the booking)
  const { breakdown } = req;
  void sendBookingConfirmation({
    toEmail: customer.email,
    customerName: customer.name,
    reference: apptId,
    packageName: pkg.name,
    date: displayDate,
    time: req.time,
    serviceType: serviceType === 'Drive-in' ? 'Drive-in (at our wash bay)' : 'Call-out (we come to you)',
    location: req.address || 'WashWizzy wash bay',
    vehicle: req.vehicle,
    packagePrice: formatMoney(breakdown.packagePrice),
    callOutFee: breakdown.callOutFee > 0 ? formatMoney(breakdown.callOutFee) : 'Free',
    discount: breakdown.discount > 0 ? `-${formatMoney(breakdown.discount)}` : 'None',
    vat: formatMoney(breakdown.vat),
    total: formatMoney(total),
    paymentReference: payment.reference,
  });

  const safeNotify = (n: NewNotificationInput) => {
    try {
      notify(n);
    } catch (e) {
      console.warn('Notification failed:', e);
    }
  };
  safeNotify({
    category: 'appointments',
    icon: 'calendar',
    title: 'Appointment Booked',
    message: `Your appointment for ${pkg.name} has been successfully booked for ${displayDate} at ${req.time}.`,
    link: '/dashboard/customer/appointments',
    eventId: `appt-booked-${apptId}`,
  });
  safeNotify({
    category: 'system',
    icon: 'check',
    title: 'Payment Successful',
    message: `Your Paystack payment of ${formatMoney(total)} for ${pkg.name} was received.`,
    link: '/dashboard/customer/appointments',
    eventId: `pay-success-${apptId}`,
  });

  if (req.voucher) {
    try {
      markVoucherUsed(req.voucher.id, customer.uid);
      safeNotify({
        category: 'promotions',
        icon: 'gift',
        title: 'Promotion Redeemed',
        message: `Your "${req.voucher.rewardTitle}" promotion has been successfully applied to your booking.`,
        link: '/dashboard/customer/packages',
        eventId: `voucher-used-${req.voucher.id}-${apptId}`,
      });
    } catch (e) {
      console.warn('Voucher could not be marked used:', e);
    }
  }

  try {
    await awardBookingPoints(customer.uid, apptId, pkg.name, req.customOptionCount);
    if (req.pointsEarned > 0) {
      safeNotify({
        category: 'rewards',
        icon: 'star',
        title: 'Reward Points Added',
        message: `You've earned ${req.pointsEarned} reward points for your recent ${pkg.name}.`,
        link: '/dashboard/customer/rewards',
        eventId: `points-awarded-${apptId}`,
      });
    }
  } catch (e) {
    console.warn('Points could not be awarded:', e);
  }

  return { kind: 'paid', appointment, reference: payment.reference };
}
