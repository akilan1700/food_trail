// File: src/app/components/BottomNav.tsx
// Description: Mobile-first sticky bottom navigation bar with active tab indicators and dynamic trip badges.
// Author: Akilan M
// Created: 2026-08-13T18:38:00+05:30

'use client';

import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSelector } from '../services/hooks';
import { selectCurrentUser } from '../services/authSlice';
import { selectSavedRestCount } from '../services/tripSlice';
import { Search, Compass, PlusCircle, Bookmark, User } from 'lucide-react';

/**
 * Responsive mobile sticky bottom navigation component.
 * Hidden on desktop viewports and positioned at the bottom on mobile devices.
 *
 * @returns {React.ReactElement | null} The bottom navigation element, or null if not mounted.
 */
export default function BottomNav(): React.ReactElement | null {
  const pathname = usePathname();
  const user = useAppSelector(selectCurrentUser);
  const count = useAppSelector(selectSavedRestCount);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!isClient) {
    return null;
  }

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-bg-secondary/90 border-t border-white/8 backdrop-blur-md px-2 py-2 flex justify-around items-center overscroll-behavior-contain shadow-[0_-4px_16px_rgba(0,0,0,0.4)]">
      {/* Search Tab */}
      <Link
        href="/"
        className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-sm transition-all duration-300 ${
          isActive('/') ? 'text-accent font-bold scale-105' : 'text-text-secondary'
        }`}
      >
        <Search className="w-5.5 h-5.5 shrink-0" />
        <span className="text-[0.65rem] uppercase tracking-wider">Search</span>
      </Link>

      {/* Trails Tab */}
      <Link
        href="/trails"
        className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-sm transition-all duration-300 ${
          isActive('/trails') ? 'text-accent font-bold scale-105' : 'text-text-secondary'
        }`}
      >
        <Compass className="w-5.5 h-5.5 shrink-0" />
        <span className="text-[0.65rem] uppercase tracking-wider">Trails</span>
      </Link>

      {/* Add Spot Tab */}
      <Link
        href="/add-spot"
        className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-sm transition-all duration-300 ${
          isActive('/add-spot') ? 'text-accent font-bold scale-105' : 'text-text-secondary'
        }`}
      >
        <PlusCircle className="w-5.5 h-5.5 shrink-0" />
        <span className="text-[0.65rem] uppercase tracking-wider">Add Spot</span>
      </Link>

      {/* My Trip Tab */}
      <Link
        href="/trip"
        className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-sm transition-all duration-300 relative ${
          isActive('/trip') ? 'text-accent font-bold scale-105' : 'text-text-secondary'
        }`}
      >
        <Bookmark className="w-5.5 h-5.5 shrink-0" />
        <span className="text-[0.65rem] uppercase tracking-wider">My Trip</span>
        {count > 0 && (
          <span className="absolute top-0 right-1.5 bg-accent text-white w-4 h-4 rounded-full flex items-center justify-center text-[0.6rem] font-black border border-bg-secondary shadow-[0_0_8px_rgba(244,63,94,0.5)]">
            {count}
          </span>
        )}
      </Link>

      {/* Profile/Auth Tab */}
      <Link
        href="/profile"
        className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-sm transition-all duration-300 ${
          isActive('/profile') || isActive('/settings') ? 'text-accent font-bold scale-105' : 'text-text-secondary'
        }`}
      >
        {user ? (
          <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[0.65rem] font-black border shrink-0 ${
            isActive('/profile') || isActive('/settings') ? 'bg-accent text-white border-accent' : 'bg-bg-tertiary text-text-primary border-white/10'
          }`}>
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </div>
        ) : (
          <User className="w-5.5 h-5.5 shrink-0" />
        )}
        <span className="text-[0.65rem] uppercase tracking-wider">Profile</span>
      </Link>
    </nav>
  );
}
