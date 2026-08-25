import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  prefixText?: string;
  labelClassName?: string;
  iconClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, prefixText, className = "", labelClassName = "", iconClassName = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full group/field">
        <label className={`text-sm font-medium text-[#52525B] dark:text-soft-gray ml-1 ${labelClassName}`}>
          {label}
        </label>
        <div className="relative">
          {icon && (
            <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-charcoal-700 group-focus-within/field:text-burnt-orange group-focus-within/field:drop-shadow-[0_0_8px_rgba(232,106,51,0.6)] transition-all duration-300 ${iconClassName}`}>
              {icon}
            </div>
          )}
          {prefixText && (
            <div className={`absolute ${icon ? "left-10" : "left-4"} top-1/2 -translate-y-1/2 font-medium text-[#18181B] dark:text-white`}>
              {prefixText}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full bg-white dark:bg-charcoal-900 border text-[#18181B] dark:text-white rounded-lg px-4 py-3
              outline-none transition-all duration-200 placeholder:text-[#9CA3AF] dark:placeholder:text-charcoal-600
              ${icon && prefixText ? "pl-[76px]" : icon ? "pl-10" : prefixText ? "pl-14" : ""}
              ${
                error
                  ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-[#CBD5E1] dark:border-charcoal-700 focus:border-burnt-orange focus:ring-1 focus:ring-burnt-orange"
              }
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
      </div>
    );
  },
);

Input.displayName = "Input";
