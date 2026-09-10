// File: src/app/components/Navbar.tsx
// Description: Interactive navigation header component adapting to authenticated user session state.
// Author: Akilan M
// Created: 2026-08-13T11:47:00+05:30

'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '../services/hooks';
import { selectCurrentUser, selectDetectedCity, setDetectedLocation } from '../services/authSlice';
import TripLink from './TripLink';
import Logo from './Logo';
import { Compass, Search, MapPin, PlusCircle, User, Settings, Store } from 'lucide-react';

export default function Navbar() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const detectedCity = useAppSelector(selectDetectedCity);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const detectLocation = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await res.json();
            const city = data.city || data.locality || data.principalSubdivision || 'Nearby';
            dispatch(setDetectedLocation({ city, latitude, longitude }));
          } catch (err) {
            console.error('Failed to reverse geocode location:', err);
          }
        },
        (err) => {
          console.warn('Geolocation permission denied or failed:', err.message);
        }
      );
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('foodtrail_detected_city');
      if (!cached) {
        detectLocation();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header className="sticky top-0 z-50 px-4 md:px-6 py-3.5 flex justify-between items-center border-b border-white/8 glass-panel">
      <div className="flex items-center gap-3">
        <Logo href="/" size="sm" priority />
        {isClient && (
          <button
            type="button"
            onClick={detectLocation}
            title="Click to detect your location"
            className="flex items-center gap-1.5 text-xs text-text-secondary bg-bg-tertiary/40 hover:bg-bg-tertiary border border-white/5 hover:border-white/10 rounded-full px-3 py-1 cursor-pointer transition-all duration-300 shadow-sm"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${detectedCity ? 'bg-status-green animate-pulse' : 'bg-status-orange'}`}></span>
            <span>{detectedCity || user?.profile?.city || 'Detecting Location...'}</span>
          </button>
        )}
      </div>
      
      {/* Mobile Settings Icon - visible on mobile only when authenticated */}
      {isClient && user && (
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/my-spots"
            title="My Added Spots"
            className="flex items-center justify-center text-text-secondary hover:text-text-primary p-2.5 rounded-full transition-all duration-300 hover:bg-bg-tertiary/60 shrink-0 border border-white/5"
          >
            <Store className="w-5 h-5 text-accent" />
          </Link>
          <Link
            href="/settings"
            title="Settings"
            className="flex items-center justify-center text-text-secondary hover:text-text-primary p-2.5 rounded-full transition-all duration-300 hover:bg-bg-tertiary/60 shrink-0 border border-white/5"
          >
            <Settings className="w-5 h-5 text-text-secondary" />
          </Link>
        </div>
      )}

      <nav className="hidden md:flex flex-wrap items-center w-full md:w-auto justify-around md:justify-end gap-1 md:gap-4">
        <Link href="/" className="flex flex-col md:flex-row items-center gap-1.5 text-xs md:text-[0.95rem] font-medium text-text-secondary p-[0.35rem] md:px-3 md:py-2 rounded-sm transition-all duration-300 hover:text-text-primary hover:bg-bg-tertiary">
          <Search className="w-4 h-4 shrink-0" />
          <span>Dish Search</span>
        </Link>
        {isClient && user && (
          <>
            <Link href="/my-spots" className="flex flex-col md:flex-row items-center gap-1.5 text-xs md:text-[0.95rem] font-medium text-text-secondary p-[0.35rem] md:px-3 md:py-2 rounded-sm transition-all duration-300 hover:text-text-primary hover:bg-bg-tertiary">
              <Store className="w-4 h-4 shrink-0 text-accent" />
              <span>My Spots</span>
            </Link>
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

        {isClient && user ? (
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
