// File: src/app/components/AuthForm.tsx
// Description: Interactive Sign-Up, Login, and Forgot-MPIN form with OTP verification and resend support.
// Author: Akilan M
// Created: 2026-08-13T11:27:00+05:30
// Updated: 2026-09-11

'use client';

import { useState } from 'react';
import { useAppDispatch } from '../services/hooks';
import { setCredentials } from '../services/authSlice';
import {
  signupUser,
  loginUser,
  verifyOtp,
  forgotMpin,
  resetMpin,
  resendOtp,
} from '../services/api';
import { Mail, User, Lock, AlertCircle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AuthFormProps {
  onSuccess?: () => void;
  defaultMode?: 'login' | 'signup';
}

type FormMode = 'login' | 'signup' | 'forgot';
type OtpFlowType = 'signup' | 'login' | 'reset_mpin';

/**
 * AuthForm handles login, signup, OTP verification, and forgot-MPIN reset flows.
 */
export default function AuthForm({ onSuccess, defaultMode = 'login' }: AuthFormProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [mode, setMode] = useState<FormMode>(defaultMode);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [mpin, setMpin] = useState('');

  const [otpStep, setOtpStep] = useState(false);
  const [otpType, setOtpType] = useState<OtpFlowType>('login');
  const [otpCode, setOtpCode] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [resetMpinStep, setResetMpinStep] = useState(false);
  const [newMpin, setNewMpin] = useState('');

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  /**
   * Switches between login and signup tabs and clears form state.
   */
  const handleModeSwitch = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setError(null);
    setInfo(null);
    setEmail('');
    setName('');
    setMpin('');
    setNewMpin('');
    setOtpCode('');
    setOtpStep(false);
    setResetMpinStep(false);
    router.push(newMode === 'login' ? '/login' : '/signup');
  };

  /**
   * Enters the forgot-MPIN flow from the login form.
   */
  const handleEnterForgot = () => {
    setMode('forgot');
    setError(null);
    setInfo(null);
    setMpin('');
    setOtpCode('');
    setNewMpin('');
    setOtpStep(false);
    setResetMpinStep(false);
  };

  /**
   * Submits login, signup, or forgot-MPIN email request.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email address is required.');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      setError(null);
      setInfo(null);
      try {
        const data = await forgotMpin(email);
        setOtpEmail(data.email || email);
        setOtpType('reset_mpin');
        setOtpStep(true);
        setInfo('If an account exists for this email, a verification code has been sent.');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to start MPIN reset. Please try again.';
        setError(message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!mpin || (mpin.length !== 4 && mpin.length !== 6)) {
      setError('MPIN must be a 4-digit or 6-digit number.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      let data;
      if (mode === 'signup') {
        if (!name.trim()) {
          setError('Name is required for sign up.');
          setLoading(false);
          return;
        }
        data = await signupUser(email, name, mpin);
      } else {
        data = await loginUser(email, mpin);
      }

      if (data.status === 'otp_required') {
        setOtpEmail(data.email || email);
        setOtpType(data.type || (mode === 'signup' ? 'signup' : 'login'));
        setOtpStep(true);
      } else if (data.user) {
        const expiresAt = data.expiresIn
          ? Date.now() + Number(data.expiresIn) * 1000
          : undefined;
        dispatch(setCredentials({ user: data.user, token: data.token, expiresAt }));
        setEmail('');
        setName('');
        setMpin('');
        setError(null);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifies OTP for login/signup, or advances forgot-MPIN to new-MPIN entry.
   */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    if (otpType === 'reset_mpin') {
      setResetMpinStep(true);
      setOtpStep(false);
      setError(null);
      setInfo('Enter your new MPIN to finish resetting.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await verifyOtp(otpEmail, otpCode, 'signup');
      const expiresAt = data.expiresIn
        ? Date.now() + Number(data.expiresIn) * 1000
        : undefined;
      dispatch(setCredentials({ user: data.user, token: data.token, expiresAt }));

      setEmail('');
      setName('');
      setMpin('');
      setOtpCode('');
      setOtpStep(false);
      setError(null);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid verification code. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Completes forgot-MPIN with OTP + new MPIN, then returns to login.
   */
  const handleResetMpinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMpin || (newMpin.length !== 4 && newMpin.length !== 6)) {
      setError('MPIN must be a 4-digit or 6-digit number.');
      return;
    }
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await resetMpin({ email: otpEmail, otp: otpCode, mpin: newMpin });
      setMode('login');
      setResetMpinStep(false);
      setOtpStep(false);
      setOtpCode('');
      setNewMpin('');
      setMpin('');
      setInfo('MPIN updated successfully. You can log in with your new MPIN.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to reset MPIN. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resends the current OTP email.
   */
  const handleResendOtp = async () => {
    setResendLoading(true);
    setError(null);
    try {
      await resendOtp(otpEmail, otpType === 'reset_mpin' ? 'reset_mpin' : 'signup');
      setInfo('A new verification code has been sent.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to resend code. Please try again.';
      setError(message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setOtpStep(false);
    setResetMpinStep(false);
    setOtpCode('');
    setNewMpin('');
    setError(null);
    setInfo(null);
    if (mode === 'forgot') {
      setMode('login');
    }
  };

  if (resetMpinStep) {
    return (
      <div className="w-full max-w-[420px] mx-auto glass-panel p-8 relative overflow-hidden transition-all duration-300">
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-accent/20 rounded-full blur-2xl pointer-events-none"></div>

        <div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-text-primary flex justify-center items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent animate-pulse" />
              <span>Set New MPIN</span>
            </h2>
            <p className="text-sm text-text-secondary mt-1 leading-relaxed">
              Choose a new 4 or 6-digit MPIN for <strong className="text-text-primary">{otpEmail}</strong>.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-status-red/10 border border-status-red/20 text-status-red p-3.5 rounded-sm text-sm mb-4 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {info && !error && (
            <div className="bg-accent/10 border border-accent/20 text-accent p-3.5 rounded-sm text-sm mb-4 animate-fade-in">
              {info}
            </div>
          )}

          <form onSubmit={handleResetMpinSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="auth-new-mpin" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">New MPIN</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="auth-new-mpin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  placeholder="••••••"
                  value={newMpin}
                  onChange={(e) => setNewMpin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 pl-10 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60 tracking-[4px] text-lg font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-accent text-white border-none rounded-sm py-3.5 font-bold cursor-pointer transition-all duration-300 hover:bg-accent-hover hover:scale-[1.02] flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(241,128,36,0.3)] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Update MPIN</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleBackToCredentials}
              className="w-full bg-transparent border border-white/8 hover:border-white/15 text-text-secondary hover:text-text-primary rounded-sm py-3 text-sm font-semibold cursor-pointer transition-all duration-300"
            >
              Back to Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (otpStep) {
    return (
      <div className="w-full max-w-[420px] mx-auto glass-panel p-8 relative overflow-hidden transition-all duration-300">
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-accent/20 rounded-full blur-2xl pointer-events-none"></div>

        <div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-text-primary flex justify-center items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent animate-pulse" />
              <span>{otpType === 'reset_mpin' ? 'Verify Reset Code' : 'Verify Email'}</span>
            </h2>
            <p className="text-sm text-text-secondary mt-1 leading-relaxed">
              We have sent a 6-digit verification code to <strong className="text-text-primary">{otpEmail}</strong>. Please enter the code to proceed.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-status-red/10 border border-status-red/20 text-status-red p-3.5 rounded-sm text-sm mb-4 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {info && !error && (
            <div className="bg-accent/10 border border-accent/20 text-accent p-3.5 rounded-sm text-sm mb-4 animate-fade-in">
              {info}
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="auth-otp" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Verification Code</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="auth-otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 pl-10 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60 tracking-[8px] text-xl font-black text-center"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-accent text-white border-none rounded-sm py-3.5 font-bold cursor-pointer transition-all duration-300 hover:bg-accent-hover hover:scale-[1.02] flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(241,128,36,0.3)] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>{otpType === 'reset_mpin' ? 'Continue' : 'Verify & Complete'}</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendLoading}
              className="w-full bg-transparent text-accent hover:text-accent-hover text-sm font-semibold cursor-pointer transition-all disabled:opacity-50"
            >
              {resendLoading ? 'Sending…' : 'Resend verification code'}
            </button>

            <button
              type="button"
              onClick={handleBackToCredentials}
              className="w-full bg-transparent border border-white/8 hover:border-white/15 text-text-secondary hover:text-text-primary rounded-sm py-3 text-sm font-semibold cursor-pointer transition-all duration-300"
            >
              Back to Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'forgot') {
    return (
      <div className="w-full max-w-[420px] mx-auto glass-panel p-8 relative overflow-hidden transition-all duration-300">
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-accent/20 rounded-full blur-2xl pointer-events-none"></div>

        <div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-text-primary flex justify-center items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent animate-pulse" />
              <span>Forgot MPIN</span>
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Enter your registered email and we will send a verification code to reset your MPIN.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-status-red/10 border border-status-red/20 text-status-red p-3.5 rounded-sm text-sm mb-4 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-forgot-email" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="auth-forgot-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 pl-10 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-accent text-white border-none rounded-sm py-3.5 font-bold cursor-pointer transition-all duration-300 hover:bg-accent-hover hover:scale-[1.02] flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(241,128,36,0.3)] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Send Reset Code</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleBackToCredentials}
              className="w-full bg-transparent border border-white/8 hover:border-white/15 text-text-secondary hover:text-text-primary rounded-sm py-3 text-sm font-semibold cursor-pointer transition-all duration-300"
            >
              Back to Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px] mx-auto glass-panel p-8 relative overflow-hidden transition-all duration-300">
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-accent/20 rounded-full blur-2xl pointer-events-none"></div>
      
      <div>
        <div className="flex border-b border-white/5 mb-6">
          <button
            type="button"
            onClick={() => handleModeSwitch('login')}
            className={`flex-1 pb-3 text-center font-bold text-lg cursor-pointer transition-all duration-300 ${
              mode === 'login'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('signup')}
            className={`flex-1 pb-3 text-center font-bold text-lg cursor-pointer transition-all duration-300 ${
              mode === 'signup'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-text-primary flex justify-center items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            <span>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</span>
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            {mode === 'login'
              ? 'Enter your registered email and MPIN to log in.'
              : 'Fill in your name, email, and choose a 4 or 6-digit MPIN.'}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-status-red/10 border border-status-red/20 text-status-red p-3.5 rounded-sm text-sm mb-4 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {info && !error && (
          <div className="bg-accent/10 border border-accent/20 text-accent p-3.5 rounded-sm text-sm mb-4 animate-fade-in">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="auth-name" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Your Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="auth-name"
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 pl-10 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-email" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="auth-email"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 pl-10 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-mpin" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">
              {mode === 'signup' ? 'Choose MPIN (4 or 6 digits)' : 'Enter MPIN'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="auth-mpin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                placeholder="••••••"
                value={mpin}
                onChange={(e) => setMpin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 pl-10 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60 tracking-[4px] text-lg font-bold"
              />
            </div>
          </div>

          {mode === 'login' && (
            <button
              type="button"
              onClick={handleEnterForgot}
              className="self-end text-xs text-accent hover:text-accent-hover font-semibold cursor-pointer bg-transparent border-none"
            >
              Forgot MPIN?
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-accent text-white border-none rounded-sm py-3.5 font-bold cursor-pointer transition-all duration-300 hover:bg-accent-hover hover:scale-[1.02] flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(241,128,36,0.3)] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>{mode === 'login' ? 'Log In' : 'Sign Up'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
