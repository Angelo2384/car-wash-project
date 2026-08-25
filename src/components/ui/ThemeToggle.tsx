import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  size?: number;
}

export default function ThemeToggle({ className = '', size = 18 }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <div className="relative inline-flex items-center justify-center">
      <button
        onClick={toggleTheme}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`p-2 rounded-xl text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E86A33]/50 active:scale-95 group ${className}`}
        aria-label={label}
        title={label}
      >
        <div className="relative w-5 h-5 flex items-center justify-center transition-transform duration-300 group-hover:rotate-45">
          {isDark ? (
            <Sun
              style={{ width: size, height: size }}
              className="text-[#A1A1AA] group-hover:text-[#E86A33] transition-colors"
            />
          ) : (
            <Moon
              style={{ width: size, height: size }}
              className="text-[#71717A] group-hover:text-[#E86A33] transition-colors"
            />
          )}
        </div>
      </button>

      {/* Accessible Floating Tooltip */}
      {(isHovered || isFocused) && (
        <div
          role="tooltip"
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 text-[11px] font-semibold text-[#F5F5F5] bg-[#1F1F1F] border border-[#2C2C2C] rounded-lg shadow-xl whitespace-nowrap pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {label}
          {/* Tooltip arrow */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1F1F1F] border-t border-l border-[#2C2C2C] rotate-45" />
        </div>
      )}
    </div>
  );
}
