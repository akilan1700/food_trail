// File: src/components/GoogleMapsLocationInput.tsx
// Description: Interactive Google Maps link parser, coordinate extractor, and visual verification widget for Admin spot management.
// Author: Akilan M
// Created: 2026-09-20T20:03:12+05:30

'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Search,
  ExternalLink,
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  parseClientGoogleMapsInput,
  buildGoogleMapsSearchUrl,
  buildGoogleMapsPinUrl,
  isValidCoordinates,
} from '../utils/googleMapsParser';
import { resolveGoogleMapsUrl } from '../services/api';

interface GoogleMapsLocationInputProps {
  latitude: string;
  longitude: string;
  onChangeCoordinates: (lat: string, lng: string) => void;
  currentSpotName?: string;
  currentArea?: string;
  onSuggestName?: (name: string) => void;
}

/**
 * GoogleMapsLocationInput enables administrators to paste any Google Maps share link,
 * web URL, iframe embed code, or coordinates to extract verified latitude/longitude automatically.
 */
export default function GoogleMapsLocationInput({
  latitude,
  longitude,
  onChangeCoordinates,
  currentSpotName = '',
  currentArea = '',
  onSuggestName,
}: GoogleMapsLocationInputProps) {
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [suggestedName, setSuggestedName] = useState<string | null>(null);
  const [showManualInputs, setShowManualInputs] = useState(false);
  const [showMapPreview, setShowMapPreview] = useState(true);

  const hasValidCoords =
    Boolean(latitude && longitude) &&
    isValidCoordinates(parseFloat(latitude), parseFloat(longitude));

  /**
   * Performs resolution of the user input string via client regex or backend API.
   * @param rawInput - URL or coordinate string to extract.
   */
  const handleExtractLocation = async (rawInput?: string): Promise<void> => {
    const textToParse = (rawInput ?? inputUrl).trim();
    if (!textToParse) {
      setErrorMsg('Please paste a Google Maps link or enter coordinates.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setSuggestedName(null);

    try {
      // 1. Attempt client-side instant extraction
      const clientParsed = parseClientGoogleMapsInput(textToParse);

      if (clientParsed && !clientParsed.isShortUrl) {
        onChangeCoordinates(
          clientParsed.latitude.toFixed(6),
          clientParsed.longitude.toFixed(6)
        );
        setSuccessMsg(`Extracted coordinates: ${clientParsed.latitude.toFixed(5)}, ${clientParsed.longitude.toFixed(5)}`);
        if (clientParsed.placeName) {
          setSuggestedName(clientParsed.placeName);
        }
        setLoading(false);
        return;
      }

      // 2. If it's a shortened URL or requires server-side redirect following
      const serverData = await resolveGoogleMapsUrl(textToParse);
      onChangeCoordinates(
        serverData.latitude.toFixed(6),
        serverData.longitude.toFixed(6)
      );
      setSuccessMsg(
        `Resolved Google Maps location: ${serverData.latitude.toFixed(5)}, ${serverData.longitude.toFixed(5)}`
      );

      if (serverData.placeName) {
        setSuggestedName(serverData.placeName);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extract location from link.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reads link directly from administrator's clipboard.
   */
  const handlePasteClipboard = async (): Promise<void> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputUrl(text);
          await handleExtractLocation(text);
        }
      }
    } catch {
      setErrorMsg('Unable to read clipboard. Please paste manually into the input box.');
    }
  };

  /**
   * Clears the input and status messages.
   */
  const handleClear = (): void => {
    setInputUrl('');
    setErrorMsg('');
    setSuccessMsg('');
    setSuggestedName(null);
  };

  const searchQuery = [currentSpotName, currentArea].filter(Boolean).join(' ');
  const googleSearchUrl = buildGoogleMapsSearchUrl(searchQuery || 'restaurants near me');
  const googlePinUrl = hasValidCoords
    ? buildGoogleMapsPinUrl(latitude, longitude)
    : null;

  // OpenStreetMap embed URL for live visual confirmation
  const osmEmbedUrl = hasValidCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(longitude) - 0.005}%2C${parseFloat(latitude) - 0.003}%2C${parseFloat(longitude) + 0.005}%2C${parseFloat(latitude) + 0.003}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : null;

  return (
    <div className="p-4 rounded-xl bg-bg-tertiary/40 border border-white/10 space-y-3.5">
      {/* Header & Helpers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/15 text-accent">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Spot Location via Google Maps
            </h4>
            <p className="text-[0.7rem] text-text-muted">
              Paste any Google Maps link, share URL, embed code, or coordinates.
            </p>
          </div>
        </div>

        {/* Quick External Search Helper */}
        <a
          href={googleSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[0.7rem] text-accent hover:text-accent-hover font-semibold transition-colors self-start sm:self-auto"
          title="Search this spot on Google Maps in a new tab"
        >
          <Search className="w-3 h-3" />
          <span>Find Spot on Google Maps</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
        </a>
      </div>

      {/* Input Box & Action Buttons */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Paste Google Maps URL (e.g. https://maps.app.goo.gl/... or @11.9324,79.8335)"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleExtractLocation();
                }
              }}
              className="w-full pl-3 pr-8 py-2 bg-bg-secondary border border-white/10 rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            {inputUrl && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
                title="Clear input"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handlePasteClipboard}
            className="px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary border border-white/10 text-xs font-medium flex items-center gap-1 transition-colors shrink-0"
            title="Paste from clipboard"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Paste</span>
          </button>

          <button
            type="button"
            disabled={loading || !inputUrl.trim()}
            onClick={() => handleExtractLocation()}
            className="btn-primary py-2 px-3.5 text-xs font-bold shrink-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Resolving...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Extract Pin</span>
              </>
            )}
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[0.7rem] font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[0.7rem] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Suggested Spot Name chip */}
        {suggestedName && onSuggestName && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-accent/10 border border-accent/20 text-xs">
            <div className="flex items-center gap-1.5 text-text-primary">
              <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="text-[0.7rem] text-text-muted">Detected Place:</span>
              <strong className="text-accent font-bold text-xs truncate max-w-[200px]">
                {suggestedName}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => {
                onSuggestName(suggestedName);
                setSuggestedName(null);
              }}
              className="px-2 py-0.5 rounded bg-accent text-white font-bold text-[0.65rem] hover:bg-accent-hover transition-colors"
            >
              Use this Name
            </button>
          </div>
        )}
      </div>

      {/* Coordinate Status & Preview Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5 text-xs">
        <div className="flex items-center gap-2">
          {hasValidCoords ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[0.7rem] font-bold">
              <CheckCircle2 className="w-3 h-3" />
              <span>
                {parseFloat(latitude).toFixed(4)}° N, {parseFloat(longitude).toFixed(4)}° E
              </span>
            </span>
          ) : (
            <span className="text-[0.7rem] text-amber-400 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>Location pin pending</span>
            </span>
          )}

          {googlePinUrl && (
            <a
              href={googlePinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.7rem] text-text-secondary hover:text-accent font-medium flex items-center gap-1 transition-colors"
              title="Verify pin on Google Maps"
            >
              <span>View in Google Maps</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasValidCoords && (
            <button
              type="button"
              onClick={() => setShowMapPreview(!showMapPreview)}
              className="text-[0.7rem] text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors cursor-pointer"
            >
              {showMapPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showMapPreview ? 'Hide Map' : 'Show Map'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowManualInputs(!showManualInputs)}
            className="text-[0.7rem] text-text-muted hover:text-accent font-medium underline underline-offset-2 transition-colors cursor-pointer"
          >
            {showManualInputs ? 'Hide Numeric Coordinates' : 'Edit Coordinates Manually'}
          </button>
        </div>
      </div>

      {/* Visual Map Pin Preview */}
      {showMapPreview && osmEmbedUrl && (
        <div className="relative rounded-lg overflow-hidden border border-white/10 bg-bg-secondary h-44 w-full animate-fade-in shadow-inner">
          <iframe
            title="Location Pin Preview"
            src={osmEmbedUrl}
            className="w-full h-full border-0 pointer-events-none opacity-90"
            loading="lazy"
          />
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[0.65rem] text-text-muted font-medium border border-white/10">
            Pin preview at ({latitude}, {longitude})
          </div>
        </div>
      )}

      {/* Collapsible Manual Coordinate Fields */}
      {showManualInputs && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 animate-fade-in">
          <div>
            <label className="block text-[0.65rem] font-bold text-text-muted uppercase tracking-wider mb-1">
              Latitude (Decimal)
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="e.g. 11.932454"
              value={latitude}
              onChange={(e) => onChangeCoordinates(e.target.value, longitude)}
              className="w-full px-3 py-1.5 bg-bg-secondary border border-white/10 rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent font-mono"
            />
          </div>
          <div>
            <label className="block text-[0.65rem] font-bold text-text-muted uppercase tracking-wider mb-1">
              Longitude (Decimal)
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="e.g. 79.833532"
              value={longitude}
              onChange={(e) => onChangeCoordinates(latitude, e.target.value)}
              className="w-full px-3 py-1.5 bg-bg-secondary border border-white/10 rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}
