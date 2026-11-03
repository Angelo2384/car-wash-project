import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { calculateCallOutFee } from '../../../lib/appointments';
import { formatDuration, formatHour, resolveBookingPackage, toIsoDate, workHoursFor } from '../../../lib/business';
import { workTypeForService } from '../../../lib/scheduling';
import { useBusinessSettings, useServices } from '../../../hooks/useOperations';
import TimeSlotPicker from '../../../components/booking/TimeSlotPicker';
import {
  getStoredVehicles,
  subscribeToCustomerVehicles,
  type CustomerVehicle,
} from '../../../lib/vehicles';
import { useToast } from '../../../contexts/ToastContext';
import { useNotifications } from '../../../contexts/NotificationsContext';
import { payAndBook, VAT_RATE } from '../../../lib/bookingPayment';
import { paystackTestMode } from '../../../lib/paystack';
import {
  calculateBookingPoints,
  getRewardsSummary,
  getValidVouchers,
  getVoucherDiscount,
  LOYALTY_TIERS,
  type RedeemedReward,
} from '../../../lib/rewards';
import PaymentSuccessModal, { type PaymentSuccessInfo } from '../../../components/ui/PaymentSuccessModal';
import EditProfileModal from '../../../components/customer/EditProfileModal';
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
  ShieldCheck,
  Check,
  CreditCard,
  MapPin,
  Wand2,
  Award,
  Lock,
} from 'lucide-react';

const PKG_ICON: Record<string, React.ReactNode> = {
  express: <Droplets className="w-4 h-4" />,
  premium: <Sparkles className="w-4 h-4" />,
  elite:   <ShieldCheck className="w-4 h-4" />,
};

function fmt(n: number) { return `R${n.toFixed(2)}`; }

// ─── Input shortcut classes (dark theme matching Profile) ─────────────────────
// The Input component defaults to dark; override nothing — it already matches.
const inputCls = '';
const labelCls = '';
const iconCls  = '';

