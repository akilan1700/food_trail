// File: src/services/googleMapsResolver.js
// Description: Secure resolver and parser for Google Maps URLs, extracting coordinates, place names, and addresses with SSRF protection.
// Author: Akilan M
// Created: 2026-09-20T20:03:12+05:30

const ALLOWED_HOSTNAMES = [
  'maps.app.goo.gl',
  'goo.gl',
  'google.com',
  'www.google.com',
  'maps.google.com',
  'google.co.in',
  'www.google.co.in',
  'maps.google.co.in',
];

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  /^localhost$/i,
];

/**
 * Validates if the given URL is a permitted Google Maps domain and does not target private IPs.
 * @param {string} urlString - URL to validate.
 * @returns {URL} Parsed and validated URL object.
 * @throws {Error} If URL is invalid, untrusted, or targeting private networks.
 */
function validateGoogleMapsUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    throw new Error('URL must be a non-empty string.');
  }

  const trimmed = urlString.trim();
  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    throw new Error('Invalid URL format.');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Invalid URL protocol. Only HTTP and HTTPS are permitted.');
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Check for localhost or private IPs
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new Error('Access to private or local networks is forbidden.');
    }
  }

  // Verify hostname belongs to Google Maps or Google domains
  const isAllowedHost =
    ALLOWED_HOSTNAMES.includes(hostname) ||
    /^(?:[a-z0-9-]+\.)*google\.(?:com|[a-z]{2}(?:\.[a-z]{2})?)$/i.test(hostname) ||
    hostname === 'maps.google.com' ||
    hostname.endsWith('.goo.gl');

  if (!isAllowedHost) {
    throw new Error('Untrusted URL host. Only valid Google Maps URLs are supported.');
  }

  return parsedUrl;
}

/**
 * Extracts coordinates and metadata directly from a Google Maps URL string.
 * @param {string} urlString - Google Maps URL or query string.
 * @returns {{ latitude: number, longitude: number, placeName?: string } | null} Extracted data or null if not found.
 */
function extractFromUrlString(urlString) {
  if (!urlString) return null;

  let latitude = null;
  let longitude = null;
  let placeName = null;

  // Pattern 1: /@<lat>,<lng>,<zoom>z
  const atMatch = urlString.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    latitude = parseFloat(atMatch[1]);
    longitude = parseFloat(atMatch[2]);
  }

  // Pattern 2: !3d<lat>!4d<lng> (standard Google Maps place data)
  if (latitude === null || longitude === null) {
    const d3d4Match = urlString.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (d3d4Match) {
      latitude = parseFloat(d3d4Match[1]);
      longitude = parseFloat(d3d4Match[2]);
    }
  }

  // Pattern 3: !2d<lng>!3d<lat> (embed pb parameter pattern)
  if (latitude === null || longitude === null) {
    const d2d3Match = urlString.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
    if (d2d3Match) {
      longitude = parseFloat(d2d3Match[1]);
      latitude = parseFloat(d2d3Match[2]);
    }
  }

  // Pattern 4: Query parameter ?q=<lat>,<lng> or ?ll=<lat>,<lng> or ?query=<lat>,<lng>
  if (latitude === null || longitude === null) {
    const queryMatch = urlString.match(/[?&](?:q|query|ll|daddr|saddr|loc:)=(-?\d+\.\d+)(?:,|%2C|\+)(-?\d+\.\d+)/i);
    if (queryMatch) {
      latitude = parseFloat(queryMatch[1]);
      longitude = parseFloat(queryMatch[2]);
    }
  }

  // Extract Place Name if present in /maps/place/<Place+Name>/
  const placeMatch = urlString.match(/\/maps\/place\/([^/@?]+)/);
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
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  ) {
    return { latitude, longitude, placeName: placeName || undefined };
  }

  return null;
}

/**
 * Parses coordinates from raw coordinate string formats (e.g. "11.9324, 79.8335" or DMS).
 * @param {string} input - Raw coordinates string.
 * @returns {{ latitude: number, longitude: number } | null}
 */
function parseRawCoordinates(input) {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  // Decimal Degrees: "11.932454, 79.833532" or "11.932454 79.833532"
  const ddMatch = trimmed.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
  if (ddMatch) {
    const lat = parseFloat(ddMatch[1]);
    const lng = parseFloat(ddMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
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

    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) };
    }
  }

  return null;
}

/**
 * Extracts metadata (title, og:url, og:title) from HTML response body.
 * @param {string} html - HTML string.
 * @returns {{ placeName?: string, ogUrl?: string }}
 */
