/* eslint-disable react-hooks/set-state-in-effect */
// File: src/app/components/Navbar.tsx
// Description: Interactive navigation header component adapting to authenticated user session state.
// Author: Akilan M
// Created: 2026-08-13T11:47:00+05:30

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppSelector } from '../services/hooks';
import { selectCurrentUser } from '../services/authSlice';
import TripLink from './TripLink';
import { Compass, Search, MapPin, PlusCircle, User, Settings } from 'lucide-react';

export default function Navbar() {
  const user = useAppSelector(selectCurrentUser);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 px-4 md:px-6 py-4 md:py-3 flex flex-col md:flex-row justify-between items-center border-b border-white/8 glass-panel gap-4 md:gap-0">
      <Link href="/" className="flex items-center gap-1.5 text-2xl font-extrabold text-text-primary hover:opacity-90">
        <MapPin className="w-6 h-6 text-accent shrink-0" />
        <span>Food<span className="text-accent">Trail</span></span>
      </Link>
      
      <nav className="flex flex-wrap items-center w-full md:w-auto justify-around md:justify-end gap-1 md:gap-4">
        <Link href="/" className="flex flex-col md:flex-row items-center gap-1.5 text-xs md:text-[0.95rem] font-medium text-text-secondary p-[0.35rem] md:px-3 md:py-2 rounded-sm transition-all duration-300 hover:text-text-primary hover:bg-bg-tertiary">
          <Search className="w-4 h-4 shrink-0" />
          <span>Dish Search</span>
        </Link>
        {mounted && user && (
          <>
            <Link href="/trails" className="flex flex-col md:flex-row items-center gap-1.5 text-xs md:text-[0.95rem] font-medium text-text-secondary p-[0.35rem] md:px-3 md:py-2 rounded-sm transition-all duration-300 hover:text-text-primary hover:bg-bg-tertiary">
              <Compass className="w-4 h-4 shrink-0" />
              <span>Walking Trails</span>
            </Link>
            <Link href="/add-spot" className="flex flex-col md:flex-row items-center gap-1.5 text-xs md:text-[0.95rem] font-medium text-text-secondary p-[0.35rem] md:px-3 md:py-2 rounded-sm transition-all duration-300 hover:text-text-primary hover:bg-bg-tertiary">
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Add Spot</span>
            </Link>
            <TripLink />
          </>
        )}

        <div className="w-px h-5 bg-white/10 hidden md:block"></div>

        {mounted && user ? (
          <div className="flex items-center gap-1.5">
            <Link
              href="/profile"
              className="flex items-center gap-2 text-xs md:text-[0.95rem] font-semibold text-text-primary p-[0.35rem] md:px-3 md:py-2 rounded-sm transition-all duration-300 hover:bg-bg-tertiary border border-accent/20 bg-accent/5"
            >
              <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[0.7rem] font-black shrink-0">
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <span className="max-w-[80px] truncate hidden sm:inline">{user.name.split(' ')[0]}</span>
            </Link>
            
            <Link
              href="/settings"
              title="Settings"
              className="flex items-center justify-center text-text-secondary hover:text-text-primary p-2 rounded-sm transition-all duration-300 hover:bg-bg-tertiary shrink-0"
            >
              <Settings className="w-4.5 h-4.5" />
            </Link>
          </div>
        ) : (
          <Link
            href="/profile"
            className="flex flex-col md:flex-row items-center gap-1.5 text-xs md:text-[0.95rem] font-semibold text-accent p-[0.35rem] md:px-4 md:py-2 rounded-sm transition-all duration-300 hover:bg-accent/10 border border-accent/20 bg-accent/5"
          >
            <User className="w-4 h-4 shrink-0" />
            <span>Sign In</span>
          </Link>
        )}
      </nav>
    </header>
  );
}
