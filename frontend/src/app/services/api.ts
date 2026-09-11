// File: src/app/services/api.ts
// Description: Unified API service module containing typed fetch operations, offline caching, and PWA synchronization handlers.
// Author: Akilan M
// Created: 2026-08-12T14:21:00+05:30
// Updated: 2026-09-11

import { User, UserSettings, UserProfileDetails } from './authSlice';
import { enqueueOfflineMutation, OfflineMutationItem } from './offlineSync';

export interface Restaurant {
  _id: string;
  name: string;
  description?: string;
  address?: string;
  area: string;
  location?: {
    type?: string;
    coordinates: number[]; // [longitude, latitude]
  };
  vibeTags: string[];
  busyStatus: 'Plenty of Tables' | 'Filling Up' | '~15 Min Wait' | 'Closed';
  rating: number;
  reviewCount?: number;
  photoUrl?: string;
  isOfflinePending?: boolean;
}

/**
 * Constructs a Google Maps redirection URL for a restaurant or dining spot.
 * Prioritizes exact coordinates [lng, lat] and falls back to spot name and area query.
 * @param rest - Object containing name, optional area, and optional location coordinates.
 * @returns Google Maps URL.
 */
export function getGoogleMapsUrl(rest: {
  name: string;
  area?: string;
  location?: { coordinates?: number[] };
}): string {
  if (rest.location?.coordinates && Array.isArray(rest.location.coordinates) && rest.location.coordinates.length === 2) {
    const [lng, lat] = rest.location.coordinates;
    if (!isNaN(lat) && !isNaN(lng)) {
      return `https://www.google.com/maps?q=${lat},${lng}`;
    }
  }
  const query = encodeURIComponent(`${rest.name} ${rest.area || ''}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export interface Dish {
  _id: string;
  name: string;
  description: string;
  price: number;
  photoUrl?: string;
  restaurantId: Restaurant;
  rating: number;
  reviewCount?: number;
  isSignature?: boolean;
  isOfflinePending?: boolean;
}

export interface Review {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  restaurantId?: string;
  dishId?: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  isOfflinePending?: boolean;
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
  createdBy?: string | null;
  isOfflinePending?: boolean;
}

export interface SavedTrip {
  _id: string;
  shareId: string;
  restaurantIds: Restaurant[];
  trailId?: Trail | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

/**
 * Normalizes list endpoints that may return a bare array or a paginated `{ data }` envelope.
 * @param payload - Array or paginated response body.
 * @returns Flat array of items.
 */
export function unwrapList<T>(payload: T[] | { data: T[] } | null | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

/**
 * Saves a successful API GET response payload to local storage for offline use.
 */
function setCacheItem<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`ft_cache_${key}`, JSON.stringify(data));
  } catch (e) {
    console.warn('[Cache] Storage quota exceeded or unavailable:', e);
  }
}

/**
 * Retrieves a cached GET response payload from local storage.
 */
function getCacheItem<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(`ft_cache_${key}`);
    return item ? (JSON.parse(item) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Generic API request wrapper with offline caching and session handling.
 * @param endpoint - The API endpoint path.
 * @param options - Request options (headers, method, body, etc.).
 */
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const isGet = !options?.method || options.method === 'GET';

  // Auto-destroy local session if past client-side expiry (cookie is authoritative)
  if (typeof window !== 'undefined') {
    const expiryStr = localStorage.getItem('foodtrail_session_expires_at');
    if (expiryStr && Date.now() >= Number(expiryStr)) {
      localStorage.removeItem('foodtrail_user');
      localStorage.removeItem('foodtrail_token');
      localStorage.removeItem('foodtrail_session_expires_at');
      window.dispatchEvent(new CustomEvent('foodtrail_session_expired'));
    }
  }

  const headers = new Headers(options?.headers);
  // Transitional Bearer only if a legacy token remains in storage (cookies preferred)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('foodtrail_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      credentials: options?.credentials || 'include',
      headers,
    });

    // Automatically destroy local session if server returns 401 Unauthorized
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('foodtrail_user');
      localStorage.removeItem('foodtrail_token');
      localStorage.removeItem('foodtrail_session_expires_at');
      window.dispatchEvent(new CustomEvent('foodtrail_session_expired'));
    }

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

    const data = (await response.json()) as T;
    // Cache successful GET responses
    if (isGet) {
      setCacheItem(endpoint, data);
    }
    return data;
  } catch (error) {
    // If GET request fails and user is offline or fetch threw network error, check cache
    if (isGet) {
      const cached = getCacheItem<T>(endpoint);
      if (cached) {
        console.info(`[PWA Offline] Serving cached data for endpoint: ${endpoint}`);
        return cached;
      }
    }
    throw error;
  }
}

/**
 * Fetch all signature or featured dishes.
 */
export async function getDishes(): Promise<Dish[]> {
  const res = await apiRequest<Dish[] | { data: Dish[] }>('/dishes');
  return unwrapList(res);
}

/**
 * Search dishes by query string.
 */
export async function searchDishes(query: string): Promise<Dish[]> {
  const params = new URLSearchParams();
  params.append('page', '1');
  params.append('limit', '100');
  if (query.trim()) {
    params.append('q', query.trim());
  }
  const res = await apiRequest<Dish[] | { data: Dish[] }>(`/dishes/search?${params.toString()}`);
  return unwrapList(res);
}

/**
 * Fetch all walking food trails.
 */
export async function getTrails(): Promise<Trail[]> {
  const res = await apiRequest<Trail[] | { data: Trail[] }>('/trails');
  return unwrapList(res);
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
  if (typeof window !== 'undefined' && !navigator.onLine) {
    enqueueOfflineMutation('UPDATE_BUSY_STATUS', { restaurantId, busyStatus: newStatus });
    return {
      _id: restaurantId,
      name: 'Dining Spot',
      area: '',
      vibeTags: [],
      busyStatus: newStatus as Restaurant['busyStatus'],
      rating: 4.5,
      isOfflinePending: true,
    };
  }

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
  // Prefer unpaginated full list so browse/search never silently truncates
  const res = await apiRequest<Restaurant[] | { data: Restaurant[] }>('/restaurants');
  return unwrapList(res);
}

/**
 * Fetch all dining spots created by the currently authenticated user.
 */
export async function getMySpots(): Promise<Restaurant[]> {
  return apiRequest<Restaurant[]>('/restaurants/my-spots');
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
 * Formats a given photo URL or path into a fully qualified image URL.
 */
export function formatPhotoUrl(url: string | undefined): string {
  if (!url) return 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600';
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
 * Uploads an image file to the Express backend.
 * @param file - Image file to upload.
 * @param folder - Optional subfolder category.
 */
export async function uploadImage(file: File, folder?: string): Promise<{ success: boolean; fileId: string; folder?: string }> {
  const formData = new FormData();
  formData.append('photo', file);
  if (folder) {
    formData.append('folder', folder);
  }

  const url = `${API_BASE}/upload`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errorDetail = errJson.error.message;
      }
    } catch {
      // Ignore JSON parse failure
    }
    throw new Error(`Upload failed: ${errorDetail}`);
  }

  return response.json() as Promise<{ success: boolean; fileId: string; folder?: string }>;
}

/**
 * Deletes an uploaded image from Cloudinary.
 * @param photoUrl - The URL or public_id of the photo to delete.
 */
export async function deleteUploadedImage(photoUrl: string): Promise<{ success: boolean; message: string }> {
  const url = `${API_BASE}/upload`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ photoUrl }),
  });

  if (!response.ok) {
    let errorDetail = `${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errorDetail = errJson.error.message;
      }
    } catch {
      // Ignore JSON parse failure
    }
    throw new Error(`Delete failed: ${errorDetail}`);
  }

  return response.json() as Promise<{ success: boolean; message: string }>;
}

