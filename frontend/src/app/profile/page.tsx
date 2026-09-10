// File: src/app/profile/page.tsx
// Description: User profile page displaying authenticated session credentials, trip stats, and sign out controls.
// Author: Akilan M
// Created: 2026-08-13T11:35:40+05:30

'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../services/hooks';
import { selectCurrentUser, clearCredentials } from '../services/authSlice';
import { selectSavedRestIds } from '../services/tripSlice';
import LoadingScreen from '../components/LoadingScreen';
import { useRouter } from 'next/navigation';
import { LogOut, Calendar, Map, CheckCircle2, Award, Heart } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const user = useAppSelector(selectCurrentUser);
  const savedRestIds = useAppSelector(selectSavedRestIds);
  const dispatch = useAppDispatch();
  const router = useRouter();
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleLogout = () => {
    dispatch(clearCredentials());
  };

  if (!user) {
    return <LoadingScreen />;
  }

  // Create formatted registration date
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recently';

  const userInitial = user.name ? user.name[0].toUpperCase() : 'U';

  return (
    <div className="max-w-[760px] mx-auto py-6 md:py-10 animate-fade-in">
      {/* Profile Header Card */}
      <div className="glass-panel p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6 mb-8 relative overflow-hidden">
        {/* Decorative ambient background gradient */}
        <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-accent/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-accent to-rating flex items-center justify-center text-white text-3xl font-black shadow-lg border-2 border-white/10 shrink-0">
          {userInitial}
        </div>
        
        <div className="flex-grow text-center sm:text-left">
          <h1 className="text-2xl md:text-3xl font-black text-text-primary mb-1">{user.name}</h1>
          <p className="text-text-secondary text-sm md:text-base font-medium mb-3">{user.email}</p>
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-text-muted">
            <Calendar className="w-3.5 h-3.5" />
            <span>Member since {memberSince}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="bg-bg-tertiary/60 border border-white/8 text-text-secondary hover:text-white hover:bg-status-red/15 hover:border-status-red/20 px-4 py-2.5 rounded-sm text-sm font-semibold cursor-pointer transition-all duration-300 flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Stats Section */}
      <h2 className="text-base uppercase tracking-wider text-text-muted font-bold mb-4 text-left">Your Activity Stats</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel p-5 text-center flex flex-col items-center justify-center hover:border-accent/35 transition-all duration-300">
          <Map className="w-6 h-6 text-accent mb-2" />
          <span className="text-3xl font-black text-text-primary">{savedRestIds.length}</span>
          <span className="text-xs text-text-secondary mt-1 font-semibold">Spots Saved in Trip</span>
        </div>
        
        <div className="glass-panel p-5 text-center flex flex-col items-center justify-center hover:border-rating/35 transition-all duration-300">
          <CheckCircle2 className="w-6 h-6 text-rating mb-2" />
          <span className="text-3xl font-black text-text-primary">{user.profile?.walksCompleted || 0}</span>
          <span className="text-xs text-text-secondary mt-1 font-semibold">Walks Completed</span>
        </div>

        <Link
          href="/my-spots"
          className="glass-panel p-5 text-center flex flex-col items-center justify-center hover:border-status-green/50 transition-all duration-300 group cursor-pointer"
        >
          <Award className="w-6 h-6 text-status-green mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-3xl font-black text-text-primary">{user.profile?.cafesDiscovered || 0}</span>
          <span className="text-xs text-text-secondary mt-1 font-semibold flex items-center gap-1 group-hover:text-status-green transition-colors">
            <span>Spots I Added</span>
            <span className="text-[0.65rem]">&rarr;</span>
          </span>
        </Link>
      </div>

      {/* User Details Card */}
      {user.profile && (user.profile.bio || user.profile.city || user.profile.favoriteCuisine || user.profile.dateOfBirth) && (
        <div className="glass-panel p-6 md:p-8 mb-8 text-left">
          <h2 className="text-lg font-bold mb-4 border-b border-white/5 pb-2">User Details</h2>
          
          {user.profile.bio && (
            <div className="mb-4">
              <span className="text-xs uppercase tracking-wider text-text-muted font-bold block">About Me</span>
              <p className="text-sm text-text-primary mt-1 leading-relaxed">{user.profile.bio}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {user.profile.dateOfBirth && (
              <div>
                <span className="text-xs uppercase tracking-wider text-text-muted font-bold block">Date of Birth</span>
                <span className="text-sm text-text-primary mt-1 block">
                  {new Date(user.profile.dateOfBirth).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}

            {user.profile.city && (
              <div>
                <span className="text-xs uppercase tracking-wider text-text-muted font-bold block">City</span>
                <span className="text-sm text-text-primary mt-1 block">{user.profile.city}</span>
              </div>
            )}

            {user.profile.favoriteCuisine && (
              <div>
                <span className="text-xs uppercase tracking-wider text-text-muted font-bold block">Favorite Cuisine</span>
                <span className="text-sm text-text-primary mt-1 block">{user.profile.favoriteCuisine}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account Info Cards */}
      <div className="glass-panel p-6 md:p-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-accent" />
          <span>Quick Settings & Actions</span>
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed mb-5">
          View your submitted spots, modify preferences, toggle push notifications, and customize your profile.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/5 pt-5">
          <Link
            href="/my-spots"
            className="bg-accent text-white border-none rounded-sm py-3 text-center font-bold text-xs transition-all hover:bg-accent-hover block shadow-[0_4px_12px_rgba(244,63,94,0.25)]"
          >
            My Added Spots ({user.profile?.cafesDiscovered || 0})
          </Link>
          <Link
            href="/settings"
            className="bg-bg-tertiary border border-white/8 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/80 rounded-sm py-3 text-center font-semibold text-xs transition-all block"
          >
            Settings
          </Link>
          <Link
            href="/"
            className="bg-bg-tertiary border border-white/8 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/80 rounded-sm py-3 text-center font-semibold text-xs transition-all block"
          >
            Explore Spots
          </Link>
        </div>
      </div>
    </div>
  );
}
