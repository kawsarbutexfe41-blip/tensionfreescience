import React, { useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from '../services/firebase.js';
import {
  loginUser,
  syncGoogleUserData,
  requestPhoneOtp,
  verifyPhoneOtpAndLogin,
  resendVerificationEmail
} from '../utils/auth.js';
import { AuthUser } from '../types/auth.js';
import {
  FlaskConical,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  KeyRound,
  Sparkles,
  Smartphone,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface LoginPageProps {
  onSuccess: (user: AuthUser) => void;
  onNavigateRegister: () => void;
  onNavigateForgotPassword: () => void;
  onNavigateHome: () => void;
  redirectMessage?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onNavigateRegister,
  onNavigateForgotPassword,
  onNavigateHome,
  redirectMessage
}) => {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');

  // Email login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);

  // Phone login state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [studentName, setStudentName] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [phoneCooldown, setPhoneCooldown] = useState(0);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);

  // Handle getRedirectResult on page load to complete redirect login
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          const user = await syncGoogleUserData(result.user);
          if (user) {
            onSuccess(user);
          }
        }
      })
      .catch((error: any) => {
        console.error('getRedirectResult error:', error);
        if (error.code === 'auth/unauthorized-domain') {
          setError('Domain not authorized in Firebase Console: tension-free-science.netlify.app');
        } else {
          setError(error.message || 'গুগল রিডাইরেক্ট লগইন সম্পন্ন করা যায়নি।');
        }
      });
  }, [onSuccess]);

  // Cooldown timer effect
  useEffect(() => {
    if (phoneCooldown <= 0) return;
    const timer = setInterval(() => {
      setPhoneCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [phoneCooldown]);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const timer = setInterval(() => {
      setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [emailCooldown]);

  // Handle standard email/password login
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessInfo(null);
    setIsLoading(true);

    try {
      const res = await loginUser(email, password);
      setIsLoading(false);
      if (res.success && res.user) {
        if (res.needsVerification) {
          setNeedsEmailVerification(true);
          setSuccessInfo(res.message);
        } else {
          onSuccess(res.user);
        }
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'লগইন করার সময় ত্রুটি দেখা দিয়েছে। আবার চেষ্টা করুন।');
    }
  };

  // Resend verification email to Gmail
  const handleResendVerificationEmail = async () => {
    if (emailCooldown > 0) return;
    setError(null);
    setIsLoading(true);
    try {
      const res = await resendVerificationEmail();
      setIsLoading(false);
      if (res.success) {
        setEmailCooldown(60);
        setSuccessInfo(res.message);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'ভেরিফিকেশন ইমেইল পাঠানো যায়নি।');
    }
  };

  // Handle direct Google single-click login with REAL popup and redirect fallback
  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessInfo(null);
    setIsPopupBlocked(false);
    setIsGoogleLoading(true);
    try {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const appUser = await syncGoogleUserData(result.user);
        setIsGoogleLoading(false);
        if (appUser) {
          onSuccess(appUser);
        } else {
          setError('Google অ্যাকাউন্ট থেকে তথ্য পাওয়া যায়নি।');
        }
      } catch (error: any) {
        if (
          error.code === 'auth/popup-blocked' ||
          error.code === 'auth/popup-closed-by-user' ||
          error.code === 'auth/cancelled-popup-request'
        ) {
          // Auto fallback to redirect
          console.log('Popup blocked, trying redirect...', error.code);
          setSuccessInfo('পপ-আপের পরিবর্তে Google লগইন পেজে রিডাইরেক্ট করা হচ্ছে...');
          await signInWithRedirect(auth, googleProvider);
        } else if (error.code === 'auth/unauthorized-domain') {
          throw new Error('Domain not authorized in Firebase Console');
        } else {
          throw error;
        }
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      console.error('Google login error:', err);
      if (err.message && err.message.includes('Domain not authorized')) {
        setError('Domain not authorized in Firebase Console: tension-free-science.netlify.app');
      } else {
        setError(err?.message || 'গুগল দিয়ে লগইন করতে সমস্যা হয়েছে।');
      }
    }
  };

  // Handle Google Login via Direct Redirect
  const handleGoogleRedirectLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      setIsGoogleLoading(false);
      setError(err?.message || 'Google রিডাইরেক্ট শুরু করা যায়নি।');
    }
  };

  // Handle Send Real Phone SMS OTP
  const handleSendPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (phoneCooldown > 0) return;

    setError(null);
    setSuccessInfo(null);
    setIsLoading(true);

    try {
      const res = await requestPhoneOtp(phoneNumber, 'recaptcha-container');
      setIsLoading(false);

      if (res.success) {
        setIsOtpSent(true);
        setPhoneCooldown(60);
        setSuccessInfo(res.message);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'মোবাইলে এসএমএস পাঠানো সম্ভব হয়নি।');
    }
  };

  // Handle Verify Real Phone OTP & Login
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await verifyPhoneOtpAndLogin(phoneNumber, phoneOtp, studentName);
      setIsLoading(false);

      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'ওটিপি যাচাই করা যায়নি।');
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 flex flex-col justify-center items-center">
      {/* Invisible Recaptcha Container for Firebase Phone Auth */}
      <div id="recaptcha-container"></div>

      {/* Back to Home Button */}
      <div className="w-full max-w-md mb-3 flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>হোমে ফিরে যাও</span>
        </button>
      </div>

      <div
        className="w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-xl animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--card-border)' }}
      >
        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-[#6C5CE7] text-white flex items-center justify-center mx-auto mb-2 shadow-lg shadow-indigo-200">
            <FlaskConical className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-main)' }}>
            Tension Free Science
          </h1>
          <p className="text-xs font-semibold text-[#6C5CE7] mt-0.5">
            ভয় নয়, বিজ্ঞান হবে সহজ
          </p>
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mt-2">
            শিক্ষার্থী লগইন
          </h2>
        </div>

        {/* Auth Method Tabs: Email vs Phone */}
        <div
          className="grid grid-cols-2 p-1 rounded-2xl border mb-5 gap-1"
          style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--card-border)' }}
        >
          <button
            type="button"
            onClick={() => {
              setAuthMethod('email');
              setError(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              authMethod === 'email'
                ? 'bg-[#6C5CE7] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#6C5CE7]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>ইমেইল দিয়ে লগইন</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMethod('phone');
              setError(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              authMethod === 'phone'
                ? 'bg-[#6C5CE7] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#6C5CE7]'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>ফোন নম্বর দিয়ে লগইন</span>
          </button>
        </div>

        {/* Redirect notice if redirected from exam */}
        {redirectMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{redirectMessage}</span>
          </div>
        )}

        {/* Success Notice */}
        {successInfo && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successInfo}</span>
          </div>
        )}

        {/* Needs Email Verification Notice with Resend button */}
        {needsEmailVerification && (
          <div className="mb-4 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-[#6C5CE7] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Gmail ইনবক্স চেক করুন</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  আপনার Gmail এ ভেরিফিকেশন লিংক পাঠানো হয়েছে। লিংক না পেলে স্প্যাম ফোল্ডার দেখুন।
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={emailCooldown > 0 || isLoading}
              onClick={handleResendVerificationEmail}
              className="w-full py-1.5 px-3 rounded-xl bg-[#6C5CE7] text-white font-bold text-xs hover:bg-[#5848df] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {emailCooldown > 0
                  ? `পুনরায় পাঠাতে অপেক্ষা করুন (${emailCooldown}s)`
                  : 'ভেরিফিকেশন ইমেইল পুনরায় পাঠান'}
              </span>
            </button>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-medium flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <span>{error}</span>
              {error.includes('Authorized domains') && typeof window !== 'undefined' && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900 text-[11px] text-slate-700 dark:text-slate-300 mt-2">
                  <p className="font-bold text-rose-600 dark:text-rose-400 mb-1">
                    অনুমোদন করার সহজ উপায় (Firebase Console):
                  </p>
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>Firebase Console এ <strong>gen-lang-client-0170019612</strong> প্রজেক্ট খুলুন।</li>
                    <li>Authentication &gt; Settings &gt; <strong>Authorized domains</strong> এ যান।</li>
                    <li>
                      <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        {window.location.hostname}
                      </code>{' '}
                      ডোমেইনটি 'Add domain' এ যুক্ত করে সেভ করুন।
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: EMAIL LOGIN */}
        {authMethod === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-main)' }}>
                ইমেইল এড্রেস:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                  পাসওয়ার্ড:
                </label>
                <button
                  type="button"
                  onClick={onNavigateForgotPassword}
                  className="text-xs font-semibold text-[#6C5CE7] hover:underline cursor-pointer"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-main)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                  aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  title={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-sm shadow-md shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'লগইন হচ্ছে...' : 'লগইন করো'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 2: PHONE NUMBER LOGIN */}
        {authMethod === 'phone' && (
          <div>
            {!isOtpSent ? (
              <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-main)' }}>
                    বাংলাদেশী মোবাইল নম্বর:
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="017XXXXXXXX বা +88017XXXXXXXX"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
                      style={{
                        backgroundColor: 'var(--bg)',
                        borderColor: 'var(--card-border)',
                        color: 'var(--text-main)'
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    মোবাইলে সরাসরি আসল SMS কোড পাঠানো হবে
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-[#6C5CE7] hover:bg-[#5848df] text-white font-bold text-sm shadow-md shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{isLoading ? 'কোড পাঠানো হচ্ছে...' : 'ওটিপি কোড পাঠান'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                      মোবাইল নম্বর:
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsOtpSent(false)}
                      className="text-xs font-bold text-[#6C5CE7] hover:underline cursor-pointer"
                    >
                      পরিবর্তন করুন
                    </button>
                  </div>
                  <div
                    className="px-3 py-2 rounded-xl border text-xs font-semibold text-slate-600 dark:text-slate-300"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--card-border)' }}
                  >
                    {phoneNumber}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-main)' }}>
                    এসএমএসে আসা ৬ ডিজিটের ওটিপি কোড:
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={phoneOtp}
                      onChange={(e) => setPhoneOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all font-mono"
                      style={{
                        backgroundColor: 'var(--bg)',
                        borderColor: 'var(--card-border)',
                        color: 'var(--text-main)'
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                    <span>এসএমএস চেক করুন</span>
                    <button
                      type="button"
                      disabled={phoneCooldown > 0 || isLoading}
                      onClick={() => handleSendPhoneOtp()}
                      className="font-bold text-[#6C5CE7] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{phoneCooldown > 0 ? `পুনরায় কোড (${phoneCooldown}s)` : 'পুনরায় কোড পাঠান'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-main)' }}>
                    তোমার নাম (নতুন শিক্ষার্থীর ক্ষেত্রে):
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="যেমন: তানভীর আহমেদ"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all"
                    style={{
                      backgroundColor: 'var(--bg)',
                      borderColor: 'var(--card-border)',
                      color: 'var(--text-main)'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isLoading ? 'যাচাই হচ্ছে...' : 'ভেরিফাই ও সরাসরি লগইন'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: 'var(--card-border)' }} />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="px-2 font-bold" style={{ backgroundColor: 'var(--card)', color: 'var(--text-muted)' }}>
              অথবা সরাসরি
            </span>
          </div>
        </div>

        {/* Direct Google Single-Click Login with Real Popup */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          className="w-full py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-main)' }}
        >
          {isGoogleLoading ? (
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.1 7.5 23 12 23z"
              />
            </svg>
          )}
          <span>{isGoogleLoading ? 'Google পপ-আপ খোলা হচ্ছে...' : 'Google দিয়ে সরাসরি লগইন করো'}</span>
        </button>

        {/* Popup Blocked Assistance Box */}
        {isPopupBlocked && (
          <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 text-xs space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">গুগল পপ-আপ উইন্ডোটি ব্লক হয়েছে</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-200 mt-0.5 leading-relaxed">
                  ব্রাউজার বা প্রিভিউ ফ্রেমের সিকিউরিটি সেটিং পপ-আপ ব্লক করেছে। নিচের যেকোনো একটি বিকল্প ব্যবহার করুন:
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <a
                href={typeof window !== 'undefined' ? window.location.href : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all text-center no-underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>নতুন ট্যাবে সম্পূর্ণ স্ক্রিনে খুলুন (প্রস্তাবিত)</span>
              </a>

              <button
                type="button"
                onClick={handleGoogleRedirectLogin}
                className="w-full py-2 px-3 rounded-xl border border-amber-400 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-100 font-bold text-xs hover:bg-amber-100/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>রিডাইরেক্ট পদ্ধতিতে লগইন চেষ্টা করুন</span>
              </button>
            </div>

            <p className="text-[10px] text-amber-700 dark:text-amber-300 border-t border-amber-200 dark:border-amber-800 pt-2">
              💡 অথবা ব্রাউজারের অ্যাড্রেস বারের ডানপাশে <strong>🚫 Pop-up Blocked</strong> আইকনে ক্লিক করে <strong>'Always allow pop-ups'</strong> দিয়ে আবার চেষ্টা করুন।
            </p>
          </div>
        )}

        {/* Register Prompt */}
        <div
          className="mt-4 pt-3 border-t text-center text-xs"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
        >
          <span>নতুন শিক্ষার্থী? </span>
          <button
            onClick={onNavigateRegister}
            className="font-bold text-[#6C5CE7] hover:underline cursor-pointer"
          >
            এখনই ফ্রি একাউন্ট তৈরি করো
          </button>
        </div>
      </div>
    </div>
  );
};