function extractFromHtml(html) {
  if (!html || typeof html !== 'string') return {};

  let placeName;
  let ogUrl;

  const ogUrlMatch = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i);
  if (ogUrlMatch && ogUrlMatch[1]) {
    ogUrl = ogUrlMatch[1];
  }

  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (ogTitleMatch && ogTitleMatch[1]) {
    const title = ogTitleMatch[1].replace(/ - Google Maps.*$/i, '').trim();
    if (title && !title.toLowerCase().includes('google maps')) {
      placeName = title;
    }
  }

  if (!placeName) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      const title = titleMatch[1].replace(/ - Google Maps.*$/i, '').trim();
      if (title && !title.toLowerCase().includes('google maps')) {
        placeName = title;
      }
    }
  }

  return { placeName, ogUrl };
}

/**
 * Resolves a Google Maps link (shortened or full), following HTTP redirects securely,
 * and extracts latitude, longitude, place name, and resolved URL.
 * @param {string} inputUrl - URL or coordinates string.
 * @returns {Promise<{ latitude: number, longitude: number, placeName?: string, address?: string, resolvedUrl: string }>}
 */
async function resolveGoogleMapsUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') {
    throw new Error('Google Maps URL or coordinates required.');
  }

  const trimmed = inputUrl.trim();

  // If iframe embed code is pasted, extract src attribute
  const iframeMatch = trimmed.match(/src=["'](https?:\/\/[^"']+)["']/i);
  const targetString = iframeMatch ? iframeMatch[1] : trimmed;

  // 1. Check if raw coordinates were entered
  const rawCoords = parseRawCoordinates(targetString);
  if (rawCoords) {
    return {
      latitude: rawCoords.latitude,
      longitude: rawCoords.longitude,
      resolvedUrl: `https://www.google.com/maps/search/?api=1&query=${rawCoords.latitude},${rawCoords.longitude}`,
    };
  }

  // 2. Validate URL domain & security
  let currentUrl = validateGoogleMapsUrl(targetString);

  // 3. Fast direct extraction if full URL contains coordinates
  const directData = extractFromUrlString(currentUrl.toString());
  if (directData && (!currentUrl.hostname.includes('goo.gl') || directData.latitude !== null)) {
    return {
      latitude: directData.latitude,
      longitude: directData.longitude,
      placeName: directData.placeName,
      resolvedUrl: currentUrl.toString(),
    };
  }

  // 4. Follow redirects securely with hop limits
  const MAX_HOPS = 5;
  let hopCount = 0;
  let lastUrl = currentUrl.toString();
  let placeNameFromRedirect = null;

  while (hopCount < MAX_HOPS) {
    hopCount++;

    const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(5000)
      : undefined;

    const response = await fetch(lastUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal,
    });

    const locationHeader = response.headers.get('location');

    if (locationHeader && (response.status >= 300 && response.status < 400)) {
      const nextParsedUrl = new URL(locationHeader, lastUrl);
      // Validate redirect destination
      validateGoogleMapsUrl(nextParsedUrl.toString());
      lastUrl = nextParsedUrl.toString();

      const redirectExtract = extractFromUrlString(lastUrl);
      if (redirectExtract) {
        return {
          latitude: redirectExtract.latitude,
          longitude: redirectExtract.longitude,
          placeName: redirectExtract.placeName,
          resolvedUrl: lastUrl,
        };
      }
      continue;
    }

    // If terminal page reached, parse HTML
    const htmlText = await response.text();
    const htmlMeta = extractFromHtml(htmlText);

    if (htmlMeta.placeName) {
      placeNameFromRedirect = htmlMeta.placeName;
    }

    if (htmlMeta.ogUrl) {
      const ogExtract = extractFromUrlString(htmlMeta.ogUrl);
      if (ogExtract) {
        return {
          latitude: ogExtract.latitude,
          longitude: ogExtract.longitude,
          placeName: ogExtract.placeName || placeNameFromRedirect,
          resolvedUrl: htmlMeta.ogUrl,
        };
      }
    }

    // Try extracting from raw HTML string
    const htmlCoordExtract = extractFromUrlString(htmlText);
    if (htmlCoordExtract) {
      return {
        latitude: htmlCoordExtract.latitude,
        longitude: htmlCoordExtract.longitude,
        placeName: htmlCoordExtract.placeName || placeNameFromRedirect,
        resolvedUrl: lastUrl,
      };
    }

    break;
  }

  // Final check on resolved URL
  const finalExtract = extractFromUrlString(lastUrl);
  if (finalExtract) {
    return {
      latitude: finalExtract.latitude,
      longitude: finalExtract.longitude,
      placeName: finalExtract.placeName || placeNameFromRedirect,
      resolvedUrl: lastUrl,
    };
  }

  throw new Error(
    'Could not extract latitude and longitude from the provided Google Maps link. Please verify the URL or enter coordinates manually.'
  );
}

module.exports = {
  validateGoogleMapsUrl,
  extractFromUrlString,
  parseRawCoordinates,
  resolveGoogleMapsUrl,
};
