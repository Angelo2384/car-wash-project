import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import {
  CalendarPlus,
  CalendarDays,
  Car,
  Check,
  CheckCircle2,
  Crown,
  Gift,
  Laptop,
  MapPin,
  Radio,
  Sparkles,
  Truck,
  Wallet,
  Wand2,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { db } from '../../../lib/firebase';
import {
  getStoredAppointments,
  getDynamicAppointmentStatus,
  getAppointmentsStorageKey,
  parseAppointmentDateTime,
  type StoredAppointment,
  type DynamicStatusResult,
} from '../../../lib/appointments';
import {
  REWARD_POINTS,
  calculateBookingPoints,
  getRewardsSummary,
  getTierProgress,
  subscribeToRewards,
  type RewardsSummary,
} from '../../../lib/rewards';
import { Button } from '../../../components/ui/Button';
import { activePackages, formatDuration, formatRand, type ServiceItem } from '../../../lib/business';
import { useBusinessSettings, useServices } from '../../../hooks/useOperations';

// Photo for the top card: the night garage shot in dark mode, the daylight shot in light mode
const HERO_IMAGES = {
  dark: { src: '/images/dashboard_hero.png', position: 'object-[92%_50%]' },
  light: { src: '/images/dashboard_hero_light.png', position: 'object-right' },
} as const;

// Package cards come from the admin's catalogue (Services & Business); top three by order
function dashboardPackages(items: ServiceItem[]) {
  return activePackages(items)
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: formatRand(p.price),
      duration: formatDuration(p.durationMinutes),
      points: calculateBookingPoints(p.name),
      highlighted: Boolean(p.popular),
      services: p.includes.slice(0, 4),
    }));
}

