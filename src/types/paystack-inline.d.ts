// The Paystack checkout package ships without types; these cover what WashWizzy uses.
declare module '@paystack/inline-js' {
  export interface PaystackTransactionOptions {
    key: string;
    email: string;
    /** In the smallest unit of the currency (cents for ZAR) */
    amount: number;
    currency?: string;
    reference?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    metadata?: Record<string, unknown>;
    onSuccess?: (transaction: { id: number; reference: string; message: string }) => void;
    onCancel?: () => void;
    onError?: (error: { message: string }) => void;
    onLoad?: (response: { id: number; accessCode: string }) => void;
  }

  export default class PaystackPop {
    newTransaction(options: PaystackTransactionOptions): unknown;
    isLoaded(): boolean;
  }
}