/**
 * Update a restaurant's photo URL.
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
 * Create a new walking food trail (with offline queue fallback).
 */
export async function createTrail(trailData: Partial<Trail>): Promise<Trail> {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    enqueueOfflineMutation('CREATE_TRAIL', trailData);
    const mockTrail: Trail = {
      _id: `offline_trail_${Date.now()}`,
      name: trailData.name || 'Offline Walking Trail',
      description: trailData.description || '',
      estimatedDuration: trailData.estimatedDuration || 30,
      distance: trailData.distance || 1500,
      area: trailData.area || 'Nearby',
      photoUrl: trailData.photoUrl,
      stops: trailData.stops || [],
      isOfflinePending: true,
    };
    return mockTrail;
  }

  return apiRequest<Trail>('/trails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(trailData),
  });
}

/**
 * Deletes a walking trail owned by the current user (or legacy trails without an owner).
 * @param id - Trail document id
 */
export async function deleteTrail(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/trails/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Create a new restaurant (with offline queue fallback).
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
  if (typeof window !== 'undefined' && !navigator.onLine) {
    enqueueOfflineMutation('CREATE_RESTAURANT', restaurantData);
    const mockRestaurant: Restaurant = {
      _id: `offline_spot_${Date.now()}`,
      name: restaurantData.name,
      description: restaurantData.description,
      address: restaurantData.address,
      area: restaurantData.area,
      location: {
        type: 'Point',
        coordinates: restaurantData.coordinates,
      },
      vibeTags: restaurantData.vibeTags || [],
      busyStatus: 'Plenty of Tables',
      rating: 5.0,
      reviewCount: 0,
      photoUrl: restaurantData.photoUrl,
      isOfflinePending: true,
    };

    // Update local cache
    const existing = getCacheItem<Restaurant[]>('/restaurants') || [];
    setCacheItem('/restaurants', [mockRestaurant, ...existing]);

    return mockRestaurant;
  }

  return apiRequest<Restaurant>('/restaurants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(restaurantData),
  });
}

