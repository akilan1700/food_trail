// File: src/app/login/page.tsx
// Description: Dedicated Login Page component displaying the AuthForm in login mode and handling authenticated redirects.
// Author: Akilan M
// Created: 2026-08-13T22:38:00+05:30

'use client';

import AuthForm from '../components/AuthForm';
import Logo from '../components/Logo';
import { useAppSelector } from '../services/hooks';
import { selectCurrentUser } from '../services/authSlice';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingScreen from '../components/LoadingScreen';

export default function LoginPage() {
  const user = useAppSelector(selectCurrentUser);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/profile');
    }
  }, [user, router]);

  if (user) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center py-10 animate-fade-in text-center">
      <div className="text-center mb-8 max-w-[400px] flex flex-col items-center">
        <Logo size="md" href="/" className="mb-4" />
        <h1 className="text-3xl font-extrabold text-text-primary mb-2">Sign In</h1>
        <p className="text-text-secondary text-sm">
          Access your personalized walking food routes and cafe exploration history.
        </p>
      </div>
      <AuthForm defaultMode="login" onSuccess={() => router.push('/profile')} />
    </div>
  );
}
