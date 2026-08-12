// File: src/app/services/tripSlice.ts
// Description: Redux Slice managing the saved food trail route state and syncing with localStorage.
// Author: Akilan M
// Created: 2026-08-12T14:26:00+05:30

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TripState {
  savedRestIds: string[];
  savedTrailId: string | null;
}

const initialState: TripState = {
  savedRestIds: [],
  savedTrailId: null,
};

export const tripSlice = createSlice({
  name: 'trip',
  initialState,
  reducers: {
    setSavedRestIds: (state, action: PayloadAction<string[]>) => {
      state.savedRestIds = action.payload;
    },
    setSavedTrailId: (state, action: PayloadAction<string | null>) => {
      state.savedTrailId = action.payload;
      if (typeof window !== 'undefined') {
        if (action.payload) {
          localStorage.setItem('foodtrail_saved_trail_id', action.payload);
        } else {
          localStorage.removeItem('foodtrail_saved_trail_id');
        }
      }
    },
    addRestaurant: (state, action: PayloadAction<string>) => {
      if (!state.savedRestIds.includes(action.payload)) {
        state.savedRestIds.push(action.payload);
        if (typeof window !== 'undefined') {
          localStorage.setItem('foodtrail_saved_trip', JSON.stringify(state.savedRestIds));
        }
      }
    },
    addRestaurants: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach((id) => {
        if (!state.savedRestIds.includes(id)) {
          state.savedRestIds.push(id);
        }
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('foodtrail_saved_trip', JSON.stringify(state.savedRestIds));
      }
    },
    removeRestaurant: (state, action: PayloadAction<string>) => {
      state.savedRestIds = state.savedRestIds.filter((id) => id !== action.payload);
      if (typeof window !== 'undefined') {
        localStorage.setItem('foodtrail_saved_trip', JSON.stringify(state.savedRestIds));
      }
    },
    clearTrip: (state) => {
      state.savedRestIds = [];
      state.savedTrailId = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('foodtrail_saved_trip');
        localStorage.removeItem('foodtrail_saved_trail_id');
      }
    },
    loadTripFromStorage: (state) => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('foodtrail_saved_trip');
        if (saved) {
          try {
            state.savedRestIds = JSON.parse(saved);
          } catch (e) {
            console.error('Failed to parse saved trip from localStorage', e);
          }
        }
        const savedTrailId = localStorage.getItem('foodtrail_saved_trail_id');
        if (savedTrailId) {
          state.savedTrailId = savedTrailId;
        }
      }
    },
  },
});

export const { setSavedRestIds, setSavedTrailId, addRestaurant, addRestaurants, removeRestaurant, clearTrip, loadTripFromStorage } = tripSlice.actions;

export const selectSavedRestIds = (state: { trip: TripState }) => state.trip.savedRestIds;
export const selectSavedRestCount = (state: { trip: TripState }) => state.trip.savedRestIds.length;
export const selectSavedTrailId = (state: { trip: TripState }) => state.trip.savedTrailId;

export default tripSlice.reducer;