/**
 * Create a new dish (with offline queue fallback).
 */
export async function createDish(dishData: {
  name: string;
  description?: string;
  price: number;
  photoUrl?: string;
  restaurantId: string;
  isSignature?: boolean;
}): Promise<Dish> {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    enqueueOfflineMutation('CREATE_DISH', dishData);
    const mockDish: Dish = {
      _id: `offline_dish_${Date.now()}`,
      name: dishData.name,
      description: dishData.description || '',
      price: dishData.price,
      photoUrl: dishData.photoUrl,
      restaurantId: {
        _id: dishData.restaurantId,
        name: 'Spot',
        area: 'Nearby',
        vibeTags: [],
        busyStatus: 'Plenty of Tables',
        rating: 5,
      },
      rating: 5,
      reviewCount: 0,
      isSignature: dishData.isSignature,
      isOfflinePending: true,
    };
    return mockDish;
  }

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
  type?: 'signup' | 'login' | 'reset_mpin';
  /** Session lifetime in seconds when login/verify succeeds. */
  expiresIn?: number;
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
export async function verifyOtp(
  email: string,
  otp: string,
  type: 'signup' | 'login'
): Promise<{ token: string; user: User; expiresIn?: number }> {
  return apiRequest<{ token: string; user: User; expiresIn?: number }>('/auth/verify', {
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
 * Mark a walking food trail as completed (with offline queue fallback).
 */
export async function completeWalk(trailId?: string): Promise<{ user: User }> {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    enqueueOfflineMutation('COMPLETE_WALK', { trailId });
    const cachedUserJson = localStorage.getItem('foodtrail_user');
    let user: User;
    if (cachedUserJson) {
      user = JSON.parse(cachedUserJson);
      if (!user.profile) {
        user.profile = {};
      }
      user.profile.walksCompleted = (user.profile.walksCompleted || 0) + 1;
      localStorage.setItem('foodtrail_user', JSON.stringify(user));
    } else {
      user = {
        id: 'offline_user',
        email: 'user@foodtrail.local',
        name: 'Foodie',
        settings: { notificationsEnabled: true, preferredTheme: 'Dark' },
        profile: { walksCompleted: 1 },
        createdAt: new Date().toISOString(),
      };
    }
    return { user };
  }

  return apiRequest<{ user: User }>('/auth/profile/complete-walk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trailId }),
    credentials: 'include',
  });
}

/**
 * Log out user by clearing the authentication cookie on the backend.
 */
export async function logoutUser(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

/**
 * Start forgot-MPIN flow by requesting an email OTP.
 * @param email - Registered account email.
 */
export async function forgotMpin(email: string): Promise<{ status: string; email: string; type: string }> {
  return apiRequest<{ status: string; email: string; type: string }>('/auth/forgot-mpin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

/**
 * Complete MPIN reset with OTP and new MPIN.
 * @param payload - Email, OTP, and new MPIN.
 */
export async function resetMpin(payload: {
  email: string;
  otp: string;
  mpin: string;
}): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/reset-mpin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Resend a pending OTP email for signup or MPIN reset.
 * @param email - Target email address.
 * @param type - OTP purpose (`signup` or `reset_mpin`).
 */
export async function resendOtp(
  email: string,
  type: 'signup' | 'login' | 'reset_mpin' = 'signup'
): Promise<{ status: string; email: string; type: string }> {
  const otpType = type === 'reset_mpin' ? 'reset_mpin' : 'signup';
  return apiRequest<{ status: string; email: string; type: string }>('/auth/resend-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, type: otpType }),
  });
}

/**
 * Permanently delete the authenticated user account.
 */
export async function deleteAccount(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/account', {
    method: 'DELETE',
  });
}

/**
 * Update a dining spot owned by the current user.
 * @param id - Restaurant ID.
 * @param body - Partial restaurant fields to update.
 */
export async function updateMySpot(
  id: string,
  body: {
    name?: string;
    description?: string;
    address?: string;
    area?: string;
    photoUrl?: string;
    vibeTags?: string[];
    coordinates?: number[];
    busyStatus?: string;
  }
): Promise<Restaurant> {
  return apiRequest<Restaurant>(`/restaurants/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Delete a dining spot owned by the current user.
 * @param id - Restaurant ID.
 */
export async function deleteMySpot(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/restaurants/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Fetch all user reviews and comments for a specific restaurant or dish.
 * @param params - Target query filter containing restaurantId or dishId.
 */
export async function getReviews(params: { restaurantId?: string; dishId?: string }): Promise<Review[]> {
  const query = new URLSearchParams();
  if (params.restaurantId) query.append('restaurantId', params.restaurantId);
  if (params.dishId) query.append('dishId', params.dishId);
  return apiRequest<Review[]>(`/reviews?${query.toString()}`);
}

/**
 * Submit a user rating and review comment (with offline queue fallback).
 * @param data - Review payload containing target, rating, and comment.
 */
export async function createReview(data: {
  restaurantId?: string;
  dishId?: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    enqueueOfflineMutation('CREATE_REVIEW', data);
    const cachedUserJson = localStorage.getItem('foodtrail_user');
    let userName = 'You (Offline)';
    let userEmail = 'user@offline.local';
    let userId = 'offline_user';
    if (cachedUserJson) {
      try {
        const u = JSON.parse(cachedUserJson);
        userName = u.name || userName;
        userEmail = u.email || userEmail;
        userId = u.id || u._id || userId;
      } catch {}
    }

    const mockReview: Review = {
      _id: `offline_rev_${Date.now()}`,
      user: {
        _id: userId,
        name: userName,
        email: userEmail,
      },
      restaurantId: data.restaurantId,
      dishId: data.dishId,
      rating: data.rating,
      comment: data.comment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOfflinePending: true,
    };

    return mockReview;
  }

  return apiRequest<Review>('/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

/**
 * Delete a user's own review by ID.
 * @param reviewId - The ID of the review to delete.
 */
export async function deleteReview(reviewId: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/reviews/${reviewId}`, {
    method: 'DELETE',
  });
}

/**
 * Processes an individual queued offline mutation against the live API.
 * @param item - The offline mutation item.
 */
export async function executeQueuedMutation(item: OfflineMutationItem): Promise<unknown> {
  switch (item.type) {
    case 'CREATE_REVIEW':
      return createReview(item.payload as { restaurantId?: string; dishId?: string; rating: number; comment: string });
    case 'CREATE_RESTAURANT':
      return createRestaurant(item.payload as { name: string; description?: string; address?: string; area: string; coordinates: number[]; vibeTags?: string[]; photoUrl?: string });
    case 'CREATE_DISH':
      return createDish(item.payload as { name: string; description?: string; price: number; photoUrl?: string; restaurantId: string; isSignature?: boolean });
    case 'COMPLETE_WALK':
      return completeWalk((item.payload as { trailId?: string })?.trailId);
    case 'CREATE_TRAIL':
      return createTrail(item.payload as Partial<Trail>);
    case 'UPDATE_BUSY_STATUS': {
      const p = item.payload as { restaurantId: string; busyStatus: string };
      return updateBusyStatus(p.restaurantId, p.busyStatus);
    }
    default:
      throw new Error(`Unknown mutation type: ${item.type}`);
  }
}

/**
 * Native PWA Web Share API helper with automatic fallback to clipboard copy.
 * @param data - Share payload containing title, text, and url.
 * @returns Boolean indicating whether share or copy succeeded.
 */
export async function shareFoodTrail(data: { title: string; text: string; url: string }): Promise<boolean> {
  if (typeof window !== 'undefined' && navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.warn('[shareFoodTrail] Web Share error, falling back to clipboard:', err);
      } else {
        return false;
      }
    }
  }

  // Fallback to clipboard
  if (typeof window !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(`${data.title}\n${data.text}\n${data.url}`);
      return true;
    } catch (err) {
      console.error('[shareFoodTrail] Clipboard write failed:', err);
    }
  }

  return false;
}
