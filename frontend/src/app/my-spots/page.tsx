// File: src/app/my-spots/page.tsx
// Description: Dedicated page displaying all dining spots and cafes created and submitted by the authenticated user.
// Author: Akilan M
// Created: 2026-09-10T12:17:35+05:30
// Updated: 2026-09-11

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getMySpots,
  updateMySpot,
  deleteMySpot,
  Restaurant,
  formatPhotoUrl,
  getGoogleMapsUrl,
} from '../services/api';
import { useAppSelector } from '../services/hooks';
import { selectCurrentUser } from '../services/authSlice';
import AddDishModal from '../components/AddDishModal';
import ReviewModal from '../components/ReviewModal';
import LoadingScreen from '../components/LoadingScreen';
import {
  Store,
  MapPin,
  Plus,
  PlusCircle,
  Navigation,
  Loader2,
  MessageSquare,
  Star,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

export default function MySpotsPage() {
  const user = useAppSelector(selectCurrentUser);
  const router = useRouter();

  const [mySpots, setMySpots] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddDishRest, setSelectedAddDishRest] = useState<{ id: string; name: string } | null>(null);
  const [selectedReviewSpot, setSelectedReviewSpot] = useState<Restaurant | null>(null);
  const [editingSpot, setEditingSpot] = useState<Restaurant | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUserSpots = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMySpots();
      setMySpots(data);
    } catch (err) {
      console.error('Failed to load user spots:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    Promise.resolve().then(() => {
      loadUserSpots();
    });
  }, [user, router, loadUserSpots]);

  /**
   * Opens the simple edit form for an owned dining spot.
   */
  const openEdit = (spot: Restaurant) => {
    setEditingSpot(spot);
    setEditName(spot.name);
    setEditDescription(spot.description || '');
    setEditArea(spot.area || '');
    setEditAddress(spot.address || '');
    setEditError(null);
  };

  /**
   * Saves edited spot fields via updateMySpot.
   */
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpot) return;
    if (!editName.trim() || !editArea.trim()) {
      setEditError('Name and area are required.');
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      await updateMySpot(editingSpot._id, {
        name: editName.trim(),
        description: editDescription.trim(),
        area: editArea.trim(),
        address: editAddress.trim(),
      });
      setEditingSpot(null);
      await loadUserSpots();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update spot.';
      setEditError(message);
    } finally {
      setEditSaving(false);
    }
  };

  /**
   * Deletes an owned spot after confirmation.
   */
  const handleDeleteSpot = async (spot: Restaurant) => {
    const confirmed = window.confirm(`Delete "${spot.name}" and its dishes/reviews? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(spot._id);
    try {
      await deleteMySpot(spot._id);
      setMySpots((prev) => prev.filter((s) => s._id !== spot._id));
    } catch (err) {
      console.error('Failed to delete spot:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete spot.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="max-w-[960px] mx-auto py-6 md:py-10 px-4 animate-fade-in space-y-6">
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
            Manage your registered dining spots, update details, and add signature menu items.
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
              <div>
                <div className="relative h-48 w-full bg-bg-tertiary overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formatPhotoUrl(spot.photoUrl)}
                    alt={spot.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-xs font-bold text-white border border-white/10 flex items-center gap-1.5 shadow-md">
                    <MapPin className="w-3 h-3 text-accent" />
                    <span>{spot.area}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedReviewSpot(spot)}
                    className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow-md flex items-center gap-1 cursor-pointer transition-all hover:scale-105"
                    title="Click to view & write reviews and comments"
                  >
                    <Star className="w-3.5 h-3.5 fill-black text-black shrink-0" />
                    <span>{spot.rating > 0 ? spot.rating.toFixed(1) : ''}</span>
                    {spot.reviewCount !== undefined && spot.reviewCount > 0 && (
                      <span className="text-[0.65rem] font-bold opacity-80">({spot.reviewCount})</span>
                    )}
                  </button>
                </div>

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
                </div>
              </div>

              <div className="p-5 pt-0 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAddDishRest({ id: spot._id, name: spot.name })}
                    className="py-2.5 rounded-lg bg-accent/10 hover:bg-accent hover:text-white border border-accent/20 text-accent font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Dish</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedReviewSpot(spot)}
                    className="py-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 hover:text-black border border-amber-500/20 text-amber-400 font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                    title="View & write user reviews"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Reviews {spot.reviewCount ? `(${spot.reviewCount})` : ''}</span>
                  </button>

                  <a
                    href={getGoogleMapsUrl(spot)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 rounded-lg bg-bg-tertiary hover:bg-white/10 border border-white/8 text-text-secondary hover:text-text-primary font-semibold text-xs transition-all flex items-center justify-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Map</span>
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(spot)}
                    className="py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-text-secondary hover:text-text-primary font-semibold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === spot._id}
                    onClick={() => handleDeleteSpot(spot)}
                    className="py-2 rounded-lg bg-status-red/10 hover:bg-status-red hover:text-white border border-status-red/20 text-status-red font-semibold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === spot._id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingSpot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel border border-white/10 p-6 space-y-4 relative">
            <button
              type="button"
              onClick={() => setEditingSpot(null)}
              className="absolute top-3 right-3 text-text-muted hover:text-text-primary cursor-pointer bg-transparent border-none"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-text-primary">Edit Spot</h3>
            {editError && (
              <p className="text-sm text-status-red">{editError}</p>
            )}
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Name"
                required
                className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary focus:border-accent"
              />
              <input
                type="text"
                value={editArea}
                onChange={(e) => setEditArea(e.target.value)}
                placeholder="Area"
                required
                className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary focus:border-accent"
              />
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Address"
                className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary focus:border-accent"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description"
                rows={3}
                className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary focus:border-accent resize-none"
              />
              <button
                type="submit"
                disabled={editSaving}
                className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3 rounded-sm disabled:opacity-50 cursor-pointer"
              >
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

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

      {selectedReviewSpot && (
        <ReviewModal
          isOpen={!!selectedReviewSpot}
          targetType="restaurant"
          targetId={selectedReviewSpot._id}
          targetName={selectedReviewSpot.name}
          currentRating={selectedReviewSpot.rating}
          reviewCount={selectedReviewSpot.reviewCount}
          onClose={() => setSelectedReviewSpot(null)}
          onReviewUpdated={() => {
            loadUserSpots();
          }}
        />
      )}
    </div>
  );
}
