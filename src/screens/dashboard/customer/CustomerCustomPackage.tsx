import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import {
  ArrowLeft,
  Check,
  Clock,
  Droplets,
  Wind,
  Layers,
  Cpu,
  Sparkles,
  ShieldCheck,
  Brush,
  Zap,
  Star,
  Trash2,
  CreditCard,
  Package,
} from 'lucide-react';

// ─── Service catalogue ────────────────────────────────────────────────────────
type Category = 'All' | 'Exterior' | 'Interior' | 'Engine';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // minutes
  category: Exclude<Category, 'All'>;
  icon: React.ReactNode;
  popular?: boolean;
}

const SERVICES: Service[] = [
  // ── Exterior ──────────────────────────────────────────────────────────────
  {
    id: 'ext-hand-wash',
    name: 'Exterior Hand Wash',
    description: 'Full hand wash & rinse of all exterior panels.',
    price: 75,
    duration: 25,
    category: 'Exterior',
    icon: <Droplets className="w-5 h-5" />,
    popular: true,
  },
  {
    id: 'ext-tyre-dress',
    name: 'Tyre & Rim Dressing',
    description: 'Deep-clean rims and apply shine dressing to tyres.',
    price: 50,
    duration: 15,
    category: 'Exterior',
    icon: <Wind className="w-5 h-5" />,
  },
  {
    id: 'ext-clay-bar',
    name: 'Clay Bar Treatment',
    description: 'Removes bonded contaminants for a silky-smooth finish.',
    price: 120,
    duration: 30,
    category: 'Exterior',
    icon: <Layers className="w-5 h-5" />,
  },
  {
    id: 'ext-machine-polish',
    name: 'Machine Polish',
    description: 'Single-stage machine polish to remove light swirls.',
    price: 350,
    duration: 90,
    category: 'Exterior',
    icon: <Sparkles className="w-5 h-5" />,
    popular: true,
  },
  {
    id: 'ext-ceramic',
    name: 'Ceramic Coating',
    description: '9H ceramic coating for long-lasting paint protection.',
    price: 650,
    duration: 120,
    category: 'Exterior',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    id: 'ext-windows',
    name: 'Window Clean (Exterior)',
    description: 'Streak-free clean of all external glass surfaces.',
    price: 45,
    duration: 10,
    category: 'Exterior',
    icon: <Zap className="w-5 h-5" />,
  },
  // ── Interior ──────────────────────────────────────────────────────────────
  {
    id: 'int-vacuum',
    name: 'Full Interior Vacuum',
    description: 'Thorough vacuum of carpets, seats, and boot.',
    price: 60,
    duration: 20,
    category: 'Interior',
    icon: <Wind className="w-5 h-5" />,
    popular: true,
  },
  {
    id: 'int-dashboard',
    name: 'Dashboard & Console Detail',
    description: 'Wipe-down and condition of all interior hard surfaces.',
    price: 80,
    duration: 20,
    category: 'Interior',
    icon: <Brush className="w-5 h-5" />,
  },
  {
    id: 'int-leather',
    name: 'Leather Conditioning',
    description: 'Clean and condition all leather seats and surfaces.',
    price: 180,
    duration: 35,
    category: 'Interior',
    icon: <Star className="w-5 h-5" />,
  },
  {
    id: 'int-windows',
    name: 'Window Clean (Interior)',
    description: 'Streak-free clean of all interior glass surfaces.',
    price: 45,
    duration: 10,
    category: 'Interior',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: 'int-odour',
    name: 'Odour Elimination',
    description: 'Ozone or enzyme treatment to neutralise bad odours.',
    price: 150,
    duration: 30,
    category: 'Interior',
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    id: 'int-shampoo',
    name: 'Carpet & Seat Shampoo',
    description: 'Deep extraction shampoo for seats and floor carpets.',
    price: 220,
    duration: 50,
    category: 'Interior',
    icon: <Droplets className="w-5 h-5" />,
  },
  // ── Engine ────────────────────────────────────────────────────────────────
  {
    id: 'eng-rinse',
    name: 'Engine Bay Rinse',
    description: 'Light rinse and degrease of the engine compartment.',
    price: 120,
    duration: 25,
    category: 'Engine',
    icon: <Cpu className="w-5 h-5" />,
  },
  {
    id: 'eng-detail',
    name: 'Full Engine Detail',
    description: 'Full steam-clean and dress of all engine bay components.',
    price: 250,
    duration: 45,
    category: 'Engine',
    icon: <Layers className="w-5 h-5" />,
    popular: true,
  },
  {
    id: 'eng-protect',
    name: 'Engine Protectant Coat',
    description: 'Apply heat-resistant protectant to plastic and rubber.',
    price: 90,
    duration: 15,
    category: 'Engine',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
];

const CATEGORIES: Category[] = ['All', 'Exterior', 'Interior', 'Engine'];
const VAT = 0.15;

function fmt(n: number) {
  return `R${n.toFixed(2)}`;
}

function fmtDuration(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ─── Service card ─────────────────────────────────────────────────────────────
function ServiceCard({
  service,
  selected,
  onToggle,
}: {
  service: Service;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative text-left flex flex-col gap-3 p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5
        ${selected
          ? 'border-[#E86A33] bg-[#E86A33]/[0.07] shadow-[0_0_0_1px_rgba(232,106,51,0.25)]'
          : 'border-[#2C2C2C] bg-[#171717] hover:border-[#3C3C3C]'
        }`}
    >
      {/* Popular badge */}
      {service.popular && (
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#E86A33]/15 text-[#E86A33] border border-[#E86A33]/25">
          Popular
        </span>
      )}

      {/* Icon */}
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200 ${
          selected
            ? 'bg-[#E86A33]/20 text-[#E86A33]'
            : 'bg-[#1F1F1F] text-[#A1A1AA]'
        }`}
      >
        {service.icon}
      </div>

      {/* Text */}
      <div className="flex flex-col gap-1">
        <p className={`text-sm font-semibold leading-tight ${selected ? 'text-[#F5F5F5]' : 'text-[#D4D4D4]'}`}>
          {service.name}
        </p>
        <p className="text-xs text-[#71717A] leading-snug line-clamp-2">{service.description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#2C2C2C]">
        <div className="flex items-center gap-1 text-[#71717A] text-xs">
          <Clock className="w-3.5 h-3.5" />
          {fmtDuration(service.duration)}
        </div>
        <span className={`text-sm font-bold ${selected ? 'text-[#E86A33]' : 'text-[#F5F5F5]'}`}>
          {fmt(service.price)}
        </span>
      </div>

      {/* Check indicator */}
      {selected && (
        <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-[#E86A33] flex items-center justify-center shadow-md shadow-[#E86A33]/30">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CustomerCustomPackage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () =>
      activeCategory === 'All'
        ? SERVICES
        : SERVICES.filter((s) => s.category === activeCategory),
    [activeCategory],
  );

  const selectedServices = SERVICES.filter((s) => selected.has(s.id));
  const subtotal = selectedServices.reduce((acc, s) => acc + s.price, 0);
  const vatAmt   = subtotal * VAT;
  const total    = subtotal + vatAmt;
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => navigate('/dashboard/customer/packages')}
          className="flex items-center gap-1.5 text-sm text-[#E86A33] hover:opacity-80 transition-opacity w-fit mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Packages
        </button>
        <h2 className="text-2xl font-bold font-display tracking-tight text-[#F5F5F5]">
          Build Your Custom Package
        </h2>
        <p className="text-[#A1A1AA] text-sm">
          Select individual services and we'll build a tailored quote for you.
        </p>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ──────────────── LEFT: service catalogue ──────────────────────── */}
        <div className="flex-[2] flex flex-col gap-5">

          {/* Category filter tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold border transition-all duration-150
                  ${activeCategory === cat
                    ? 'bg-[#E86A33] border-[#E86A33] text-white shadow-md shadow-[#E86A33]/25'
                    : 'bg-[#171717] border-[#2C2C2C] text-[#A1A1AA] hover:border-[#3C3C3C] hover:text-[#F5F5F5]'
                  }`}
              >
                {cat}
                {cat !== 'All' && (
                  <span className="ml-1.5 text-[11px] opacity-60">
                    ({SERVICES.filter((s) => s.category === cat).length})
                  </span>
                )}
              </button>
            ))}

            {selected.size > 0 && (
              <button
                onClick={() => setSelected(new Set())}
                className="ml-auto flex items-center gap-1.5 text-xs text-[#71717A] hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear all
              </button>
            )}
          </div>

          {/* Service grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((svc) => (
              <ServiceCard
                key={svc.id}
                service={svc}
                selected={selected.has(svc.id)}
                onToggle={() => toggle(svc.id)}
              />
            ))}
          </div>
        </div>

        {/* ──────────────── RIGHT: summary sidebar ───────────────────────── */}
        <div className="w-full lg:w-[320px] shrink-0">
          <div className="bg-[#171717] border border-[#2C2C2C] rounded-xl p-6 flex flex-col gap-5 sticky top-24">

            {/* Summary header */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E86A33]/10 border border-[#E86A33]/20 flex items-center justify-center">
                <Package className="w-4 h-4 text-[#E86A33]" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-[#F5F5F5]">Custom Package</h3>
                <p className="text-xs text-[#71717A]">
                  {selected.size === 0
                    ? 'No services selected yet'
                    : `${selected.size} service${selected.size > 1 ? 's' : ''} selected`}
                </p>
              </div>
            </div>

            <div className="h-px bg-[#2C2C2C]" />

            {/* Selected services list */}
            {selected.size === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-[#1F1F1F] flex items-center justify-center mb-1">
                  <Sparkles className="w-5 h-5 text-[#3C3C3C]" />
                </div>
                <p className="text-sm text-[#71717A]">Select services from the left to build your package.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1 -mr-1">
                {selectedServices.map((svc) => (
                  <div
                    key={svc.id}
                    className="flex items-center justify-between gap-2 py-2 border-b border-[#2C2C2C] last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-[#E86A33]/15 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-[#E86A33]" />
                      </span>
                      <span className="text-xs text-[#D4D4D4] truncate">{svc.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-[#71717A]">{fmtDuration(svc.duration)}</span>
                      <span className="text-xs font-semibold text-[#F5F5F5]">{fmt(svc.price)}</span>
                      <button
                        onClick={() => toggle(svc.id)}
                        className="text-[#3C3C3C] hover:text-red-400 transition-colors"
                        aria-label={`Remove ${svc.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selected.size > 0 && (
              <>
                <div className="h-px bg-[#2C2C2C]" />

                {/* Duration */}
                <div className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
                  <Clock className="w-3.5 h-3.5 text-[#E86A33]" />
                  Estimated duration: <span className="font-medium text-[#F5F5F5]">{fmtDuration(totalDuration)}</span>
                </div>

                <div className="h-px bg-[#2C2C2C]" />

                {/* Price breakdown */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A1A1AA]">Subtotal</span>
                    <span className="text-[#F5F5F5] font-medium">{fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A1A1AA]">VAT (15%)</span>
                    <span className="text-[#F5F5F5] font-medium">{fmt(vatAmt)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-[#2C2C2C] mt-1">
                    <span className="font-bold text-[#F5F5F5]">Total</span>
                    <span className="font-bold text-[#E86A33] text-lg">{fmt(total)}</span>
                  </div>
                </div>
              </>
            )}

            {/* CTA */}
            <Button
              variant="primary"
              fullWidth
              disabled={selected.size === 0}
              onClick={() => navigate('/dashboard/customer/booking', { state: { packageId: 'custom', customServices: [...selected] } })}
              className="mt-1 gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Book Custom Package
            </Button>

            {selected.size === 0 && (
              <p className="text-[11px] text-center text-[#71717A]">
                Select at least one service to continue.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
