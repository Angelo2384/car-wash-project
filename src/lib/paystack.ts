import PaystackPop from '@paystack/inline-js';

/**
 * Paystack checkout in test mode. Paystack opens its own payment window over the page,
 * takes the payment, and hands back a reference; we never see card details.
 *
 * Only the public key is used here (VITE_PAYSTACK_PUBLIC_KEY in .env). The secret key
 * belongs on a server and must never be put in the website. With no server, the booking
 * is saved when Paystack reports success in the browser: fine for test mode, but real
 * money needs a server to verify the payment with the secret key first.
 */
const PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';
const CURRENCY = import.meta.env.VITE_PAYSTACK_CURRENCY || 'ZAR';

export const paystackTestMode = PUBLIC_KEY.startsWith('pk_test_');

/** Opens Paystack's payment window. Resolves with the reference, or null if the customer closed it. */
export function payWithPaystack(input: {
  email: string;
  amount: number;
  reference: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  description?: string;
}): Promise<{ reference: string } | null> {
  if (!PUBLIC_KEY) {
    return Promise.reject(new Error('Payments aren’t set up yet: add VITE_PAYSTACK_PUBLIC_KEY to .env.'));
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return Promise.reject(new Error('Your account needs a valid email address to pay.'));
  }
  // Paystack rejects options that are present but undefined, so only pass the ones we have
  const optional = Object.fromEntries(
    Object.entries({
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      metadata: input.description
        ? { custom_fields: [{ display_name: 'Booking', variable_name: 'booking', value: input.description }] }
        : undefined,
    }).filter(([, v]) => v !== undefined && v !== '')
  );
  return new Promise((resolve, reject) => {
    new PaystackPop().newTransaction({
      key: PUBLIC_KEY,
      email: input.email,
      amount: Math.round(input.amount * 100),
      currency: CURRENCY,
      // Paystack allows letters, numbers, - . and = in references
      reference: `${input.reference}-${Date.now().toString(36)}`.replace(/[^A-Za-z0-9.=-]/g, ''),
      ...optional,
      onSuccess: (t) => resolve({ reference: t.reference }),
      onCancel: () => resolve(null),
      onError: (e) => reject(new Error(e?.message || 'Paystack could not start the payment.')),
    });
  });
}
