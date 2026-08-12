// File: src/app/services/api.ts
// Description: Unified API service module containing typed fetch operations and shared typescript models.
// Author: Akilan M
// Created: 2026-08-12T14:21:00+05:30

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
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
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
export async function createSharedTrip(restaurantIds: string[]): Promise<{ shareId: string }> {
  return apiRequest<{ shareId: string }>('/trips', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ restaurantIds }),
  });
}

/**
 * Fetch a shared trip by its share ID.
 */
export async function getSharedTrip(id: string): Promise<SavedTrip> {
  return apiRequest<SavedTrip>(`/trips/${id}`);
}
