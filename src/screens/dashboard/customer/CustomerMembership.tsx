import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { doc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { Button } from "../../../components/ui/Button";

export default function CustomerMembership() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const uid = currentUser?.uid;

  // Track user membership state
  const [hasMembership, setHasMembership] = useState<boolean>(() => {
    if (!uid) return false;
    const cached = localStorage.getItem(`ww_has_membership_${uid}`);
    return cached ? JSON.parse(cached) : false;
  });

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleToggleMembership = async () => {
    setIsProcessing(true);
    const newStatus = !hasMembership;

    try {
      if (uid) {
        await setDoc(
          doc(db, "users", uid),
          { hasMembership: newStatus },
          { merge: true }
        );
        localStorage.setItem(`ww_has_membership_${uid}`, JSON.stringify(newStatus));
      }
      setHasMembership(newStatus);

      if (newStatus) {
        showToast(
          "Welcome to Diamond Elite Membership! All VIP perks and discounts are now active.",
          "success"
        );
      } else {
        showToast("Membership subscription cancelled. Reverted to Free Tier.", "info");
      }
    } catch (error) {
      console.error("Failed to update membership status:", error);
      // Fallback local update
      setHasMembership(newStatus);
      if (uid) {
        localStorage.setItem(`ww_has_membership_${uid}`, JSON.stringify(newStatus));
      }
      showToast(
        newStatus
          ? "Diamond Elite Membership activated!"
          : "Membership reverted to Free Tier.",
        "success"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-10 pb-16 text-[#F5F5F5] animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-forwards overflow-hidden">
      {/* ─── UNIQUE DARK GEOMETRIC BACKGROUND PATTERN ─── */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Deep background color layer */}
        <div className="absolute inset-0 bg-[#101010]" />

        {/* Ambient Warm Brown/Black Gradient Meshes */}
        <div
          className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full opacity-30 blur-[130px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(232,106,51,0.18) 0%, rgba(44,24,16,0.2) 45%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-[45%] -right-[15%] w-[800px] h-[800px] rounded-full opacity-20 blur-[140px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(53,184,107,0.15) 0%, rgba(20,35,25,0.25) 50%, transparent 75%)",
          }}
        />
        <div
          className="absolute bottom-0 -left-[10%] w-[700px] h-[700px] rounded-full opacity-25 blur-[120px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(232,106,51,0.12) 0%, rgba(30,18,12,0.3) 50%, transparent 70%)",
          }}
        />

        {/* Layered Geometric Angular Polygons and Grid Lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.07] stroke-[#E86A33]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="membership-geo-grid"
              width="120"
              height="120"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(25)"
            >
              {/* Angular geometric grid */}
              <path
                d="M 120 0 L 0 120 M 0 0 L 120 120 M 60 0 L 120 60 L 60 120 L 0 60 Z"
                fill="none"
                strokeWidth="1.2"
              />
              <circle cx="60" cy="60" r="2.5" fill="#E86A33" />
            </pattern>
            <linearGradient id="glow-line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E86A33" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#35B86B" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#E86A33" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Grid pattern fill */}
          <rect width="100%" height="100%" fill="url(#membership-geo-grid)" />

          {/* High-tech accent laser vectors */}
          <line
            x1="0"
            y1="15%"
            x2="100%"
            y2="35%"
            stroke="url(#glow-line-grad)"
            strokeWidth="1.5"
            strokeDasharray="16 8"
          />
          <line
            x1="10%"
            y1="60%"
            x2="90%"
            y2="85%"
            stroke="url(#glow-line-grad)"
            strokeWidth="1.5"
            strokeDasharray="24 12"
          />
        </svg>

        {/* Diagonal faceted gradient accents */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(135deg, #E86A33 25%, transparent 25%), 
                              linear-gradient(225deg, #E86A33 25%, transparent 25%), 
                              linear-gradient(45deg, #35B86B 25%, transparent 25%), 
                              linear-gradient(315deg, #35B86B 25%, #101010 25%)`,
            backgroundPosition: "40px 0, 40px 0, 0 0, 0 0",
            backgroundSize: "80px 80px",
            backgroundRepeat: "repeat",
          }}
        />
      </div>

      {/* ─── PAGE HEADER ─── */}
      <div className="flex flex-col gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#E86A33]/15 text-[#E86A33] border border-[#E86A33]/30 shadow-sm">
            <Crown className="w-3.5 h-3.5 text-[#E86A33]" />
            VIP Club
          </span>
          {hasMembership && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#35B86B]/15 text-[#35B86B] border border-[#35B86B]/30 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Active Member
            </span>
          )}
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[#F5F5F5]">
          Membership
        </h1>
        <p className="text-[#A1A1AA] text-sm md:text-[15px] max-w-2xl">
          Enjoy unlimited zero-fee mobile call-outs, priority scheduling, exclusive discounts on all services, and double reward points.
        </p>
      </div>

      {/* ─── HERO SECTION: "WASH MORE. SAVE MORE." ─── */}
      <div className="relative bg-[#171717] border border-[#2C2C2C] rounded-2xl overflow-hidden shadow-2xl">
        {/* Top ambient orange glow bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E86A33] via-[#FF8542] to-transparent z-20" />

        {/* Ambient radial glows */}
        <div
          className="absolute top-0 right-0 w-[550px] h-[550px] pointer-events-none rounded-full z-0"
          style={{
            background:
              "radial-gradient(circle, rgba(232,106,51,0.12) 0%, rgba(44,24,16,0.08) 45%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-10 left-10 w-[300px] h-[300px] pointer-events-none rounded-full z-0"
          style={{
            background:
              "radial-gradient(circle, rgba(53,184,107,0.08) 0%, transparent 65%)",
          }}
        />

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
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E86A33] via-[#FF8042] to-[#FFA26B]">
                  SAVE MORE.
                </span>
              </h2>
              <p className="text-[#A1A1AA] text-sm sm:text-base mt-4 leading-relaxed max-w-xl">
                Join the WashWizzy Membership for the ultimate convenience. Members receive complimentary house calls, priority booking slots, flexible 1-hour rescheduling, and 20% savings on every detail.
              </p>
            </div>

            {/* Quick Feature Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-[#101010]/90 border border-[#2C2C2C] rounded-xl p-3 flex flex-col items-center text-center gap-1">
                <span className="text-lg font-bold font-display text-[#E86A33]">R0</span>
                <span className="text-[11px] text-[#A1A1AA] font-medium leading-tight">Free House Calls</span>
              </div>
              <div className="bg-[#101010]/90 border border-[#2C2C2C] rounded-xl p-3 flex flex-col items-center text-center gap-1">
                <span className="text-lg font-bold font-display text-[#E86A33]">20%</span>
                <span className="text-[11px] text-[#A1A1AA] font-medium leading-tight">Off All Packages</span>
              </div>
              <div className="bg-[#101010]/90 border border-[#2C2C2C] rounded-xl p-3 flex flex-col items-center text-center gap-1">
                <span className="text-lg font-bold font-display text-[#35B86B]">2X</span>
                <span className="text-[11px] text-[#A1A1AA] font-medium leading-tight">Reward Points</span>
              </div>
              <div className="bg-[#101010]/90 border border-[#2C2C2C] rounded-xl p-3 flex flex-col items-center text-center gap-1">
                <span className="text-lg font-bold font-display text-[#E86A33]">VIP</span>
                <span className="text-[11px] text-[#A1A1AA] font-medium leading-tight">Priority Slots</span>
              </div>
            </div>

            {/* Action button */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Button
                variant="primary"
                onClick={handleToggleMembership}
                disabled={isProcessing}
                className="py-3 px-7 text-sm font-semibold shadow-lg shadow-[#E86A33]/25"
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
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-[#2C2C2C] bg-[#101010] shadow-2xl group">
              <img
                src="/images/member.png"
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
      <div id="comparison-section" className="flex flex-col gap-6 scroll-mt-24">
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
              </div>
            </div>

            {/* Action button */}
            <div className="mt-8 pt-4 border-t border-[#2C2C2C]">
              <Button
                variant="outline"
                fullWidth
                disabled={!hasMembership}
                onClick={hasMembership ? handleToggleMembership : undefined}
                className="py-3 text-xs sm:text-sm !border-[#2C2C2C] hover:!border-[#E86A33] hover:!text-[#E86A33] disabled:opacity-60 disabled:cursor-default"
              >
                {!hasMembership ? "Your Current Plan" : "Downgrade to Free Tier"}
              </Button>
            </div>
          </div>

          {/* Card 2: Membership (HIGHLIGHTED AS BEST VALUE) */}
          <div className="bg-[#171717] border-2 border-[#E86A33] rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(232,106,51,0.18)]">
            {/* Top Ambient Glow Line */}
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#E86A33] via-[#FFA26B] to-[#E86A33]" />

            {/* Ambient Corner Glow */}
            <div
              className="absolute -top-10 -right-10 w-48 h-48 pointer-events-none rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(232,106,51,0.2) 0%, transparent 70%)",
              }}
            />

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
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-[#E86A33] to-[#FF8042] text-white shadow-md shadow-[#E86A33]/30 border border-[#FFA26B]/40 flex items-center gap-1 animate-pulse">
                  <Crown className="w-3.5 h-3.5" />
                  Best Value
                </span>
              </div>

              {/* Pricing */}
              <div className="pb-4 border-b border-[#2C2C2C]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl sm:text-5xl font-black font-display text-[#F5F5F5] tracking-tight">
                    {billingCycle === "monthly" ? "R199" : "R1,899"}
                  </span>
                  <span className="text-xs text-[#A1A1AA] font-medium">
                    {billingCycle === "monthly" ? "/ month" : "/ year (save R489)"}
                  </span>
                </div>
                <p className="text-[11px] text-[#35B86B] font-semibold mt-1 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {billingCycle === "monthly"
                    ? "Cancel anytime with no lock-in contracts"
                    : "Best savings: Equivalent to R158/month"}
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
                  <span>Accelerated rewards</span>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="mt-8 pt-4 border-t border-[#2C2C2C] relative z-10">
              <Button
                variant="primary"
                fullWidth
                disabled={isProcessing}
                onClick={handleToggleMembership}
                className="py-3.5 text-sm sm:text-base font-bold shadow-xl shadow-[#E86A33]/30 flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" />
                {hasMembership
                  ? "Membership Active • Click to Cancel"
                  : billingCycle === "monthly"
                  ? "Upgrade to Membership (R199/mo)"
                  : "Upgrade to Annual Membership (R1,899/yr)"}
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
    </div>
  );
}
