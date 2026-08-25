import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendEmailVerification, deleteUser } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { Mail, Lock, Eye, EyeOff, User, Phone, ArrowLeft } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function CustomerSignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    
    setIsLoading(true);
    try {
      // Prevent pre-registered staff from signing up as customers
      const staffQuery = query(
        collection(db, "pre_registered_staff"),
        where("email", "==", email.toLowerCase())
      );
      const staffDocs = await getDocs(staffQuery);

      if (!staffDocs.empty) {
        showToast("This email is registered for staff. Please use the Staff Activation page.", "error");
        setIsLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        fullName,
        email,
        phoneNumber,
        role: 'customer',
        hasMembership: false,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });

      const actionCodeSettings = {
        url: `${window.location.origin}/auth/login`,
        handleCodeInApp: false
      };
      await sendEmailVerification(userCredential.user, actionCodeSettings);
      await auth.signOut();

      navigate('/auth/verify-email', { state: { email, password } });
    } catch (err: any) {
      showToast(err.message || "Failed to create an account", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Prevent pre-registered staff from signing up via Google as customers
        const staffQuery = query(
          collection(db, "pre_registered_staff"),
          where("email", "==", user.email?.toLowerCase())
        );
        const staffDocs = await getDocs(staffQuery);

        if (!staffDocs.empty) {
          await deleteUser(user);
          showToast("This email is registered for staff. Please use the Staff Activation page.", "error");
          return;
        }

        await setDoc(userDocRef, {
          uid: user.uid,
          fullName: user.displayName || '',
          email: user.email,
          phoneNumber: user.phoneNumber || '',
          photoURL: user.photoURL || '',
          role: 'customer',
          hasMembership: false,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
        navigate('/dashboard/customer');
      } else {
        await setDoc(userDocRef, {
          lastLogin: serverTimestamp()
        }, { merge: true });
        
        const role = userDoc.data().role || 'customer';
        navigate(`/dashboard/${role}`);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to sign in with Google", "error");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8 text-center relative">
        <Link to="/auth/signup" className="absolute left-0 top-1/2 -translate-y-1/2 text-soft-gray hover:text-white transition-colors p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold font-display tracking-tight mb-2 text-white">Create Account</h1>
        <p className="text-soft-gray text-sm">Join WashWizzy for premium car care.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          label="Full Name"
          type="text"
          placeholder="e.g. Alex Driver"
          icon={<User className="w-5 h-5" />}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        
        <Input 
          label="Phone Number"
          type="tel"
          placeholder="Enter your phone number"
          icon={<Phone className="w-5 h-5" />}
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
          required
        />

        <Input 
          label="Email Address"
          type="email"
          placeholder="Enter your email"
          icon={<Mail className="w-5 h-5" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <div className="space-y-1">
          <div className="relative">
            <Input 
              label="Password"
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

        <Button type="submit" fullWidth isLoading={isLoading} className="mt-4">
          Complete Registration
        </Button>
      </form>

      <div className="mt-6 mb-6 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-charcoal-700/50"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-charcoal text-soft-gray/60 font-medium tracking-wider text-[10px]">
            OR CONTINUE WITH
          </span>
        </div>
      </div>

      <Button 
        type="button" 
        onClick={handleGoogleSignIn}
        variant="outline" 
        fullWidth 
        isLoading={isGoogleLoading}
        className="group border-charcoal-700/50 hover:border-charcoal-600 bg-charcoal-900/30"
      >
        <svg className="w-5 h-5 mr-2 opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign up with Google
      </Button>

      <p className="mt-6 text-center text-soft-gray text-sm">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-burnt-orange font-semibold hover:underline transition-all">
          Sign In
        </Link>
      </p>
    </div>
  );
}
