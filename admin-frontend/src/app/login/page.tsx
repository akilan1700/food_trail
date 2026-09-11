// File: src/app/login/page.tsx
// Description: Dedicated administrator login page authenticating against the separate Admin collection.
// Author: Akilan M
// Created: 2026-09-10T11:28:00+05:30

'use client';

import React, { useState, FormEvent } from 'react';
import { useAdminAuth } from '../../services/adminAuthContext';
import { KeyRound, Mail, Loader2, Lock } from 'lucide-react';

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [mpin, setMpin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('Admin email is required.');
      return;
    }

    if (!mpin.trim()) {
      setErrorMsg('Admin MPIN is required.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), mpin.trim());
    } catch (err: unknown) {
      console.error('Admin login error:', err);
      const message = err instanceof Error ? err.message : 'Invalid administrator credentials. Please check your credentials.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      <div className="w-full max-w-md bg-bg-secondary border border-accent/25 rounded-2xl p-8 glass-panel shadow-2xl relative overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="FoodTrail" width={56} height={56} className="mx-auto" />
          </div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Admin Console</h1>
          <p className="text-xs text-text-secondary mt-1">
            FoodTrail Administrator Control & Signature Dish Manager
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                disabled={loading}
                placeholder="admin@foodtrail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-tertiary/60 border border-white/10 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Security MPIN
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                maxLength={6}
                disabled={loading}
                placeholder="••••••"
                value={mpin}
                onChange={(e) => setMpin(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-tertiary/60 border border-white/10 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-all tracking-widest font-mono"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-medium text-red-400">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In to Admin Panel</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-white/5 text-center">
          <p className="text-[0.7rem] text-text-muted">
            Access strictly restricted to authorized administrators.
          </p>
        </div>
      </div>
    </div>
  );
}
