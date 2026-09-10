// File: src/app/add-spot/page.tsx
// Description: User-facing page to add new dining spots with background location pin capture and Google Maps integration.
// Author: Akilan M
// Created: 2026-08-12T17:46:00+05:30

'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation, Plus, X, ArrowLeft, Loader2, MapPin, ExternalLink, CheckCircle2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { createRestaurant } from '../services/api';
import { useAppSelector } from '../services/hooks';
import { selectDetectedCity, selectDetectedLatitude, selectDetectedLongitude } from '../services/authSlice';
import PhotoUpload from '../components/PhotoUpload';
import AddDishModal from '../components/AddDishModal';

export default function AddSpotPage() {
  const router = useRouter();
  const detectedCity = useAppSelector(selectDetectedCity);
  const detectedLat = useAppSelector(selectDetectedLatitude);
  const detectedLng = useAppSelector(selectDetectedLongitude);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [vibeInput, setVibeInput] = useState('');
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAddDishOpen, setIsAddDishOpen] = useState(false);
  const [createdSpot, setCreatedSpot] = useState<{
    id: string;
    name: string;
    area: string;
    lat: number;
    lng: number;
  } | null>(null);

  // Sync client-side detected location on mount to avoid SSR hydration mismatches
  useEffect(() => {
    if (detectedCity && !area) {
      setArea(detectedCity);
    }
    if (detectedLat && !latitude) {
      setLatitude(detectedLat.toFixed(6));
    }
    if (detectedLng && !longitude) {
      setLongitude(detectedLng.toFixed(6));
    }
  }, [detectedCity, detectedLat, detectedLng, area, latitude, longitude]);

  /**
   * Adds a new vibe tag to the restaurant's vibe list.
   */
  const addVibeTag = (): void => {
    const trimmed = vibeInput.trim();
    if (trimmed && !vibeTags.includes(trimmed)) {
      setVibeTags([...vibeTags, trimmed]);
      setVibeInput('');
    }
  };

  /**
   * Removes an existing vibe tag from the list.
   * @param tag - Tag name to remove.
   */
  const removeVibeTag = (tag: string): void => {
    setVibeTags(vibeTags.filter((t) => t !== tag));
  };

  /**
   * Captures the current GPS location pin in the background via HTML5 Geolocation API.
   * Optimized for PWA standalone execution and mobile browsers.
   */
  const handleGetCurrentLocation = (): void => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setLocationLoading(true);
    setErrorMsg('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocationLoading(false);
      },
      (error) => {
        console.error('Error getting location pin:', error);
        let errorReason = error.message;
        if (error.code === 1) {
          errorReason = 'Location permission was denied. Please allow location access in your device settings.';
        } else if (error.code === 2) {
          errorReason = 'Location unavailable. Please check your GPS signal.';
        } else if (error.code === 3) {
          errorReason = 'Location request timed out. Please try again.';
        }
        setErrorMsg(`Failed to retrieve location pin: ${errorReason}`);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  /**
   * Handles form submission to validate inputs and publish the new dining spot.
   * @param e - Form submit event.
   */
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setErrorMsg('');

    // Field Validations
    if (!name.trim()) {
      setErrorMsg('Spot name is required.');
      return;
    }

    if (!area.trim()) {
      setErrorMsg('Area is required.');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setErrorMsg('Please pin the spot location by clicking "Pin Current Location".');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setErrorMsg('Invalid coordinates captured. Please pin the location again.');
      return;
    }

    setLoading(true);
    try {
      const newSpot = await createRestaurant({
        name: name.trim(),
        description: description.trim() || undefined,
        area: area.trim(),
        coordinates: [lng, lat], // Backend expects [longitude, latitude]
        vibeTags,
        photoUrl: photoUrl || undefined,
      });

      setCreatedSpot({
        id: newSpot._id,
        name: newSpot.name,
        area: newSpot.area,
        lat,
        lng,
      });
    } catch (err) {
      console.error('Failed to create restaurant:', err);
      const message = err instanceof Error ? err.message : 'Error adding spot. Please try again.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resets form state to allow adding another dining spot.
   */
  const handleResetForm = (): void => {
    setName('');
    setDescription('');
    setArea(detectedCity || '');
    setLatitude('');
    setLongitude('');
    setVibeInput('');
    setVibeTags([]);
    setPhotoUrl('');
    setErrorMsg('');
    setCreatedSpot(null);
    setIsAddDishOpen(false);
  };

  const hasPinnedLocation = Boolean(latitude && longitude);
  const currentPinMapsUrl = hasPinnedLocation ? `https://www.google.com/maps?q=${latitude},${longitude}` : '#';

  return (
    <div className="max-w-[700px] mx-auto animate-fade-in py-4 md:py-8">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-all duration-300">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Search
        </Link>
      </div>

      <section className="mb-8">
        <h1 className="text-3xl font-extrabold mb-2">Add New Dining Spot</h1>
        <p className="text-text-secondary">Mark a restaurant or cafe, pin its location, and share it with the community.</p>
      </section>

      {createdSpot ? (
        <div className="bg-bg-secondary/20 border border-white/8 rounded-lg p-6 md:p-8 glass-panel shadow-2xl animate-fade-in text-center space-y-6">
          <div className="w-16 h-16 bg-status-green/10 border border-status-green/30 text-status-green rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(34,197,94,0.2)]">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-1">{createdSpot.name}</h2>
            <p className="text-text-secondary text-sm flex items-center justify-center gap-1.5">
              <MapPin className="w-4 h-4 text-accent" />
              <span>{createdSpot.area}</span>
            </p>
          </div>

          <div className="p-4 bg-bg-tertiary/30 border border-white/5 rounded-md max-w-md mx-auto">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1 font-semibold">Location Pin Configured</p>
            <p className="text-sm text-text-secondary font-mono">
              Lat: {createdSpot.lat.toFixed(5)}, Lng: {createdSpot.lng.toFixed(5)}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsAddDishOpen(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-rose-600 hover:from-accent-hover hover:to-rose-700 text-white font-bold px-6 py-3.5 rounded shadow-lg transition-all duration-300 transform hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Signature Dish</span>
            </button>

            <a
              href={`https://www.google.com/maps?q=${createdSpot.lat},${createdSpot.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-bg-tertiary/60 border border-white/10 hover:bg-bg-tertiary text-text-primary font-semibold px-6 py-3.5 rounded transition-all duration-300"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Google Maps</span>
            </a>

            <button
              type="button"
              onClick={handleResetForm}
              className="flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 text-text-secondary hover:text-text-primary border border-white/10 font-semibold px-5 py-3.5 rounded transition-all duration-300 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Spot</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleResetForm();
                router.push('/');
              }}
              className="flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 text-text-secondary hover:text-text-primary border border-white/10 font-semibold px-5 py-3.5 rounded transition-all duration-300 cursor-pointer"
            >
              <span>Done</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 bg-bg-secondary/20 border border-white/8 rounded-lg p-6 md:p-8 glass-panel shadow-2xl">
          {/* Restaurant Name */}
          <div>
            <label htmlFor="spotName" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Spot Name <span className="text-accent">*</span>
            </label>
            <input
              id="spotName"
              type="text"
              required
              disabled={loading}
              placeholder="e.g. Baker Street Cafe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-tertiary/40 border border-white/8 rounded p-3 text-text-primary focus:outline-none focus:border-accent transition-all duration-300"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="spotDescription" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              id="spotDescription"
              disabled={loading}
              placeholder="What makes this spot special? (e.g. Known for wood-fired pizzas)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 bg-bg-tertiary/40 border border-white/8 rounded p-3 text-text-primary focus:outline-none focus:border-accent transition-all duration-300 resize-none"
            />
          </div>

          {/* Area Text Box */}
          <div>
            <label htmlFor="spotArea" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Area <span className="text-accent">*</span>
            </label>
            <input
              id="spotArea"
              type="text"
              required
              disabled={loading}
              placeholder="e.g. White Town, MG Road, Indiranagar"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full bg-bg-tertiary/40 border border-white/8 rounded p-3 text-text-primary focus:outline-none focus:border-accent transition-all duration-300"
            />
          </div>

          {/* Location Pin Capture Section (Background GPS) */}
          <div className="p-4 bg-bg-tertiary/20 border border-white/8 rounded-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                  Location Pin <span className="text-accent">*</span>
                </label>
                <p className="text-xs text-text-secondary mt-0.5">
                  Coordinates are captured automatically in the background.
                </p>
              </div>

              <button
                type="button"
                disabled={locationLoading || loading}
                onClick={handleGetCurrentLocation}
                className="flex items-center justify-center gap-2 bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 font-semibold px-4 py-2.5 rounded transition-all duration-300 disabled:opacity-50 shrink-0 text-sm"
              >
                {locationLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Pinning Location...</span>
                  </>
                ) : hasPinnedLocation ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Re-pin Current Location</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span>Pin Current Location</span>
                  </>
                )}
              </button>
            </div>

            {hasPinnedLocation ? (
              <div className="flex items-center justify-between p-3 bg-status-green/10 border border-status-green/20 rounded text-xs text-status-green animate-fade-in flex-wrap gap-2">
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 shrink-0 text-status-green" />
                  <span>Pin Location Active ({latitude}, {longitude})</span>
                </div>
                <a
                  href={currentPinMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline text-xs hover:text-white transition-colors"
                >
                  <span>Preview on Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="p-3 bg-bg-primary/40 border border-dashed border-white/10 rounded text-xs text-text-muted flex items-center gap-2">
                <MapPin className="w-4 h-4 text-text-muted shrink-0" />
                <span>No location pin set yet. Click &ldquo;Pin Current Location&rdquo; to attach your coordinates.</span>
              </div>
            )}
          </div>

          {/* Vibe Tags */}
          <div>
            <label htmlFor="vibeInput" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Vibe Tags (e.g. Cozy, Pet-friendly, Outdoor)
            </label>
            <div className="flex gap-2 mb-3">
              <input
                id="vibeInput"
                type="text"
                disabled={loading}
                placeholder="Add a vibe..."
                value={vibeInput}
                onChange={(e) => setVibeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addVibeTag();
                  }
                }}
                className="flex-grow bg-bg-tertiary/40 border border-white/8 rounded p-3 text-text-primary focus:outline-none focus:border-accent transition-all duration-300"
              />
              <button
                type="button"
                disabled={loading}
                onClick={addVibeTag}
                className="px-4 bg-bg-tertiary/60 border border-white/8 text-text-primary rounded font-semibold hover:bg-bg-tertiary transition-all duration-300"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Vibe tag list */}
            {vibeTags.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-bg-tertiary/20 border border-white/5 rounded">
                {vibeTags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 bg-accent/10 border border-accent/20 text-accent text-xs font-semibold px-2.5 py-1 rounded-full animate-fade-in"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeVibeTag(tag)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Photo Upload */}
          <div>
            <PhotoUpload
              value={photoUrl}
              folder="spots"
              onUploadSuccess={(fileId) => setPhotoUrl(fileId)}
              onClear={() => setPhotoUrl('')}
              label="Upload Dining Spot Photo"
            />
          </div>

          {/* Form error notification */}
          {errorMsg && (
            <div className="text-red-500 font-medium bg-red-500/10 p-3.5 rounded border border-red-500/20 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-rose-600 hover:from-accent-hover hover:to-rose-700 text-white font-extrabold p-4 rounded shadow-lg transition-all duration-300 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Publishing Spot...</span>
              </>
            ) : (
              <span>Publish Spot</span>
            )}
          </button>
        </form>
      )}

      {createdSpot && (
        <AddDishModal
          isOpen={isAddDishOpen}
          restaurantId={createdSpot.id}
          restaurantName={createdSpot.name}
          onClose={() => setIsAddDishOpen(false)}
          onDishAdded={() => {
            setIsAddDishOpen(false);
          }}
        />
      )}
    </div>
  );
}
