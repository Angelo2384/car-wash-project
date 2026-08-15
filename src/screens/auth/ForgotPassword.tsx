import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
    }, 1500);
  };

  if (isSent) {
    return (
      <div className="w-full text-center py-6">
        <div className="w-16 h-16 bg-reward-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-reward-green" />
        </div>
        <h1 className="text-2xl font-bold font-display tracking-tight mb-3 text-white">Check your email</h1>
        <p className="text-soft-gray text-sm mb-8 leading-relaxed px-4">
          We've sent password reset instructions. Please check your inbox and spam folder.
        </p>
        <Link to="/auth/login">
          <Button fullWidth variant="outline" className="border-charcoal-700 hover:border-charcoal-600">
            Return to Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-10 text-center relative">
        <Link to="/auth/login" className="absolute left-0 top-1/2 -translate-y-1/2 text-soft-gray hover:text-white transition-colors p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold font-display tracking-tight mb-2 text-white">Reset Password</h1>
        <p className="text-soft-gray text-sm">We'll send you instructions to reset it.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input 
          label="Email Address"
          type="email"
          placeholder="Enter your email"
          icon={<Mail className="w-5 h-5" />}
          required
        />
        
        <Button type="submit" fullWidth isLoading={isLoading}>
          Send Instructions
        </Button>
      </form>
    </div>
  );
}
