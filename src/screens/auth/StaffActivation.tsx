import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Hash, Info, ArrowLeft, Key } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function StaffActivation() {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getPasswordStrength = () => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  const strength = getPasswordStrength();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <div className="w-full">
      <div className="mb-8 text-center relative">
        <Link to="/auth/signup" className="absolute left-0 top-1/2 -translate-y-1/2 text-soft-gray hover:text-white transition-colors p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold font-display tracking-tight mb-2 text-white">Activate Account</h1>
      </div>

      <div className="bg-burnt-orange/10 border border-burnt-orange/30 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-[0_0_15px_rgba(232,106,51,0.1)]">
        <Info className="w-5 h-5 text-burnt-orange shrink-0 mt-0.5" />
        <p className="text-xs text-white/90 leading-relaxed font-medium">
          Your employee profile must be pre-registered by a WashWizzy administrator before activation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          label="Employee ID"
          type="text"
          placeholder="e.g. EMP-1234"
          icon={<Hash className="w-5 h-5" />}
          required
        />

        <Input 
          label="Work Email"
          type="email"
          placeholder="Enter registered email"
          icon={<Mail className="w-5 h-5" />}
          required
        />

        <Input 
          label="Access Code"
          type="text"
          placeholder="Enter access code"
          icon={<Key className="w-5 h-5" />}
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, ''))}
          required
        />
        
        <div className="space-y-1">
          <div className="relative">
            <Input 
              label="New Password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              icon={<Lock className="w-5 h-5" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[38px] text-soft-gray hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          {password && (
            <div className="flex gap-1 mt-2 px-1">
              {[1, 2, 3, 4].map((level) => (
                <div 
                  key={level} 
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    strength >= level * 25 
                      ? strength === 100 ? 'bg-reward-green' : strength >= 50 ? 'bg-burnt-orange' : 'bg-red-500'
                      : 'bg-charcoal-700'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="relative pt-1">
          <Input 
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            placeholder="Re-enter your password"
            icon={<Lock className="w-5 h-5" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-[42px] text-soft-gray hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <Button type="submit" fullWidth isLoading={isLoading} className="mt-6">
          Activate Account
        </Button>
      </form>

      <p className="mt-8 text-center text-soft-gray text-sm">
        Already activated?{' '}
        <Link to="/auth/login" className="text-burnt-orange font-semibold hover:underline transition-all">
          Sign In
        </Link>
      </p>
    </div>
  );
}
