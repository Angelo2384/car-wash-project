import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { getStoredAppointments, type StoredAppointment } from './appointments';

export type TierName = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Ultimate';

export interface LoyaltyTier {
  name: TierName;
  level: number;
  minPoints: number;
  maxPoints: number | null; // null for highest tier
  multiplier: number;
  badgeColor: string;
  glowColor: string;
  perks: string[];
  description: string;
}

export const LOYALTY_TIERS: Record<TierName, LoyaltyTier> = {
  Bronze: {
    name: 'Bronze',
    level: 1,
    minPoints: 0,
    maxPoints: 499,
    multiplier: 1.0,
    badgeColor: 'text-[#D97706] bg-[#D97706]/10 border-[#D97706]/30',
    glowColor: 'rgba(217, 119, 6, 0.15)',
    perks: ['1x Points on All Bookings', 'Standard Scheduling', 'Seasonal Perks'],
    description: 'Welcome to WashWizzy Rewards. Start earning points on every single wash.',
  },
  Silver: {
    name: 'Silver',
    level: 2,
    minPoints: 500,
    maxPoints: 1199,
    multiplier: 1.25,
    badgeColor: 'text-[#94A3B8] bg-[#94A3B8]/10 border-[#94A3B8]/30',
    glowColor: 'rgba(148, 163, 184, 0.15)',
    perks: ['1.25x Points Multiplier', 'Free Air Freshener Voucher', 'Priority Weather Rescheduling'],
    description: 'Silver members enjoy accelerated points and complimentary freshener upgrades.',
  },
  Gold: {
    name: 'Gold',
    level: 3,
    minPoints: 1200,
    maxPoints: 1999,
    multiplier: 1.5,
    badgeColor: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30',
    glowColor: 'rgba(245, 158, 11, 0.18)',
    perks: ['1.5x Points Multiplier', 'Priority Staff Assignment', 'Free Wheel & Rim Polish Voucher'],
    description: 'Gold members receive VIP treatment, faster scheduling, and high point bonuses.',
  },
  Diamond: {
    name: 'Diamond',
    level: 4,
    minPoints: 2000,
    maxPoints: 2999,
    multiplier: 1.75,
    badgeColor: 'text-[#06B6D4] bg-[#06B6D4]/10 border-[#06B6D4]/30',
    glowColor: 'rgba(6, 182, 212, 0.2)',
    perks: ['1.75x Points Multiplier', 'Complimentary Hydrophobic Booster', 'Zero Cancellation Fees'],
    description: 'Elite care with maximum flexibility, specialty coatings, and top priority.',
  },
  Ultimate: {
    name: 'Ultimate',
    level: 5,
    minPoints: 3000,
    maxPoints: null,
    multiplier: 2.0,
    badgeColor: 'text-[#35B86B] bg-[#35B86B]/15 border-[#35B86B]/30',
    glowColor: 'rgba(53, 184, 107, 0.25)',
    perks: ['2x Points on All Bookings', 'Dedicated Master Detailer', 'Annual Complimentary Full Detail'],
    description: 'The pinnacle of automotive luxury and bespoke car care privileges.',
  },
};

export const TIER_ORDER: TierName[] = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Ultimate'];

export interface CatalogueReward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  minTier: TierName;
  category: 'discount' | 'addon' | 'free_service';
  expiryDays: number;
  iconName: string;
  badgeText: string;
}

