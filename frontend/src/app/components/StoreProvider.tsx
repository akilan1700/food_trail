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
import { setCredentials, clearCredentials, selectCurrentUser } from '../services/authSlice';

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

    // Validate current user session from the cookie on mount
    fetchProfile()
      .then((data) => {
        if (data && data.user) {
          store.dispatch(setCredentials({ user: data.user, token: '' }));
        }
      })
      .catch((err) => {
        console.warn('Session verification failed or expired:', err.message);
        store.dispatch(clearCredentials());
      });
  }, []);

  return (
    <Provider store={store}>
      <ThemeToggler />
      {children}
    </Provider>
  );
}
