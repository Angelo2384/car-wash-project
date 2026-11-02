import { useState, type ReactNode } from "react";

type TooltipProps = {
  label: string;
  children: ReactNode;
  /** "center" sits under the middle; "end" lines up with the right edge (for items at the edge of the screen) */
  align?: "center" | "end";
  /** Hide the tooltip, e.g. while a dropdown from the same button is open */
  disabled?: boolean;
};

/**
 * Small floating label shown while hovering, used in the dashboard top bar.
 * It hides as soon as you press, and stays hidden until the pointer leaves.
 * (The wrapped control still has its own aria-label for screen readers.)
 */
export default function Tooltip({ label, children, align = "center", disabled = false }: TooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const show = isHovered && !isPressed && !disabled;

  const position = align === "end" ? "right-0" : "left-1/2 -translate-x-1/2";
  const arrowPosition = align === "end" ? "right-4" : "left-1/2 -translate-x-1/2";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onPointerDown={() => setIsPressed(true)}
    >
      {children}

      {show && (
        <div
          role="tooltip"
          className={`absolute top-full mt-2 ${position} px-2.5 py-1 text-[11px] font-semibold text-[#F5F5F5] bg-[#1F1F1F] border border-[#2C2C2C] rounded-lg shadow-xl whitespace-nowrap pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-150`}
        >
          {label}
          <div className={`absolute -top-1 ${arrowPosition} w-2 h-2 bg-[#1F1F1F] border-t border-l border-[#2C2C2C] rotate-45`} />
        </div>
      )}
    </div>
  );
}
