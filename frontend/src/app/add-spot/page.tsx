// File: src/app/add-spot/page.tsx
// Description: User-facing page to add new dining spots (restaurants) with photos and coordinates.
// Author: Akilan M
// Created: 2026-08-12T17:46:00+05:30

'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Navigation, Plus, X, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { createRestaurant } from '../services/api';
import PhotoUpload from '../components/PhotoUpload';

export default function AddSpotPage() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('White Town');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [vibeInput, setVibeInput] = useState('');
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle adding vibe tags
  const addVibeTag = () => {
    const trimmed = vibeInput.trim();
    if (trimmed && !vibeTags.includes(trimmed)) {
      setVibeTags([...vibeTags, trimmed]);
      setVibeInput('');
    }
  };

  // Remove vibe tag
  const removeVibeTag = (tag: string) => {
    setVibeTags(vibeTags.filter((t) => t !== tag));
  };

  // Use HTML5 Geolocation API to auto-fill latitude and longitude
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocationLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert(`Failed to retrieve your location: ${error.message}`);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle submit form
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Field Validations
    if (!name.trim()) {
      setErrorMsg('Restaurant name is required.');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setErrorMsg('Please enter valid numerical latitude and longitude.');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setErrorMsg('Latitude must be between -90 and 90. Longitude must be between -180 and 180.');
      return;
    }

    setLoading(true);
    try {
      await createRestaurant({
        name,
        description,
        address,
        area,
        coordinates: [lng, lat], // Backend expects [longitude, latitude]
        vibeTags,
        photoUrl: photoUrl || undefined,
      });

      setSuccessMsg('Culinary spot added successfully! Redirecting...');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err) {
      console.error('Failed to create restaurant:', err);
      const message = err instanceof Error ? err.message : 'Error adding spot. Please try again.';
      setErrorMsg(message);
      setLoading(false);
    }
  };

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
        <p className="text-text-secondary">Mark a restaurant or cafe, upload a photo, and share it with the community.</p>
      </section>

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

        {/* Address */}
        <div>
          <label htmlFor="spotAddress" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
            Address
          </label>
          <input
            id="spotAddress"
            type="text"
            disabled={loading}
            placeholder="e.g. 12 Bussy Street, White Town"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-bg-tertiary/40 border border-white/8 rounded p-3 text-text-primary focus:outline-none focus:border-accent transition-all duration-300"
          />
        </div>

        {/* Grid for Area & Coordinates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Area */}
          <div>
            <label htmlFor="spotArea" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Area <span className="text-accent">*</span>
            </label>
            <select
              id="spotArea"
              value={area}
              disabled={loading}
              onChange={(e) => setArea(e.target.value)}
              className="w-full bg-bg-tertiary/40 border border-white/8 rounded p-3 text-text-primary focus:outline-none focus:border-accent transition-all duration-300"
            >
              <option value="White Town" className="bg-bg-primary text-text-primary">White Town</option>
              <option value="Auroville Road" className="bg-bg-primary text-text-primary">Auroville Road</option>
              <option value="Heritage Town" className="bg-bg-primary text-text-primary">Heritage Town</option>
              <option value="Others" className="bg-bg-primary text-text-primary">Others</option>
            </select>
          </div>

          {/* Coordinates Actions */}
          <div className="flex flex-col justify-end">
            <button
              type="button"
              disabled={locationLoading || loading}
              onClick={handleGetCurrentLocation}
              className="flex items-center justify-center gap-2 bg-accent/10 border border-accent/20 text-accent font-semibold p-3 rounded hover:bg-accent/20 transition-all duration-300 disabled:opacity-50"
            >
              {locationLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  <span>Get Current Coordinates</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Latitude & Longitude Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="spotLatitude" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Latitude <span className="text-accent">*</span>
            </label>
            <input
              id="spotLatitude"
              type="text"
              required
              disabled={loading}
              placeholder="e.g. 11.9344"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="w-full bg-bg-tertiary/40 border border-white/8 rounded p-3 text-text-primary focus:outline-none focus:border-accent transition-all duration-300"
            />
          </div>
          <div>
            <label htmlFor="spotLongitude" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Longitude <span className="text-accent">*</span>
            </label>
            <input
              id="spotLongitude"
              type="text"
              required
              disabled={loading}
              placeholder="e.g. 79.8306"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="w-full bg-bg-tertiary/40 border border-white/8 rounded p-3 text-text-primary focus:outline-none focus:border-accent transition-all duration-300"
            />
          </div>
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
            onUploadSuccess={(fileId) => setPhotoUrl(fileId)}
            label="Upload Dining Spot Photo"
          />
        </div>

        {/* Form status notification */}
        {errorMsg && (
          <div className="text-red-500 font-medium bg-red-500/10 p-3.5 rounded border border-red-500/20 text-sm">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="text-green-500 font-medium bg-green-500/10 p-3.5 rounded border border-green-500/20 text-sm">
            {successMsg}
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
              <span>Creating Spot...</span>
            </>
          ) : (
            <span>Publish Spot</span>
          )}
        </button>
      </form>
    </div>
  );
}
