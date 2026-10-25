import React, { useState, useEffect } from 'react';
import { verifyOtpCode, resendOtp, getPendingOtpData } from '../utils/auth.js';
import { AuthUser } from '../types/auth.js';
import { toBengaliNumber } from '../utils/quizLogic.js';
import {
  ShieldCheck,
  Mail,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronLeft
} from 'lucide-react';

interface VerifyOtpPageProps {
  email: string;
  onSuccess: (user: AuthUser) => void;
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
}

export const VerifyOtpPage: React.FC<VerifyOtpPageProps> = ({
  email,
  onSuccess,
  onNavigateLogin,
  onNavigateHome
}) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [currentOtpData, setCurrentOtpData] = useState<{ otp: string; expiresAt: number } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(300); // 5 minutes

  // Read pending OTP on mount
  useEffect(() => {
    const data = getPendingOtpData();
    if (data && data.email === email) {
      setCurrentOtpData({ otp: data.otp, expiresAt: data.expiresAt });
      const remaining = Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }
  }, [email]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError('৬ ডিজিটের সঠিক ওটিপি কোড লিখুন।');
      return;
    }

    const res = verifyOtpCode(email, otp);
    if (res.success && res.user) {
      onSuccess(res.user);
    } else {
      setError(res.message);
    }
  };

  const handleResend = () => {
    setError(null);
    const res = resendOtp(email);
    if (res.success && res.otp) {
      setCurrentOtpData({ otp: res.otp, expiresAt: Date.now() + 5 * 60 * 1000 });
      setSecondsLeft(300);
      setInfoMessage('নতুন ওটিপি কোড জেনারেট করা হয়েছে!');
      setTimeout(() => setInfoMessage(null), 4000);
    } else {
      setError(res.message);
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="min-h-screen py-10 px-4 flex flex-col justify-center items-center">
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
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
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-200">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-extrabold" style={{ color: 'var(--text-main)' }}>
            ইমেইল ওটিপি ভেরিফিকেশন
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{email}</span> ঠিকানায় ৬ ডিজিটের কোড পাঠানো হয়েছে।
          </p>
        </div>

        {/* Demo Simulated Banner (Mandatory as per user instruction) */}
        {currentOtpData && (
          <div className="mb-5 p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 text-center animate-pulse">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
              ডেমো ওটিপি নোটিফিকেশন:
            </span>
            <div className="text-xl font-black text-[#6C5CE7] tracking-widest">
              Demo OTP: {currentOtpData.otp}
            </div>
            <p className="text-[10px] text-violet-600 dark:text-violet-300 mt-1 font-medium">
              (বাস্তব প্রোজেক্টে এটি EmailJS / Firebase দিয়ে সরাসরি জিমেইলে যাবে)
            </p>
          </div>
        )}

        {/* Info or Error Notices */}
        {infoMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{infoMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-main)' }}>
              ৬ ডিজিটের ওটিপি কোড:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                className="w-full pl-10 pr-4 py-3 rounded-xl border text-center text-lg font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 transition-all font-mono"
                style={{
                  backgroundColor: 'var(--bg)',
                  borderColor: 'var(--card-border)',
                  color: 'var(--text-main)'
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>মেয়াদ বাকি: {toBengaliNumber(timeFormatted)}</span>
            <button
              type="button"
              onClick={handleResend}
              className="font-bold text-[#6C5CE7] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>কোড পুনরায় পাঠান</span>
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
          >
            <span>ভেরিফাই ও লগইন করো</span>
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t text-center text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
          <button
            onClick={onNavigateLogin}
            className="font-bold text-[#6C5CE7] hover:underline cursor-pointer"
          >
            লগইন পেজে ফিরে যান
          </button>
        </div>
      </div>
    </div>
  );
};
