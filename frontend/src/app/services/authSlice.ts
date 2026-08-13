// File: src/app/services/authSlice.ts
// Description: Redux Slice managing user session state, local storage persistence, and profile setting preferences.
// Author: Akilan M
// Created: 2026-08-13T11:21:40+05:30

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserSettings {
  notificationsEnabled: boolean;
  preferredTheme: 'Dark' | 'Light';
}

export interface UserProfileDetails {
  phoneNumber?: string;
  bio?: string;
  dateOfBirth?: string | null;
  city?: string;
  favoriteCuisine?: string;
  walksCompleted?: number;
  cafesDiscovered?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  settings: UserSettings;
  profile: UserProfileDetails;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// Safer localStorage check to avoid server-side execution errors in Next.js
const getInitialState = (): AuthState => {
  if (typeof window === 'undefined') {
    return {
      user: null,
      token: null,
      loading: false,
      error: null,
    };
  }

  const token = localStorage.getItem('foodtrail_token');
  const userJson = localStorage.getItem('foodtrail_user');
  let user: User | null = null;

  if (userJson) {
    try {
      user = JSON.parse(userJson);
    } catch (e) {
      console.error('Failed to parse cached user payload', e);
    }
  }

  return {
    user,
    token,
    loading: false,
    error: null,
  };
};

const initialState = getInitialState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: User; token: string }>) {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.error = null;

      if (typeof window !== 'undefined') {
        localStorage.setItem('foodtrail_token', token);
        localStorage.setItem('foodtrail_user', JSON.stringify(user));
      }
    },
    clearCredentials(state) {
      state.user = null;
      state.token = null;
      state.error = null;

      if (typeof window !== 'undefined') {
        localStorage.removeItem('foodtrail_token');
        localStorage.removeItem('foodtrail_user');
      }
    },
    updateUserSettings(
      state,
      action: PayloadAction<{
        name?: string;
        settings?: Partial<UserSettings>;
        profile?: Partial<UserProfileDetails>;
      }>
    ) {
      if (state.user) {
        if (action.payload.name !== undefined) {
          state.user.name = action.payload.name;
        }
        if (action.payload.settings !== undefined) {
          state.user.settings = {
            ...state.user.settings,
            ...action.payload.settings,
          };
        }
        if (action.payload.profile !== undefined) {
          state.user.profile = {
            ...state.user.profile,
            ...action.payload.profile,
          };
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('foodtrail_user', JSON.stringify(state.user));
        }
      }
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setCredentials, clearCredentials, updateUserSettings, setLoading, setError } = authSlice.actions;

export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthToken = (state: { auth: AuthState }) => state.auth.token;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

export default authSlice.reducer;
