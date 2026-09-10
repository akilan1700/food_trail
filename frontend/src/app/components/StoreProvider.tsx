// File: src/app/components/StoreProvider.tsx
// Description: Client component wrapping the Redux Provider and seeding initial state from localStorage.
// Author: Akilan M
// Created: 2026-08-12T14:28:00+05:30

'use client';

import { Provider, useSelector } from 'react-redux';
import { store } from '../services/store';
import { useEffect } from 'react';
import { loadTripFromStorage } from '../services/tripSlice';
import { fetchProfile } from '../services/api';
import { setCredentials, clearCredentials, checkSessionExpiry, selectCurrentUser } from '../services/authSlice';

function ThemeToggler() {
  const user = useSelector(selectCurrentUser);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const theme = user?.settings?.preferredTheme || 'Dark';
      if (theme === 'Light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    }
  }, [user]);

  return null;
}

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  // Load state from localStorage on mount & verify session cookie
  useEffect(() => {
    store.dispatch(loadTripFromStorage());

    // 1. Initial 1-hour session expiration check from local storage
    store.dispatch(checkSessionExpiry());

    // 2. Validate current user session from the cookie on mount
    fetchProfile()
      .then((data) => {
        if (data && data.user) {
          store.dispatch(setCredentials({ user: data.user }));
        }
      })
      .catch((err) => {
        console.warn('Session verification failed or expired:', err.message);
        store.dispatch(clearCredentials());
      });

    // 3. Listen to global session expired events
    const handleSessionExpired = () => {
      store.dispatch(clearCredentials());
    };
    window.addEventListener('foodtrail_session_expired', handleSessionExpired);

    // 4. Check on tab visibility / focus
    const handleFocusOrVisibility = () => {
      store.dispatch(checkSessionExpiry());
    };
    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    // 5. Periodic 1-hour session watchdog check (runs every 10 seconds)
    const watchdogInterval = setInterval(() => {
      store.dispatch(checkSessionExpiry());
    }, 10000);

    return () => {
      window.removeEventListener('foodtrail_session_expired', handleSessionExpired);
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      clearInterval(watchdogInterval);
    };
  }, []);

  return (
    <Provider store={store}>
      <ThemeToggler />
      {children}
    </Provider>
  );
}
