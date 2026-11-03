import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { activePackages, formatDuration, formatRand, type ServiceItem } from '../../../lib/business';
import { useServices } from '../../../hooks/useOperations';
import {
  Check,
  Clock,
  Droplets,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  Wand2,
  Star,
} from 'lucide-react';

// ─── Package data (from the admin's Services & Business catalogue) ───────────
type PackageCardData = {
  id: string;
  name: string;
  price: string;
  tagline: string;
  description: string;
  duration: string;
  badge: string | null;
  accentColor: string;
  services: string[];
  icon: React.ReactNode;
};

const ACCENTS: Record<string, string> = { express: '#A1A1AA', premium: '#E86A33', elite: '#35B86B' };
const ICONS: Record<string, React.ReactNode> = {
  express: <Droplets className="w-5 h-5" />,
  premium: <Sparkles className="w-5 h-5" />,
  elite: <ShieldCheck className="w-5 h-5" />,
};

function toCard(item: ServiceItem): PackageCardData {
  return {
    id: item.id,
    name: item.name,
    price: formatRand(item.price),
    tagline: item.tagline || '',
    description: item.description || '',
    duration: formatDuration(item.durationMinutes),
    badge: item.popular ? 'Most Popular' : null,
    accentColor: ACCENTS[item.id] ?? '#E86A33',
    services: item.includes,
    icon: ICONS[item.id] ?? <Sparkles className="w-5 h-5" />,
  };
}

// ─── Image placeholder ────────────────────────────────────────────────────────
function PackageImage({
  accent,
  icon,
}: {
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="w-full h-40 rounded-xl flex flex-col items-center justify-center gap-3 relative overflow-hidden"
      style={{ background: '#101010' }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: `${accent}15`, border: `1.5px solid ${accent}25` }}
      >
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <span className="text-[#71717A] text-[11px] font-medium tracking-wide uppercase">
        Car Wash Illustration
      </span>
    </div>
  );
}

// ─── Package card ─────────────────────────────────────────────────────────────
function PackageCard({
  pkg,
  onBook,
}: {
  pkg: PackageCardData;
  onBook: (id: string) => void;
}) {
  const isHighlighted = pkg.badge === 'Most Popular';

  return (
    <div
      className={`relative flex flex-col bg-[#171717] rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-lg
        ${
          isHighlighted
            ? 'border-2 border-[#E86A33]'
            : 'border border-[#2C2C2C] hover:border-[#3C3C3C]'
        }`}
    >
      {/* Top accent line */}
      {isHighlighted && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E86A33] via-[#E86A33]/50 to-transparent" />
      )}

      {/* Badge */}
      {pkg.badge && (
        <div
          className="absolute top-4 right-4 z-10 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-widest border"
          style={{
            background: `${pkg.accentColor}15`,
            color: pkg.accentColor,
            borderColor: `${pkg.accentColor}30`,
          }}
        >
          {pkg.badge}
        </div>
      )}

      {/* Image */}
      <div className="p-4 pb-0">
        <PackageImage accent={pkg.accentColor} icon={pkg.icon} />
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 gap-4 p-5">
        {/* Header */}
        <div>
          <h3 className="text-lg font-bold font-display text-[#F5F5F5] tracking-tight">
            {pkg.name}
          </h3>
          <p className="text-[#A1A1AA] text-xs mt-0.5">{pkg.tagline}</p>
        </div>

        {/* Description */}
        <p className="text-[#71717A] text-xs leading-relaxed">{pkg.description}</p>

        {/* Services */}
        <ul className="flex flex-col gap-1.5">
          {pkg.services.map((s) => (
            <li key={s} className="flex items-start gap-2 text-xs text-[#D4D4D4]">
              <span
                className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${pkg.accentColor}18` }}
              >
                <Check className="w-2.5 h-2.5" style={{ color: pkg.accentColor }} />
              </span>
              {s}
            </li>
          ))}
        </ul>

        {/* Duration & price */}
        <div className="flex items-center justify-between pt-3 border-t border-[#2C2C2C] mt-auto">
          <div className="flex items-center gap-1.5 text-[#A1A1AA] text-xs">
            <Clock className="w-3.5 h-3.5" style={{ color: pkg.accentColor }} />
            {pkg.duration}
          </div>
          <span
            className="text-2xl font-bold font-display"
            style={{ color: pkg.accentColor }}
          >
            {pkg.price}
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={() => onBook(pkg.id)}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{
            background: isHighlighted
              ? '#E86A33'
              : `${pkg.accentColor}15`,
            color: isHighlighted ? '#fff' : pkg.accentColor,
            border: isHighlighted ? 'none' : `1.5px solid ${pkg.accentColor}25`,
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
  const { items } = useServices();
  const packages = activePackages(items).map(toCard);

  const handleBook = (id: string) => {
    navigate('/dashboard/customer/booking', { state: { packageId: id } });
  };

  const handleCustomPackage = () => {
    navigate('/dashboard/customer/custom-package');
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards text-[#F5F5F5]">

      {/* Back nav */}
      <button
        onClick={() => navigate('/dashboard/customer/appointments')}
        className="flex items-center gap-1.5 text-sm text-[#E86A33] hover:opacity-80 transition-opacity w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Appointments
      </button>

      {/* Package cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {packages.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} onBook={handleBook} />
        ))}
      </div>

      {/* Custom package banner */}
      <div className="relative bg-[#171717] border border-[#2C2C2C] rounded-2xl p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 overflow-hidden shadow-lg">
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#E86A33] via-[#E86A33]/50 to-transparent" />

        <div className="flex flex-col gap-2 relative z-10 max-w-lg">
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="w-9 h-9 rounded-xl bg-[#E86A33]/10 border border-[#E86A33]/20 flex items-center justify-center">
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

          {/* Trust signals */}
          <div className="flex items-center gap-4 mt-2">
            {[
              { icon: <Star className="w-3.5 h-3.5" />, label: 'Fully customisable' },
              { icon: <Check className="w-3.5 h-3.5" />, label: 'Instant pricing' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-[#71717A]">
                <span className="text-[#E86A33]">{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 shrink-0">
          <Button
            variant="outline"
            onClick={handleCustomPackage}
            className="!border-[#2C2C2C] hover:!border-[#E86A33] hover:!text-[#E86A33]"
          >
            Create custom package
          </Button>
        </div>
      </div>

    </div>
  );
}
