// File: src/services/api.ts
// Description: Typed API client service for the Standalone Admin Panel communicating with the Express backend.
// Author: Akilan M
// Created: 2026-09-10T11:27:20+05:30
// Updated: 2026-09-11

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'superadmin';
  lastLogin?: string | null;
}

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
  photoUrl?: string;
  totalDishes?: number;
  signatureDishes?: number;
  createdAt?: string;
}

export interface Dish {
  _id: string;
  name: string;
  description?: string;
  price: number;
  photoUrl?: string;
  restaurantId: Restaurant | string;
  rating: number;
  isSignature: boolean;
  createdAt?: string;
}

export interface AdminStats {
  totalRestaurants: number;
  totalDishes: number;
  totalSignatureDishes: number;
  totalUsers: number;
  totalTrails: number;
}

export interface PlatformUser {
  _id: string;
  email: string;
  name: string;
  createdAt: string;
  settings?: {
    notificationsEnabled?: boolean;
    preferredTheme?: string;
  };
  profile?: {
    city?: string;
    favoriteCuisine?: string;
    walksCompletedCount?: number;
  };
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

export interface AdminTrail {
  _id: string;
  name: string;
  description?: string;
  estimatedDuration?: number;
  distance?: number;
  area?: string;
  photoUrl?: string;
  stops?: Array<{ order?: number; restaurantId?: string; description?: string }>;
  createdAt?: string;
}

export interface AdminReview {
  _id: string;
  user?: { _id?: string; name?: string } | string;
  restaurantId?: { _id?: string; name?: string } | string | null;
  dishId?: { _id?: string; name?: string } | string | null;
  rating: number;
  comment?: string;
  createdAt?: string;
}

/**
 * Generic administrative fetch wrapper using cookie credentials (optional legacy Bearer).
 * @param endpoint - The API endpoint path.
 * @param options - Request options.
 */
async function adminFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  // Check session expiry
  if (typeof window !== 'undefined') {
    const expiryStr = localStorage.getItem('foodtrail_admin_expires_at');
    if (expiryStr && Date.now() >= Number(expiryStr)) {
      localStorage.removeItem('foodtrail_admin_jwt');
      localStorage.removeItem('foodtrail_admin_user');
      localStorage.removeItem('foodtrail_admin_expires_at');
    }
  }

  const headers = new Headers(options?.headers);

  // Transitional Bearer only if a legacy token remains
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('foodtrail_admin_jwt');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    credentials: options?.credentials || 'include',
    headers,
  });

  if ((response.status === 401 || response.status === 403) && typeof window !== 'undefined') {
    localStorage.removeItem('foodtrail_admin_jwt');
    localStorage.removeItem('foodtrail_admin_user');
    localStorage.removeItem('foodtrail_admin_expires_at');
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

  return response.json() as Promise<T>;
}

/**
 * Formats a given photo URL or identifier into a full display URL.
 * @param url - Stored photo URL or public identifier.
 */
export function formatPhotoUrl(url?: string): string {
  if (!url) return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/uploads/')) {
    const backendBase = API_BASE.replace(/\/api$/, '');
    return `${backendBase}${url}`;
  }
  return url;
}

/**
 * Authenticates administrator using email and MPIN against the Admin collection.
 */
export async function adminLogin(email: string, mpin: string): Promise<{ token: string; admin: AdminUser }> {
  return adminFetch<{ token: string; admin: AdminUser }>('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, mpin }),
  });
}

/**
 * Fetches the currently authenticated administrator profile.
 */
export async function getAdminProfile(): Promise<{ admin: AdminUser }> {
  return adminFetch<{ admin: AdminUser }>('/admin/me');
}

/**
 * Logs out the administrator.
 */
export async function adminLogout(): Promise<{ message: string }> {
  return adminFetch<{ message: string }>('/admin/logout', {
    method: 'POST',
  });
}

/**
 * Fetches system KPI statistics.
 */
export async function getAdminStats(): Promise<AdminStats> {
  return adminFetch<AdminStats>('/admin/stats');
}

/**
 * Fetches all registered restaurants with dish counters.
 */
export async function getAdminRestaurants(): Promise<Restaurant[]> {
  return adminFetch<Restaurant[]>('/admin/restaurants');
}

/**
 * Creates a new restaurant spot from the admin panel.
 */
