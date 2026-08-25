import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function AuthLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center p-4 sm:p-8 font-sans overflow-hidden bg-charcoal-900">
      {/* Top right Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle size={18} />
      </div>

      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/images/login.png"
          alt="WashWizzy Background"
          className="w-full h-full object-cover mix-blend-luminosity opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal-900/80 via-charcoal-900/95 to-charcoal-900"></div>
        {/* Subtle orange accent glow */}
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-burnt-orange/10 rounded-full blur-[120px] -translate-y-1/2 mix-blend-screen"></div>
      </div>

      <div className="w-full max-w-[440px] relative z-10">
        {/* Logo outside card */}
        <div className="flex justify-center mb-4 mt-[-20px]">
          <Link to="/" className="inline-flex items-center group transition-transform hover:scale-105">
            <img
              src="/images/logo.png"
              alt="WashWizzy Logo"
              className="h-36 w-auto object-contain drop-shadow-2xl -mb-4"
            />
          </Link>
        </div>

        {/* Central Card */}
        <div className="bg-charcoal/80 backdrop-blur-xl border border-charcoal-700/50 p-8 md:p-10 rounded-2xl shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Footer Links */}
        <div className="mt-8 text-center flex items-center justify-center gap-6 text-xs text-soft-gray font-medium">
          <Link to="/" className="hover:text-burnt-orange transition-colors">Return to Home</Link>
          <span className="w-1 h-1 rounded-full bg-charcoal-700"></span>
          <a href="#" className="hover:text-burnt-orange transition-colors">Privacy Policy</a>
          <span className="w-1 h-1 rounded-full bg-charcoal-700"></span>
          <a href="#" className="hover:text-burnt-orange transition-colors">Terms of Service</a>
        </div>
      </div>
    </div>
  );
}
