import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import Tooltip from './Tooltip';

interface ThemeToggleProps {
  className?: string;
  size?: number;
}

export default function ThemeToggle({ className = '', size = 18 }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <Tooltip label={label}>
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-xl text-[#71717A] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E86A33]/50 active:scale-95 group ${className}`}
        aria-label={label}
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
    </Tooltip>
  );
}