export const REWARDS_CATALOGUE: CatalogueReward[] = [
  {
    id: 'rw_fragrance_pack',
    title: 'Signature Fragrance Upgrade',
    description: 'Upgrade your interior freshness with custom organic scent mist and cabin deodorizer.',
    pointsCost: 100,
    minTier: 'Bronze',
    category: 'addon',
    expiryDays: 45,
    iconName: 'Sparkles',
    badgeText: 'Add-on',
  },
  {
    id: 'rw_free_rim_shine',
    title: 'Free Rim Shine & Tire Gloss',
    description: 'Add a complimentary premium hydrophobic rim shine and tire glaze to your next wash.',
    pointsCost: 150,
    minTier: 'Bronze',
    category: 'addon',
    expiryDays: 30,
    iconName: 'Disc',
    badgeText: 'Popular',
  },
  {
    id: 'rw_10off_express',
    title: '10% Off Express Wash',
    description: 'Valid for any standard express exterior and interior clean booked online.',
    pointsCost: 300,
    minTier: 'Bronze',
    category: 'discount',
    expiryDays: 30,
    iconName: 'Percent',
    badgeText: '10% OFF',
  },
  {
    id: 'rw_50off_ceramic_boost',
    title: '50% Off Ceramic Booster Spray',
    description: 'Half-price premium SiO2 ceramic spray coating for high gloss & water beading.',
    pointsCost: 450,
    minTier: 'Silver',
    category: 'discount',
    expiryDays: 30,
    iconName: 'ShieldCheck',
    badgeText: 'Silver Exclusive',
  },
  {
    id: 'rw_interior_sanitization',
    title: 'Complimentary Ozone Sanitization',
    description: 'Medical-grade anti-bacterial ozone cabin mist to eliminate 99.9% of germs.',
    pointsCost: 750,
    minTier: 'Gold',
    category: 'free_service',
    expiryDays: 60,
    iconName: 'Wind',
    badgeText: 'Gold Exclusive',
  },
  {
    id: 'rw_free_full_detail',
    title: 'Complimentary Full Detail Service',
    description: 'Full comprehensive deep interior extraction, paint clay decontamination, and sealant.',
    pointsCost: 1500,
    minTier: 'Diamond',
    category: 'free_service',
    expiryDays: 90,
    iconName: 'Crown',
    badgeText: 'VIP Reward',
  },
];

export interface RewardTransaction {
  id: string;
  type: 'earned' | 'redeemed' | 'bonus' | 'referral' | 'review';
  description: string;
  points: number; // positive for earned, negative for redeemed
  appointmentId?: string;
  rewardId?: string;
  createdAt: number;
}

export interface RedeemedReward {
  id: string;
  rewardId: string;
  rewardTitle: string;
  pointsSpent: number;
  redeemedAt: number;
  expiresAt: number;
  voucherCode: string;
  isUsed: boolean;
}

export interface RewardsSummary {
  pointsBalance: number;
  lifetimePoints: number;
  currentTier: TierName;
  streakMonths: number;
  lastActivity: number;
  transactions: RewardTransaction[];
  redeemedRewards: RedeemedReward[];
}

export function getRewardsStorageKey(uid?: string | null): string {
  return uid ? `ww_rewards_${uid}` : 'ww_rewards_guest';
}

/**
 * Calculates booking reward points using FIXED per-package values.
 * Express = 50, Premium = 100, Elite = 150, Custom = 15 × selected options.
 * No price-based calculation, no membership/tier multipliers.
 */
export function calculateBookingPoints(
  packageName: string,
  customOptionCount: number = 0
): number {
  const lower = packageName.toLowerCase();
  if (lower.includes('express')) return 50;
  if (lower.includes('premium')) return 100;
  if (lower.includes('elite')) return 150;
  if (lower.includes('custom')) return Math.max(15, customOptionCount * 15);
  return 50; // safe fallback
}

/**
 * Resolves current tier based on lifetime points earned.
 */
export function getTierForPoints(points: number): LoyaltyTier {
  if (points >= 3000) return LOYALTY_TIERS.Ultimate;
  if (points >= 2000) return LOYALTY_TIERS.Diamond;
  if (points >= 1200) return LOYALTY_TIERS.Gold;
  if (points >= 500) return LOYALTY_TIERS.Silver;
  return LOYALTY_TIERS.Bronze;
}

/**
 * Gets the next tier after the current tier.
 */
export function getNextTier(currentTierName: TierName): LoyaltyTier | null {
  const idx = TIER_ORDER.indexOf(currentTierName);
  if (idx === -1 || idx >= TIER_ORDER.length - 1) return null;
  return LOYALTY_TIERS[TIER_ORDER[idx + 1]];
}

export interface TierProgressInfo {
  currentTier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  progressPercent: number;
  pointsToNext: number;
  isHighestTier: boolean;
  tierFloor: number;
  tierCeiling: number;
}

/**
 * Calculates current tier progress percentage and points required to level up.
 */
