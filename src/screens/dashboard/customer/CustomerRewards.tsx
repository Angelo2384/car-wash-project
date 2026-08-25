import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
  Lock,
  Gift,
  Share2,
  Star,
  Copy,
  Check,
  Percent,
  Disc,
  ShieldCheck,
  Wind,
  Crown,
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { Button } from '../../../components/ui/Button';
import {
  LOYALTY_TIERS,
  TIER_ORDER,
  REWARDS_CATALOGUE,
  getRewardsSummary,
  subscribeToRewards,
  getTierProgress,
  calculateStreakFromAppointments,
  redeemReward,
  recordReferralPoints,
  recordReviewPoints,
  type RewardsSummary,
  type CatalogueReward,
  type RedeemedReward,
} from '../../../lib/rewards';
import { getStoredAppointments } from '../../../lib/appointments';

export default function CustomerRewards() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const uid = currentUser?.uid;

  const [summary, setSummary] = useState<RewardsSummary>(() => getRewardsSummary(uid));
  const [activeTab, setActiveTab] = useState<'all' | 'available' | 'locked' | 'vouchers'>('all');
  
  // Modals state
  const [selectedRewardToRedeem, setSelectedRewardToRedeem] = useState<CatalogueReward | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [isSendingReferral, setIsSendingReferral] = useState(false);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [selectedVoucher, setSelectedVoucher] = useState<RedeemedReward | null>(null);

  // Subscribe to real-time updates from Firestore/localStorage
  useEffect(() => {
    const appointments = getStoredAppointments(uid);
    const streakInfo = calculateStreakFromAppointments(appointments);

    const unsubscribe = subscribeToRewards(uid, (updatedSummary) => {
      setSummary({
        ...updatedSummary,
        streakMonths: Math.max(updatedSummary.streakMonths || 1, streakInfo.streakMonths),
      });
    });

    return () => unsubscribe();
  }, [uid]);

  const tierProgress = getTierProgress(summary.lifetimePoints);
  const currentTierObj = LOYALTY_TIERS[summary.currentTier] || LOYALTY_TIERS.Bronze;
  const nextTierObj = tierProgress.nextTier;
  const streakInfo = calculateStreakFromAppointments(getStoredAppointments(uid));

  // Referral code for current user
  const referralCode = `WW-${(currentUser?.displayName || 'WIZZY')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 5) || 'VIP'}-${(uid || '77').slice(0, 4).toUpperCase()}`;
  const referralLink = `https://washwizzy.com/signup?ref=${referralCode}`;

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedReferral(true);
    showToast('Referral link copied to clipboard!', 'success');
    setTimeout(() => setCopiedReferral(false), 3000);
  };

  const handleSimulateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName.trim()) {
      showToast('Please enter your friend’s name or email.', 'error');
      return;
    }

    setIsSendingReferral(true);
    try {
      const res = await recordReferralPoints(uid, friendName.trim());
      if (res.success) {
        showToast(`🎉 Invite sent! +${res.points} bonus reward points added!`, 'success');
        setFriendName('');
        setIsReferralOpen(false);
      }
    } catch {
      showToast('Could not process referral reward. Please try again.', 'error');
    } finally {
      setIsSendingReferral(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReview(true);
    try {
      const appointments = getStoredAppointments(uid);
      const targetApptId = appointments[0]?.id || `demo-wash-${Date.now()}`;
      const res = await recordReviewPoints(uid, targetApptId, reviewRating);
      if (res.success) {
        showToast(`⭐ Review submitted! +${res.points} loyalty points earned.`, 'success');
        setIsReviewOpen(false);
        setReviewFeedback('');
      } else if (res.alreadyAwarded) {
        showToast('You have already received reward points for this review.', 'info');
        setIsReviewOpen(false);
      }
    } catch {
      showToast('Failed to submit review. Try again.', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleConfirmRedemption = async () => {
    if (!selectedRewardToRedeem) return;

    setIsRedeeming(true);
    try {
      const res = await redeemReward(uid, selectedRewardToRedeem.id);
      if (res.success && res.redeemedReward) {
        showToast(`🎉 Redeemed "${selectedRewardToRedeem.title}" successfully!`, 'success');
        setSelectedRewardToRedeem(null);
        setSelectedVoucher(res.redeemedReward);
      } else {
        showToast(res.error || 'Failed to redeem reward.', 'error');
      }
    } catch {
      showToast('Error processing reward redemption.', 'error');
    } finally {
      setIsRedeeming(false);
    }
  };

  const getRewardIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-[#E86A33]" />;
      case 'Disc':
        return <Disc className="w-5 h-5 text-[#35B86B]" />;
      case 'Percent':
        return <Percent className="w-5 h-5 text-[#E86A33]" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-[#06B6D4]" />;
      case 'Wind':
        return <Wind className="w-5 h-5 text-[#F59E0B]" />;
      case 'Crown':
        return <Crown className="w-5 h-5 text-[#35B86B]" />;
      default:
        return <Gift className="w-5 h-5 text-[#E86A33]" />;
    }
  };

  // Filter catalogue items
  const filteredRewards = REWARDS_CATALOGUE.filter((reward) => {
    const isAffordable = summary.pointsBalance >= reward.pointsCost;
    const tierRequirementMet =
      LOYALTY_TIERS[summary.currentTier].level >= LOYALTY_TIERS[reward.minTier].level;

    if (activeTab === 'available') {
      return isAffordable && tierRequirementMet;
    }
    if (activeTab === 'locked') {
      return !isAffordable || !tierRequirementMet;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards text-[#F5F5F5] pb-12">
      {/* ── 1. Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2C2C2C] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-[#F5F5F5]">
              Rewards
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${currentTierObj.badgeColor}`}
            >
              {currentTierObj.name} Tier
            </span>
          </div>
          <p className="text-sm text-[#A1A1AA] mt-1.5 max-w-xl leading-relaxed">
            Unlock premium perks, discounts, and exclusive car care services.
          </p>
        </div>

        {/* Header Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#171717] border border-[#2C2C2C] px-3.5 py-2 rounded-xl">
            <Flame className="w-4 h-4 text-[#E86A33]" />
            <span className="text-xs font-medium text-[#A1A1AA]">Streak:</span>
            <span className="text-xs font-bold text-[#F5F5F5]">
              {streakInfo.streakMonths} {streakInfo.streakMonths === 1 ? 'Month' : 'Months'}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[#171717] border border-[#35B86B]/30 px-3.5 py-2 rounded-xl">
            <Award className="w-4 h-4 text-[#35B86B]" />
            <span className="text-xs font-medium text-[#A1A1AA]">Balance:</span>
            <span className="text-sm font-extrabold text-[#35B86B]">
              {summary.pointsBalance.toLocaleString()} PTS
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Main Loyalty Summary Card ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#171717] via-[#141414] to-[#101010] border border-[#2C2C2C] rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Glow Accents */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none blur-3xl opacity-20"
          style={{ background: currentTierObj.glowColor || 'rgba(232,106,51,0.2)' }}
        ></div>
        <div
          className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full pointer-events-none blur-3xl opacity-15"
          style={{ background: 'rgba(53,184,107,0.2)' }}
        ></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          {/* Points & Tier Stats */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E86A33]/15 border border-[#E86A33]/30 flex items-center justify-center text-[#E86A33]">
                <Crown className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#E86A33]">
                {currentTierObj.name} MEMBER
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-4xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-[#F5F5F5]">
                  {summary.pointsBalance.toLocaleString()}
                </span>
                <span className="text-base sm:text-lg font-bold text-[#35B86B]">PTS</span>
              </div>
              <div className="flex items-center gap-4 text-xs sm:text-sm text-[#A1A1AA] mt-1">
                <span>Total Points Earned: <strong className="text-[#F5F5F5]">{summary.lifetimePoints.toLocaleString()} PTS</strong></span>
                <span>•</span>
                <span>Booster Rate: <strong className="text-[#E86A33]">{currentTierObj.multiplier}x</strong></span>
              </div>
            </div>

            {/* Next Tier Progress Bar */}
            <div className="pt-2 max-w-xl">
              <div className="flex justify-between items-center text-xs mb-2 font-semibold">
                <span className="text-[#F5F5F5]">
                  {tierProgress.isHighestTier ? (
                    '🎉 Maximum Tier Achieved'
                  ) : (
                    <>Next Tier: <span className="text-[#E86A33]">{nextTierObj?.name}</span></>
                  )}
                </span>
                <span className="text-[#35B86B]">
                  {tierProgress.isHighestTier
                    ? 'All perks unlocked'
                    : `${tierProgress.pointsToNext.toLocaleString()} pts to go`}
                </span>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-3 bg-[#1F1F1F] rounded-full overflow-hidden p-0.5 border border-[#2C2C2C]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#E86A33] via-[#35B86B] to-[#35B86B] transition-all duration-700 ease-out shadow-[0_0_12px_rgba(53,184,107,0.5)]"
                  style={{ width: `${tierProgress.progressPercent}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-[#71717A] mt-2 font-medium">
                <span>{currentTierObj.name} ({currentTierObj.minPoints.toLocaleString()} PTS)</span>
                <span>
                  {nextTierObj ? `${nextTierObj.name} (${nextTierObj.minPoints.toLocaleString()} PTS)` : 'Ultimate (3,000+ PTS)'}
                </span>
              </div>
            </div>
          </div>

          {/* Action CTA & Quick Perks */}
          <div className="lg:w-80 flex flex-col gap-4 bg-[#101010]/80 border border-[#2C2C2C] p-5 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#2C2C2C]">
              <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
                Current Tier Perks
              </span>
              <span className="text-[11px] font-semibold text-[#35B86B]">Active</span>
            </div>

            <ul className="space-y-2 text-xs text-[#D8D5CF]">
              {currentTierObj.perks.map((perk, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#35B86B] shrink-0" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <Button
                variant="primary"
                fullWidth
                onClick={() => navigate('/dashboard/customer/packages')}
                className="text-xs sm:text-sm py-3 font-bold group shadow-lg shadow-[#E86A33]/20"
              >
                Earn More Points
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Horizontal Tier Progression ── */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-7 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-[#2C2C2C] mb-6">
          <div className="flex items-center gap-2.5">
            <Crown className="w-5 h-5 text-[#E86A33]" />
            <h2 className="text-lg font-bold font-display text-[#F5F5F5]">
              Tier Progression
            </h2>
          </div>
          <span className="text-xs text-[#A1A1AA]">
            Higher tiers unlock bigger point multipliers & exclusive gifts
          </span>
        </div>

        {/* Tiers Track */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {TIER_ORDER.map((tierKey, index) => {
            const tier = LOYALTY_TIERS[tierKey];
            const isCurrent = summary.currentTier === tier.name;
            const isCompleted = currentTierObj.level > tier.level;
            const isLocked = currentTierObj.level < tier.level;

            return (
              <div
                key={tier.name}
                className={`relative rounded-xl p-4.5 border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-[#101010] border-[#E86A33] shadow-[0_0_20px_rgba(232,106,51,0.15)] ring-1 ring-[#E86A33]'
                    : isCompleted
                    ? 'bg-[#121212] border-[#35B86B]/40 text-[#F5F5F5]'
                    : 'bg-[#101010]/60 border-[#2C2C2C] opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-bold text-[#71717A]">
                      0{index + 1}
                    </span>
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#35B86B] bg-[#35B86B]/15 px-2 py-0.5 rounded-full border border-[#35B86B]/30">
                        <Check className="w-3 h-3" />
                        Completed
                      </span>
                    )}
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E86A33] bg-[#E86A33]/15 px-2 py-0.5 rounded-full border border-[#E86A33]/30 animate-pulse">
                        Current Tier
                      </span>
                    )}
                    {isLocked && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#71717A] bg-[#1F1F1F] px-2 py-0.5 rounded-full border border-[#2C2C2C]">
                        <Lock className="w-3 h-3" />
                        Locked
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold font-display text-[#F5F5F5] flex items-center gap-1.5">
                    {tier.name}
                  </h3>

                  <p className="text-xs font-semibold text-[#E86A33] mt-0.5">
                    {tier.minPoints.toLocaleString()}+ PTS
                  </p>

                  <p className="text-[11px] text-[#A1A1AA] mt-2 line-clamp-2 leading-relaxed">
                    {tier.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1F1F1F] flex items-center justify-between text-[11px]">
                  <span className="text-[#71717A]">Multiplier</span>
                  <span className="font-bold text-[#35B86B]">{tier.multiplier}x Points</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Streak Section & How to Earn Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Streak Card */}
        <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-36 h-36 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(232,106,51,0.15) 0%, transparent 70%)',
            }}
          ></div>

          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#2C2C2C]">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#E86A33]" />
                <h3 className="text-base font-bold font-display text-[#F5F5F5]">
                  Monthly Streak
                </h3>
              </div>
              <span className="text-[11px] font-bold text-[#E86A33] bg-[#E86A33]/15 px-2.5 py-0.5 rounded-full border border-[#E86A33]/30">
                {streakInfo.multiplier}x Boost Active
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-display text-[#F5F5F5]">
                  {streakInfo.streakMonths} Month{streakInfo.streakMonths !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-[#35B86B] font-bold">Streak</span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-1.5 leading-relaxed">
                {streakInfo.streakStatus}
              </p>
            </div>

            {/* Streak Milestone Indicators */}
            <div className="mt-5 bg-[#101010] p-3.5 rounded-xl border border-[#2C2C2C]">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-[#F5F5F5] font-medium">Next Milestone</span>
                <span className="text-[#35B86B] font-bold">
                  {streakInfo.nextMilestoneMonths} Months ({streakInfo.nextMilestoneMonths >= 6 ? '1.75x' : '1.5x'} pts)
                </span>
              </div>
              <div className="w-full h-2 bg-[#1F1F1F] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E86A33] rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((streakInfo.streakMonths / streakInfo.nextMilestoneMonths) * 100))}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3">
            <button
              onClick={() => navigate('/dashboard/customer/packages')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#E86A33]/10 text-[#E86A33] hover:bg-[#E86A33]/20 border border-[#E86A33]/30 transition-all cursor-pointer"
            >
              Book This Month to Keep Streak
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* How to Earn Points Cards (2 cols) */}
        <div className="lg:col-span-2 bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#2C2C2C]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#E86A33]" />
                <h3 className="text-base font-bold font-display text-[#F5F5F5]">
                  How to Earn Points
                </h3>
              </div>
              <span className="text-xs text-[#71717A]">Multiply your earnings</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
              {/* Action 1: Bookings */}
              <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4 flex flex-col justify-between hover:border-[#E86A33]/40 transition-colors group">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-[#E86A33]/15 text-[#E86A33] flex items-center justify-center mb-3">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-[#F5F5F5] group-hover:text-[#E86A33] transition-colors">
                    Book Washes
                  </h4>
                  <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                    Earn 2 PTS per R1 spent on any mobile wash or bespoke package.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-[#1F1F1F]">
                  <button
                    onClick={() => navigate('/dashboard/customer/packages')}
                    className="text-xs font-semibold text-[#E86A33] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    View Packages
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action 2: Refer a friend */}
              <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4 flex flex-col justify-between hover:border-[#35B86B]/40 transition-colors group">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-[#35B86B]/15 text-[#35B86B] flex items-center justify-center mb-3">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-[#F5F5F5] group-hover:text-[#35B86B] transition-colors">
                    Refer Friends
                  </h4>
                  <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                    Give friends 15% off, earn <strong className="text-[#35B86B]">+250 PTS</strong> when they wash.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-[#1F1F1F]">
                  <button
                    onClick={() => setIsReferralOpen(true)}
                    className="text-xs font-semibold text-[#35B86B] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Invite & Earn
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action 3: Review a wash */}
              <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4 flex flex-col justify-between hover:border-[#F59E0B]/40 transition-colors group">
                <div>
                  <div className="w-9 h-9 rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center mb-3">
                    <Star className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-[#F5F5F5] group-hover:text-[#F59E0B] transition-colors">
                    Service Reviews
                  </h4>
                  <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                    Leave feedback on your completed detail and receive <strong className="text-[#F59E0B]">+50 PTS</strong>.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-[#1F1F1F]">
                  <button
                    onClick={() => setIsReviewOpen(true)}
                    className="text-xs font-semibold text-[#F59E0B] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Rate Service
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Available Rewards Catalogue ── */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-7 shadow-lg">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2C2C2C]">
          <div className="flex items-center gap-2.5">
            <Gift className="w-5 h-5 text-[#35B86B]" />
            <h2 className="text-lg font-bold font-display text-[#F5F5F5]">
              Rewards Catalogue
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#101010] p-1 rounded-xl border border-[#2C2C2C] overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#1F1F1F] text-[#F5F5F5] shadow-sm'
                  : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
              }`}
            >
              All Rewards
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'available'
                  ? 'bg-[#35B86B]/20 text-[#35B86B] shadow-sm'
                  : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
              }`}
            >
              Available to Redeem
            </button>
            <button
              onClick={() => setActiveTab('locked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'locked'
                  ? 'bg-[#1F1F1F] text-[#F5F5F5] shadow-sm'
                  : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
              }`}
            >
              Locked
            </button>
            <button
              onClick={() => setActiveTab('vouchers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'vouchers'
                  ? 'bg-[#E86A33]/20 text-[#E86A33] shadow-sm'
                  : 'text-[#A1A1AA] hover:text-[#F5F5F5]'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              My Vouchers ({summary.redeemedRewards.length})
            </button>
          </div>
        </div>

        {/* Tab 1-3: Catalogue Grid */}
        {activeTab !== 'vouchers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {filteredRewards.map((reward) => {
              const isAffordable = summary.pointsBalance >= reward.pointsCost;
              const requiredTier = LOYALTY_TIERS[reward.minTier];
              const tierMet = currentTierObj.level >= requiredTier.level;
              const isUnlocked = isAffordable && tierMet;

              return (
                <div
                  key={reward.id}
                  className={`bg-[#101010] border rounded-2xl p-5 flex flex-col justify-between transition-all relative overflow-hidden group ${
                    isUnlocked
                      ? 'border-[#2C2C2C] hover:border-[#35B86B]/50 hover:shadow-lg hover:shadow-[#35B86B]/5'
                      : 'border-[#2C2C2C]/60 opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-11 h-11 rounded-xl bg-[#1F1F1F] border border-[#2C2C2C] flex items-center justify-center shrink-0">
                        {getRewardIcon(reward.iconName)}
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#1F1F1F] text-[#E86A33] border border-[#2C2C2C]">
                        {reward.badgeText}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-[#F5F5F5] group-hover:text-[#35B86B] transition-colors">
                      {reward.title}
                    </h3>
                    <p className="text-xs text-[#A1A1AA] mt-1.5 leading-relaxed">
                      {reward.description}
                    </p>

                    {/* Expiry / Requirements info */}
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-[#71717A]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#71717A]" />
                        Valid for {reward.expiryDays} days
                      </span>
                      {reward.minTier !== 'Bronze' && (
                        <span>• Requires {reward.minTier}</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#1F1F1F] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#71717A] block font-medium">Cost</span>
                      <span className="text-base font-extrabold text-[#35B86B]">
                        {reward.pointsCost.toLocaleString()} PTS
                      </span>
                    </div>

                    {isUnlocked ? (
                      <button
                        onClick={() => setSelectedRewardToRedeem(reward)}
                        className="px-4 py-2 text-xs font-bold bg-[#35B86B] hover:bg-[#35B86B]/90 text-white rounded-xl shadow-md shadow-[#35B86B]/20 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                      >
                        Redeem Now
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : !tierMet ? (
                      <span className="px-3 py-1.5 text-xs font-medium text-[#71717A] bg-[#1F1F1F] rounded-xl border border-[#2C2C2C] flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {reward.minTier} Tier
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 text-xs font-medium text-[#A1A1AA] bg-[#1F1F1F] rounded-xl border border-[#2C2C2C]">
                        Need {(reward.pointsCost - summary.pointsBalance).toLocaleString()} more pts
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredRewards.length === 0 && (
              <div className="col-span-full py-12 text-center text-[#71717A]">
                <Gift className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold text-[#A1A1AA]">No rewards matching filter</p>
                <p className="text-xs text-[#71717A] mt-1">
                  Keep washing to earn more points and unlock higher tiers.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: My Redeemed Vouchers */}
        {activeTab === 'vouchers' && (
          <div className="mt-6">
            {summary.redeemedRewards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {summary.redeemedRewards.map((voucher) => {
                  const nowRef = summary.lastActivity || voucher.redeemedAt;
                  const isExpired = nowRef > voucher.expiresAt;
                  const daysRemaining = Math.max(
                    0,
                    Math.ceil((voucher.expiresAt - nowRef) / (1000 * 60 * 60 * 24))
                  );

                  return (
                    <div
                      key={voucher.id}
                      className="bg-[#101010] border border-[#2C2C2C] rounded-2xl p-5 flex flex-col justify-between hover:border-[#E86A33]/50 transition-all relative overflow-hidden"
                    >
                      {/* Decorative punch holes for ticket styling */}
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#171717]"></div>
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#171717]"></div>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-bold text-[#E86A33] uppercase tracking-wider flex items-center gap-1">
                            <Ticket className="w-3.5 h-3.5" />
                            Active Voucher
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isExpired
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-[#35B86B]/15 text-[#35B86B] border-[#35B86B]/30'
                            }`}
                          >
                            {isExpired ? 'Expired' : `Expires in ${daysRemaining}d`}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-[#F5F5F5]">
                          {voucher.rewardTitle}
                        </h3>

                        {/* Voucher Code Box */}
                        <div className="mt-4 bg-[#1F1F1F] border border-[#2C2C2C] rounded-xl p-3 text-center">
                          <span className="text-[10px] text-[#71717A] uppercase font-bold tracking-widest block mb-0.5">
                            Voucher Code
                          </span>
                          <span className="font-mono text-sm font-extrabold text-[#E86A33] tracking-widest">
                            {voucher.voucherCode}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-dashed border-[#2C2C2C] flex items-center justify-between">
                        <span className="text-[11px] text-[#71717A]">
                          Redeemed for {voucher.pointsSpent} PTS
                        </span>
                        <button
                          onClick={() => setSelectedVoucher(voucher)}
                          className="text-xs font-bold text-[#35B86B] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          View Details
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-[#71717A] border border-dashed border-[#2C2C2C] rounded-2xl">
                <Ticket className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#E86A33]" />
                <p className="text-sm font-semibold text-[#A1A1AA]">No active vouchers</p>
                <p className="text-xs text-[#71717A] mt-1 max-w-sm mx-auto">
                  Redeem rewards from the catalogue above to generate discount codes and perk vouchers.
                </p>
                <button
                  onClick={() => setActiveTab('all')}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-[#E86A33]/15 text-[#E86A33] hover:bg-[#E86A33]/25 transition-colors cursor-pointer"
                >
                  Browse Catalogue
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 6. Recent Rewards Activity ── */}
      <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 sm:p-7 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-[#2C2C2C]">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-[#E86A33]" />
            <h2 className="text-lg font-bold font-display text-[#F5F5F5]">
              Recent Activity
            </h2>
          </div>
          <span className="text-xs text-[#71717A]">
            {summary.transactions.length} Total Transactions
          </span>
        </div>

        {summary.transactions.length > 0 ? (
          <div className="divide-y divide-[#1F1F1F] mt-2">
            {summary.transactions.slice(0, 10).map((tx) => {
              const isPositive = tx.points > 0;
              const dateStr = new Date(tx.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={tx.id}
                  className="py-3.5 flex items-center justify-between gap-4 transition-colors hover:bg-white/[0.02] px-2 rounded-lg"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isPositive
                          ? 'bg-[#35B86B]/15 text-[#35B86B] border-[#35B86B]/30'
                          : 'bg-[#E86A33]/15 text-[#E86A33] border-[#E86A33]/30'
                      }`}
                    >
                      {isPositive ? (
                        <Award className="w-4 h-4" />
                      ) : (
                        <Gift className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-[#F5F5F5]">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[#71717A] mt-0.5">
                        <span>{dateStr}</span>
                        <span>•</span>
                        <span className="capitalize">{tx.type}</span>
                        {tx.appointmentId && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[#A1A1AA]">{tx.appointmentId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`font-mono text-sm sm:text-base font-extrabold ${
                      isPositive ? 'text-[#35B86B]' : 'text-red-400'
                    }`}
                  >
                    {isPositive ? `+${tx.points}` : `${tx.points}`} PTS
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-[#71717A]">
            <Award className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#A1A1AA]" />
            <p className="text-sm font-semibold text-[#A1A1AA]">No reward transactions yet</p>
            <p className="text-xs text-[#71717A] mt-1">
              Points earned on bookings and referrals will appear here in real time.
            </p>
          </div>
        )}
      </div>

      {/* ── MODAL 1: Confirm Reward Redemption ── */}
      {selectedRewardToRedeem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-left">
            <div className="w-12 h-12 rounded-xl bg-[#35B86B]/15 border border-[#35B86B]/30 flex items-center justify-center mb-4 text-[#35B86B]">
              <Gift className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold font-display text-[#F5F5F5]">
              Redeem Reward
            </h3>
            <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1">
              Confirm spending your loyalty points for this perk.
            </p>

            <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4 my-5 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#71717A]">Reward</span>
                <span className="font-semibold text-[#F5F5F5]">{selectedRewardToRedeem.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#71717A]">Points Cost</span>
                <span className="font-bold text-[#E86A33]">-{selectedRewardToRedeem.pointsCost} PTS</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#71717A]">Balance After</span>
                <span className="font-bold text-[#35B86B]">
                  {(summary.pointsBalance - selectedRewardToRedeem.pointsCost).toLocaleString()} PTS
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#1F1F1F]">
                <span className="text-[#71717A]">Voucher Validity</span>
                <span className="text-[#D8D5CF]">{selectedRewardToRedeem.expiryDays} Days</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setSelectedRewardToRedeem(null)}
                className="py-2.5 text-xs sm:text-sm !border-[#2C2C2C]"
                disabled={isRedeeming}
              >
                Cancel
              </Button>
              <button
                onClick={handleConfirmRedemption}
                disabled={isRedeeming}
                className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-xs sm:text-sm bg-[#35B86B] hover:bg-[#35B86B]/90 text-white shadow-lg shadow-[#35B86B]/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRedeeming ? 'Redeeming...' : 'Confirm Redemption'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: View Redeemed Voucher ── */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-[#35B86B]/15 border border-[#35B86B]/30 flex items-center justify-center mx-auto mb-4 text-[#35B86B]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold font-display text-[#F5F5F5]">
              {selectedVoucher.rewardTitle}
            </h3>
            <p className="text-xs text-[#A1A1AA] mt-1 mb-5">
              Present this voucher code to your mobile detailer or enter it at checkout.
            </p>

            <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-5 mb-5 space-y-3">
              <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-widest block">
                Voucher Code
              </span>
              <div className="font-mono text-xl sm:text-2xl font-black text-[#E86A33] tracking-widest bg-[#1F1F1F] py-2 px-4 rounded-lg border border-[#2C2C2C]">
                {selectedVoucher.voucherCode}
              </div>
              <div className="text-[11px] text-[#71717A]">
                Expires on {new Date(selectedVoucher.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              onClick={() => setSelectedVoucher(null)}
              className="py-2.5 text-xs sm:text-sm font-semibold"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Refer a Friend ── */}
      {isReferralOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#35B86B]/15 border border-[#35B86B]/30 flex items-center justify-center text-[#35B86B]">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-[#F5F5F5]">
                  Refer a Friend
                </h3>
                <p className="text-xs text-[#35B86B] font-semibold">
                  Earn +250 Points Per Referral
                </p>
              </div>
            </div>

            <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4">
              Share your unique referral link. When your friend registers and books their first mobile wash, they get 15% off and you automatically receive 250 PTS.
            </p>

            {/* Link Copy Box */}
            <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-3 flex items-center justify-between gap-2 mb-4">
              <span className="font-mono text-xs text-[#F5F5F5] truncate select-all">
                {referralLink}
              </span>
              <button
                onClick={handleCopyReferral}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E86A33]/20 text-[#E86A33] hover:bg-[#E86A33] hover:text-white transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                {copiedReferral ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedReferral ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Quick Invite Form */}
            <form onSubmit={handleSimulateReferral} className="space-y-3 pt-2 border-t border-[#2C2C2C]">
              <div>
                <label className="text-xs font-medium text-[#A1A1AA] block mb-1">
                  Or send direct invite:
                </label>
                <input
                  type="text"
                  placeholder="Friend's Name or Email"
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  className="w-full bg-[#101010] border border-[#2C2C2C] focus:border-[#E86A33] rounded-lg px-3.5 py-2.5 text-xs text-[#F5F5F5] outline-none transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => setIsReferralOpen(false)}
                  className="py-2 text-xs !border-[#2C2C2C]"
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isSendingReferral}
                  className="py-2 text-xs font-semibold"
                >
                  Send Invite (+250 PTS)
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: Service Review ── */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B]">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-[#F5F5F5]">
                  Rate Your Wash Experience
                </h3>
                <p className="text-xs text-[#F59E0B] font-semibold">
                  Earn +50 Bonus Points
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star Selector */}
              <div>
                <label className="text-xs font-medium text-[#A1A1AA] block mb-2">
                  Service Rating:
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 text-[#F59E0B] hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= reviewRating ? 'fill-[#F59E0B]' : 'stroke-[#71717A] fill-transparent'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#A1A1AA] block mb-1">
                  Comments (Optional):
                </label>
                <textarea
                  rows={3}
                  placeholder="How was the shine, interior freshness, and staff punctuality?"
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  className="w-full bg-[#101010] border border-[#2C2C2C] focus:border-[#E86A33] rounded-lg p-3 text-xs text-[#F5F5F5] outline-none transition-colors resize-none"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => setIsReviewOpen(false)}
                  className="py-2 text-xs !border-[#2C2C2C]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isSubmittingReview}
                  className="py-2 text-xs font-semibold"
                >
                  Submit & Collect +50 PTS
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
