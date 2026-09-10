// File: src/app/my-spots/page.tsx
// Description: Dedicated page displaying all dining spots and cafes created and submitted by the authenticated user.
// Author: Akilan M
// Created: 2026-09-10T12:17:35+05:30

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getMySpots,
  updateBusyStatus,
  Restaurant,
  formatPhotoUrl,
  getGoogleMapsUrl,
} from '../services/api';
import { useAppSelector } from '../services/hooks';
import { selectCurrentUser } from '../services/authSlice';
import AddDishModal from '../components/AddDishModal';
import {
  Store,
  MapPin,
  Plus,
  PlusCircle,
  ExternalLink,
  Navigation,
  Loader2,
  Sparkles,
  ArrowLeft,
  Calendar,
} from 'lucide-react';

const BUSY_STATUSES = ['Plenty of Tables', 'Filling Up', '~15 Min Wait', 'Closed'] as const;

export default function MySpotsPage() {
  const user = useAppSelector(selectCurrentUser);
  const router = useRouter();

  const [mySpots, setMySpots] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddDishRest, setSelectedAddDishRest] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    async function loadUserSpots() {
      try {
        setLoading(true);
        const data = await getMySpots();
        setMySpots(data);
      } catch (err) {
        console.error('Failed to load user spots:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserSpots();
  }, [user, router]);

  const handleBusyStatusChange = async (spotId: string, newStatus: Restaurant['busyStatus']) => {
    // Optimistically update UI
    setMySpots((prev) =>
      prev.map((s) => (s._id === spotId ? { ...s, busyStatus: newStatus } : s))
    );

    try {
      await updateBusyStatus(spotId, newStatus);
    } catch (err) {
      console.error('Failed to update spot busy status:', err);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-[960px] mx-auto py-6 md:py-10 px-4 animate-fade-in space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-white/8 relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-widest mb-1">
            <Store className="w-3.5 h-3.5" />
            <span>My Community Submissions</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight">
            Spots You Have Added
          </h1>
          <p className="text-xs md:text-sm text-text-secondary mt-1">
            Manage your registered dining spots, update live table statuses, and add signature menu items.
          </p>
        </div>

        <Link
          href="/add-spot"
          className="flex items-center gap-2 px-5 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-lg shadow-accent/20 transition-all self-start sm:self-auto shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Another Spot</span>
        </Link>
      </div>

      {/* Spots List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <span className="text-xs text-text-secondary">Loading your submitted spots...</span>
        </div>
      ) : mySpots.length === 0 ? (
        <div className="p-12 rounded-2xl glass-panel border border-white/8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto">
            <Store className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-bold text-text-primary">No Spots Added Yet</h2>
            <p className="text-xs text-text-secondary mt-1">
              You haven&apos;t added any dining spots yet. Discover a great cafe, bakery, or street eatery? Share it with the community!
            </p>
          </div>
          <Link
            href="/add-spot"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg shadow-lg shadow-accent/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Spot</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mySpots.map((spot) => (
            <div
              key={spot._id}
              className="rounded-2xl overflow-hidden glass-panel border border-white/8 flex flex-col justify-between group hover:border-accent/30 transition-all shadow-xl"
            >
              {/* Photo & Header */}
              <div>
                <div className="relative h-48 w-full bg-bg-tertiary overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formatPhotoUrl(spot.photoUrl)}
                    alt={spot.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Area Badge */}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-xs font-bold text-white border border-white/10 flex items-center gap-1.5 shadow-md">
                    <MapPin className="w-3 h-3 text-accent" />
                    <span>{spot.area}</span>
                  </div>

                  {/* Rating Badge */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-500 text-black text-xs font-black shadow-md flex items-center gap-1">
                    <span>★</span>
                    <span>{spot.rating || 4.5}</span>
                  </div>
                </div>

                {/* Spot Details */}
                <div className="p-5 space-y-3">
                  <div>
                    <h2 className="text-xl font-bold text-text-primary group-hover:text-accent transition-colors">
                      {spot.name}
                    </h2>
                    {spot.address && (
                      <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                        <span>{spot.address}</span>
                      </p>
                    )}
                  </div>

                  {spot.description && (
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                      {spot.description}
                    </p>
                  )}

                  {/* Vibe Tags */}
                  {spot.vibeTags && spot.vibeTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {spot.vibeTags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-[0.65rem] font-semibold bg-white/5 text-text-secondary border border-white/5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="p-5 pt-0 space-y-3">
                {/* Live Busy Status Selector */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-bg-tertiary/60 border border-white/5">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    Live Crowd:
                  </span>
                  <select
                    value={spot.busyStatus}
                    onChange={(e) =>
                      handleBusyStatusChange(spot._id, e.target.value as Restaurant['busyStatus'])
                    }
                    className={`px-3 py-1 rounded-full text-xs font-bold border focus:outline-none cursor-pointer transition-all ${
                      spot.busyStatus === 'Plenty of Tables'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : spot.busyStatus === 'Filling Up'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {BUSY_STATUSES.map((status) => (
                      <option key={status} value={status} className="bg-bg-secondary text-text-primary">
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAddDishRest({ id: spot._id, name: spot.name })}
                    className="flex-1 py-2.5 rounded-lg bg-accent/10 hover:bg-accent hover:text-white border border-accent/20 text-accent font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Dish</span>
                  </button>

                  <a
                    href={getGoogleMapsUrl(spot)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-lg bg-bg-tertiary hover:bg-white/10 border border-white/8 text-text-secondary hover:text-text-primary font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Directions</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Dish Modal */}
      {selectedAddDishRest && (
        <AddDishModal
          restaurantId={selectedAddDishRest.id}
          restaurantName={selectedAddDishRest.name}
          isOpen={!!selectedAddDishRest}
          onClose={() => setSelectedAddDishRest(null)}
          onDishAdded={() => {
            setSelectedAddDishRest(null);
          }}
        />
      )}
    </div>
  );
}
