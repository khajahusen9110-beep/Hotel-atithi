import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Utensils,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MailCheck,
  ShieldCheck,
  Smartphone,
  KeyRound,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  const { user, signUp, signInWithPassword, signInWithOtp, verifyOtp } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  // Tab mode: 'login' | 'signup' | 'otp'
  const [tab, setTab] = useState<'login' | 'signup' | 'otp'>(initialMode);

  // Signup form state
  const [signupForm, setSignupForm] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [signupTouched, setSignupTouched] = useState<Record<string, boolean>>({});
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [duplicateEmailError, setDuplicateEmailError] = useState<string | null>(null);

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // OTP form state (as fallback)
  const [otpPhone, setOtpPhone] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'token'>('phone');

  // General loading & confirmation states
  const [loading, setLoading] = useState(false);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // If already authenticated, redirect
  useEffect(() => {
    if (user) {
      navigate(redirectPath);
    }
  }, [user, navigate, redirectPath]);

  // Validation function for signup
  const validateField = (
    field: keyof typeof signupForm,
    value: string,
    allValues = signupForm
  ): string => {
    switch (field) {
      case 'fullName':
        if (!value.trim()) return 'Full name is required';
        return '';
      case 'mobileNumber': {
        const clean = value.replace(/\D/g, '');
        if (!clean) return 'Mobile number is required';
        if (clean.length !== 10) return 'Mobile number must be exactly 10 digits';
        return '';
      }
      case 'email': {
        const trimmed = value.trim();
        if (!trimmed) return 'Email address is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) return 'Please enter a valid email address';
        return '';
      }
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== allValues.password) return 'Passwords do not match';
        return '';
      default:
        return '';
    }
  };

  const handleSignupChange = (field: keyof typeof signupForm, value: string) => {
    const updated = { ...signupForm, [field]: value };
    setSignupForm(updated);
    setDuplicateEmailError(null);

    // Re-validate field if already touched
    if (signupTouched[field]) {
      const err = validateField(field, value, updated);
      setSignupErrors((prev) => ({ ...prev, [field]: err }));
    }

    // Also re-validate confirmPassword if password is changed
    if (field === 'password' && signupTouched.confirmPassword) {
      const confirmErr = validateField('confirmPassword', signupForm.confirmPassword, updated);
      setSignupErrors((prev) => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const handleSignupBlur = (field: keyof typeof signupForm) => {
    setSignupTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, signupForm[field]);
    setSignupErrors((prev) => ({ ...prev, [field]: err }));
  };

  // Submit Signup
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateEmailError(null);

    // Validate all fields
    const errors: Record<string, string> = {
      fullName: validateField('fullName', signupForm.fullName),
      mobileNumber: validateField('mobileNumber', signupForm.mobileNumber),
      email: validateField('email', signupForm.email),
      password: validateField('password', signupForm.password),
      confirmPassword: validateField('confirmPassword', signupForm.confirmPassword),
    };

    setSignupTouched({
      fullName: true,
      mobileNumber: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    setSignupErrors(errors);

    const hasError = Object.values(errors).some((err) => err.length > 0);
    if (hasError) {
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = signupForm.mobileNumber.replace(/\D/g, '');
      const trimmedEmail = signupForm.email.trim();
      const trimmedName = signupForm.fullName.trim();

      const { data, error } = await signUp({
        email: trimmedEmail,
        password: signupForm.password,
        fullName: trimmedName,
        mobileNumber: cleanPhone,
      });

      if (error) {
        const errorMsg = error.message || '';
        if (
          errorMsg.toLowerCase().includes('already registered') ||
          errorMsg.toLowerCase().includes('already exists') ||
          error.status === 422 ||
          error.code === 'user_already_exists'
        ) {
          setDuplicateEmailError('This email is already registered, please login instead.');
          return;
        }
        throw error;
      }

      // Supabase duplicate check when email confirmation is active:
      // data.user might be returned with an empty identities array if user already registered
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setDuplicateEmailError('This email is already registered, please login instead.');
        return;
      }

      // Check confirmation state:
      // If session is returned or user is already confirmed, user is authenticated
      if (data?.session) {
        success('Welcome to Hotel Atithi! Your account is ready.');
        navigate(redirectPath);
      } else if (data?.user) {
        // Email confirmation is required by Supabase Auth configuration
        setRegisteredEmail(trimmedEmail);
        setEmailConfirmationRequired(true);
        success('Registration successful! Please verify your email.');
      } else {
        // Fallback: switch to login
        success('Account created! Please sign in with your credentials.');
        setLoginForm({ email: trimmedEmail, password: '' });
        setTab('login');
      }
    } catch (err: any) {
      toastError(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const trimmedEmail = loginForm.email.trim();
    if (!trimmedEmail || !loginForm.password) {
      setLoginError('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signInWithPassword({
        email: trimmedEmail,
        password: loginForm.password,
      });

      if (error) {
        if (
          error.message?.toLowerCase().includes('invalid login credentials') ||
          error.message?.toLowerCase().includes('invalid credentials')
        ) {
          setLoginError('Invalid email or password. Please try again.');
        } else if (error.message?.toLowerCase().includes('email not confirmed')) {
          setLoginError(
            'Email not confirmed yet. Please check your inbox for the confirmation link.'
          );
        } else {
          setLoginError(error.message || 'Failed to sign in. Please try again.');
        }
        return;
      }

      if (data?.user || data?.session) {
        success('Welcome back to Hotel Atithi!');
        navigate(redirectPath);
      }
    } catch (err: any) {
      setLoginError(err?.message || 'An unexpected error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  // OTP Fallback handlers
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = otpPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      toastError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signInWithOtp(cleanPhone);
      if (error) throw error;
      success('OTP sent to your phone number!');
      setOtpStep('token');
    } catch (err: any) {
      toastError(err?.message || 'Failed to send OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpToken.length < 4) {
      toastError('Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = otpPhone.replace(/\D/g, '');
      const { error } = await verifyOtp(cleanPhone, otpToken);
      if (error) throw error;
      success('Welcome back to Hotel Atithi!');
      navigate(redirectPath);
    } catch (err: any) {
      toastError(err?.message || 'Invalid or expired OTP code');
    } finally {
      setLoading(false);
    }
  };

  // Switch to login tab and prefill email from duplicate error
  const handleSwitchToLoginWithEmail = (emailToUse: string) => {
    setLoginForm({ email: emailToUse, password: '' });
    setDuplicateEmailError(null);
    setTab('login');
  };

  // Render email confirmation notice
  if (emailConfirmationRequired) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <MailCheck className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="font-display font-bold text-2xl text-stone-900">
              Confirm Your Email
            </h1>
            <p className="text-sm text-stone-600">
              We have sent a verification link to:
            </p>
            <p className="font-bold text-amber-700 bg-amber-50 py-2 px-3 rounded-xl inline-block border border-amber-200/60 break-all text-sm">
              {registeredEmail}
            </p>
            <p className="text-xs text-stone-500 max-w-xs mx-auto pt-2">
              Please click the link in your email to activate your Hotel Atithi account, then sign in below.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              id="confirm-go-to-login-btn"
              type="button"
              onClick={() => {
                setLoginForm({ email: registeredEmail, password: '' });
                setEmailConfirmationRequired(false);
                setTab('login');
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-xs flex items-center justify-center gap-2 text-sm"
            >
              <span>Go to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              to="/"
              className="inline-block text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors"
            >
              Return to Restaurant Menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-sm">
            <Utensils className="w-6 h-6" />
          </div>
          <h1 className="font-display font-bold text-2xl text-stone-900">
            {tab === 'signup'
              ? 'Create Customer Account'
              : tab === 'login'
              ? 'Sign In to Hotel Atithi'
              : 'Mobile Phone Sign In'}
          </h1>
          <p className="text-xs text-stone-500 max-w-xs mx-auto">
            {tab === 'signup'
              ? 'Register to order pure veg dishes, track deliveries, and save addresses'
              : tab === 'login'
              ? 'Enter your email & password to access your account'
              : 'Enter your 10-digit mobile number for instant verification'}
          </p>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="flex rounded-2xl bg-stone-100 p-1 text-xs font-bold">
          <button
            id="auth-tab-login"
            type="button"
            onClick={() => {
              setTab('login');
              setDuplicateEmailError(null);
              setLoginError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              tab === 'login'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Sign In
          </button>
          <button
            id="auth-tab-signup"
            type="button"
            onClick={() => {
              setTab('signup');
              setDuplicateEmailError(null);
              setLoginError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              tab === 'signup'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Register
          </button>
        </div>

        {/* ---------------- REGISTRATION / SIGNUP FORM ---------------- */}
        {tab === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4 text-xs">
            {/* Duplicate email alert banner */}
            {duplicateEmailError && (
              <div
                id="signup-duplicate-alert"
                className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 animate-fadeIn"
              >
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-xs leading-relaxed">
                    {duplicateEmailError}
                  </p>
                  <button
                    id="signup-duplicate-switch-btn"
                    type="button"
                    onClick={() => handleSwitchToLoginWithEmail(signupForm.email)}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 underline"
                  >
                    <span>Click here to Sign In</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Field 1: Full Name */}
            <div>
              <label htmlFor="signup-fullname" className="block font-bold text-stone-700 mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                <input
                  id="signup-fullname"
                  type="text"
                  required
                  placeholder="Rahul Sharma"
                  value={signupForm.fullName}
                  onChange={(e) => handleSignupChange('fullName', e.target.value)}
                  onBlur={() => handleSignupBlur('fullName')}
                  className={`w-full pl-9 pr-3 py-3 rounded-2xl border text-stone-900 bg-stone-50 focus:bg-white focus:outline-none transition-all ${
                    signupTouched.fullName && signupErrors.fullName
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                      : 'border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                  }`}
                />
              </div>
              {signupTouched.fullName && signupErrors.fullName && (
                <p id="signup-fullname-error" className="text-rose-600 font-medium text-[11px] mt-1">
                  {signupErrors.fullName}
                </p>
              )}
            </div>

            {/* Field 2: Mobile Number */}
            <div>
              <label htmlFor="signup-mobile" className="block font-bold text-stone-700 mb-1.5">
                Mobile Number *
              </label>
              <div
                className={`flex rounded-2xl border bg-stone-50 focus-within:bg-white overflow-hidden transition-all ${
                  signupTouched.mobileNumber && signupErrors.mobileNumber
                    ? 'border-rose-300 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-200'
                    : 'border-stone-200 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20'
                }`}
              >
                <span className="flex items-center gap-1 px-3 bg-stone-100 border-r border-stone-200 text-stone-700 font-bold">
                  🇮🇳 +91
                </span>
                <input
                  id="signup-mobile"
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="9876543210"
                  value={signupForm.mobileNumber}
                  onChange={(e) =>
                    handleSignupChange('mobileNumber', e.target.value.replace(/\D/g, ''))
                  }
                  onBlur={() => handleSignupBlur('mobileNumber')}
                  className="flex-1 px-3 py-3 font-semibold text-stone-900 bg-transparent focus:outline-none"
                />
              </div>
              {signupTouched.mobileNumber && signupErrors.mobileNumber && (
                <p id="signup-mobile-error" className="text-rose-600 font-medium text-[11px] mt-1">
                  {signupErrors.mobileNumber}
                </p>
              )}
            </div>

            {/* Field 3: Email */}
            <div>
              <label htmlFor="signup-email" className="block font-bold text-stone-700 mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                <input
                  id="signup-email"
                  type="email"
                  required
                  placeholder="rahul@example.com"
                  value={signupForm.email}
                  onChange={(e) => handleSignupChange('email', e.target.value)}
                  onBlur={() => handleSignupBlur('email')}
                  className={`w-full pl-9 pr-3 py-3 rounded-2xl border text-stone-900 bg-stone-50 focus:bg-white focus:outline-none transition-all ${
                    (signupTouched.email && signupErrors.email) || duplicateEmailError
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                      : 'border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                  }`}
                />
              </div>
              {signupTouched.email && signupErrors.email && (
                <p id="signup-email-error" className="text-rose-600 font-medium text-[11px] mt-1">
                  {signupErrors.email}
                </p>
              )}
            </div>

            {/* Field 4: Password */}
            <div>
              <label htmlFor="signup-password" className="block font-bold text-stone-700 mb-1.5">
                Password (min 6 characters) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                <input
                  id="signup-password"
                  type={showSignupPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={signupForm.password}
                  onChange={(e) => handleSignupChange('password', e.target.value)}
                  onBlur={() => handleSignupBlur('password')}
                  className={`w-full pl-9 pr-10 py-3 rounded-2xl border text-stone-900 bg-stone-50 focus:bg-white focus:outline-none transition-all ${
                    signupTouched.password && signupErrors.password
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                      : 'border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                  }`}
                />
                <button
                  id="signup-toggle-password-visibility"
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 p-0.5"
                  aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                >
                  {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {signupTouched.password && signupErrors.password && (
                <p id="signup-password-error" className="text-rose-600 font-medium text-[11px] mt-1">
                  {signupErrors.password}
                </p>
              )}
            </div>

            {/* Field 5: Confirm Password */}
            <div>
              <label
                htmlFor="signup-confirm-password"
                className="block font-bold text-stone-700 mb-1.5"
              >
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                <input
                  id="signup-confirm-password"
                  type={showSignupConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={signupForm.confirmPassword}
                  onChange={(e) => handleSignupChange('confirmPassword', e.target.value)}
                  onBlur={() => handleSignupBlur('confirmPassword')}
                  className={`w-full pl-9 pr-10 py-3 rounded-2xl border text-stone-900 bg-stone-50 focus:bg-white focus:outline-none transition-all ${
                    signupTouched.confirmPassword && signupErrors.confirmPassword
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                      : 'border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                  }`}
                />
                <button
                  id="signup-toggle-confirm-password-visibility"
                  type="button"
                  onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 p-0.5"
                  aria-label={showSignupConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showSignupConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {signupTouched.confirmPassword && signupErrors.confirmPassword && (
                <p
                  id="signup-confirm-password-error"
                  className="text-rose-600 font-medium text-[11px] mt-1"
                >
                  {signupErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="signup-submit-button"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold transition-all shadow-xs flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Switch to Login */}
            <div className="text-center pt-1 text-stone-500">
              Already have an account?{' '}
              <button
                id="signup-switch-to-login"
                type="button"
                onClick={() => {
                  setTab('login');
                  setDuplicateEmailError(null);
                }}
                className="text-amber-600 font-bold hover:underline"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* ---------------- LOGIN FORM ---------------- */}
        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            {/* Login error banner */}
            {loginError && (
              <div
                id="login-error-alert"
                className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 animate-fadeIn"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="font-semibold text-xs leading-relaxed">{loginError}</p>
              </div>
            )}

            {/* Field 1: Email */}
            <div>
              <label htmlFor="login-email" className="block font-bold text-stone-700 mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoFocus
                  placeholder="rahul@example.com"
                  value={loginForm.email}
                  onChange={(e) => {
                    setLoginForm({ ...loginForm, email: e.target.value });
                    setLoginError(null);
                  }}
                  className="w-full pl-9 pr-3 py-3 rounded-2xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-900"
                />
              </div>
            </div>

            {/* Field 2: Password */}
            <div>
              <label htmlFor="login-password" className="block font-bold text-stone-700 mb-1.5">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                <input
                  id="login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="Your account password"
                  value={loginForm.password}
                  onChange={(e) => {
                    setLoginForm({ ...loginForm, password: e.target.value });
                    setLoginError(null);
                  }}
                  className="w-full pl-9 pr-10 py-3 rounded-2xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-900"
                />
                <button
                  id="login-toggle-password-visibility"
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 p-0.5"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold transition-all shadow-xs flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Switch to Signup */}
            <div className="text-center pt-1 text-stone-500">
              Don't have an account?{' '}
              <button
                id="login-switch-to-signup"
                type="button"
                onClick={() => {
                  setTab('signup');
                  setLoginError(null);
                }}
                className="text-amber-600 font-bold hover:underline"
              >
                Register
              </button>
            </div>

            {/* Alternative OTP Login Trigger */}
            <div className="pt-2 text-center">
              <button
                id="login-switch-to-otp"
                type="button"
                onClick={() => setTab('otp')}
                className="text-stone-400 hover:text-stone-600 font-medium inline-flex items-center gap-1.5 text-[11px]"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Or sign in with Phone OTP</span>
              </button>
            </div>
          </form>
        )}

        {/* ---------------- OPTIONAL PHONE OTP FORM ---------------- */}
        {tab === 'otp' && (
          <div className="space-y-4 text-xs">
            {otpStep === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label htmlFor="otp-phone-input" className="block font-bold text-stone-700 mb-1.5">
                    10-Digit Mobile Number
                  </label>
                  <div className="flex rounded-2xl border border-stone-200 bg-stone-50 focus-within:bg-white focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 overflow-hidden">
                    <span className="flex items-center gap-1 px-3 bg-stone-100 border-r border-stone-200 text-stone-700 font-bold">
                      🇮🇳 +91
                    </span>
                    <input
                      id="otp-phone-input"
                      type="tel"
                      required
                      maxLength={10}
                      autoFocus
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="flex-1 px-3 py-3 font-semibold text-stone-900 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  id="otp-send-button"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label htmlFor="otp-token-input" className="block font-bold text-stone-700 mb-1.5">
                    Enter 6-Digit OTP sent to +91 {otpPhone}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                    <input
                      id="otp-token-input"
                      type="text"
                      required
                      maxLength={6}
                      autoFocus
                      value={otpToken}
                      onChange={(e) => setOtpToken(e.target.value.trim())}
                      placeholder="123456"
                      className="w-full pl-10 pr-3 py-3 rounded-2xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-bold text-center tracking-widest text-base"
                    />
                  </div>
                </div>

                <button
                  id="otp-verify-button"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Verify & Continue</span>
                  )}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setOtpStep('phone')}
                    className="text-stone-500 hover:text-stone-800 font-semibold text-xs"
                  >
                    Change Number
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="text-amber-700 font-bold hover:underline text-xs"
                  >
                    Resend OTP
                  </button>
                </div>
              </form>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setTab('login')}
                className="text-amber-600 font-bold hover:underline text-xs"
              >
                Back to Email & Password Sign In
              </button>
            </div>
          </div>
        )}

        {/* Security badge footer */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-center gap-1.5 text-[11px] text-stone-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted connection • Hotel Atithi customer security</span>
        </div>
      </div>
    </div>
  );
};
