import { useState, useEffect } from "react";
import { formatRand } from "../../../lib/business";
import { useBusinessSettings } from "../../../hooks/useOperations";
import { useNavigate } from "react-router-dom";
import {
  Crown,
  Sparkles,
  CheckCircle2,
  Truck,
  Star,
  ShieldCheck,
  ArrowRight,
  Check,
  Lock,
  X,
} from "lucide-react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { useNotifications } from "../../../contexts/NotificationsContext";
import PaymentSuccessModal, { type PaymentSuccessInfo } from '../../../components/ui/PaymentSuccessModal';
import { Button } from "../../../components/ui/Button";
import { payWithPaystack, paystackTestMode } from "../../../lib/paystack";

export default function CustomerMembership() {
  // Prices come from the admin's Fees settings
  const business = useBusinessSettings();
  const monthlyFmt = `R${business.membershipMonthly.toFixed(2)}`;
  const annualFmt = `R${business.membershipAnnual.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const annualSaving = business.membershipMonthly * 12 - business.membershipAnnual;
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { addNotification } = useNotifications();

  const uid = currentUser?.uid;

  // Track user membership state
  const [hasMembership, setHasMembership] = useState<boolean>(() => {
    if (!uid) return false;
    const cached = localStorage.getItem(`ww_has_membership_${uid}`);
    return cached ? JSON.parse(cached) : false;
  });

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [isProcessing, setIsProcessing] = useState(false);

  // Checkout Pop-up Modal State (Paystack takes the card details in its own window)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paymentSuccessInfo, setPaymentSuccessInfo] = useState<PaymentSuccessInfo | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (snap.exists()) {
          const mem = snap.data()?.hasMembership === true;
          setHasMembership(mem);
          localStorage.setItem(`ww_has_membership_${uid}`, JSON.stringify(mem));
        }
      },
      (err) => {
        console.error("Failed to load user membership:", err);
      }
    );
    return () => unsub();
  }, [uid]);

  const handleOpenCheckout = () => setIsCheckoutOpen(true);

  // Pay with Paystack, then activate the membership
  const handleProcessPayment = async () => {
    if (!uid) return;
    const fee = billingCycle === "monthly" ? business.membershipMonthly : business.membershipAnnual;
    const feeStr = billingCycle === "monthly" ? monthlyFmt : annualFmt;
    const refCode = `WW-MEM-${Math.floor(100000 + Math.random() * 900000)}`;
    const [firstName, ...otherNames] = (currentUser?.displayName || "").split(" ");
    setIsPaying(true);
    try {
      const payment = await payWithPaystack({
        email: currentUser?.email || "",
        amount: fee,
        reference: refCode,
        firstName: firstName || undefined,
        lastName: otherNames.join(" ") || undefined,
        description: `Diamond Elite Membership (${billingCycle === "monthly" ? "monthly" : "yearly"})`,
      });
      if (!payment) {
        showToast("Payment cancelled. Nothing was charged.", "error");
        return;
      }

      await setDoc(
        doc(db, "users", uid),
        {
          hasMembership: true,
          membership: {
            cycle: billingCycle,
            amount: fee,
            paymentProvider: paystackTestMode ? "Paystack (test)" : "Paystack",
            paymentReference: payment.reference,
            paidAt: Date.now(),
          },
        },
        { merge: true }
      );
      localStorage.setItem(`ww_has_membership_${uid}`, JSON.stringify(true));
      setHasMembership(true);
      window.dispatchEvent(new Event("ww_membership_changed"));
      setIsCheckoutOpen(false);

      addNotification({
        category: 'membership',
        icon: 'crown',
        title: 'Membership Activated',
        message: `Welcome to VIP Membership! You now have unlimited free mobile call-outs and 20% discount on detailing.`,
        link: '/dashboard/customer/membership',
        eventId: `mem-activated-${payment.reference}`,
      });
      addNotification({
        category: 'system',
        icon: 'check',
        title: 'Payment Successful',
        message: `Your Paystack payment of ${feeStr} for Diamond Elite Membership was received.`,
        link: '/dashboard/customer/membership',
        eventId: `mem-pay-${payment.reference}`,
      });
      showToast(`Payment of ${feeStr} confirmed! Diamond Elite Membership is now active.`, "success");
      setPaymentSuccessInfo({
        itemName: 'Diamond Elite Membership',
        amount: feeStr,
        paymentType: 'membership',
        reference: payment.reference,
      });
      setShowPaymentSuccess(true);
    } catch (error) {
      console.error("Membership payment failed:", error);
      showToast(error instanceof Error ? error.message : "Couldn't complete the payment.", "error");
    } finally {
      setIsPaying(false);
    }
  };

  const handleCancelMembership = async () => {
    setIsProcessing(true);
    try {
      if (uid) {
        await setDoc(
          doc(db, "users", uid),
          { hasMembership: false },
          { merge: true }
        );
        localStorage.setItem(`ww_has_membership_${uid}`, JSON.stringify(false));
      }
      setHasMembership(false);
      window.dispatchEvent(new Event("ww_membership_changed"));

      addNotification({
        category: 'membership',
        icon: 'check',
        title: 'Membership Cancelled',
        message: 'Your VIP Membership subscription has been cancelled.',
        link: '/dashboard/customer/membership',
        eventId: `mem-cancelled-${Date.now()}`,
      });

      showToast("Membership subscription cancelled successfully.", "info");
    } catch (error) {
      console.error("Failed to cancel membership status:", error);
      setHasMembership(false);
      if (uid) {
        localStorage.setItem(`ww_has_membership_${uid}`, JSON.stringify(false));
      }
      window.dispatchEvent(new Event("ww_membership_changed"));
      showToast("Membership reverted to Free Tier.", "info");
    } finally {
      setIsProcessing(false);
    }
  };

  const priceFormatted = billingCycle === "monthly" ? monthlyFmt : annualFmt;
  const pricePeriod = billingCycle === "monthly" ? "/ month" : "/ year";

  return (
    <div className="flex flex-col gap-10 pb-16 text-[#F5F5F5] animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-forwards">
      {/* ─── HERO SECTION: "WASH MORE. SAVE MORE." ─── */}
      <div className="relative bg-[#171717] border border-[#2C2C2C] rounded-2xl overflow-hidden">
        {/* Top ambient orange glow bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E86A33] via-[#E86A33]/50 to-transparent z-20" />


        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-8 lg:p-10">
          {/* Left Text Content */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-[#1F1F1F] border border-[#2C2C2C] text-[#A1A1AA] w-fit">
              <Star className="w-3.5 h-3.5 text-[#E86A33] fill-[#E86A33]" />
              Exclusive Customer Tier
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-display tracking-tight leading-[1.08] text-[#F5F5F5]">
                WASH MORE.
                <br />
                <span className="text-[#E86A33]">
                  SAVE MORE.
                </span>
              </h2>
              <p className="text-[#A1A1AA] text-sm sm:text-base mt-4 leading-relaxed max-w-xl">
                Join the WashWizzy Membership for the ultimate convenience. Members receive complimentary house calls, priority booking slots, and flexible rescheduling up to 2 hours before.
              </p>
            </div>

            {/* Quick Feature Pill: Free House Calls */}
            <div className="pt-1">
              <div className="bg-[#101010]/90 border border-[#2C2C2C] rounded-xl px-4 py-3 flex items-center gap-3 w-fit">
                <div className="w-9 h-9 rounded-lg bg-[#E86A33]/15 border border-[#E86A33]/30 flex items-center justify-center text-[#E86A33] font-bold">
                  R0
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold font-display text-[#F5F5F5]">Free House Calls</span>
                  <span className="text-xs text-[#A1A1AA]">Zero call-out fees to your doorstep</span>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Button
                variant="primary"
                onClick={hasMembership ? handleCancelMembership : handleOpenCheckout}
                disabled={isProcessing}
                className="py-3 px-7 text-sm font-semibold"
              >
                <Crown className="w-4 h-4" />
                {hasMembership ? "Manage Active Membership" : "Upgrade to Diamond Elite"}
              </Button>
              <button
                onClick={() => {
                  const el = document.getElementById("comparison-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-xs font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors flex items-center gap-1.5"
              >
                Compare plans <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Visual Image */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* Angled Backdrop Card */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-[#2C2C2C] bg-[#101010] group">
              <img
                src="/images/member.webp"
                alt="WashWizzy Premium Mobile Detailing Rig"
                className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#101010] via-transparent to-transparent opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#171717]/60 via-transparent to-transparent" />

              {/* Float badge */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#171717]/90 backdrop-blur-md border border-[#2C2C2C] p-3.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#E86A33]/20 border border-[#E86A33]/30 flex items-center justify-center text-[#E86A33]">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#F5F5F5]">Doorstep Mobile Detailing</p>
                    <p className="text-[10px] text-[#A1A1AA]">We come to your home or office</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#35B86B]/15 text-[#35B86B] border border-[#35B86B]/30">
                  Included Free
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── COMPARISON SECTION: FREE TIER VS MEMBERSHIP (BEST VALUE) ─── */}
      <div id="comparison-section" className="flex flex-col gap-6 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#E86A33]">
              Plan Comparison
            </span>
            <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-[#F5F5F5] mt-1">
              Choose your level of care
            </h2>
            <p className="text-[#A1A1AA] text-sm mt-1">
              Select the plan that matches how often you keep your vehicle pristine.
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center bg-[#171717] border border-[#2C2C2C] p-1 rounded-xl w-fit self-start sm:self-auto">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                billingCycle === "monthly"
                  ? "bg-[#E86A33] text-white shadow-sm"
                  : "text-[#A1A1AA] hover:text-[#F5F5F5]"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                billingCycle === "annual"
                  ? "bg-[#E86A33] text-white shadow-sm"
                  : "text-[#A1A1AA] hover:text-[#F5F5F5]"
              }`}
            >
              Annual Billing
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#35B86B]/20 text-[#35B86B] border border-[#35B86B]/30">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {/* 2 Plan Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Free Tier */}
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all hover:border-[#3C3C3C]">
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
                    Standard Access
                  </span>
                  <h3 className="text-2xl font-bold font-display text-[#F5F5F5] mt-1">
                    Free Tier
                  </h3>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    Pay-as-you-go for occasional car washes.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1F1F1F] text-[#A1A1AA] border border-[#2C2C2C]">
                  Default
                </span>
              </div>

              {/* Pricing */}
              <div className="pb-4 border-b border-[#2C2C2C]">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold font-display text-[#F5F5F5]">R0</span>
                  <span className="text-xs text-[#71717A] font-medium">/ forever</span>
                </div>
                <p className="text-[11px] text-[#71717A] mt-1">
                  Pay individual service rates with standard booking.
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="flex flex-col gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-3 text-[#D4D4D4]">
                  <CheckCircle2 className="w-4 h-4 text-[#71717A] shrink-0" />
                  <span>Standard service access</span>
                </div>
                <div className="flex items-center gap-3 text-[#D4D4D4]">
                  <CheckCircle2 className="w-4 h-4 text-[#71717A] shrink-0" />
                  <span>House calls (fee applies)</span>
                </div>
                <div className="flex items-center gap-3 text-[#D4D4D4]">
                  <CheckCircle2 className="w-4 h-4 text-[#71717A] shrink-0" />
                  <span>Basic loyalty rewards</span>
                </div>
                <div className="flex items-center gap-3 text-[#D4D4D4]">
                  <CheckCircle2 className="w-4 h-4 text-[#71717A] shrink-0" />
                  <span>24-hour notice required to reschedule an appointment.</span>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="mt-8 pt-4 border-t border-[#2C2C2C]">
              <Button
                variant="outline"
                fullWidth
                disabled={!hasMembership}
                onClick={hasMembership ? handleCancelMembership : undefined}
                className="py-3 text-xs sm:text-sm !border-[#2C2C2C] hover:!border-[#E86A33] hover:!text-[#E86A33] disabled:opacity-60 disabled:cursor-default"
              >
                {!hasMembership ? "Your Current Plan" : "Downgrade to Free Tier"}
              </Button>
            </div>
          </div>

          {/* Card 2: Membership (HIGHLIGHTED AS BEST VALUE) */}
          <div className="bg-[#171717] border-2 border-[#E86A33] rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            {/* Top Ambient Glow Line */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E86A33] via-[#E86A33]/50 to-transparent" />


            <div className="flex flex-col gap-6 relative z-10">
              {/* Header with Best Value Badge */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#E86A33]">
                      Diamond Elite
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold font-display text-[#F5F5F5] mt-1 flex items-center gap-2">
                    Membership
                    <Sparkles className="w-5 h-5 text-[#E86A33]" />
                  </h3>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    Ultimate convenience, huge savings, and VIP treatment.
                  </p>
                </div>

                {/* BEST VALUE BADGE */}
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#E86A33] text-white flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" />
                  Best Value
                </span>
              </div>

              {/* Pricing */}
              <div className="pb-4 border-b border-[#2C2C2C]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl sm:text-5xl font-black font-display text-[#F5F5F5] tracking-tight">
                    {billingCycle === "monthly" ? formatRand(business.membershipMonthly) : formatRand(business.membershipAnnual)}
                  </span>
                  <span className="text-xs text-[#A1A1AA] font-medium">
                    {billingCycle === "monthly" ? "/ month" : annualSaving > 0 ? `/ year (save ${formatRand(annualSaving)})` : "/ year"}
                  </span>
                </div>
                <p className="text-[11px] text-[#35B86B] font-semibold mt-1 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {billingCycle === "monthly"
                    ? "Cancel anytime with no lock-in contracts"
                    : `Best savings: Equivalent to ${formatRand(Math.round(business.membershipAnnual / 12))}/month`}
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="flex flex-col gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-3 text-[#F5F5F5] font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#E86A33] shrink-0" />
                  <span>Free house calls</span>
                </div>

                <div className="flex items-center gap-3 text-[#F5F5F5] font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#E86A33] shrink-0" />
                  <span>Exclusive member discounts</span>
                </div>

                <div className="flex items-center gap-3 text-[#F5F5F5] font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#E86A33] shrink-0" />
                  <span>Priority booking slots</span>
                </div>

                <div className="flex items-center gap-3 text-[#F5F5F5] font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#E86A33] shrink-0" />
                  <span>1.5x Accelerated loyalty rewards</span>
                </div>

                <div className="flex items-center gap-3 text-[#F5F5F5] font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[#E86A33] shrink-0" />
                  <span>Reschedule up to 2 hours before your appointment.</span>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="mt-8 pt-4 border-t border-[#2C2C2C] relative z-10">
              <Button
                variant="primary"
                fullWidth
                disabled={isProcessing}
                onClick={hasMembership ? handleCancelMembership : handleOpenCheckout}
                className="py-3.5 text-sm sm:text-base font-bold flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" />
                {hasMembership
                  ? "Membership Active • Click to Cancel"
                  : billingCycle === "monthly"
                  ? `Upgrade to Membership (${formatRand(business.membershipMonthly)}/mo)`
                  : `Upgrade to Annual Membership (${formatRand(business.membershipAnnual)}/yr)`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── GUARANTEE & FAQ BANNER ─── */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#35B86B]/15 border border-[#35B86B]/30 flex items-center justify-center text-[#35B86B] shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold font-display text-[#F5F5F5]">
              100% Satisfaction & Flexibility Guarantee
            </h4>
            <p className="text-xs text-[#A1A1AA] mt-0.5 max-w-xl">
              No long-term commitment. Switch between plans or cancel anytime with one click in your account settings.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate("/dashboard/customer/packages")}
          className="text-xs sm:text-sm py-2.5 px-5 shrink-0 !border-[#2C2C2C] hover:!border-[#E86A33] hover:!text-[#E86A33]"
        >
          View Wash Packages
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* ─── CHECKOUT / PAYMENT POP-UP MODAL ─── */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-8 flex flex-col gap-6 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Ambient Orange Top Border Line */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E86A33] via-[#E86A33]/50 to-transparent" />

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E86A33]/15 border border-[#E86A33]/30 flex items-center justify-center text-[#E86A33]">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-[#F5F5F5]">
                    Diamond Elite Membership
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">
                    {billingCycle === "monthly" ? "Monthly Subscription" : "Annual Subscription (Save 20%)"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-[#71717A] hover:text-[#F5F5F5] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Price Badge Banner */}
            <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-[#71717A] block">Total Amount Due</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-black font-display text-[#E86A33]">
                    {priceFormatted}
                  </span>
                  <span className="text-xs text-[#A1A1AA]">{pricePeriod}</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#35B86B]/15 text-[#35B86B] border border-[#35B86B]/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Cancel Anytime
              </span>
            </div>

            {/* Paystack takes the card details in its own window */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 text-xs text-[#A1A1AA] leading-relaxed">
                <Lock className="w-4 h-4 text-[#35B86B] shrink-0 mt-0.5" />
                <span>
                  Paystack opens a secure window to take your payment. WashWizzy never sees your card details.
                  {paystackTestMode && " Test mode: no real money moves; use a test card from Paystack's window."}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCheckoutOpen(false)}
                  disabled={isPaying}
                  className="flex-1 py-3 text-xs sm:text-sm !border-[#2C2C2C] hover:!border-[#3C3C3C]"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleProcessPayment}
                  isLoading={isPaying}
                  disabled={isPaying}
                  className="flex-[2] py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Pay {priceFormatted} with Paystack
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ── Success Confirmation Modal ── */}
      <PaymentSuccessModal
        open={showPaymentSuccess}
        paymentInfo={paymentSuccessInfo}
        onDone={() => {
          setShowPaymentSuccess(false);
          setPaymentSuccessInfo(null);
        }}
        doneText="Done"
      />
    </div>
  );
}
