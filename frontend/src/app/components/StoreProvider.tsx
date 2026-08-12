// File: src/app/components/StoreProvider.tsx
// Description: Client component wrapping the Redux Provider and seeding initial state from localStorage.
// Author: Akilan M
// Created: 2026-08-12T14:28:00+05:30

'use client';

import { Provider } from 'react-redux';
import { store } from '../services/store';
import { useEffect } from 'react';
import { loadTripFromStorage } from '../services/tripSlice';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  // Load state from localStorage on mount
  useEffect(() => {
    store.dispatch(loadTripFromStorage());
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
