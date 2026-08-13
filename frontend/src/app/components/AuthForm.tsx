// File: src/app/components/AuthForm.tsx
// Description: Interactive Sign-Up & Login form with MPIN validation flow and visual success/error cues.
// Author: Akilan M
// Created: 2026-08-13T11:27:00+05:30

'use client';

import { useState } from 'react';
import { useAppDispatch } from '../services/hooks';
import { setCredentials } from '../services/authSlice';
import { signupUser, loginUser } from '../services/api';
import { Mail, User, Lock, AlertCircle, Sparkles } from 'lucide-react';

interface AuthFormProps {
  onSuccess?: () => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const dispatch = useAppDispatch();

  // Mode state: 'login' | 'signup'
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Form fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [mpin, setMpin] = useState('');

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Switch tabs
  const handleModeSwitch = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setError(null);
    setMpin('');
  };

  // Submit form (signup or login)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email address is required.');
      return;
    }
    if (!mpin || (mpin.length !== 4 && mpin.length !== 6)) {
      setError('MPIN must be a 4-digit or 6-digit number.');
      return;
    }

    setLoading(true);
    setError(null);

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

      dispatch(setCredentials({ user: data.user, token: data.token }));
      
      // Clear states
      setMpin('');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto glass-panel p-8 relative overflow-hidden transition-all duration-300">
      {/* Decorative accent blob */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-accent/20 rounded-full blur-2xl pointer-events-none"></div>
      
      <div>
        {/* Header tab selectors */}
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

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-accent text-white border-none rounded-sm py-3.5 font-bold cursor-pointer transition-all duration-300 hover:bg-accent-hover hover:scale-[1.02] flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(244,63,94,0.3)] disabled:opacity-50 disabled:pointer-events-none"
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
