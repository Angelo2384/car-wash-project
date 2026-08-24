import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import {
  Calendar,
  Clock,
  Car,
  FileText,
  Hash,
  ArrowLeft,
  Sparkles,
  Droplets,
  Shield,
  Check,
  CreditCard,
} from 'lucide-react';

// ─── Package catalogue (mirrors CustomerPackages.tsx) ───────────────────────
const PACKAGES: Record<string, { name: string; price: number; duration: string; accentColor: string }> = {
  express: { name: 'Express Wash',  price: 75,  duration: '20–30 min', accentColor: '#A1A1AA' },
  premium: { name: 'Premium Wash', price: 275, duration: '60–75 min', accentColor: '#E86A33' },
  elite:   { name: 'Elite Wash',   price: 875, duration: '2–3 hrs',   accentColor: '#35B86B' },
};

const PKG_ICON: Record<string, React.ReactNode> = {
  express: <Droplets className="w-5 h-5" />,
  premium: <Sparkles className="w-5 h-5" />,
  elite:   <Shield  className="w-5 h-5" />,
};

const VAT_RATE = 0.15;

function fmt(amount: number) {
  return `R${amount.toFixed(2)}`;
}

// ─── Reusable section card wrapper ──────────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-off-white)] border border-[var(--color-soft-gray)] rounded-xl p-6 flex flex-col gap-5 shadow-sm">
      <h3 className="text-[15px] font-semibold text-[var(--color-charcoal)] tracking-tight">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Shared Input class shortcuts ────────────────────────────────────────────
const inputCls =
  '!bg-white !border-[var(--color-soft-gray)] !text-[var(--color-charcoal)] focus:!border-[var(--color-burnt-orange)] focus:!ring-[var(--color-burnt-orange)]';
const labelCls = '!text-[var(--color-charcoal)]';
const iconCls  = '!text-[var(--color-charcoal)]';

// ─── Available time slots ────────────────────────────────────────────────────
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00',
];

