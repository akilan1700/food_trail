// File: src/app/services/store.ts
// Description: Global Redux Store configuration using Redux Toolkit.
// Author: Akilan M
// Created: 2026-08-12T14:27:00+05:30

import { configureStore } from '@reduxjs/toolkit';
import tripReducer from './tripSlice';

export const store = configureStore({
  reducer: {
    trip: tripReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
