import { Link, useNavigate } from 'react-router-dom';
import { User, Briefcase, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function SignUpChoice() {
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-bold font-display tracking-tight mb-3 text-white">
          Join WashWizzy
        </h1>
        <p className="text-soft-gray text-sm">Select your account type to continue.</p>
      </div>

      <div className="space-y-4">
        {/* Customer Card */}
        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate('/auth/signup/customer')}
          className="w-full text-left bg-charcoal-900/50 border border-charcoal-700 hover:border-burnt-orange hover:shadow-[0_0_15px_rgba(232,106,51,0.15)] p-5 rounded-xl cursor-pointer transition-all duration-300 group flex items-center gap-5"
        >
          <div className="w-12 h-12 shrink-0 bg-charcoal-800 rounded-lg flex items-center justify-center group-hover:bg-burnt-orange/10 transition-colors">
            <User className="text-soft-gray group-hover:text-burnt-orange transition-colors w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white group-hover:text-burnt-orange transition-colors">Customer</h3>
            <p className="text-xs text-soft-gray mt-1 leading-relaxed">
              Book washes, track rewards, and manage your membership.
            </p>
          </div>
          <div className="text-soft-gray group-hover:text-burnt-orange transition-colors translate-x-0 group-hover:translate-x-1 duration-300">
            <ChevronRight className="w-5 h-5" />
          </div>
        </motion.button>

        {/* Staff Card */}
        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate('/auth/signup/staff')}
          className="w-full text-left bg-charcoal-900/50 border border-charcoal-700 hover:border-charcoal-500 p-5 rounded-xl cursor-pointer transition-colors group flex items-center gap-5"
        >
          <div className="w-12 h-12 shrink-0 bg-charcoal-800 rounded-lg flex items-center justify-center group-hover:bg-charcoal-700 transition-colors">
            <Briefcase className="text-soft-gray w-6 h-6 group-hover:text-white transition-colors" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">Staff Member</h3>
            <p className="text-xs text-soft-gray mt-1 leading-relaxed">
              Activate your work profile and manage assigned services.
            </p>
          </div>
          <div className="text-soft-gray group-hover:text-white transition-colors translate-x-0 group-hover:translate-x-1 duration-300">
            <ChevronRight className="w-5 h-5" />
          </div>
        </motion.button>
      </div>

      <p className="mt-8 text-center text-soft-gray text-sm">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-burnt-orange font-semibold hover:underline transition-all">
          Sign In
        </Link>
      </p>
    </div>
  );
}