const HOW_IT_WORKS = [
  {
    icon: Laptop,
    title: 'Book online',
    body: 'Pick a package, choose a date and time, and tell us where your car will be.',
  },
  {
    icon: Truck,
    title: 'We come to you',
    body: 'A detailer arrives at your home or office. Prefer to drive in? Book a slot at our wash bay.',
  },
  {
    icon: Sparkles,
    title: 'Enjoy the shine',
    body: 'Your car is cleaned and detailed, ready to drive. Every wash earns reward points.',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
type ApptWithStatus = { appt: StoredAppointment; dyn: DynamicStatusResult; when: Date | null };

function getPackageId(packageName: string): string | null {
  const lower = packageName.toLowerCase();
  if (lower.includes('express')) return 'express';
  if (lower.includes('premium')) return 'premium';
  if (lower.includes('elite')) return 'elite';
  return null;
}

function formatDay(date: Date | null, fallback: string): string {
  if (!date) return fallback;
  return date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_ICON_COLORS: Record<string, string> = {
  'reward-green': 'text-[#35B86B]',
  blue: 'text-sky-400',
  amber: 'text-amber-400',
  red: 'text-red-500',
};

const STATUS_BADGES: Record<string, string> = {
  'reward-green': 'text-[#35B86B] bg-[#35B86B]/15 border-[#35B86B]/30',
  blue: 'text-sky-500 bg-sky-500/10 border-sky-500/30',
  amber: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  red: 'text-red-500 bg-red-500/10 border-red-500/30',
};

const UPCOMING_STATUSES = ['Awaiting Confirmation', 'Confirmed', 'Staff on route', 'Staff arrived', 'Washing in progress'];

/**
 * Refunds aren't stored on bookings yet, so this reads the outcome from the
 * cancellation policy: full refund 24h+ ahead, 20% fee inside 24h.
 */
function getRefundNote(appt: StoredAppointment, status: string, when: Date | null): string | null {
  if (status === 'Missed') return 'Refund subject to approval';
  if (status !== 'Cancelled') return null;
  if (appt.cancelledByRole && appt.cancelledByRole !== 'customer') return 'Cancelled by WashWizzy';
  if (!appt.cancelledAt || !when) return null;
  const hoursBefore = (when.getTime() - appt.cancelledAt) / (1000 * 60 * 60);
  if (hoursBefore > 24) return 'Full refund';
  if (hoursBefore > 0) return 'Refunded less 20% fee';
  return 'Non-refundable';
}

const STATUS_COPY: Record<string, { heading: string; body: string }> = {
  Completed: {
    heading: 'Your wash is complete',
    body: 'Thanks for washing with us. Book your next one whenever your car needs it.',
  },
  Missed: {
    heading: 'You missed this wash',
    body: 'The booking time passed before the wash could happen. You can request a refund from your appointments.',
  },
  Cancelled: {
    heading: 'Booking cancelled',
    body: 'This booking won’t go ahead. Book a new time whenever suits you.',
  },
  'Staff on route': {
    heading: 'Your detailer is on the way',
    body: 'Make sure your car is unlocked or the keys are handy when they arrive.',
  },
  'Staff arrived': {
    heading: 'Your detailer has arrived',
    body: "They're getting set up and will start on your car shortly.",
  },
  'Washing in progress': {
    heading: 'Your car is being washed',
    body: "Sit back. We'll let you know as soon as it's done.",
  },
  'Awaiting Confirmation': {
    heading: 'Booking received',
    body: "We're confirming your booking. You'll get a notification as soon as it's confirmed.",
  },
  Confirmed: {
    heading: 'Your wash is booked',
    body: "Everything's set. We'll let you know when your detailer is on the way.",
  },
};

const cardClass = 'bg-[#171717] border border-[#2C2C2C] rounded-2xl';

// ─── Sections ─────────────────────────────────────────────────────────────────
function SectionHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold font-display text-[#F5F5F5]">{title}</h2>
        <p className="text-sm text-[#A1A1AA]">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function HeroPill({ icon: Icon, iconClass, children }: { icon: typeof Sparkles; iconClass: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full border border-[#2C2C2C] bg-[#1F1F1F] text-xs font-semibold text-[#F5F5F5]">
      <Icon className={`w-3.5 h-3.5 ${iconClass}`} aria-hidden="true" />
      {children}
    </span>
  );
}

function HeroImage() {
  const { theme } = useTheme();
  const image = HERO_IMAGES[theme];
  return (
    <div className="hidden md:block absolute inset-y-0 right-0 w-[62%] pointer-events-none">
      <img
        src={image.src}
        alt=""
        className={`w-full h-full object-cover ${image.position} [mask-image:linear-gradient(to_right,transparent_0%,transparent_8%,rgba(0,0,0,0.1)_30%,rgba(0,0,0,0.4)_48%,rgba(0,0,0,0.75)_65%,black_84%)]`}
      />
    </div>
  );
}

function WelcomeHero({ onBook }: { onBook: () => void }) {
  return (
    <div className={`${cardClass} relative overflow-hidden p-6 md:p-7 flex xl:col-span-2 min-h-[320px]`}>
      <div className="relative z-10 flex flex-col justify-center gap-4 flex-1 md:max-w-[50%]">
        <HeroPill icon={Sparkles} iconClass="text-[#E86A33]">
          Welcome to WashWizzy
        </HeroPill>
        <h2 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[#F5F5F5] max-w-[16ch]">
          Ready for a fresh clean?
        </h2>
        <p className="text-[15px] text-[#A1A1AA] leading-relaxed max-w-[52ch]">
          You haven't booked a wash yet. Book your first one and we'll come to you, or drive in to
          our wash bay.
        </p>
        <Button onClick={onBook} className="self-start mt-2">
          <CalendarPlus className="w-4 h-4" />
          Book your first wash
        </Button>
      </div>
      <HeroImage />
    </div>
  );
}

type BookingHeroActions = {
  onView: () => void;
  onReschedule: () => void;
  onBookAgain: () => void;
  onReview: () => void;
};

function BookingHero({ item, onView, onReschedule, onBookAgain, onReview }: { item: ApptWithStatus } & BookingHeroActions) {
  const { appt, dyn, when } = item;
  const copy = STATUS_COPY[dyn.status] ?? STATUS_COPY.Confirmed;
  const where = appt.serviceType === 'Drive-in' ? 'At our wash bay' : appt.address || appt.location || 'At your address';
  // Past bookings keep it short; the full details are one click away in the appointment
  const isUpcoming = UPCOMING_STATUSES.includes(dyn.status);
  const rows = isUpcoming
    ? [
        { label: 'When', icon: CalendarDays, value: `${formatDay(when, appt.date)}, ${appt.time}` },
        { label: 'Package', icon: Sparkles, value: appt.vehicle ? `${appt.packageName} · ${appt.vehicle}` : appt.packageName },
        { label: 'Where', icon: MapPin, value: where },
      ]
    : [];

  const actions =
    dyn.status === 'Completed'
      ? { primary: { label: 'Book again', onClick: onBookAgain }, secondary: { label: 'Leave a review', onClick: onReview } }
      : dyn.status === 'Missed'
        ? { primary: { label: 'View appointment', onClick: onView }, secondary: { label: 'Book a new time', onClick: onBookAgain } }
        : dyn.status === 'Cancelled'
          ? { primary: { label: 'Book again', onClick: onBookAgain }, secondary: { label: 'View appointment', onClick: onView } }
          : {
              primary: { label: 'View appointment', onClick: onView },
              secondary: dyn.canReschedule ? { label: 'Reschedule', onClick: onReschedule } : null,
            };

  return (
    <div className={`${cardClass} relative overflow-hidden p-6 md:p-7 flex xl:col-span-2 min-h-[320px]`}>
      <div className="relative z-10 flex flex-col justify-center gap-4 flex-1 min-w-0 md:max-w-[50%]">
        <HeroPill icon={Radio} iconClass={STATUS_ICON_COLORS[dyn.statusColor] ?? STATUS_ICON_COLORS['reward-green']}>
          Service update: {dyn.status}
        </HeroPill>
        <h2 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[#F5F5F5]">
          {copy.heading}
        </h2>
        <p className="text-[15px] text-[#A1A1AA] leading-relaxed max-w-[52ch]">{copy.body}</p>

        {rows.length > 0 && (
          <dl className="flex flex-col gap-2.5 mt-1">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <dt className="w-8 h-8 rounded-lg bg-[#1F1F1F] border border-[#2C2C2C] flex items-center justify-center shrink-0">
                  <row.icon className="w-4 h-4 text-[#E86A33]" aria-hidden="true" />
                  <span className="sr-only">{row.label}</span>
                </dt>
                <dd className="text-[15px] font-semibold text-[#F5F5F5]">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex flex-wrap gap-3 mt-1">
          <Button onClick={actions.primary.onClick} className="!py-3">
            {actions.primary.label}
          </Button>
          {actions.secondary && (
            <Button variant="outline" onClick={actions.secondary.onClick} className="!py-3 hover:!border-[#E86A33]">
              {actions.secondary.label}
            </Button>
          )}
        </div>
      </div>
      <HeroImage />
    </div>
  );
}

function MembershipCard({ hasMembership, price, callOutFee }: { hasMembership: boolean; price: number; callOutFee: number }) {
  const perks = [
    { title: 'R0 call-out fees', detail: `Save ${formatRand(callOutFee)} every time we come to you` },
    { title: 'Priority scheduling', detail: 'First pick of booking slots' },
  ];

  return (
    <div className={`${cardClass} p-6 flex flex-col gap-5`}>
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
            hasMembership ? 'bg-[#35B86B]/15 border-[#35B86B]/30' : 'bg-[#E86A33]/10 border-[#E86A33]/20'
          }`}
        >
          <Crown className={`w-5 h-5 ${hasMembership ? 'text-[#35B86B]' : 'text-[#E86A33]'}`} />
        </div>
        <div>
          <h2 className="text-lg font-bold font-display text-[#F5F5F5]">
            {hasMembership ? "You're a member" : 'Membership'}
          </h2>
          <p className="text-sm text-[#A1A1AA]">
            {hasMembership ? 'Your perks apply automatically' : `${formatRand(price)} / month`}
          </p>
        </div>
      </div>

      {!hasMembership && (
        <p className="text-sm text-[#A1A1AA] leading-relaxed">
          Stop paying call-out fees and get first pick of booking times.
        </p>
      )}

      <ul className="flex flex-col gap-3.5">
        {perks.map((perk) => (
          <li key={perk.title} className="flex items-start gap-3">
            <CheckCircle2 className={`w-[18px] h-[18px] mt-0.5 shrink-0 ${hasMembership ? 'text-[#35B86B]' : 'text-[#E86A33]'}`} />
            <div>
              <p className="text-sm font-semibold text-[#F5F5F5]">{perk.title}</p>
              <p className="text-xs text-[#A1A1AA] mt-0.5">{perk.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <Link
        to="/dashboard/customer/membership"
        className={`mt-auto inline-flex items-center justify-center rounded-lg px-6 py-3 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E86A33] ${
          hasMembership
            ? 'border border-[#2C2C2C] text-[#F5F5F5] hover:border-[#35B86B]'
            : 'border border-[#E86A33]/40 text-[#E86A33] hover:bg-[#E86A33]/10'
        }`}
      >
        {hasMembership ? 'Manage membership' : 'Join membership'}
      </Link>
    </div>
  );
}

function RewardsCard({ rewards, wide = false }: { rewards: RewardsSummary; wide?: boolean }) {
  const progress = getTierProgress(rewards.lifetimePoints);
  const { currentTier, nextTier } = progress;
  const navigate = useNavigate();

  return (
    <div className={`${cardClass} p-6 flex flex-col gap-5 h-full`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#E86A33]/10 border border-[#E86A33]/20 flex items-center justify-center">
            <Gift className="w-5 h-5 text-[#E86A33]" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display text-[#F5F5F5]">
              {nextTier ? `Road to ${nextTier.name}` : `${currentTier.name} tier`}
            </h2>
            <p className="text-sm text-[#A1A1AA]">
              {currentTier.name === 'Unranked' ? 'Earn points on every wash' : `You're ${currentTier.name}`}
            </p>
          </div>
        </div>
        {wide && (
          <p className="text-right shrink-0">
            <span className="text-4xl font-black font-display text-[#F5F5F5]">{rewards.lifetimePoints}</span>
            {nextTier && <span className="text-sm text-[#A1A1AA]"> / {nextTier.minPoints} pts</span>}
          </p>
        )}
      </div>

      {!wide && (
        <p className="flex items-baseline gap-1">
          <span className="text-5xl font-black font-display text-[#F5F5F5]">{rewards.lifetimePoints}</span>
          {nextTier && <span className="text-base text-[#A1A1AA]">/ {nextTier.minPoints} pts</span>}
        </p>
      )}

      <div>
        <div
          className="h-2.5 rounded-full bg-[#1F1F1F] overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.progressPercent}
          aria-label={nextTier ? `Progress to ${nextTier.name}` : 'Tier progress'}
        >
          <div
            className="h-full rounded-full bg-[#E86A33] transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(progress.progressPercent, 2)}%` }}
          />
        </div>
        <p className="text-sm text-[#A1A1AA] mt-2.5">
          {nextTier
            ? `${progress.pointsToNext} points to ${nextTier.name}. A Premium Wash earns ${REWARD_POINTS.BOOKING_PREMIUM}.`
            : "You've reached the top tier."}
        </p>
      </div>

      {wide && nextTier && (
        <div className="border-t border-[#2C2C2C] pt-5">
          <h3 className="text-sm font-semibold text-[#F5F5F5] mb-3">Unlocks at {nextTier.name}</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {nextTier.perks.map((perk) => (
              <li
                key={perk}
                className="flex items-start gap-2.5 rounded-xl bg-[#101010] border border-[#2C2C2C] px-4 py-3 text-sm text-[#D8D5CF]"
              >
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#E86A33]" />
                {perk}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button onClick={() => navigate('/dashboard/customer/rewards')} className="mt-auto self-stretch sm:self-start !py-3">
        View rewards
      </Button>
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="flex flex-col gap-4 xl:col-span-2">
      <SectionHeading title="How it works" subtitle="Three steps to a clean car" />
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
        {HOW_IT_WORKS.map((step, i) => (
          <li key={step.title} className={`${cardClass} p-5 flex flex-col gap-4`}>
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-[#1F1F1F] border border-[#2C2C2C] flex items-center justify-center">
                <step.icon className="w-5 h-5 text-[#E86A33]" />
              </div>
              <span className="text-4xl font-black font-display text-[#2C2C2C] leading-none" aria-hidden="true">
                {i + 1}
              </span>
            </div>
            <h3 className="text-base font-bold font-display text-[#F5F5F5]">{step.title}</h3>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BookingHistory({ items, onBookAgain }: { items: ApptWithStatus[]; onBookAgain: (appt: StoredAppointment) => void }) {
  return (
    <div className={`${cardClass} overflow-hidden flex flex-col`}>
      {items.length === 0 ? (
        <p className="p-6 text-sm text-[#A1A1AA]">Past bookings will show up here, including missed and cancelled ones.</p>
      ) : (
        items.map(({ appt, dyn, when }) => {
          const refundNote = getRefundNote(appt, dyn.status, when);
          return (
            <div key={appt.id} className="flex items-center gap-4 px-5 py-4 border-b border-[#2C2C2C] last:border-b-0">
              <div className="w-11 h-11 rounded-xl bg-[#1F1F1F] border border-[#2C2C2C] flex items-center justify-center shrink-0">
                <Car className="w-5 h-5 text-[#A1A1AA]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[15px] font-semibold text-[#F5F5F5] truncate">{appt.packageName}</p>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${STATUS_BADGES[dyn.statusColor] ?? STATUS_BADGES.red}`}
                  >
                    {dyn.status}
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] mt-1 truncate">
                  {formatDay(when, appt.date)}
                  {appt.vehicle ? ` · ${appt.vehicle}` : ''}
                  {refundNote ? ` · ${refundNote}` : ''}
                </p>
              </div>
              <button
                onClick={() => onBookAgain(appt)}
                className="shrink-0 rounded-lg border border-[#2C2C2C] px-4 py-2.5 text-sm font-semibold text-[#F5F5F5] hover:border-[#E86A33] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E86A33]"
              >
                Book again
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

function SuggestionCard({ lastWashDays }: { lastWashDays: number | null }) {
  const overdue = lastWashDays !== null && lastWashDays >= 21;
  return (
    <div className="bg-[#E86A33]/[0.06] border border-[#E86A33]/20 rounded-2xl p-6 flex gap-4">
      <div className="w-11 h-11 rounded-xl bg-[#E86A33]/10 border border-[#E86A33]/20 flex items-center justify-center shrink-0">
        <Wand2 className="w-5 h-5 text-[#E86A33]" />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-bold font-display text-[#F5F5F5]">
          {overdue ? `It's been ${lastWashDays} days since your last wash` : 'Need something specific?'}
        </h3>
        <p className="text-sm text-[#A1A1AA] leading-relaxed">
          {overdue
            ? 'Treat your car to a deep clean. Build a custom package with just the services you want.'
            : 'Build a custom package from individual services and see the price as you go.'}
        </p>
        <Link
          to="/dashboard/customer/custom-package"
          className="self-start mt-2 rounded-lg border border-[#E86A33]/40 px-4 py-2.5 text-sm font-semibold text-[#E86A33] hover:bg-[#E86A33]/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E86A33]"
        >
          Build a custom package
        </Link>
      </div>
    </div>
  );
}

function ComingUpCard({ items }: { items: ApptWithStatus[] }) {
  return (
    <div className={`${cardClass} p-6 flex flex-col gap-4`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F5F5]">
        <CalendarDays className="w-4 h-4 text-[#E86A33]" />
        Also coming up
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-[#A1A1AA]">Nothing else booked.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map(({ appt, when }) => (
            <li key={appt.id}>
              <p className="text-xl font-extrabold font-display text-[#F5F5F5]">{formatDay(when, appt.date)}</p>
              <p className="text-sm text-[#A1A1AA]">
                {appt.time} · {appt.packageName}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/dashboard/customer/appointments"
        className="text-sm font-semibold text-[#E86A33] underline underline-offset-4 decoration-[#E86A33]/40 hover:decoration-[#E86A33] self-start"
      >
        All appointments
      </Link>
    </div>
  );
}

function SavingsCard({ callOutVisits, hasMembership, fee }: { callOutVisits: number; hasMembership: boolean; fee: number }) {
  const amount = callOutVisits * fee;
  return (
    <div className={`${cardClass} p-6 flex flex-col gap-3`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F5F5]">
        <Wallet className={`w-4 h-4 ${hasMembership ? 'text-[#35B86B]' : 'text-[#E86A33]'}`} />
        {hasMembership ? 'Saved with membership' : 'Call-out fees you could skip'}
      </div>
      <p className="text-4xl font-black font-display text-[#F5F5F5]">R{amount.toLocaleString('en-ZA')}</p>
      <p className="text-sm text-[#A1A1AA]">
        {callOutVisits === 0
          ? 'You haven’t booked a call-out yet.'
          : `${callOutVisits} call-out visit${callOutVisits === 1 ? '' : 's'} at ${formatRand(fee)} each.`}
      </p>
      {!hasMembership && callOutVisits > 0 && (
        <Link
          to="/dashboard/customer/membership"
          className="text-sm font-semibold text-[#E86A33] underline underline-offset-4 decoration-[#E86A33]/40 hover:decoration-[#E86A33] self-start"
        >
          See membership
        </Link>
      )}
    </div>
  );
}

function PackagesSection({ isNewCustomer, onBook }: { isNewCustomer: boolean; onBook: (id: string) => void }) {
  const { items } = useServices();
  const packages = dashboardPackages(items);
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title="Popular packages"
        subtitle={isNewCustomer ? 'A good place to start for your first booking' : 'Pick a package to book your next wash'}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`relative rounded-2xl p-6 flex flex-col gap-5 bg-[#171717] ${
              pkg.highlighted ? 'border-2 border-[#E86A33]' : 'border border-[#2C2C2C]'
            }`}
          >
            {pkg.highlighted && (
              <span className="absolute -top-3 left-6 px-2.5 py-0.5 rounded-full bg-[#E86A33] text-white text-xs font-semibold badge-solid">
                Most popular
              </span>
            )}
            <div>
              <h3 className="text-base font-bold font-display text-[#F5F5F5]">{pkg.name}</h3>
              <p className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black font-display text-[#F5F5F5]">{pkg.price}</span>
                <span className="text-sm text-[#A1A1AA]">{pkg.duration}</span>
              </p>
            </div>
            <ul className="flex flex-col gap-2.5">
              {pkg.services.map((service) => (
                <li key={service} className="flex items-start gap-2.5 text-sm text-[#D8D5CF]">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#E86A33]" />
                  {service}
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#71717A] mt-auto">Earns {pkg.points} reward points</p>
            <Button
              variant={pkg.highlighted ? 'primary' : 'outline'}
              fullWidth
              onClick={() => onBook(pkg.id)}
              className={`!py-3 ${pkg.highlighted ? '' : 'hover:!border-[#E86A33]'}`}
            >
              Book {pkg.name.replace(' Wash', '')}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const business = useBusinessSettings();

  const [appointments, setAppointments] = useState<StoredAppointment[]>(() => getStoredAppointments(uid));
  const [hasMembership, setHasMembership] = useState<boolean>(() => {
    if (!uid) return false;
    const cached = localStorage.getItem(`ww_has_membership_${uid}`);
    return cached ? JSON.parse(cached) === true : false;
  });
  const [rewards, setRewards] = useState<RewardsSummary>(() => getRewardsSummary(uid));

  // Real-time appointments
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'appointments'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: StoredAppointment[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as StoredAppointment);
        });
        setAppointments(list);
        try {
          localStorage.setItem(getAppointmentsStorageKey(uid), JSON.stringify(list));
        } catch {
          // cache is best-effort
        }
      },
      (err) => console.warn('Customer dashboard appointments sync note:', err.message)
    );
  }, [uid]);

  // Real-time membership
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) setHasMembership(snap.data()?.hasMembership === true);
    });
    const handleChange = () => {
      const cached = localStorage.getItem(`ww_has_membership_${uid}`);
      if (cached) setHasMembership(JSON.parse(cached) === true);
    };
    window.addEventListener('ww_membership_changed', handleChange);
    return () => {
      unsub();
      window.removeEventListener('ww_membership_changed', handleChange);
    };
  }, [uid]);

  // Real-time rewards
  useEffect(() => subscribeToRewards(uid, setRewards), [uid]);

  const { upcoming, history, completed, callOutVisits } = useMemo(() => {
    const all: ApptWithStatus[] = appointments.map((appt) => ({
      appt,
      when: parseAppointmentDateTime(appt.date, appt.time),
      dyn: getDynamicAppointmentStatus(
        appt.date,
        appt.time,
        appt.status === 'Missed',
        appt.completed,
        hasMembership,
        appt.status,
        appt.confirmed,
        appt.staffStatus
      ),
    }));
    const byTime = (a: ApptWithStatus, b: ApptWithStatus) =>
      (a.when?.getTime() ?? a.appt.createdAt ?? 0) - (b.when?.getTime() ?? b.appt.createdAt ?? 0);
    // Everything that's no longer upcoming: completed, missed, cancelled/refunded — newest first
    const history = all.filter((item) => !UPCOMING_STATUSES.includes(item.dyn.status)).sort((a, b) => byTime(b, a));

    return {
      upcoming: all.filter((item) => UPCOMING_STATUSES.includes(item.dyn.status)).sort(byTime),
      history,
      completed: history.filter((item) => item.dyn.status === 'Completed'),
      callOutVisits: all.filter((item) => item.dyn.status !== 'Cancelled' && item.appt.serviceType === 'Call-out').length,
    };
  }, [appointments, hasMembership]);

  const isNewCustomer = appointments.length === 0;
  const lastWash = completed[0]?.when ?? null;
  const lastWashDays = lastWash ? daysSince(lastWash) : null;

  const goToBooking = (packageId: string) => navigate('/dashboard/customer/booking', { state: { packageId } });
  const goToPackages = () => navigate('/dashboard/customer/packages');
  const bookAgain = (appt: StoredAppointment) => {
    const packageId = getPackageId(appt.packageName);
    if (packageId) goToBooking(packageId);
    else navigate('/dashboard/customer/custom-package');
  };

  // The booking the customer cares about most: the next upcoming one, otherwise the most recent
  const latest = upcoming[0] ?? history[0];

  return (
    <div className="flex flex-col gap-10 pb-10 text-[#F5F5F5] transition-colors duration-300">
      {/* Top row: what matters right now + membership */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {isNewCustomer || !latest ? (
          <WelcomeHero onBook={goToPackages} />
        ) : (
          <BookingHero
            item={latest}
            onView={() => navigate(`/dashboard/customer/appointments?id=${latest.appt.id}`)}
            onReschedule={() => navigate(`/dashboard/customer/appointments/reschedule/${latest.appt.id}`)}
            onBookAgain={() => bookAgain(latest.appt)}
            onReview={() => navigate('/dashboard/customer/reviews')}
          />
        )}
        <MembershipCard hasMembership={hasMembership} price={business.membershipMonthly} callOutFee={business.callOutFee} />
      </div>

      {isNewCustomer ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <HowItWorks />
          <div className="flex flex-col">
            <RewardsCard rewards={rewards} />
          </div>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-x-5 gap-y-4 items-start">
              <div className="xl:col-span-2">
                <SectionHeading
                  title="Booking history"
                  subtitle="Every past booking, including missed and cancelled ones"
                  action={
                    history.length > 0 && (
                      <Link
                        to="/dashboard/customer/appointments?tab=history"
                        className="shrink-0 rounded-lg border border-[#2C2C2C] px-4 py-2 text-sm font-semibold text-[#F5F5F5] hover:border-[#E86A33] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E86A33]"
                      >
                        View all
                      </Link>
                    )
                  }
                />
              </div>
              <div className="hidden xl:block" aria-hidden="true" />
              <div className="xl:col-span-2">
                <BookingHistory items={history.slice(0, 2)} onBookAgain={bookAgain} />
              </div>
              <SuggestionCard lastWashDays={lastWashDays} />
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
              <RewardsCard rewards={rewards} wide />
            </div>
            <div className="flex flex-col gap-5">
              <ComingUpCard items={upcoming.slice(1, 3)} />
              <SavingsCard callOutVisits={callOutVisits} hasMembership={hasMembership} fee={business.callOutFee} />
            </div>
          </div>
        </>
      )}

      <PackagesSection isNewCustomer={isNewCustomer} onBook={goToBooking} />
    </div>
  );
}