export function getTierProgress(lifetimePoints: number): TierProgressInfo {
  const currentTier = getTierForPoints(lifetimePoints);
  const nextTier = getNextTier(currentTier.name);

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      progressPercent: 100,
      pointsToNext: 0,
      isHighestTier: true,
      tierFloor: currentTier.minPoints,
      tierCeiling: currentTier.minPoints,
    };
  }

  const tierFloor = currentTier.minPoints;
  const tierCeiling = nextTier.minPoints;
  const range = tierCeiling - tierFloor;
  const earnedInRange = Math.max(0, lifetimePoints - tierFloor);
  const progressPercent = Math.min(100, Math.round((earnedInRange / range) * 100));
  const pointsToNext = Math.max(0, tierCeiling - lifetimePoints);

  return {
    currentTier,
    nextTier,
    progressPercent,
    pointsToNext,
    isHighestTier: false,
    tierFloor,
    tierCeiling,
  };
}

/**
 * Computes consecutive booking streak from appointments.
 */
export function calculateStreakFromAppointments(appointments: StoredAppointment[]): {
  streakMonths: number;
  multiplier: number;
  nextMilestoneMonths: number;
  streakStatus: string;
} {
  if (!appointments || appointments.length === 0) {
    return {
      streakMonths: 0,
      multiplier: 1.0,
      nextMilestoneMonths: 1,
      streakStatus: 'Book your first wash to start a streak!',
    };
  }

  // Extract unique year-month periods of valid appointments
  const activeMonths = new Set<string>();
  const now = new Date();

  appointments.forEach((appt) => {
    const timestamp = appt.createdAt ? new Date(appt.createdAt) : null;
    if (timestamp && !isNaN(timestamp.getTime())) {
      activeMonths.add(`${timestamp.getFullYear()}-${timestamp.getMonth() + 1}`);
    }
  });

  // If user has bookings, count how many months or active sessions they have
  let streakMonths = Math.min(12, Math.max(1, activeMonths.size));
  
  // Also factor total completed/scheduled appointments
  if (appointments.length >= 6 && streakMonths < 4) streakMonths = 4;
  else if (appointments.length >= 3 && streakMonths < 2) streakMonths = 2;

  let multiplier = 1.0;
  if (streakMonths >= 6) multiplier = 1.75;
  else if (streakMonths >= 3) multiplier = 1.5;
  else if (streakMonths >= 2) multiplier = 1.25;

  const nextMilestoneMonths = streakMonths >= 6 ? 12 : streakMonths >= 3 ? 6 : 3;
  const streakStatus = streakMonths >= 3 
    ? `Keep booking monthly to maintain your ${multiplier}x points booster`
    : `Book in ${now.toLocaleString('default', { month: 'long' })} to grow your streak`;

  return {
    streakMonths,
    multiplier,
    nextMilestoneMonths,
    streakStatus,
  };
}

/**
 * Gets the current rewards summary for a given user from local cache.
 */
export function getRewardsSummary(uid?: string | null): RewardsSummary {
  try {
    const key = getRewardsStorageKey(uid);
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      const tier = getTierForPoints(parsed.lifetimePoints ?? parsed.pointsBalance ?? 0);
      return {
        pointsBalance: parsed.pointsBalance ?? 0,
        lifetimePoints: parsed.lifetimePoints ?? parsed.pointsBalance ?? 0,
        currentTier: tier.name,
        streakMonths: parsed.streakMonths ?? 1,
        lastActivity: parsed.lastActivity ?? Date.now(),
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        redeemedRewards: Array.isArray(parsed.redeemedRewards) ? parsed.redeemedRewards : [],
      };
    }
  } catch (e) {
    console.error('Failed to parse rewards summary from localStorage', e);
  }

  // Default baseline data for demo / newly created account
  const defaultAppointments = getStoredAppointments(uid);
  const streakInfo = calculateStreakFromAppointments(defaultAppointments);

  const initialSummary: RewardsSummary = {
    pointsBalance: 0,
    lifetimePoints: 0,
    currentTier: 'Bronze',
    streakMonths: streakInfo.streakMonths,
    lastActivity: Date.now(),
    transactions: [],
    redeemedRewards: [],
  };

  return initialSummary;
}

/**
 * Saves rewards summary to localStorage and asynchronously syncs to Firestore.
 */
