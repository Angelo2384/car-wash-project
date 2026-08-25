import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import { calculateCallOutFee } from '../../../lib/appointments';
import { useToast } from '../../../contexts/ToastContext';
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
} from 'lucide-react';

// ─── Package catalogue ────────────────────────────────────────────────────────
const PACKAGES: Record<string, { name: string; price: number; duration: string; accentColor: string }> = {
  express: { name: 'Express Wash',  price: 75,  duration: '20–30 min', accentColor: '#A1A1AA' },
  premium: { name: 'Premium Wash', price: 275, duration: '60–75 min', accentColor: '#E86A33' },
  elite:   { name: 'Elite Wash',   price: 875, duration: '2–3 hrs',   accentColor: '#35B86B' },
};

const PKG_ICON: Record<string, React.ReactNode> = {
  express: <Droplets className="w-4 h-4" />,
  premium: <Sparkles className="w-4 h-4" />,
  elite:   <ShieldCheck className="w-4 h-4" />,
};

const INCLUDED: Record<string, string[]> = {
  express: ['Exterior hand wash', 'Wheel rinse', 'Window wipe-down', 'Quick interior vacuum'],
  premium: ['Full exterior wash & dry', 'Interior vacuum & wipe-down', 'Tyre dressing & rim shine', 'Window clean (inside & out)', 'Air freshener finish'],
  elite:   ['Everything in Premium', 'Clay bar & paint correction', 'Ceramic coating application', 'Full leather conditioning', 'Engine bay clean'],
};

const VAT = 0.15;
function fmt(n: number) { return `R${n.toFixed(2)}`; }

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

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

  const [hasMembership, setHasMembership] = useState<boolean>(() => {
    if (!currentUser?.uid) return false;
    const cached = localStorage.getItem(`ww_has_membership_${currentUser.uid}`);
    return cached ? JSON.parse(cached) : false;
  });

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      if (snap.exists()) {
        const mem = snap.data()?.hasMembership === true;
        setHasMembership(mem);
        localStorage.setItem(`ww_has_membership_${currentUser.uid}`, JSON.stringify(mem));
      }
    });
    return () => unsub();
  }, [currentUser?.uid]);

  const packageId: string = (location.state as any)?.packageId ?? 'premium';
  const pkg = PACKAGES[packageId] ?? PACKAGES.premium;

  const [serviceType, setServiceType] = useState<'Call-out' | 'Drive-in'>('Call-out');
  const [streetAddress, setStreetAddress] = useState('123 Bree Street');
  const [city, setCity] = useState('Cape Town');

  const [date,    setDate]    = useState('');
  const [time,    setTime]    = useState('');
  const [plate,   setPlate]   = useState('');
  const [vehicle, setVehicle] = useState('');
  const [notes,   setNotes]   = useState('');

  const callOutFee = calculateCallOutFee(serviceType, hasMembership);
  const subtotal = pkg.price + callOutFee;
  const vat   = subtotal * VAT;
  const total = subtotal + vat;

  const handleProceedToPayment = () => {
    if (!date) {
      showToast('Please select an appointment date to continue', 'error');
      return;
    }
    if (!time) {
      showToast('Please select an appointment time slot to continue', 'error');
      return;
    }
    if (serviceType === 'Call-out' && !streetAddress.trim()) {
      showToast('Please provide an address for the call-out service', 'error');
      return;
    }

    navigate('/dashboard/customer/checkout', {
      state: {
        packageId,
        price: pkg.price,
        serviceType,
        streetAddress: serviceType === 'Call-out' ? streetAddress : '',
        city: serviceType === 'Call-out' ? city : '',
        date,
        time,
        plate,
        vehicle,
        notes,
      },
    });
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
        <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-[#F5F5F5]">
          Book Appointment
        </h2>
        <p className="text-[#A1A1AA] text-sm md:text-[15px]">
          Complete your booking details below
        </p>
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
              {PKG_ICON[packageId]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#F5F5F5]">{pkg.name}</p>
              <p className="text-xs text-[#71717A]">Duration: {pkg.duration}</p>
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
                onChange={(e) => setDate(e.target.value)}
                icon={<Calendar className="w-5 h-5" />}
                className={inputCls}
                labelClassName={labelCls}
                iconClassName={iconCls}
              />
              {/* Time slot picker */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-soft-gray ml-1">Select Time</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-medium border transition-all duration-150
                        ${time === slot
                          ? 'bg-[#E86A33] border-[#E86A33] text-white shadow-md shadow-[#E86A33]/20'
                          : 'bg-[#101010] border-[#2C2C2C] text-[#A1A1AA] hover:border-[#E86A33]/40 hover:text-[#F5F5F5]'
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

          {/* Service Type (Call-out vs Drive-in) */}
          <SectionCard title="Service Type">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setServiceType('Call-out')}
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
                onClick={() => setServiceType('Drive-in')}
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

        {/* ────────── RIGHT: summary ───────────────────────────── */}
        <div className="w-full lg:w-[320px] shrink-0">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-2xl p-6 flex flex-col gap-5 sticky top-24 shadow-lg relative overflow-hidden">
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E86A33] via-[#E86A33]/50 to-transparent" />

            <h3 className="text-[15px] font-semibold font-display text-[#F5F5F5] tracking-tight border-b border-[#2C2C2C] pb-3">
              Booking Summary
            </h3>

            {/* Package block */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-widest text-[#71717A] font-semibold">Package</span>
              <div className="flex items-center justify-between mt-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: `${pkg.accentColor}18`, color: pkg.accentColor }}
                  >
                    {PKG_ICON[packageId]}
                  </span>
                  <span className="font-semibold text-[#F5F5F5] text-sm">{pkg.name}</span>
                </div>
                <span className="font-bold text-[#F5F5F5] text-sm">{fmt(pkg.price)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-[#71717A]">
                <Clock className="w-3.5 h-3.5 text-[#E86A33]" />
                Duration: {pkg.duration}
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
              {INCLUDED[packageId]?.map((item: string) => (
                <div key={item} className="flex items-center gap-2 text-xs text-[#D4D4D4]">
                  <Check className="w-3.5 h-3.5 text-[#E86A33] shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            {/* CTA */}
            <Button variant="primary" fullWidth className="gap-2" onClick={handleProceedToPayment}>
              <CreditCard className="w-4 h-4" />
              Proceed to Payment
            </Button>

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
