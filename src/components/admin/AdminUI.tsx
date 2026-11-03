import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cardClass } from "./adminStyles";

/** Shared building blocks for the admin pages, styled like the customer dashboard. */


export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${cardClass} ${className}`}>{children}</div>;
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div className="flex flex-col gap-1 min-w-0">
        <h2 className="text-lg font-bold font-display text-[#F5F5F5]">{title}</h2>
        {subtitle && <p className="text-sm text-[#A1A1AA]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatTile({ label, value, hint, tone = "neutral" }: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "orange" | "amber" | "green" | "red";
}) {
  const toneClass = {
    neutral: "text-[#F5F5F5]",
    orange: "text-[#E86A33]",
    amber: "text-amber-400",
    green: "text-[#35B86B]",
    red: "text-red-400",
  }[tone];
  return (
    <Card className="p-5 flex flex-col gap-1.5">
      <span className="text-sm text-[#A1A1AA]">{label}</span>
      <span className={`text-3xl font-black font-display ${toneClass}`}>{value}</span>
      {hint && <span className="text-xs text-[#71717A]">{hint}</span>}
    </Card>
  );
}

export type BadgeTone = "neutral" | "orange" | "green" | "amber" | "red" | "blue";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "text-[#A1A1AA] bg-[#1F1F1F] border-[#2C2C2C]",
  orange: "text-[#E86A33] bg-[#E86A33]/10 border-[#E86A33]/30",
  green: "text-[#35B86B] bg-[#35B86B]/15 border-[#35B86B]/30",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  red: "text-red-400 bg-red-500/10 border-red-500/30",
  blue: "text-sky-400 bg-sky-500/10 border-sky-500/30",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-12 px-6">
      <p className="text-[15px] font-semibold text-[#F5F5F5]">{title}</p>
      {body && <p className="text-sm text-[#A1A1AA] max-w-md leading-relaxed">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-[#2C2C2C] overflow-x-auto overflow-y-hidden [scrollbar-width:none]" role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              active ? "text-[#E86A33] border-[#E86A33]" : "text-[#A1A1AA] border-transparent hover:text-[#F5F5F5]"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" && <span className="ml-1.5 text-[#71717A] font-medium">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Pill filter group, e.g. All / Bay / Mobile */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#101010] border border-[#2C2C2C]">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={o.id === value}
          className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
            o.id === value ? "bg-[#E86A33] text-white badge-solid" : "text-[#A1A1AA] hover:text-[#F5F5F5]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Rendered inside the dashboard wrapper's theme class via the portal target
  const target = document.querySelector("[data-dashboard-root]") ?? document.body;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className={`relative w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] flex flex-col ${cardClass} shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[#2C2C2C]">
          <div>
            <h2 className="text-lg font-bold font-display text-[#F5F5F5]">{title}</h2>
            {description && <p className="text-sm text-[#A1A1AA] mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.06] cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-[#2C2C2C] flex justify-end gap-3">{footer}</div>}
      </div>
    </div>,
    target
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[#D4D4D4]">{label}</span>
      {children}
      {hint && <span className="text-xs text-[#71717A]">{hint}</span>}
    </label>
  );
}





