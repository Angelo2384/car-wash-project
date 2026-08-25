import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', fullWidth, isLoading, className = '', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants: Record<string, string> = {
      primary: "bg-burnt-orange hover:bg-burnt-orange-dark text-white shadow-lg shadow-burnt-orange/20",
      secondary: "bg-charcoal-700 hover:bg-charcoal-800 text-white",
      outline: "border-2 border-charcoal-700 hover:border-charcoal-600 text-white bg-transparent",
      ghost: "text-soft-gray hover:text-white hover:bg-charcoal-800",
    };

    const sizing = "px-6 py-3.5 text-[15px]";
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizing} ${fullWidth ? 'w-full' : ''} ${className}`}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