export function saveRewardsSummary(summary: RewardsSummary, uid?: string | null): void {
  try {
    const key = getRewardsStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(summary));

    // Async sync to Firestore if user is authenticated
    if (uid) {
      const docRef = doc(db, 'users', uid, 'rewards', 'summary');
      setDoc(docRef, summary, { merge: true }).catch((err) => {
        console.warn('Firestore rewards sync notice:', err.message);
      });
    }
  } catch (e) {
    console.error('Failed to save rewards summary', e);
  }
}

/**
 * Subscribes to rewards data via Firestore with automatic fallback to localStorage.
 */
export function subscribeToRewards(
  uid: string | null | undefined,
  callback: (summary: RewardsSummary) => void
): () => void {
  // Always emit local data immediately for instant responsive render
  const localData = getRewardsSummary(uid);
  callback(localData);

  if (!uid) {
    return () => {};
  }

  try {
    const docRef = doc(db, 'users', uid, 'rewards', 'summary');
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const remote = snapshot.data() as Partial<RewardsSummary>;
          const lifetime = remote.lifetimePoints ?? remote.pointsBalance ?? 0;
          const tier = getTierForPoints(lifetime);
          const fullSummary: RewardsSummary = {
            pointsBalance: remote.pointsBalance ?? 0,
            lifetimePoints: lifetime,
            currentTier: tier.name,
            streakMonths: remote.streakMonths ?? 1,
            lastActivity: remote.lastActivity ?? Date.now(),
            transactions: remote.transactions ?? [],
            redeemedRewards: remote.redeemedRewards ?? [],
          };
          // Update local cache and notify subscriber
          const key = getRewardsStorageKey(uid);
          localStorage.setItem(key, JSON.stringify(fullSummary));
          callback(fullSummary);
        }
      },
      (error) => {
        console.warn('Firestore snapshot subscription falling back to local storage:', error.message);
      }
    );

    return unsubscribe;
  } catch {
    return () => {};
  }
}

/**
 * Awards reward points for a completed booking.
 * Uses FIXED per-package values. No price-based calculation.
 * GUARANTEED IDEMPOTENT: Will not award points twice for the same appointmentId.
 */