export async function createAdminRestaurant(data: {
  name: string;
  description?: string;
  address?: string;
  area: string;
  coordinates: number[];
  vibeTags?: string[];
  photoUrl?: string;
  busyStatus?: string;
  rating?: number;
}): Promise<Restaurant> {
  return adminFetch<Restaurant>('/admin/restaurants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Updates an existing restaurant's details.
 */
export async function updateAdminRestaurant(id: string, data: Partial<Restaurant> & { coordinates?: number[] }): Promise<Restaurant> {
  return adminFetch<Restaurant>(`/admin/restaurants/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Deletes a restaurant and its associated menu items.
 */
export async function deleteAdminRestaurant(id: string): Promise<{ message: string }> {
  return adminFetch<{ message: string }>(`/admin/restaurants/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Fetches all dishes across the platform.
 */
export async function getAdminDishes(): Promise<Dish[]> {
  return adminFetch<Dish[]>('/admin/dishes');
}

/**
 * Fetches all dishes for a specific restaurant.
 */
export async function getRestaurantDishes(restaurantId: string): Promise<Dish[]> {
  return adminFetch<Dish[]>(`/admin/restaurants/${restaurantId}/dishes`);
}

/**
 * Creates a new dish or signature dish for a restaurant.
 */
export async function createAdminDish(data: {
  name: string;
  description?: string;
  price: number;
  photoUrl?: string;
  restaurantId: string;
  isSignature?: boolean;
  rating?: number;
}): Promise<Dish> {
  return adminFetch<Dish>('/admin/dishes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Updates a dish's properties.
 */
export async function updateAdminDish(id: string, data: Partial<Dish>): Promise<Dish> {
  return adminFetch<Dish>(`/admin/dishes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Toggles a dish's signature status.
 */
export async function toggleDishSignature(id: string): Promise<Dish> {
  return adminFetch<Dish>(`/admin/dishes/${id}/toggle-signature`, {
    method: 'PATCH',
  });
}

/**
 * Deletes a dish.
 */
export async function deleteAdminDish(id: string): Promise<{ message: string }> {
  return adminFetch<{ message: string }>(`/admin/dishes/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Fetches all registered platform users (unwraps paginated `{ data }`).
 */
export async function getAdminUsers(): Promise<PlatformUser[]> {
  const res = await adminFetch<PlatformUser[] | { data: PlatformUser[] }>('/admin/users');
  return unwrapList(res);
}

/**
 * Fetches walking trails for admin moderation (paginated unwrap).
 */
export async function getAdminTrails(): Promise<AdminTrail[]> {
  const res = await adminFetch<AdminTrail[] | { data: AdminTrail[] }>('/admin/trails');
  return unwrapList(res);
}

/**
 * Updates a trail's editable fields from the admin panel.
 */
export async function updateAdminTrail(
  id: string,
  data: Partial<Pick<AdminTrail, 'name' | 'description' | 'estimatedDuration' | 'distance' | 'area' | 'photoUrl'>>
): Promise<AdminTrail> {
  return adminFetch<AdminTrail>(`/admin/trails/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/**
 * Deletes a walking trail.
 */
export async function deleteAdminTrail(id: string): Promise<{ message: string }> {
  return adminFetch<{ message: string }>(`/admin/trails/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Fetches platform reviews for moderation (paginated unwrap).
 */
export async function getAdminReviews(): Promise<AdminReview[]> {
  const res = await adminFetch<AdminReview[] | { data: AdminReview[] }>('/admin/reviews');
  return unwrapList(res);
}

/**
 * Deletes a review and triggers rating recalculation on the backend.
 */
export async function deleteAdminReview(id: string): Promise<{ message: string }> {
  return adminFetch<{ message: string }>(`/admin/reviews/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Uploads an image to Cloudinary via the backend upload route.
 */
export async function uploadImage(file: File, folder?: string): Promise<{ success: boolean; fileId: string }> {
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
    } catch {}
    throw new Error(`Upload failed: ${errorDetail}`);
  }

  return response.json() as Promise<{ success: boolean; fileId: string }>;
}

/**
 * Deletes an uploaded image from Cloudinary.
 */
export async function deleteUploadedImage(photoUrl: string): Promise<{ success: boolean; message: string }> {
  const url = `${API_BASE}/upload`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoUrl }),
  });

  if (!response.ok) {
    let errorDetail = `${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errorDetail = errJson.error.message;
      }
    } catch {}
    throw new Error(`Delete failed: ${errorDetail}`);
  }

  return response.json() as Promise<{ success: boolean; message: string }>;
}
