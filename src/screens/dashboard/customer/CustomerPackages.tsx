import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Check, Clock, Droplets, Sparkles, Shield, ArrowLeft, Wand2 } from 'lucide-react';

// ─── Package data ────────────────────────────────────────────────────────────
const packages = [
  {
    id: 'express',
    name: 'Express Wash',
    price: 'R75',
    tagline: 'Quick clean, great results',
    description: 'A fast, efficient wash perfect for keeping your car looking fresh between deeper cleans.',
    duration: '20–30 min',
    badge: null,
    accentColor: '#A1A1AA',   // zinc-400 – subtle, entry-level
    services: [
      'Exterior hand wash',
      'Wheel rinse',
      'Window wipe-down',
      'Quick interior vacuum',
    ],
    icon: <Droplets className="w-6 h-6" />,
  },
  {
    id: 'premium',
    name: 'Premium Wash',
    price: 'R275',
    tagline: 'Our most popular choice',
    description: 'A thorough wash and detail that leaves your car spotless inside and out — our crowd favourite.',
    duration: '60–75 min',
    badge: 'Most Popular',
    accentColor: '#E86A33',   // burnt-orange – brand highlight
    services: [
      'Full exterior hand wash & dry',
      'Full interior vacuum & wipe-down',
      'Dashboard & console detail',
      'Tyre dressing & rim shine',
      'Window clean (inside & out)',
      'Air freshener finish',
    ],
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    id: 'elite',
    name: 'Elite Wash',
    price: 'R875',
    tagline: 'The full luxury treatment',
    description: 'A premium, concierge-level detail that restores your car to showroom condition, every time.',
    duration: '2–3 hrs',
    badge: 'Premium',
    accentColor: '#35B86B',   // reward-green – premium feel
    services: [
      'Everything in Premium Wash',
      'Paint decontamination & clay bar',
      'Machine polish & paint correction',
      'Ceramic coating application',
      'Full leather conditioning',
      'Engine bay clean',
      'Odour elimination treatment',
    ],
    icon: <Shield className="w-6 h-6" />,
  },
];

// ─── Placeholder image blocks with gradient + icon ───────────────────────────
function PackageImage({ accent, icon }: { accent: string; icon: React.ReactNode }) {
  return (
    <div
      className="w-full h-44 rounded-xl flex flex-col items-center justify-center gap-3 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, #1A1A1A 0%, #222 60%, ${accent}22 100%)` }}
    >
      {/* soft glow circle */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: `${accent}18`, border: `1.5px solid ${accent}30` }}
      >
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <span className="text-[#71717A] text-xs font-medium tracking-wide uppercase">
        Car Wash Illustration
      </span>
      {/* subtle shimmer strip */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 opacity-40"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
    </div>
  );
}

// ─── Single package card ──────────────────────────────────────────────────────
function PackageCard({
  pkg,
  onBook,
}: {
  pkg: (typeof packages)[0];
  onBook: (id: string) => void;
}) {
  const isHighlighted = pkg.badge === 'Most Popular';

  return (
    <div
      className={`relative flex flex-col bg-[#171717] rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl
        ${isHighlighted
          ? 'border-2 border-[#E86A33] shadow-[0_0_32px_rgba(232,106,51,0.12)]'
          : 'border border-[#2C2C2C] hover:border-[#3C3C3C]'
        }`}
    >
      {/* Badge */}
      {pkg.badge && (
        <div
          className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest"
          style={{
            background: `${pkg.accentColor}20`,
            color: pkg.accentColor,
            border: `1px solid ${pkg.accentColor}35`,
          }}
        >
          {pkg.badge}
        </div>
      )}

      {/* Image placeholder */}
      <div className="p-4 pb-0">
        <PackageImage accent={pkg.accentColor} icon={pkg.icon} />
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 gap-5 p-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold font-display text-[#F5F5F5] tracking-tight">
            {pkg.name}
          </h3>
          <p className="text-[#A1A1AA] text-sm">{pkg.tagline}</p>
        </div>

        {/* Description */}
        <p className="text-[#71717A] text-sm leading-relaxed">{pkg.description}</p>

        {/* Services list */}
        <ul className="flex flex-col gap-2">
          {pkg.services.map((service) => (
            <li key={service} className="flex items-start gap-2.5 text-sm text-[#D4D4D4]">
              <span
                className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${pkg.accentColor}20` }}
              >
                <Check className="w-2.5 h-2.5" style={{ color: pkg.accentColor }} />
              </span>
              {service}
            </li>
          ))}
        </ul>

        {/* Duration & Price */}
        <div className="flex items-center justify-between pt-4 border-t border-[#2C2C2C] mt-auto">
          <div className="flex items-center gap-1.5 text-[#A1A1AA] text-sm">
            <Clock className="w-4 h-4" style={{ color: pkg.accentColor }} />
            <span>{pkg.duration}</span>
          </div>
          <span className="text-2xl font-bold font-display" style={{ color: pkg.accentColor }}>
            {pkg.price}
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={() => onBook(pkg.id)}
          className="w-full py-3.5 rounded-xl font-semibold text-[15px] transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{
            background: isHighlighted
              ? 'linear-gradient(135deg, #E86A33, #cc5a2a)'
              : `${pkg.accentColor}15`,
            color: isHighlighted ? '#fff' : pkg.accentColor,
            border: isHighlighted ? 'none' : `1.5px solid ${pkg.accentColor}30`,
            boxShadow: isHighlighted ? '0 4px 24px rgba(232,106,51,0.25)' : 'none',
          }}
        >
          Book now
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CustomerPackages() {
  const navigate = useNavigate();

  const handleBook = (id: string) => {
    navigate('/dashboard/customer/booking', { state: { packageId: id } });
  };

  const handleCustomPackage = () => {
    navigate('/dashboard/customer/custom-package');
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">

      {/* Back nav */}
      <button
        onClick={() => navigate('/dashboard/customer/appointments')}
        className="flex items-center gap-2 text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors text-sm font-medium w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Appointments
      </button>

      {/* Page header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold font-display tracking-tight text-[#F5F5F5]">
          What Packages we offer
        </h2>
        <p className="text-[#A1A1AA] text-base">
          Choose the perfect package for your car
        </p>
      </div>

      {/* Package cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} onBook={handleBook} />
        ))}
      </div>

      {/* Custom package section */}
      <div className="relative rounded-2xl overflow-hidden border border-[#2C2C2C] bg-[#171717] p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Atmospheric glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 90% 50%, rgba(232,106,51,0.06), transparent 60%)',
          }}
        />

        <div className="flex flex-col gap-2 relative z-10 max-w-lg">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#E86A33]/10 border border-[#E86A33]/20 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-[#E86A33]" />
            </div>
            <h3 className="text-xl font-bold font-display text-[#F5F5F5]">
              Build your custom package
            </h3>
          </div>
          <p className="text-[#A1A1AA] text-sm leading-relaxed">
            Need something specific? Mix and match individual services to create a tailored
            wash plan that fits your car, your schedule, and your budget — priced on the fly.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <Button variant="outline" onClick={handleCustomPackage}>
            Create custom package
          </Button>
        </div>
      </div>

    </div>
  );
}