export async function awardBookingPoints(
  uid: string | null | undefined,
  appointmentId: string,
  packageName: string,
  customOptionCount: number = 0
): Promise<{ success: boolean; pointsAwarded: number; alreadyAwarded?: boolean }> {
  const currentSummary = getRewardsSummary(uid);

  // Check if transaction already exists for this appointment
  const existingTx = currentSummary.transactions.find(
    (tx) => tx.appointmentId === appointmentId && tx.type === 'earned'
  );

  if (existingTx) {
    return {
      success: false,
      pointsAwarded: 0,
      alreadyAwarded: true,
    };
  }

  // Also verify in Firestore if online
  if (uid) {
    try {
      const docRef = doc(db, 'users', uid, 'rewards', 'summary');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remoteData = snap.data() as RewardsSummary;
        const remoteTx = remoteData.transactions?.find(
          (tx) => tx.appointmentId === appointmentId && tx.type === 'earned'
        );
        if (remoteTx) {
          return { success: false, pointsAwarded: 0, alreadyAwarded: true };
        }
      }
    } catch {
      // Continue with local guard if network fails
    }
  }

  const pointsToEarn = calculateBookingPoints(packageName, customOptionCount);
  const newTransaction: RewardTransaction = {
    id: `tx-earn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'earned',
    description: `${packageName} Booking`,
    points: pointsToEarn,
    appointmentId,
    createdAt: Date.now(),
  };

  const newBalance = currentSummary.pointsBalance + pointsToEarn;
  const newLifetime = currentSummary.lifetimePoints + pointsToEarn;
  const newTier = getTierForPoints(newLifetime);

  const updatedSummary: RewardsSummary = {
    ...currentSummary,
    pointsBalance: newBalance,
    lifetimePoints: newLifetime,
    currentTier: newTier.name,
    lastActivity: Date.now(),
    transactions: [newTransaction, ...currentSummary.transactions],
  };

  saveRewardsSummary(updatedSummary, uid);

  return {
    success: true,
    pointsAwarded: pointsToEarn,
  };
}

/**
 * Redeems an available reward item from the catalogue.
 * Validates balance, tier requirement, and generates a unique voucher code.
 */
export async function redeemReward(
  uid: string | null | undefined,
  rewardId: string
): Promise<{
  success: boolean;
  error?: string;
  redeemedReward?: RedeemedReward;
  newBalance?: number;
}> {
  const currentSummary = getRewardsSummary(uid);
  const reward = REWARDS_CATALOGUE.find((r) => r.id === rewardId);

  if (!reward) {
    return { success: false, error: 'Selected reward was not found.' };
  }

  if (currentSummary.pointsBalance < reward.pointsCost) {
    const needed = reward.pointsCost - currentSummary.pointsBalance;
    return {
      success: false,
      error: `You need ${needed.toLocaleString()} more points to redeem this reward.`,
    };
  }

  // Tier level requirement check
  const currentTierObj = LOYALTY_TIERS[currentSummary.currentTier];
  const requiredTierObj = LOYALTY_TIERS[reward.minTier];
  if (currentTierObj.level < requiredTierObj.level) {
    return {
      success: false,
      error: `This perk requires ${reward.minTier} Tier membership.`,
    };
  }

  // Generate unique voucher code e.g. WW-10OFF-8F92
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const voucherCode = `WW-${reward.id.replace('rw_', '').toUpperCase()}-${randomSuffix}`;
  const now = Date.now();
  const expiresAt = now + reward.expiryDays * 24 * 60 * 60 * 1000;

  const newRedeemed: RedeemedReward = {
    id: `red-${now}-${Math.floor(Math.random() * 1000)}`,
    rewardId: reward.id,
    rewardTitle: reward.title,
    pointsSpent: reward.pointsCost,
    redeemedAt: now,
    expiresAt,
    voucherCode,
    isUsed: false,
  };

  const newTransaction: RewardTransaction = {
    id: `tx-red-${now}-${Math.floor(Math.random() * 1000)}`,
    type: 'redeemed',
    description: `Redeemed ${reward.title}`,
    points: -reward.pointsCost,
    rewardId: reward.id,
    createdAt: now,
  };

  const newBalance = Math.max(0, currentSummary.pointsBalance - reward.pointsCost);

  const updatedSummary: RewardsSummary = {
    ...currentSummary,
    pointsBalance: newBalance,
    lastActivity: now,
    redeemedRewards: [newRedeemed, ...currentSummary.redeemedRewards],
    transactions: [newTransaction, ...currentSummary.transactions],
  };

  saveRewardsSummary(updatedSummary, uid);

  return {
    success: true,
    redeemedReward: newRedeemed,
    newBalance,
  };
}

/**
 * Simulates earning bonus points for referring a friend.
 */
export async function recordReferralPoints(
  uid: string | null | undefined,
  friendName: string
): Promise<{ success: boolean; points: number }> {
  const currentSummary = getRewardsSummary(uid);
  const referralPoints = 250;

  const newTransaction: RewardTransaction = {
    id: `tx-ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'referral',
    description: `Friend Referral (${friendName})`,
    points: referralPoints,
    createdAt: Date.now(),
  };

  const newBalance = currentSummary.pointsBalance + referralPoints;
  const newLifetime = currentSummary.lifetimePoints + referralPoints;
  const newTier = getTierForPoints(newLifetime);

  const updatedSummary: RewardsSummary = {
    ...currentSummary,
    pointsBalance: newBalance,
    lifetimePoints: newLifetime,
    currentTier: newTier.name,
    lastActivity: Date.now(),
    transactions: [newTransaction, ...currentSummary.transactions],
  };

  saveRewardsSummary(updatedSummary, uid);

  return {
    success: true,
    points: referralPoints,
  };
}

/**
 * Records bonus points for reviewing a past service.
 */