// ─── Section card matching Profile cards ──────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 flex flex-col gap-5 shadow-lg">
      <h3 className="text-[15px] font-semibold font-display text-[#F5F5F5] tracking-tight border-b border-[#2C2C2C] pb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CustomerBooking() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const { addNotification } = useNotifications();
  const uid = currentUser?.uid;
  const [profile, setProfile] = useState<{ fullName?: string; phoneNumber?: string }>({});

  const [hasMembership, setHasMembership] = useState<boolean>(() => {
    if (!uid) return false;
    const cached = localStorage.getItem(`ww_has_membership_${uid}`);
    return cached ? JSON.parse(cached) : false;
  });

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) {
        const mem = snap.data()?.hasMembership === true;
        setHasMembership(mem);
        setProfile({
          fullName: snap.data()?.fullName || snap.data()?.displayName,
          phoneNumber: snap.data()?.phoneNumber || snap.data()?.phone,
        });
        localStorage.setItem(`ww_has_membership_${uid}`, JSON.stringify(mem));
      }
    });
    return () => unsub();
  }, [uid]);

  const navState = (location.state ?? {}) as { packageId?: string; customServices?: string[]; customOptionCount?: number };
  const packageId: string = navState.packageId ?? 'premium';
  const customServiceIds: string[] = navState.customServices ?? [];
  // Prices, durations and the call-out fee come from the admin's Services & Business settings
  const { items: services } = useServices();
  const business = useBusinessSettings();
  const pkg = resolveBookingPackage(services, packageId, customServiceIds);
  const workHours = workHoursFor(pkg.durationMinutes);

  const [serviceType, setServiceType] = useState<'Call-out' | 'Drive-in'>('Call-out');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');

  const [date,    setDate]    = useState('');
  const [startHour, setStartHour] = useState<number | null>(null);
  const time = startHour === null ? '' : formatHour(startHour);
  const [plate,   setPlate]   = useState('');
  const [vehicle, setVehicle] = useState('');
  const [notes,   setNotes]   = useState('');

  // ─── Real Saved Vehicles from Profile ──────────────────────────────────────
  const [savedVehicles, setSavedVehicles] = useState<CustomerVehicle[]>(() =>
    getStoredVehicles(uid)
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('custom');

  useEffect(() => {
    const unsub = subscribeToCustomerVehicles(uid, (list) => {
      setSavedVehicles(list);
      // If user has saved vehicles and no vehicle filled yet, auto-select first
      if (list.length > 0 && !plate && !vehicle) {
        setSelectedVehicleId(list[0].id);
        setPlate(list[0].plate);
        setVehicle(`${list[0].make} ${list[0].model}`);
      }
    });
    return () => unsub();
  }, [uid]);

  const handleSelectSavedVehicle = (vId: string) => {
    setSelectedVehicleId(vId);
    if (vId === 'custom') {
      setPlate('');
      setVehicle('');
    } else {
      const found = savedVehicles.find((v) => v.id === vId);
      if (found) {
        setPlate(found.plate);
        setVehicle(`${found.make} ${found.model}`);
      }
    }
  };

  // A redeemed voucher that suits this package is applied automatically
  // Vouchers come from rewards bought with points on the Rewards page
  const vouchers = getValidVouchers(uid).map((v) => ({ voucher: v, result: getVoucherDiscount(v, pkg.name, pkg.price) }));
  // undefined = pick the best one automatically, null = the customer chose not to use one
  const [chosenVoucherId, setChosenVoucherId] = useState<string | null | undefined>(undefined);
  const [voucherCode, setVoucherCode] = useState('');
  const bestVoucher = vouchers
    .filter((v) => v.result.applies)
    .sort((a, b) => b.result.discountAmount - a.result.discountAmount)[0]?.voucher ?? null;
  const voucher: RedeemedReward | null =
    chosenVoucherId === undefined ? bestVoucher : vouchers.find((v) => v.voucher.id === chosenVoucherId)?.voucher ?? null;
  const voucherResult = voucher ? getVoucherDiscount(voucher, pkg.name, pkg.price) : null;
  const pointsBalance = getRewardsSummary(uid).pointsBalance;

  const applyVoucherCode = () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) return;
    const match = vouchers.find((v) => v.voucher.voucherCode.toUpperCase() === code);
    if (!match) {
      showToast('No unused voucher with that code on your account.', 'error');
      return;
    }
    if (!match.result.applies) {
      showToast(match.result.reason || 'That voucher can’t be used with this package.', 'error');
      return;
    }
    setChosenVoucherId(match.voucher.id);
    setVoucherCode('');
    showToast(`${match.voucher.rewardTitle} applied.`, 'success');
  };
  const discount = voucherResult?.applies ? voucherResult.discountAmount : 0;

  const callOutFee = calculateCallOutFee(serviceType, hasMembership, business.callOutFee);
  const subtotal = Math.max(0, pkg.price - discount) + callOutFee;
  const vat   = subtotal * VAT_RATE;
  const total = subtotal + vat;

  const customOptionCount = customServiceIds.length || navState.customOptionCount || 0;
  const tier = LOYALTY_TIERS[getRewardsSummary(uid).currentTier] || LOYALTY_TIERS.Unranked;
  const pointsEarned = calculateBookingPoints(pkg.name, customOptionCount, hasMembership, tier.multiplier);

  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<PaymentSuccessInfo | null>(null);
  // Staff need a number to reach the customer; Google sign-ups don't have one yet
  const accountPhone = profile.phoneNumber || currentUser?.phoneNumber || '';
  const [phonePrompt, setPhonePrompt] = useState<{ continueToPay: boolean } | null>(null);

  // Opens Paystack straight away; the booking is saved once the payment goes through
  const handleProceedToPayment = async (saved?: { name: string; phone: string }) => {
    if (!date) {
      showToast('Please select an appointment date to continue', 'error');
      return;
    }
    if (startHour === null) {
      showToast('Please select an appointment time slot to continue', 'error');
      return;
    }
    if (serviceType === 'Call-out' && (!streetAddress.trim() || !city.trim())) {
      showToast('Please add the street address and suburb for the call-out', 'error');
      return;
    }
    if (!vehicle.trim()) {
      showToast('Please add your vehicle so the team knows which car to wash', 'error');
      return;
    }
    if (!uid || !currentUser?.email) {
      showToast('Please sign in again to book.', 'error');
      return;
    }
    const phone = saved?.phone || accountPhone;
    if (!phone) {
      setPhonePrompt({ continueToPay: true });
      return;
    }

    setPaying(true);
    try {
      const result = await payAndBook(
        {
          customer: {
            uid,
            name: saved?.name || profile.fullName || currentUser.displayName || 'Customer',
            email: currentUser.email,
            phone,
          },
          pkg,
          serviceType,
          date,
          startHour,
          workHours,
          time,
          address: serviceType === 'Call-out' ? `${streetAddress.trim()}, ${city.trim()}` : '',
          vehicle: `${vehicle.trim()}${plate.trim() ? ` (${plate.trim()})` : ''}`,
          notes: notes.trim(),
          total,
          breakdown: { packagePrice: pkg.price, callOutFee, discount, vat },
          customOptionCount,
          pointsEarned,
          voucher: voucherResult?.applies ? voucher : null,
        },
        addNotification
      );
      if (result.kind === 'slot_taken') {
        showToast('Sorry, that time was just taken. Pick another time; nothing was charged.', 'error');
        setStartHour(null);
      } else if (result.kind === 'cancelled') {
        showToast('Payment cancelled. Nothing was charged.', 'error');
      } else {
        showToast(`Payment of ${fmt(total)} confirmed! +${pointsEarned} reward points added.`, 'success');
        setSuccess({
          itemName: pkg.name,
          amount: fmt(total),
          paymentType: 'appointment',
          appointmentDate: result.appointment.date,
          appointmentTime: result.appointment.time,
          reference: result.appointment.id,
        });
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not complete the payment. Please try again.', 'error');
    } finally {
      setPaying(false);
    }
  };

  const displayDate = date
    ? new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Not selected';
  const displayTime = time || 'Not selected';

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards text-[#F5F5F5]">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => navigate('/dashboard/customer/packages')}
          className="flex items-center gap-1.5 text-sm text-[#E86A33] hover:opacity-80 transition-opacity w-fit mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Packages
        </button>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ────────── LEFT: form ────────────────────────────────── */}
        <div className="flex-[2] flex flex-col gap-5">

          {/* Selected package pill */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-[#171717]"
            style={{ borderColor: `${pkg.accentColor}30` }}
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${pkg.accentColor}18`, color: pkg.accentColor }}
            >
              {PKG_ICON[pkg.id] ?? <Wand2 className="w-4 h-4" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#F5F5F5]">{pkg.name}</p>
              <p className="text-xs text-[#71717A]">Duration: {formatDuration(pkg.durationMinutes)}</p>
            </div>
            <span className="font-bold text-[#F5F5F5] text-sm">{fmt(pkg.price)}</span>
            <button
              onClick={() => navigate('/dashboard/customer/packages')}
              className="text-xs underline text-[#E86A33] hover:opacity-75 transition-opacity shrink-0"
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
                min={toIsoDate(new Date())}
                onChange={(e) => {
                  setDate(e.target.value);
                  setStartHour(null);
                }}
                icon={<Calendar className="w-5 h-5" />}
                className={inputCls}
                labelClassName={labelCls}
                iconClassName={iconCls}
              />
              {/* Time slot picker */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-soft-gray ml-1">Select Time</label>
                <TimeSlotPicker
                  date={date}
                  type={workTypeForService(serviceType)}
                  workHours={workHours}
                  value={startHour}
                  onChange={setStartHour}
                />
              </div>
            </div>
          </SectionCard>

          {/* Service Type (Call-out vs Drive-in) */}
          <SectionCard title="Service Type">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setServiceType('Call-out'); setStartHour(null); }}
                className={`flex flex-col gap-1.5 p-4 rounded-xl border text-left transition-all ${
                  serviceType === 'Call-out'
                    ? 'bg-[#E86A33]/10 border-[#E86A33] text-[#F5F5F5]'
                    : 'bg-[#101010] border-[#2C2C2C] text-[#A1A1AA] hover:border-[#E86A33]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[#F5F5F5]">Call-out</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#E86A33]/20 text-[#E86A33] font-medium">Mobile Service</span>
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  We come directly to your home or office address.
                </p>
              </button>

              <button
                type="button"
                onClick={() => { setServiceType('Drive-in'); setStartHour(null); }}
                className={`flex flex-col gap-1.5 p-4 rounded-xl border text-left transition-all ${
                  serviceType === 'Drive-in'
                    ? 'bg-[#E86A33]/10 border-[#E86A33] text-[#F5F5F5]'
                    : 'bg-[#101010] border-[#2C2C2C] text-[#A1A1AA] hover:border-[#E86A33]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[#F5F5F5]">Drive-in</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#35B86B]/20 text-[#35B86B] font-medium">Wash Bay</span>
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Bring your vehicle directly to our wash bay facility.
                </p>
              </button>
            </div>

            {serviceType === 'Call-out' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <Input
                  label="Street Address"
                  placeholder="e.g. 123 Main Street"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  icon={<MapPin className="w-5 h-5" />}
                  className={inputCls}
                  labelClassName={labelCls}
                  iconClassName={iconCls}
                  required
                />
                <Input
                  label="City / Suburb"
                  placeholder="e.g. Cape Town"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputCls}
                  labelClassName={labelCls}
                  iconClassName={iconCls}
                  required
                />
              </div>
            )}
          </SectionCard>

          {/* Vehicle details */}
          <SectionCard title="Vehicle Details">
            <div className="flex flex-col gap-4">
              {/* Saved Vehicles Quick Select */}
              {savedVehicles.length > 0 && (
                <div className="flex flex-col gap-2 pb-2 border-b border-[#2C2C2C]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                    Select a Saved Vehicle
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {savedVehicles.map((v) => {
                      const isSelected = selectedVehicleId === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleSelectSavedVehicle(v.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-[#E86A33]/15 border-[#E86A33] text-[#F5F5F5]'
                              : 'bg-[#101010] border-[#2C2C2C] text-[#A1A1AA] hover:border-[#3C3C3C] hover:text-[#F5F5F5]'
                          }`}
                        >
                          <Car className="w-3.5 h-3.5 text-[#E86A33]" />
                          <span>
                            {v.make} {v.model}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1F1F1F] text-[#F5F5F5] border border-[#2C2C2C]">
                            {v.plate}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => handleSelectSavedVehicle('custom')}
                      className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                        selectedVehicleId === 'custom'
                          ? 'bg-[#E86A33]/15 border-[#E86A33] text-[#F5F5F5]'
                          : 'bg-[#101010] border-[#2C2C2C] text-[#71717A] hover:text-[#F5F5F5]'
                      }`}
                    >
                      Other / Manual Entry
                    </button>
                  </div>
                </div>
              )}

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
          {/* Rewards: vouchers bought with points */}
          <SectionCard title="Rewards">
            <div className="flex items-center justify-between gap-3 -mt-1">
              <span className="text-sm text-[#A1A1AA]">
                You have <span className="font-semibold text-[#F5F5F5]">{pointsBalance} points</span>
              </span>
              <button
                type="button"
                onClick={() => navigate('/dashboard/customer/rewards')}
                className="text-xs text-[#E86A33] hover:underline cursor-pointer"
              >
                Get more rewards
              </button>
            </div>

            {vouchers.length === 0 ? (
              <p className="text-xs text-[#71717A] leading-relaxed">
                No vouchers yet. Spend your points on a reward on the Rewards page and it shows up here to use on a booking.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {vouchers.map(({ voucher: v, result }) => {
                  const applied = voucher?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                        applied ? 'border-[#35B86B]/50 bg-[#35B86B]/[0.06]' : 'border-[#2C2C2C] bg-[#101010]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#F5F5F5] truncate">{v.rewardTitle}</p>
                        <p className="text-[11px] text-[#71717A]">
                          <span className="font-mono">{v.voucherCode}</span>
                          {result.applies ? ` · saves ${fmt(result.discountAmount)}` : ` · ${result.reason || 'Not valid for this package'}`}
                        </p>
                      </div>
                      {applied ? (
                        <button
                          type="button"
                          onClick={() => setChosenVoucherId(null)}
                          className="text-xs font-semibold text-[#A1A1AA] hover:text-red-400 cursor-pointer"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!result.applies}
                          onClick={() => setChosenVoucherId(v.id)}
                          className="text-xs font-semibold text-[#E86A33] hover:underline cursor-pointer disabled:text-[#3C3C3C] disabled:no-underline disabled:cursor-not-allowed"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                  );
                })}
                <p className="text-[11px] text-[#71717A]">One voucher per booking. A voucher you don't use stays on your account.</p>
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyVoucherCode()}
                placeholder="Have a voucher code?"
                className="flex-1 min-w-0 bg-[#101010] border border-[#2C2C2C] rounded-lg px-3 h-10 text-sm text-[#F5F5F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#E86A33] font-mono uppercase"
                aria-label="Voucher code"
              />
              <Button variant="outline" type="button" onClick={applyVoucherCode} className="!py-0 h-10 px-4 text-xs !border-[#2C2C2C]">
                Apply code
              </Button>
            </div>
          </SectionCard>
        </div>

        {/* ────────── RIGHT: summary ───────────────────────────── */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4">
          {!accountPhone && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col gap-2.5">
              <p className="text-sm font-semibold text-[#F5F5F5]">Your account is missing a phone number</p>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">Our team uses it to reach you about your wash, for example if they're running late.</p>
              <button
                type="button"
                onClick={() => setPhonePrompt({ continueToPay: false })}
                className="self-start text-xs font-semibold text-[#E86A33] hover:underline cursor-pointer"
              >
                Add phone number
              </button>
            </div>
          )}
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 flex flex-col gap-5 sticky top-24 shadow-lg relative overflow-hidden">
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E86A33] via-[#E86A33]/50 to-transparent" />

            <div className="flex items-center justify-between border-b border-[#2C2C2C] pb-3">
              <h3 className="text-[15px] font-semibold font-display text-[#F5F5F5] tracking-tight">
                Booking Summary
              </h3>
              {pointsEarned > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#35B86B]/15 text-[#35B86B] border border-[#35B86B]/30">
                  <Award className="w-3 h-3" />
                  +{pointsEarned} pts
                </span>
              )}
            </div>

            {/* Package block */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-widest text-[#71717A] font-semibold">Package</span>
              <div className="flex items-center justify-between mt-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: `${pkg.accentColor}18`, color: pkg.accentColor }}
                  >
                    {PKG_ICON[pkg.id] ?? <Wand2 className="w-4 h-4" />}
                  </span>
                  <span className="font-semibold text-[#F5F5F5] text-sm">{pkg.name}</span>
                </div>
                <span className="font-bold text-[#F5F5F5] text-sm">{fmt(pkg.price)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-[#71717A]">
                <Clock className="w-3.5 h-3.5 text-[#E86A33]" />
                Duration: {formatDuration(pkg.durationMinutes)}
              </div>
            </div>

            <div className="h-px bg-[#2C2C2C]" />

            {/* Date / Time */}
            <div className="flex flex-col gap-2.5">
              <SummaryRow label="Date" value={displayDate} />
              <SummaryRow label="Time" value={displayTime} />
            </div>

            <div className="h-px bg-[#2C2C2C]" />

            {/* Price breakdown */}
            <div className="flex flex-col gap-2.5">
              <SummaryRow label="Package Price" value={fmt(pkg.price)} />
              {discount > 0 && voucher && (
                <div className="flex items-center justify-between text-sm text-[#35B86B]">
                  <span className="truncate pr-2">{voucher.rewardTitle}</span>
                  <span className="font-semibold">-{fmt(discount)}</span>
                </div>
              )}
              {callOutFee > 0 && <SummaryRow label="Call-out Fee" value={fmt(callOutFee)} />}
              <SummaryRow label="Subtotal" value={fmt(subtotal)} />
              <SummaryRow label="VAT (15%)" value={fmt(vat)} />
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-[#2C2C2C]">
                <span className="font-bold text-[#F5F5F5]">Total</span>
                <span className="font-bold text-[#E86A33] text-lg">{fmt(total)}</span>
              </div>
            </div>

            {/* Included services */}
            <div className="bg-[#101010] border border-[#2C2C2C] rounded-xl p-4 flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#71717A] mb-0.5">
                Included
              </p>
              {pkg.includes.map((item: string) => (
                <div key={item} className="flex items-center gap-2 text-xs text-[#D4D4D4]">
                  <Check className="w-3.5 h-3.5 text-[#E86A33] shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            {/* CTA */}
            <Button variant="primary" fullWidth className="gap-2" onClick={() => handleProceedToPayment()} isLoading={paying} disabled={paying}>
              <CreditCard className="w-4 h-4" />
              Proceed to Payment
            </Button>

            <p className="flex items-start justify-center gap-1.5 text-[11px] text-center text-[#71717A] leading-relaxed">
              <Lock className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                Paystack opens to take your payment; we never see your card details.
                {paystackTestMode && ' Test mode: no real money moves.'}
              </span>
            </p>

            <p className="text-[11px] text-center text-[#71717A] leading-relaxed">
              By proceeding you agree to our{' '}
              <span className="text-[#E86A33] cursor-pointer hover:underline">
                cancellation policy
              </span>
              . VAT is included in all amounts.
            </p>
          </div>
        </div>

      </div>

      {phonePrompt && (
        <EditProfileModal
          initialName={profile.fullName || currentUser?.displayName || ''}
          initialPhone=""
          requirePhone
          subtitle="Add a phone number so our team can reach you about your wash"
          saveLabel={phonePrompt.continueToPay ? 'Save & continue to payment' : 'Save Details'}
          onClose={() => setPhonePrompt(null)}
          onSaved={(details) => {
            setProfile((p) => ({ ...p, fullName: details.name, phoneNumber: details.phone }));
            if (phonePrompt.continueToPay) handleProceedToPayment(details);
          }}
        />
      )}

      <PaymentSuccessModal
        open={success !== null}
        paymentInfo={success}
        onDone={() => navigate('/dashboard/customer/appointments')}
        doneText="View My Appointments"
      />
    </div>
  );
}

// ─── Summary row ──────────────────────────────────────────────────────────────
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#A1A1AA]">{label}</span>
      <span className="text-sm font-medium text-[#F5F5F5]">{value}</span>
    </div>
  );
}
