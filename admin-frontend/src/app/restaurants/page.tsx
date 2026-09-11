// File: src/app/restaurants/page.tsx
// Description: Admin management view for browsing, registering, updating, and deleting dining spots with live busy statuses.
// Author: Akilan M
// Created: 2026-09-10T11:28:25+05:30

'use client';

import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import Link from 'next/link';
import {
  getAdminRestaurants,
  createAdminRestaurant,
  updateAdminRestaurant,
  deleteAdminRestaurant,
  Restaurant,
  formatPhotoUrl,
} from '../../services/api';
import PhotoUpload from '../../components/PhotoUpload';
import {
  Store,
  Search,
  PlusCircle,
  UtensilsCrossed,
  Edit2,
  Trash2,
  MapPin,
  X,
  Loader2,
  Star,
} from 'lucide-react';

const BUSY_STATUSES = ['Plenty of Tables', 'Filling Up', '~15 Min Wait', 'Closed'] as const;

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('all');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('White Town');
  const [customArea, setCustomArea] = useState('');
  const [longitude, setLongitude] = useState('79.8335');
  const [latitude, setLatitude] = useState('11.9324');
  const [vibeTagsStr, setVibeTagsStr] = useState('Cozy, Aesthetic, Great Coffee');
  const [busyStatus, setBusyStatus] = useState<Restaurant['busyStatus']>('Plenty of Tables');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRestaurants = async () => {
    try {
      const data = await getAdminRestaurants();
      setRestaurants(data);
    } catch (err) {
      console.error('Failed to fetch restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await getAdminRestaurants();
        if (isMounted) {
          setRestaurants(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch restaurants:', err);
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const uniqueAreas = useMemo(() => {
    const set = new Set(restaurants.map((r) => r.area).filter(Boolean));
    return Array.from(set);
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesArea = selectedArea === 'all' || r.area.toLowerCase() === selectedArea.toLowerCase();
      return matchesSearch && matchesArea;
    });
  }, [restaurants, searchQuery, selectedArea]);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setDescription('');
    setAddress('');
    setArea('White Town');
    setCustomArea('');
    setLongitude('79.8335');
    setLatitude('11.9324');
    setVibeTagsStr('Cozy, Aesthetic, Great Coffee');
    setBusyStatus('Plenty of Tables');
    setPhotoUrl('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = (rest: Restaurant) => {
    setIsEditing(true);
    setEditingId(rest._id);
    setName(rest.name);
    setDescription(rest.description || '');
    setAddress(rest.address || '');
    setArea(rest.area);
    setCustomArea('');
    const coords = rest.location?.coordinates || [79.8335, 11.9324];
    setLongitude(String(coords[0]));
    setLatitude(String(coords[1]));
    setVibeTagsStr(rest.vibeTags ? rest.vibeTags.join(', ') : '');
    setBusyStatus(rest.busyStatus);
    setPhotoUrl(rest.photoUrl || '');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Spot name is required.');
      return;
    }

    const finalArea = area === 'Other' ? customArea.trim() : area.trim();
    if (!finalArea) {
      setErrorMsg('Area is required.');
      return;
    }

    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    if (isNaN(lng) || isNaN(lat)) {
      setErrorMsg('Coordinates must be valid numbers.');
      return;
    }

    const vibeTags = vibeTagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      if (isEditing && editingId) {
        await updateAdminRestaurant(editingId, {
          name: name.trim(),
          description: description.trim(),
          address: address.trim(),
          area: finalArea,
          coordinates: [lng, lat],
          vibeTags,
          busyStatus,
          photoUrl,
        });
      } else {
        await createAdminRestaurant({
          name: name.trim(),
          description: description.trim(),
          address: address.trim(),
          area: finalArea,
          coordinates: [lng, lat],
          vibeTags,
          busyStatus,
          photoUrl,
        });
      }

      setModalOpen(false);
      await fetchRestaurants();
    } catch (err: unknown) {
      console.error('Failed to save spot:', err);
      const message = err instanceof Error ? err.message : 'Error saving spot. Please try again.';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickBusyChange = async (restId: string, newStatus: Restaurant['busyStatus']) => {
    try {
      await updateAdminRestaurant(restId, { busyStatus: newStatus });
      setRestaurants((prev) =>
        prev.map((r) => (r._id === restId ? { ...r, busyStatus: newStatus } : r))
      );
    } catch (err) {
      console.error('Failed to update busy status:', err);
    }
  };

  const handleDelete = async (restId: string, restName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${restName}" and all of its associated menu dishes?`)) {
      return;
    }

    setDeletingId(restId);
    try {
      await deleteAdminRestaurant(restId);
      setRestaurants((prev) => prev.filter((r) => r._id !== restId));
    } catch (err) {
      console.error('Failed to delete restaurant:', err);
      alert('Failed to delete spot.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Registered Dining Spots</h1>
          <p className="text-xs text-text-secondary">
            Manage registered cafes, bistros, and street spots across all regions.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="btn-primary self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Spot</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl glass-panel border border-white/8">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by spot name, area, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-tertiary/60 border border-white/8 rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-text-muted shrink-0 font-medium">Area:</span>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 bg-bg-tertiary/60 border border-white/8 rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="all">All Areas ({restaurants.length})</option>
            {uniqueAreas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Restaurants Table */}
      <div className="p-6 rounded-2xl glass-panel border border-white/8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Store className="w-12 h-12 text-text-muted mx-auto opacity-40" />
            <p className="text-sm font-semibold text-text-secondary">No dining spots found matching your filter.</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-bold"
            >
              Add the First Spot
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/8 text-text-muted uppercase tracking-wider font-semibold">
                  <th className="pb-3 px-3">Spot</th>
                  <th className="pb-3 px-3">Area & Location</th>
                  <th className="pb-3 px-3">Vibes</th>
                  <th className="pb-3 px-3">Dishes</th>
                  <th className="pb-3 px-3">Live Busy Status</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRestaurants.map((rest) => (
                  <tr key={rest._id} className="hover:bg-white/3 transition-colors">
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={formatPhotoUrl(rest.photoUrl)}
                          alt={rest.name}
                          className="w-11 h-11 rounded-lg object-cover border border-white/10 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-text-primary text-sm">{rest.name}</p>
                          <p className="text-[0.7rem] text-text-muted line-clamp-1">
                            {rest.description || 'No description provided'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-text-primary flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-accent" />
                          {rest.area}
                        </span>
                        <span className="text-[0.65rem] text-text-muted">
                          {rest.address || 'Address unlisted'}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {rest.vibeTags && rest.vibeTags.length > 0 ? (
                          rest.vibeTags.map((v) => (
                            <span
                              key={v}
                              className="px-1.5 py-0.5 rounded bg-white/5 text-[0.65rem] text-text-secondary border border-white/5"
                            >
                              {v}
                            </span>
                          ))
                        ) : (
                          <span className="text-text-muted text-[0.65rem]">None</span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-text-primary text-xs">
                          {rest.totalDishes || 0} Total
                        </span>
                        <span className="text-[0.65rem] text-amber-400 font-semibold flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span>{rest.signatureDishes || 0} Signature</span>
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      <select
                        value={rest.busyStatus}
                        onChange={(e) =>
                          handleQuickBusyChange(rest._id, e.target.value as Restaurant['busyStatus'])
                        }
                        className={`px-2.5 py-1 rounded-full text-[0.65rem] font-bold border focus:outline-none cursor-pointer ${
                          rest.busyStatus === 'Plenty of Tables'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : rest.busyStatus === 'Filling Up'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {BUSY_STATUSES.map((status) => (
                          <option key={status} value={status} className="bg-bg-secondary text-text-primary">
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-4 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/dishes?restaurantId=${rest._id}`}
                          title="Manage Signature Dishes"
                          className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors"
                        >
                          <UtensilsCrossed className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEditModal(rest)}
                          title="Edit Spot"
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rest._id, rest.name)}
                          disabled={deletingId === rest._id}
                          title="Delete Spot"
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                        >
                          {deletingId === rest._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Restaurant Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-bg-secondary border border-white/10 rounded-2xl glass-panel shadow-2xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {isEditing ? 'Edit Dining Spot' : 'Register New Dining Spot'}
                </h3>
                <p className="text-xs text-text-secondary">
                  {isEditing ? `Modifying spot details for ${name}` : 'Add a verified dining spot to the platform'}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Spot Name <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coromandel Cafe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg-tertiary/60 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Area / Neighborhood <span className="text-accent">*</span>
                  </label>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg-tertiary/60 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="White Town">White Town</option>
                    <option value="Heritage Town">Heritage Town</option>
                    <option value="Beach Road">Beach Road</option>
                    <option value="Auroville">Auroville</option>
                    <option value="Indiranagar">Indiranagar</option>
                    <option value="Koramangala">Koramangala</option>
                    <option value="Other">Other (Custom Area)</option>
                  </select>
                </div>

                {area === 'Other' && (
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      Custom Area <span className="text-accent">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MG Road"
                      value={customArea}
                      onChange={(e) => setCustomArea(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-bg-tertiary/60 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                )}

                <div className={area !== 'Other' ? '' : 'sm:col-span-2'}>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Live Busy Status
                  </label>
                  <select
                    value={busyStatus}
                    onChange={(e) => setBusyStatus(e.target.value as Restaurant['busyStatus'])}
                    className="w-full px-3.5 py-2.5 bg-bg-tertiary/60 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    {BUSY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Physical Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8 Rue Romain Rolland, White Town"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg-tertiary/60 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Longitude <span className="text-accent">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="79.8335"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg-tertiary/60 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Latitude <span className="text-accent">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="11.9324"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg-tertiary/60 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Vibe Tags (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pet-friendly, Outdoor garden, Aesthetic"
                  value={vibeTagsStr}
                  onChange={(e) => setVibeTagsStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg-tertiary/60 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Short overview of vibe, specialty coffee, ambience..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-bg-tertiary/60 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent resize-none"
                />
              </div>

              {/* Photo Upload */}
              <PhotoUpload
                folder="spots"
                value={photoUrl}
                onUploadSuccess={(url) => setPhotoUrl(url)}
                onClear={() => setPhotoUrl('')}
                label="Spot Cover Photo"
              />

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-medium text-red-400">
                  {errorMsg}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{isEditing ? 'Save Changes' : 'Create Spot'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
