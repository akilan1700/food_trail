// File: src/app/dishes/page.tsx
// Description: Admin Signature Dishes Manager providing restaurant-level curation, instant signature toggling, and photo management.
// Author: Akilan M
// Created: 2026-09-10T11:28:42+05:30

'use client';

import React, { useState, useEffect, useMemo, FormEvent, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getAdminDishes,
  getAdminRestaurants,
  createAdminDish,
  updateAdminDish,
  deleteAdminDish,
  toggleDishSignature,
  Dish,
  Restaurant,
  formatPhotoUrl,
} from '../../services/api';
import PhotoUpload from '../../components/PhotoUpload';
import {
  UtensilsCrossed,
  Sparkles,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  Star,
  CheckCircle2,
  X,
  Loader2,
  Store,
} from 'lucide-react';

export default function AdminDishesPage() {
  const searchParams = useSearchParams();
  const initialRestaurantId = searchParams.get('restaurantId') || 'all';

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>(initialRestaurantId);
  const [signatureOnly, setSignatureOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formRestaurantId, setFormRestaurantId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isSignature, setIsSignature] = useState(true);
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Deleting State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dishesData, restsData] = await Promise.all([
        getAdminDishes(),
        getAdminRestaurants(),
      ]);
      setDishes(dishesData);
      setRestaurants(restsData);
    } catch (err) {
      console.error('Failed to load dishes and restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update selected restaurant if URL param changes
  useEffect(() => {
    const rId = searchParams.get('restaurantId');
    if (rId) {
      setSelectedRestaurant(rId);
    }
  }, [searchParams]);

  const filteredDishes = useMemo(() => {
    return dishes.filter((d) => {
      const restId = typeof d.restaurantId === 'object' ? d.restaurantId._id : d.restaurantId;
      const matchesRestaurant = selectedRestaurant === 'all' || restId === selectedRestaurant;
      const matchesSignature = !signatureOnly || d.isSignature;
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesRestaurant && matchesSignature && matchesSearch;
    });
  }, [dishes, selectedRestaurant, signatureOnly, searchQuery]);

  const activeRestaurantObj = useMemo(() => {
    if (selectedRestaurant === 'all') return null;
    return restaurants.find((r) => r._id === selectedRestaurant) || null;
  }, [restaurants, selectedRestaurant]);

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormRestaurantId(selectedRestaurant !== 'all' ? selectedRestaurant : (restaurants[0]?._id || ''));
    setName('');
    setDescription('');
    setPrice('');
    setIsSignature(true); // Default true for admin
    setPhotoUrl('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = (dish: Dish) => {
    setIsEditing(true);
    setEditingId(dish._id);
    const restId = typeof dish.restaurantId === 'object' ? dish.restaurantId._id : dish.restaurantId;
    setFormRestaurantId(restId);
    setName(dish.name);
    setDescription(dish.description || '');
    setPrice(String(dish.price));
    setIsSignature(dish.isSignature);
    setPhotoUrl(dish.photoUrl || '');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleToggleSignature = async (dishId: string) => {
    // Optimistic UI update
    setDishes((prev) =>
      prev.map((d) => (d._id === dishId ? { ...d, isSignature: !d.isSignature } : d))
    );

    try {
      await toggleDishSignature(dishId);
    } catch (err) {
      console.error('Failed to toggle signature status:', err);
      // Revert on error
      setDishes((prev) =>
        prev.map((d) => (d._id === dishId ? { ...d, isSignature: !d.isSignature } : d))
      );
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Dish name is required.');
      return;
    }

    const dishPrice = parseFloat(price);
    if (isNaN(dishPrice) || dishPrice < 0) {
      setErrorMsg('Please enter a valid non-negative price.');
      return;
    }

    if (!formRestaurantId) {
      setErrorMsg('Please select a restaurant.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editingId) {
        await updateAdminDish(editingId, {
          name: name.trim(),
          description: description.trim(),
          price: dishPrice,
          photoUrl: photoUrl || undefined,
          isSignature,
          restaurantId: formRestaurantId,
        });
      } else {
        await createAdminDish({
          name: name.trim(),
          description: description.trim(),
          price: dishPrice,
          photoUrl: photoUrl || undefined,
          isSignature,
          restaurantId: formRestaurantId,
        });
      }

      setModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      console.error('Failed to save dish:', err);
      const message = err instanceof Error ? err.message : 'Error saving dish. Please try again.';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (dishId: string, dishName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${dishName}"?`)) {
      return;
    }

    setDeletingId(dishId);
    try {
      await deleteAdminDish(dishId);
      setDishes((prev) => prev.filter((d) => d._id !== dishId));
    } catch (err) {
      console.error('Failed to delete dish:', err);
      alert('Failed to delete dish.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Signature Dish Curation</span>
          </div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">
            Signature & Menu Dishes
          </h1>
          <p className="text-xs text-text-secondary">
            Promote, curate, and manage must-have signature dishes across registered dining spots.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={restaurants.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 text-black" />
          <span>Add Signature Dish</span>
        </button>
      </div>

      {/* Filter and Selection Controls */}
      <div className="flex flex-col md:flex-row items-center gap-3 p-4 rounded-xl glass-panel border border-white/8">
        {/* Restaurant Selector Dropdown */}
        <div className="flex items-center gap-2 w-full md:w-80">
          <Store className="w-4 h-4 text-accent shrink-0" />
          <select
            value={selectedRestaurant}
            onChange={(e) => setSelectedRestaurant(e.target.value)}
            className="w-full px-3 py-2 bg-bg-tertiary/60 border border-white/8 rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent font-medium"
          >
            <option value="all">All Registered Spots ({restaurants.length})</option>
            {restaurants.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name} ({r.area})
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search dish by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-tertiary/60 border border-white/8 rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        </div>

        {/* Signature Only Toggle Filter */}
        <button
          type="button"
          onClick={() => setSignatureOnly(!signatureOnly)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer shrink-0 ${
            signatureOnly
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
              : 'bg-bg-tertiary/60 text-text-secondary border-white/8 hover:text-text-primary'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Signature Only</span>
        </button>
      </div>

      {/* Focused Restaurant Banner */}
      {activeRestaurantObj && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={formatPhotoUrl(activeRestaurantObj.photoUrl)}
              alt={activeRestaurantObj.name}
              className="w-10 h-10 rounded-lg object-cover border border-amber-500/30"
            />
            <div>
              <h3 className="text-sm font-bold text-text-primary">{activeRestaurantObj.name}</h3>
              <p className="text-[0.7rem] text-text-muted">
                Showing dishes registered for {activeRestaurantObj.area}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedRestaurant('all')}
            className="text-xs text-accent hover:underline cursor-pointer"
          >
            Show All Spots
          </button>
        </div>
      )}

      {/* Dishes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : filteredDishes.length === 0 ? (
        <div className="p-12 rounded-2xl glass-panel border border-white/8 text-center space-y-3">
          <UtensilsCrossed className="w-12 h-12 text-text-muted mx-auto opacity-40" />
          <p className="text-sm font-bold text-text-primary">No dishes found</p>
          <p className="text-xs text-text-secondary">
            {selectedRestaurant !== 'all'
              ? 'This spot does not have any dishes added yet.'
              : 'Try modifying your search or add a new signature dish.'}
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-xs rounded-lg shadow-md cursor-pointer"
          >
            + Add First Signature Dish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDishes.map((dish) => {
            const restName =
              typeof dish.restaurantId === 'object' && dish.restaurantId?.name
                ? dish.restaurantId.name
                : 'Spot';
            const restArea =
              typeof dish.restaurantId === 'object' && dish.restaurantId?.area
                ? dish.restaurantId.area
                : '';

            return (
              <div
                key={dish._id}
                className={`relative rounded-xl overflow-hidden glass-card border transition-all flex flex-col group ${
                  dish.isSignature
                    ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-bg-tertiary/60'
                    : 'border-white/8'
                }`}
              >
                {/* Photo Header */}
                <div className="relative h-40 w-full overflow-hidden bg-bg-tertiary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formatPhotoUrl(dish.photoUrl)}
                    alt={dish.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                    <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[0.65rem] font-bold text-text-primary border border-white/10 truncate max-w-[130px]">
                      {restName} {restArea && `(${restArea})`}
                    </span>

                    {dish.isSignature && (
                      <span className="px-2 py-0.5 rounded-full gold-badge text-[0.65rem] font-black flex items-center gap-1 shadow-lg">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>SIGNATURE</span>
                      </span>
                    )}
                  </div>

                  {/* Price Tag Overlay */}
                  <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-xs font-black text-white border border-white/10">
                    ₹{dish.price}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-text-primary text-sm line-clamp-1">{dish.name}</h3>
                    <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed">
                      {dish.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Signature Toggle Switch */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleToggleSignature(dish._id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.68rem] font-bold transition-all cursor-pointer ${
                        dish.isSignature
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-white/5 text-text-muted border border-white/10 hover:text-text-primary hover:bg-white/10'
                      }`}
                    >
                      <Star
                        className={`w-3 h-3 ${dish.isSignature ? 'fill-amber-400 text-amber-400' : 'text-text-muted'}`}
                      />
                      <span>{dish.isSignature ? 'Signature Dish' : 'Make Signature'}</span>
                    </button>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(dish)}
                        title="Edit Dish"
                        className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(dish._id, dish.name)}
                        disabled={deletingId === dish._id}
                        title="Delete Dish"
                        className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                      >
                        {deletingId === dish._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dish Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-bg-secondary border border-white/10 rounded-2xl glass-panel shadow-2xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {isEditing ? 'Edit Dish Details' : 'Add Signature Menu Dish'}
                </h3>
                <p className="text-xs text-text-secondary">
                  Curate dining dishes and mark signature status for spots
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Select Restaurant */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Associated Restaurant <span className="text-accent">*</span>
                </label>
                <select
                  required
                  value={formRestaurantId}
                  onChange={(e) => setFormRestaurantId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg-tertiary/60 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent font-medium"
                >
                  <option value="" disabled>
                    Select registered spot
                  </option>
                  {restaurants.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.area})
                    </option>
                  ))}
                </select>
              </div>

              {/* Name & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Dish Name <span className="text-accent">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Traditional Filter Coffee"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg-tertiary/60 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Price (₹) <span className="text-accent">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="120"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg-tertiary/60 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Description / Taste Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Special spices, roasting method, texture, or recommendations..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-bg-tertiary/60 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent resize-none"
                />
              </div>

              {/* Signature Toggle Checkbox */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <input
                  type="checkbox"
                  id="modalIsSignature"
                  checked={isSignature}
                  onChange={(e) => setIsSignature(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-bg-tertiary border-white/10 cursor-pointer"
                />
                <label
                  htmlFor="modalIsSignature"
                  className="text-xs font-bold text-amber-300 select-none cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mark as Official Signature / Must-Have Dish</span>
                </label>
              </div>

              {/* Photo Upload */}
              <PhotoUpload
                folder="dishes"
                value={photoUrl}
                onUploadSuccess={(url) => setPhotoUrl(url)}
                onClear={() => setPhotoUrl('')}
                label="Dish Photo"
              />

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-medium text-red-400">
                  {errorMsg}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-bg-tertiary hover:bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-lg text-xs font-black transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{isEditing ? 'Save Changes' : 'Create Signature Dish'}</span>
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
