// File: src/app/signup/page.tsx
// Description: Dedicated Signup Page component displaying the AuthForm in signup mode and handling authenticated redirects.
// Author: Akilan M
// Created: 2026-08-13T22:38:10+05:30

'use client';

import AuthForm from '../components/AuthForm';
import { useAppSelector } from '../services/hooks';
import { selectCurrentUser } from '../services/authSlice';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingScreen from '../components/LoadingScreen';

export default function SignupPage() {
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
      <div className="text-center mb-8 max-w-[400px]">
        <h1 className="text-3xl font-extrabold text-text-primary mb-2">Create Account</h1>
        <p className="text-text-secondary text-sm">
          Join FoodTrail to save your favorite walking food routes and discover hidden cafes.
        </p>
      </div>
      <AuthForm defaultMode="signup" onSuccess={() => router.push('/profile')} />
    </div>
  );
}
