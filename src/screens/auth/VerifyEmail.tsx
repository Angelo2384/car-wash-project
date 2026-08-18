import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Mail, RefreshCw } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isResending, setIsResending] = useState(false);

  // We expect email and password to be passed via routing state
  // so we can re-authenticate to resend the verification email.
  const email = location.state?.email;
  const password = location.state?.password;

  const handleResend = async () => {
    if (!email || !password) {
      showToast("Session expired. Please log in again to resend the link.", "error");
      navigate('/auth/login');
      return;
    }

    setIsResending(true);
    try {
      // Re-authenticate briefly to resend
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/login`,
        handleCodeInApp: false
      };
      await sendEmailVerification(userCredential.user, actionCodeSettings);
      await signOut(auth);
      showToast("Verification email has been resent! Check your inbox and spam folder.", "success");
    } catch (error: any) {
      showToast("Failed to resend email. Please try logging in again.", "error");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full text-center">
      <div className="w-16 h-16 bg-burnt-orange/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <Mail className="w-8 h-8 text-burnt-orange" />
      </div>
      
      <h1 className="text-3xl font-bold font-display tracking-tight mb-4 text-white">Check Your Email</h1>
      
      <p className="text-soft-gray mb-8 leading-relaxed max-w-sm mx-auto">
        We've sent a verification link to <span className="text-white font-medium">{email || 'your email address'}</span>. 
        Please click the link to verify your account. Don't forget to check your spam folder!
      </p>

      <div className="space-y-4 max-w-sm mx-auto">


        {email && password && (
          <Button 
            type="button"
            onClick={handleResend}
            isLoading={isResending}
            fullWidth
            className="flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Resend Verification Link
          </Button>
        )}
      </div>

      <p className="mt-8 text-sm text-soft-gray">
        Already verified your account?{' '}
        <Link to="/auth/login" className="text-burnt-orange font-semibold hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
