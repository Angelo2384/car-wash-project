import { send } from '@emailjs/browser';

/**
 * Booking confirmation emails, sent with EmailJS (no server needed). The template lives in
 * the EmailJS dashboard and uses the {{fields}} below. The IDs in .env are public by design;
 * restrict them to the site's domain in EmailJS so others can't use the quota.
 */
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';
const WELCOME_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_WELCOME_TEMPLATE_ID || '';
/** Where customers send enquiries, shown in emails */
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || '';

export const emailsEnabled = Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
export const welcomeEmailEnabled = Boolean(SERVICE_ID && WELCOME_TEMPLATE_ID && PUBLIC_KEY);

export interface BookingEmail {
  toEmail: string;
  customerName: string;
  reference: string;
  packageName: string;
  date: string;
  time: string;
  serviceType: string;
  location: string;
  vehicle: string;
  packagePrice: string;
  callOutFee: string;
  discount: string;
  vat: string;
  total: string;
  paymentReference: string;
}

/** Sends the confirmation. Never throws: a failed email must not undo a paid booking. */
export async function sendBookingConfirmation(email: BookingEmail): Promise<boolean> {
  if (!emailsEnabled) {
    console.warn('Booking email skipped: add the EmailJS IDs to .env to send confirmations.');
    return false;
  }
  try {
    await send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: email.toEmail,
        customer_name: email.customerName,
        reference: email.reference,
        package_name: email.packageName,
        date: email.date,
        time: email.time,
        service_type: email.serviceType,
        location: email.location,
        vehicle: email.vehicle,
        package_price: email.packagePrice,
        call_out_fee: email.callOutFee,
        discount: email.discount,
        vat: email.vat,
        total: email.total,
        payment_reference: email.paymentReference,
        appointments_link: `${window.location.origin}/dashboard/customer/appointments`,
      },
      { publicKey: PUBLIC_KEY }
    );
    return true;
  } catch (err) {
    console.warn('Booking confirmation email failed:', err);
    return false;
  }
}

/** Welcome email for a new customer. Never throws. */
export async function sendWelcomeEmail(input: { toEmail: string; customerName: string }): Promise<boolean> {
  if (!SERVICE_ID || !WELCOME_TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn('Welcome email skipped: add VITE_EMAILJS_WELCOME_TEMPLATE_ID to .env to send it.');
    return false;
  }
  const origin = window.location.origin;
  try {
    await send(
      SERVICE_ID,
      WELCOME_TEMPLATE_ID,
      {
        to_email: input.toEmail,
        customer_name: input.customerName,
        support_email: SUPPORT_EMAIL,
        dashboard_link: `${origin}/dashboard/customer`,
        booking_link: `${origin}/dashboard/customer/packages`,
      },
      { publicKey: PUBLIC_KEY }
    );
    return true;
  } catch (err) {
    console.warn('Welcome email failed:', err);
    return false;
  }
}
