import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Utensils, Phone, KeyRound, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const { signInWithOtp, verifyOtp, user } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      navigate(redirectPath);
    }
  }, [user, navigate, redirectPath]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toastError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signInWithOtp(cleanPhone);
      if (error) throw error;
      success('OTP code sent to your mobile number!');
      setStep('otp');
    } catch (err: any) {
      toastError(err?.message || 'Failed to send OTP. Please verify number.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length < 4) {
      toastError('Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const { error } = await verifyOtp(cleanPhone, token);
      if (error) throw error;
      success('Welcome back to Hotel Atithi!');
      navigate(redirectPath);
    } catch (err: any) {
      toastError(err?.message || 'Invalid or expired OTP code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-sm">
            <Utensils className="w-6 h-6" />
          </div>
          <h1 className="font-display font-bold text-2xl text-stone-900">
            {step === 'phone' ? 'Sign In / Register' : 'Enter Verification Code'}
          </h1>
          <p className="text-xs text-stone-500 max-w-xs mx-auto">
            {step === 'phone'
              ? 'Enter your mobile number to receive a secure login OTP'
              : `We sent a one-time code to +91 ${phone}`}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1.5">
                Mobile Phone Number
              </label>
              <div className="flex rounded-2xl border border-stone-200 bg-stone-50 focus-within:bg-white focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 overflow-hidden">
                <span className="flex items-center gap-1 px-3 bg-stone-100 border-r border-stone-200 text-stone-700 font-bold">
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  className="flex-1 px-3 py-3 font-semibold text-stone-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <button
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
          <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1.5">
                Enter 6-Digit OTP
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  value={token}
                  onChange={(e) => setToken(e.target.value.trim())}
                  placeholder="123456"
                  className="w-full pl-10 pr-3 py-3 rounded-2xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-bold text-center tracking-widest text-base"
                />
              </div>
            </div>

            <button
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

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-stone-500 hover:text-stone-800 font-semibold"
              >
                Change Phone Number
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="text-amber-700 font-bold hover:underline"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        <div className="pt-2 border-t border-stone-100 flex items-center justify-center gap-1.5 text-[11px] text-stone-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>No password required • Instant OTP authentication</span>
        </div>
      </div>
    </div>
  );
};
