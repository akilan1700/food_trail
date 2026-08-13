// File: src/app/services/api.ts
// Description: Unified API service module containing typed fetch operations and shared typescript models.
// Author: Akilan M
// Created: 2026-08-12T14:21:00+05:30

import { User, UserSettings, UserProfileDetails } from './authSlice';

export interface Restaurant {
  _id: string;
  name: string;
  description: string;
  address: string;
  area: string;
  vibeTags: string[];
  busyStatus: 'Plenty of Tables' | 'Filling Up' | '~15 Min Wait' | 'Closed';
  rating: number;
  photoUrl?: string;
}

export interface Dish {
  _id: string;
  name: string;
  description: string;
  price: number;
  photoUrl?: string;
  restaurantId: Restaurant;
  rating: number;
  isSignature?: boolean;
}

export interface Stop {
  _id: string;
  order: number;
  restaurantId: Restaurant;
  description: string;
}

export interface Trail {
  _id: string;
  name: string;
  description: string;
  estimatedDuration: number;
  distance: number;
  area: string;
  photoUrl?: string;
  stops: Stop[];
}

export interface SavedTrip {
  _id: string;
  shareId: string;
  restaurantIds: Restaurant[];
  trailId?: Trail | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

/**
 * Generic API request wrapper.
 * @param endpoint - The API endpoint path.
 * @param options - Request options (headers, method, body, etc.).
 */
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const headers = new Headers(options?.headers);
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('foodtrail_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const errRes = await response.clone().json();
      if (errRes?.error?.message) {
        errorMessage = errRes.error.message;
      }
    } catch {}
    throw new Error(errorMessage);
  }
  return response.json() as Promise<T>;
}

/**
 * Fetch all signature or featured dishes.
 */
export async function getDishes(): Promise<Dish[]> {
  return apiRequest<Dish[]>('/dishes');
}

/**
 * Search dishes by query string and/or vibe tag filters.
 */
export async function searchDishes(query: string, vibes: string[]): Promise<Dish[]> {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.append('q', query.trim());
  }
  if (vibes.length > 0) {
    params.append('vibe', vibes.join(','));
  }
  return apiRequest<Dish[]>(`/dishes/search?${params.toString()}`);
}

/**
 * Fetch all walking food trails.
 */
export async function getTrails(): Promise<Trail[]> {
  return apiRequest<Trail[]>('/trails');
}

/**
 * Fetch detailed walking food trail by ID (including populated stops).
 */
export async function getTrailDetails(id: string): Promise<Trail> {
  return apiRequest<Trail>(`/trails/${id}`);
}

/**
 * Update the simulated busy status of a restaurant.
 */
export async function updateBusyStatus(restaurantId: string, newStatus: string): Promise<Restaurant> {
  return apiRequest<Restaurant>(`/restaurants/${restaurantId}/busy-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ busyStatus: newStatus }),
  });
}

/**
 * Fetch all restaurants.
 */
export async function getRestaurants(): Promise<Restaurant[]> {
  return apiRequest<Restaurant[]>('/restaurants');
}

/**
 * Create a saved trip in the database to generate a share ID.
 */
export async function createSharedTrip(restaurantIds: string[], trailId?: string): Promise<{ shareId: string }> {
  return apiRequest<{ shareId: string }>('/trips', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ restaurantIds, trailId }),
  });
}

/**
 * Fetch a shared trip by its share ID.
 */
export async function getSharedTrip(id: string): Promise<SavedTrip> {
  return apiRequest<SavedTrip>(`/trips/${id}`);
}

/**
 * Formats a given photo URL. If it is a Google Drive file ID,
 * it returns the direct content download URL. Otherwise, returns the original URL.
 */
export function formatPhotoUrl(url: string | undefined): string {
  if (!url) return 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600'; // Default fallback
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/uploads/')) {
    const backendBase = API_BASE.replace(/\/api$/, '');
    return `${backendBase}${url}`;
  }
  return `https://docs.google.com/uc?export=download&id=${url}`;
}

/**
 * Uploads an image file to the Express backend (which uploads to Google Drive).
 */
export async function uploadImage(file: File): Promise<{ success: boolean; fileId: string }> {
  const formData = new FormData();
  formData.append('photo', file);

  const url = `${API_BASE}/upload`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<{ success: boolean; fileId: string }>;
}

/**
 * Update a restaurant's photo URL (Google Drive File ID).
 */
export async function updateRestaurantPhoto(id: string, photoUrl: string): Promise<Restaurant> {
  return apiRequest<Restaurant>(`/restaurants/${id}/photo`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ photoUrl }),
  });
}

/**
 * Create a new walking food trail.
 */
export async function createTrail(trailData: Partial<Trail>): Promise<Trail> {
  return apiRequest<Trail>('/trails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(trailData),
  });
}

/**
 * Create a new restaurant.
 */
export async function createRestaurant(restaurantData: {
  name: string;
  description?: string;
  address?: string;
  area: string;
  coordinates: number[];
  vibeTags?: string[];
  photoUrl?: string;
}): Promise<Restaurant> {
  return apiRequest<Restaurant>('/restaurants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(restaurantData),
  });
}

/**
 * Create a new dish.
 */
export async function createDish(dishData: {
  name: string;
  description?: string;
  price: number;
  photoUrl?: string;
  restaurantId: string;
  isSignature?: boolean;
}): Promise<Dish> {
  return apiRequest<Dish>('/dishes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dishData),
  });
}

export interface AuthResponse {
  token?: string;
  user?: User;
  status?: string;
  email?: string;
  type?: 'signup' | 'login';
}

/**
 * Sign up user with email, name, and mpin.
 */
export async function signupUser(email: string, name: string, mpin: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, mpin }),
  });
}

/**
 * Log in user with email and mpin.
 */
export async function loginUser(email: string, mpin: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, mpin }),
  });
}

/**
 * Verify the OTP sent via email and complete registration/login.
 */
export async function verifyOtp(email: string, otp: string, type: 'signup' | 'login'): Promise<{ token: string; user: User }> {
  return apiRequest<{ token: string; user: User }>('/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, type }),
  });
}

/**
 * Fetch authenticated user profile.
 */
export async function fetchProfile(): Promise<{ user: User }> {
  return apiRequest<{ user: User }>('/auth/profile');
}

/**
 * Update authenticated user name, settings, and/or profile details.
 */
export async function updateProfile(
  name?: string,
  settings?: Partial<UserSettings>,
  profile?: Partial<UserProfileDetails>
): Promise<{ user: User }> {
  return apiRequest<{ user: User }>('/auth/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, settings, profile }),
  });
}

/**
 * Mark a walking food trail as completed in the database.
 */
export async function completeWalk(trailId?: string): Promise<{ user: User }> {
  return apiRequest<{ user: User }>('/auth/profile/complete-walk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trailId }),
  });
}
