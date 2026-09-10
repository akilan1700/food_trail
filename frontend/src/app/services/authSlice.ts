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
  _id?: string;
  email: string;
  name: string;
  settings: UserSettings;
  profile: UserProfileDetails;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  sessionExpiresAt: number | null;
  loading: boolean;
  error: string | null;
  detectedCity: string | null;
  detectedLatitude: number | null;
  detectedLongitude: number | null;
}

// Safer localStorage check to avoid server-side execution errors in Next.js
const getInitialState = (): AuthState => {
  if (typeof window === 'undefined') {
    return {
      user: null,
      token: null,
      sessionExpiresAt: null,
      loading: false,
      error: null,
      detectedCity: null,
      detectedLatitude: null,
      detectedLongitude: null,
    };
  }

  const expiryStr = localStorage.getItem('foodtrail_session_expires_at');
  const sessionExpiresAt = expiryStr ? Number(expiryStr) : null;
  const isExpired = sessionExpiresAt ? Date.now() >= sessionExpiresAt : false;

  if (isExpired) {
    // Auto-destroy expired session immediately
    localStorage.removeItem('foodtrail_user');
    localStorage.removeItem('foodtrail_token');
    localStorage.removeItem('foodtrail_session_expires_at');
  }

  const token = isExpired ? null : localStorage.getItem('foodtrail_token');
  const userJson = isExpired ? null : localStorage.getItem('foodtrail_user');
  const detectedCity = localStorage.getItem('foodtrail_detected_city');
  const detectedLatitude = localStorage.getItem('foodtrail_detected_latitude') ? Number(localStorage.getItem('foodtrail_detected_latitude')) : null;
  const detectedLongitude = localStorage.getItem('foodtrail_detected_longitude') ? Number(localStorage.getItem('foodtrail_detected_longitude')) : null;
  
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
    sessionExpiresAt: isExpired ? null : sessionExpiresAt,
    loading: false,
    error: null,
    detectedCity,
    detectedLatitude,
    detectedLongitude,
  };
};

const initialState = getInitialState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setDetectedLocation(
      state,
      action: PayloadAction<{ city: string; latitude: number; longitude: number }>
    ) {
      state.detectedCity = action.payload.city;
      state.detectedLatitude = action.payload.latitude;
      state.detectedLongitude = action.payload.longitude;
      if (typeof window !== 'undefined') {
        localStorage.setItem('foodtrail_detected_city', action.payload.city);
        localStorage.setItem('foodtrail_detected_latitude', String(action.payload.latitude));
        localStorage.setItem('foodtrail_detected_longitude', String(action.payload.longitude));
      }
    },
    setCredentials(state, action: PayloadAction<{ user: User; token?: string; expiresAt?: number }>) {
      const { user, token, expiresAt } = action.payload;
      const sessionExpiry = expiresAt || (Date.now() + 60 * 60 * 1000); // 1 hour session duration

      state.user = user;
      if (token !== undefined) {
        state.token = token || null;
      }
      state.sessionExpiresAt = sessionExpiry;
      state.error = null;

      if (typeof window !== 'undefined') {
        localStorage.setItem('foodtrail_user', JSON.stringify(user));
        if (token) {
          localStorage.setItem('foodtrail_token', token);
        }
        localStorage.setItem('foodtrail_session_expires_at', String(sessionExpiry));
      }
    },
    clearCredentials(state) {
      state.user = null;
      state.token = null;
      state.sessionExpiresAt = null;
      state.error = null;

      if (typeof window !== 'undefined') {
        localStorage.removeItem('foodtrail_user');
        localStorage.removeItem('foodtrail_token');
        localStorage.removeItem('foodtrail_session_expires_at');
      }
    },
    checkSessionExpiry(state) {
      if (state.sessionExpiresAt && Date.now() >= state.sessionExpiresAt) {
        state.user = null;
        state.token = null;
        state.sessionExpiresAt = null;
        state.error = 'Session expired after 1 hour. Please sign in again.';

        if (typeof window !== 'undefined') {
          localStorage.removeItem('foodtrail_user');
          localStorage.removeItem('foodtrail_token');
          localStorage.removeItem('foodtrail_session_expires_at');
        }
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

export const { setDetectedLocation, setCredentials, clearCredentials, checkSessionExpiry, updateUserSettings, setLoading, setError } = authSlice.actions;

export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthToken = (state: { auth: AuthState }) => state.auth.token;
export const selectSessionExpiresAt = (state: { auth: AuthState }) => state.auth.sessionExpiresAt;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectDetectedCity = (state: { auth: AuthState }) => state.auth.detectedCity;
export const selectDetectedLatitude = (state: { auth: AuthState }) => state.auth.detectedLatitude;
export const selectDetectedLongitude = (state: { auth: AuthState }) => state.auth.detectedLongitude;

export default authSlice.reducer;