// ─── Main component ──────────────────────────────────────────────────────────
export default function CustomerBooking() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Package passed via navigation state; fall back to 'premium' as a safe default
  const packageId: string = (location.state as any)?.packageId ?? 'premium';
  const pkg = PACKAGES[packageId] ?? PACKAGES.premium;
  const vat   = pkg.price * VAT_RATE;
  const total = pkg.price + vat;

  // Form state
  const [date,  setDate]  = useState('');
  const [time,  setTime]  = useState('');
  const [plate, setPlate] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [notes, setNotes] = useState('');

  // Formatted display date
  const displayDate = date
    ? new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Not selected';
  const displayTime = time || 'Not selected';

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards text-[var(--color-charcoal)]">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => navigate('/dashboard/customer/packages')}
          className="flex items-center gap-1.5 text-sm text-[var(--color-burnt-orange)] hover:opacity-80 transition-colors w-fit mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Packages
        </button>
        <h2 className="text-2xl font-bold font-display tracking-tight text-[var(--color-burnt-orange)]">
          Book Appointment
        </h2>
        <p className="text-[var(--color-burnt-orange)] text-sm">
          Complete your booking details below
        </p>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ──────────────────── LEFT COLUMN (form) ──────────────────────── */}
        <div className="flex-[2] flex flex-col gap-5">

          {/* Selected package pill */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border"
            style={{
              background: `${pkg.accentColor}10`,
              borderColor: `${pkg.accentColor}30`,
            }}
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${pkg.accentColor}20`, color: pkg.accentColor }}
            >
              {PKG_ICON[packageId]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--color-charcoal)]">{pkg.name}</p>
              <p className="text-xs text-[var(--color-charcoal-700)]">Duration: {pkg.duration}</p>
            </div>
            <span className="font-bold text-[var(--color-charcoal)]">{fmt(pkg.price)}</span>
            <button
              onClick={() => navigate('/dashboard/customer/packages')}
              className="text-xs underline text-[var(--color-burnt-orange)] hover:opacity-75 transition-opacity shrink-0"
            >
              Change
            </button>
          </div>

          {/* Date & Time */}
          <SectionCard title="Date & Time">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="date"
                label="Select Date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                icon={<Calendar className="w-5 h-5" />}
                className={inputCls}
                labelClassName={labelCls}
                iconClassName={iconCls}
              />
              {/* Custom time slot picker */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className={`text-sm font-medium ml-1 ${labelCls}`}>
                  Select Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-medium border transition-all duration-150
                        ${time === slot
                          ? 'bg-[var(--color-burnt-orange)] border-[var(--color-burnt-orange)] text-white shadow-sm shadow-[var(--color-burnt-orange)]/30'
                          : 'bg-white border-[var(--color-soft-gray)] text-[var(--color-charcoal)] hover:border-[var(--color-burnt-orange)]/50 hover:bg-[var(--color-burnt-orange)]/5'
                        }`}
                    >
                      <Clock className="w-3.5 h-3.5 opacity-70" />
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Vehicle details */}
          <SectionCard title="Vehicle Details">
            <div className="flex flex-col gap-4">
              <Input
                label="Licence Plate"
                placeholder="e.g. CA 123 456"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                icon={<Hash className="w-5 h-5" />}
                className={inputCls}
                labelClassName={labelCls}
                iconClassName={iconCls}
              />
              <Input
                label="Vehicle Make & Model"
                placeholder="e.g. Toyota Corolla"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                icon={<Car className="w-5 h-5" />}
                className={inputCls}
                labelClassName={labelCls}
                iconClassName={iconCls}
              />
              <Input
                label="Additional Notes (Optional)"
                placeholder="e.g. Focus on the rear bumper"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                icon={<FileText className="w-5 h-5" />}
                className={inputCls}
                labelClassName={labelCls}
                iconClassName={iconCls}
              />
            </div>
          </SectionCard>
        </div>

        {/* ──────────────────── RIGHT COLUMN (summary) ──────────────────── */}
        <div className="w-full lg:w-[340px] shrink-0">
          <div className="bg-[var(--color-off-white)] border border-[var(--color-soft-gray)] rounded-xl p-6 flex flex-col gap-5 sticky top-24 shadow-sm">

            <h3 className="text-[15px] font-semibold text-[var(--color-charcoal)] tracking-tight">
              Booking Summary
            </h3>

            {/* Package block */}
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-widest text-[var(--color-charcoal-700)] font-medium">
                Package
              </span>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: `${pkg.accentColor}20`, color: pkg.accentColor }}
                  >
                    {PKG_ICON[packageId]}
                  </span>
                  <span className="font-medium text-[var(--color-charcoal)] text-sm">{pkg.name}</span>
                </div>
                <span className="font-semibold text-[var(--color-charcoal)] text-sm">{fmt(pkg.price)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[var(--color-charcoal-700)]">
                <Clock className="w-3.5 h-3.5" />
                Duration: {pkg.duration}
              </div>
            </div>

            <div className="h-px bg-[var(--color-soft-gray)]" />

            {/* Date / Time */}
            <div className="flex flex-col gap-2.5">
              <SummaryRow label="Date" value={displayDate} />
              <SummaryRow label="Time" value={displayTime} />
            </div>

            <div className="h-px bg-[var(--color-soft-gray)]" />

            {/* Price breakdown */}
            <div className="flex flex-col gap-2.5">
              <SummaryRow label="Subtotal" value={fmt(pkg.price)} />
              <SummaryRow label="VAT (15%)" value={fmt(vat)} />

              <div className="flex items-center justify-between pt-3 mt-1 border-t border-[var(--color-soft-gray)]">
                <span className="font-bold text-[var(--color-charcoal)]">Total</span>
                <span className="font-bold text-[var(--color-burnt-orange)] text-lg">{fmt(total)}</span>
              </div>
            </div>

            {/* Included services mini-list */}
            <div className="bg-white border border-[var(--color-soft-gray)] rounded-lg p-4 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-charcoal-700)] mb-1">
                Included
              </p>
              {INCLUDED[packageId]?.map((item: string) => (
                <div key={item} className="flex items-center gap-2 text-xs text-[var(--color-charcoal)]">
                  <Check className="w-3.5 h-3.5 text-[var(--color-burnt-orange)] shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            {/* CTA */}
            <Button
              variant="primary"
              fullWidth
              className="mt-1 gap-2"
              // Non-functional as requested
              onClick={() => {}}
            >
              <CreditCard className="w-4 h-4" />
              Proceed to Payment
            </Button>

            <p className="text-[11px] text-center text-[var(--color-charcoal-700)] leading-relaxed">
              By proceeding you agree to our{' '}
              <span className="text-[var(--color-burnt-orange)] cursor-pointer hover:underline">
                cancellation policy
              </span>
              . VAT is included in all displayed amounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Summary row helper ──────────────────────────────────────────────────────
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--color-charcoal-700)]">{label}</span>
      <span className="text-sm font-medium text-[var(--color-charcoal)]">{value}</span>
    </div>
  );
}

// ─── Included services per package (short list for summary) ─────────────────
const INCLUDED: Record<string, string[]> = {
  express: [
    'Exterior hand wash',
    'Wheel rinse',
    'Window wipe-down',
    'Quick interior vacuum',
  ],
  premium: [
    'Full exterior wash & dry',
    'Interior vacuum & wipe-down',
    'Tyre dressing & rim shine',
    'Window clean (inside & out)',
    'Air freshener finish',
  ],
  elite: [
    'Everything in Premium',
    'Clay bar & paint correction',
    'Ceramic coating application',
    'Full leather conditioning',
    'Engine bay clean',
  ],
};