export async function recordReviewPoints(
  uid: string | null | undefined,
  appointmentId: string,
  rating: number
): Promise<{ success: boolean; points: number; alreadyAwarded?: boolean }> {
  const currentSummary = getRewardsSummary(uid);

  const existing = currentSummary.transactions.find(
    (tx) => tx.appointmentId === appointmentId && tx.type === 'review'
  );

  if (existing) {
    return { success: false, points: 0, alreadyAwarded: true };
  }

  const reviewPoints = 50;
  const newTransaction: RewardTransaction = {
    id: `tx-rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'review',
    description: `Service Rating (${rating} Stars)`,
    points: reviewPoints,
    appointmentId,
    createdAt: Date.now(),
  };

  const newBalance = currentSummary.pointsBalance + reviewPoints;
  const newLifetime = currentSummary.lifetimePoints + reviewPoints;
  const newTier = getTierForPoints(newLifetime);

  const updatedSummary: RewardsSummary = {
    ...currentSummary,
    pointsBalance: newBalance,
    lifetimePoints: newLifetime,
    currentTier: newTier.name,
    lastActivity: Date.now(),
    transactions: [newTransaction, ...currentSummary.transactions],
  };

  saveRewardsSummary(updatedSummary, uid);

  return {
    success: true,
    points: reviewPoints,
  };
}

/**
 * Returns all unused, non-expired redeemed rewards / vouchers for a user.
 */
export function getValidVouchers(uid?: string | null): RedeemedReward[] {
  const summary = getRewardsSummary(uid);
  const now = Date.now();
  return (summary.redeemedRewards || []).filter(
    (v) => !v.isUsed && (!v.expiresAt || v.expiresAt > now)
  );
}

/**
 * Marks a specific redeemed reward / voucher as used.
 */
export function markVoucherUsed(voucherIdOrCode: string, uid?: string | null): void {
  const summary = getRewardsSummary(uid);
  let updated = false;
  const updatedVouchers = (summary.redeemedRewards || []).map((v) => {
    if ((v.id === voucherIdOrCode || v.voucherCode === voucherIdOrCode) && !v.isUsed) {
      updated = true;
      return { ...v, isUsed: true };
    }
    return v;
  });

  if (updated) {
    const updatedSummary: RewardsSummary = {
      ...summary,
      lastActivity: Date.now(),
      redeemedRewards: updatedVouchers,
    };
    saveRewardsSummary(updatedSummary, uid);
  }
}

export interface VoucherDiscountResult {
  applies: boolean;
  discountAmount: number;
  reason?: string;
}

/**
 * Evaluates whether a redeemed voucher is valid for a given package and calculates discount amount.
 */
export function getVoucherDiscount(
  voucher: RedeemedReward,
  packageName: string,
  packagePrice: number
): VoucherDiscountResult {
  const reward = REWARDS_CATALOGUE.find((r) => r.id === voucher.rewardId);
  const pkgLower = packageName.toLowerCase();

  // Specific rule for 10% Off Express Wash
  if (
    voucher.rewardId === 'rw_10off_express' ||
    voucher.rewardTitle.toLowerCase().includes('express')
  ) {
    if (!pkgLower.includes('express')) {
      return {
        applies: false,
        discountAmount: 0,
        reason: 'This reward can only be used with an Express Wash.',
      };
    }
    const discount = Math.round(packagePrice * 0.10 * 100) / 100;
    return {
      applies: true,
      discountAmount: discount,
    };
  }

  // 50% off ceramic booster
  if (voucher.rewardId === 'rw_50off_ceramic_boost') {
    const discount = Math.min(packagePrice, 60);
    return {
      applies: true,
      discountAmount: discount,
    };
  }

  // Free rim shine
  if (voucher.rewardId === 'rw_free_rim_shine') {
    const discount = Math.min(packagePrice, 50);
    return {
      applies: true,
      discountAmount: discount,
    };
  }

  // Signature fragrance
  if (voucher.rewardId === 'rw_fragrance_pack') {
    const discount = Math.min(packagePrice, 30);
    return {
      applies: true,
      discountAmount: discount,
    };
  }

  // Ozone sanitization
  if (voucher.rewardId === 'rw_interior_sanitization') {
    const discount = Math.min(packagePrice, 150);
    return {
      applies: true,
      discountAmount: discount,
    };
  }

  // Free full detail
  if (voucher.rewardId === 'rw_free_full_detail') {
    const discount = Math.min(packagePrice, 275);
    return {
      applies: true,
      discountAmount: discount,
    };
  }

  // Category fallback
  if (reward?.category === 'discount') {
    return {
      applies: true,
      discountAmount: Math.round(packagePrice * 0.10 * 100) / 100,
    };
  }

  return {
    applies: true,
    discountAmount: Math.min(packagePrice, 50),
  };
}

