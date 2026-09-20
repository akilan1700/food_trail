// File: src/utils/googleMapsParser.ts
// Description: Client-side parser and validator for Google Maps links, coordinates, DMS strings, and embed iframes.
// Author: Akilan M
// Created: 2026-09-20T20:03:12+05:30

export interface ParsedLocationResult {
  latitude: number;
  longitude: number;
  placeName?: string;
  isShortUrl?: boolean;
  resolvedSource?: string;
}

/**
 * Checks if a given URL string is a shortened Google Maps redirect URL.
 * Shortened URLs like maps.app.goo.gl or goo.gl/maps do not contain coordinates
 * in the string and need server-side redirect resolution.
 *
 * @param input - The URL string to inspect.
 * @returns Boolean true if the URL is a short link.
 */
export function isShortGoogleMapsUrl(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  return (
    trimmed.includes('maps.app.goo.gl') ||
    trimmed.includes('goo.gl/maps') ||
    /\/maps\/p\//i.test(trimmed)
  );
}

/**
 * Validates that the latitude and longitude are within standard geographical boundaries.
 *
 * @param lat - Latitude in degrees (-90 to 90).
 * @param lng - Longitude in degrees (-180 to 180).
 * @returns True if both values are valid numbers within range.
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Parses raw coordinate strings formatted as decimal degrees (e.g. "11.9324, 79.8335")
 * or Degrees Minutes Seconds (e.g. 11°55'56.8"N 79°50'00.7"E).
 *
 * @param input - Raw coordinate string.
 * @returns Object with parsed latitude and longitude or null.
 */
export function parseRawCoordinates(input: string): { latitude: number; longitude: number } | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Decimal Degrees: "11.932454, 79.833532" or "11.932454 79.833532"
  const ddMatch = trimmed.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
  if (ddMatch) {
    const lat = parseFloat(ddMatch[1]);
    const lng = parseFloat(ddMatch[2]);
    if (isValidCoordinates(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  // Degrees Minutes Seconds: 11°55'56.8"N 79°50'00.7"E
  const dmsMatch = trimmed.match(
    /(\d{1,2})°\s*(\d{1,2})['′]\s*([\d.]+)?["″]?\s*([NSns])[,\s]+(\d{1,3})°\s*(\d{1,2})['′]\s*([\d.]+)?["″]?\s*([EWew])/
  );
  if (dmsMatch) {
    const latDeg = parseFloat(dmsMatch[1]);
    const latMin = parseFloat(dmsMatch[2]);
    const latSec = dmsMatch[3] ? parseFloat(dmsMatch[3]) : 0;
    const latDir = dmsMatch[4].toUpperCase();

    const lngDeg = parseFloat(dmsMatch[5]);
    const lngMin = parseFloat(dmsMatch[6]);
    const lngSec = dmsMatch[7] ? parseFloat(dmsMatch[7]) : 0;
    const lngDir = dmsMatch[8].toUpperCase();

    let lat = latDeg + latMin / 60 + latSec / 3600;
    if (latDir === 'S') lat = -lat;

    let lng = lngDeg + lngMin / 60 + lngSec / 3600;
    if (lngDir === 'W') lng = -lng;

    if (isValidCoordinates(lat, lng)) {
      return {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
      };
    }
  }

  return null;
}

/**
 * Attempts to parse Google Maps URL strings, iframe embeds, and queries directly on the client side.
 *
 * @param input - The raw input string pasted by the user.
 * @returns Parsed location data or null if not extractable on client.
 */
export function parseClientGoogleMapsInput(input: string): ParsedLocationResult | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  // If iframe embed tag is pasted, extract the src URL
  const iframeMatch = trimmed.match(/src=["'](https?:\/\/[^"']+)["']/i);
  const target = iframeMatch ? iframeMatch[1] : trimmed;

  // 1. Check raw coordinates
  const rawCoords = parseRawCoordinates(target);
  if (rawCoords) {
    return {
      latitude: rawCoords.latitude,
      longitude: rawCoords.longitude,
      resolvedSource: 'raw_coordinates',
    };
  }

  // 2. Short URL detection
  if (isShortGoogleMapsUrl(target)) {
    return {
      latitude: 0,
      longitude: 0,
      isShortUrl: true,
      resolvedSource: 'short_url_redirect',
    };
  }

  let latitude: number | null = null;
  let longitude: number | null = null;
  let placeName: string | undefined = undefined;

  // Pattern A: /@<lat>,<lng>,<zoom>z
  const atMatch = target.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    latitude = parseFloat(atMatch[1]);
    longitude = parseFloat(atMatch[2]);
  }

  // Pattern B: !3d<lat>!4d<lng>
  if (latitude === null || longitude === null) {
    const d3d4Match = target.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (d3d4Match) {
      latitude = parseFloat(d3d4Match[1]);
      longitude = parseFloat(d3d4Match[2]);
    }
  }

  // Pattern C: !2d<lng>!3d<lat> (embed pb parameter)
  if (latitude === null || longitude === null) {
    const d2d3Match = target.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
    if (d2d3Match) {
      longitude = parseFloat(d2d3Match[1]);
      latitude = parseFloat(d2d3Match[2]);
    }
  }

  // Pattern D: Query parameter ?q=<lat>,<lng> or ?ll=<lat>,<lng> or ?query=<lat>,<lng>
  if (latitude === null || longitude === null) {
    const queryMatch = target.match(
      /[?&](?:q|query|ll|daddr|saddr|loc:)=(-?\d+\.\d+)(?:,|%2C|\+)(-?\d+\.\d+)/i
    );
    if (queryMatch) {
      latitude = parseFloat(queryMatch[1]);
      longitude = parseFloat(queryMatch[2]);
    }
  }

  // Extract Place Name from /maps/place/<Place+Name>/
  const placeMatch = target.match(/\/maps\/place\/([^/@?]+)/);
  if (placeMatch && placeMatch[1]) {
    try {
      const rawName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
      if (rawName && !/^[-0-9.,+]+$/.test(rawName)) {
        placeName = rawName;
      }
    } catch {
      // Ignore URI decode errors
    }
  }

  if (
    latitude !== null &&
    longitude !== null &&
    isValidCoordinates(latitude, longitude)
  ) {
    return {
      latitude,
      longitude,
      placeName,
      resolvedSource: 'client_regex',
    };
  }

  return null;
}

/**
 * Builds a direct Google Maps search link from a query string (e.g. spot name + area).
 *
 * @param query - The search query term.
 * @returns Full Google Maps web URL.
 */
export function buildGoogleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Builds a direct Google Maps pin view link for specific latitude and longitude coordinates.
 *
 * @param lat - Latitude.
 * @param lng - Longitude.
 * @returns Direct Google Maps URL centered on coordinates.
 */
export function buildGoogleMapsPinUrl(lat: number | string, lng: number | string): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
