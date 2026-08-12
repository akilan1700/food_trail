// File: src/app/components/AddDishModal.tsx
// Description: Reusable Modal form component for adding new menu items (dishes) to a specific restaurant.
// Author: Akilan M
// Created: 2026-08-12T17:48:00+05:30

'use client';

import { useState, FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createDish } from '../services/api';
import PhotoUpload from './PhotoUpload';

interface AddDishModalProps {
  restaurantId: string;
  restaurantName: string;
  isOpen: boolean;
  onClose: () => void;
  onDishAdded: () => void;
}

export default function AddDishModal({
  restaurantId,
  restaurantName,
  isOpen,
  onClose,
  onDishAdded,
}: AddDishModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isSignature, setIsSignature] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Dish name is required.');
      return;
    }

    const dishPrice = parseFloat(price);
    if (isNaN(dishPrice) || dishPrice < 0) {
      setErrorMsg('Please enter a valid non-negative price.');
      return;
    }

    setLoading(true);
    try {
      await createDish({
        name,
        description,
        price: dishPrice,
        photoUrl: photoUrl || undefined,
        restaurantId,
        isSignature,
      });

      setSuccessMsg('Dish added successfully!');
      onDishAdded();
      
      // Clear inputs and close after a short delay
      setTimeout(() => {
        setName('');
        setDescription('');
        setPrice('');
        setIsSignature(false);
        setPhotoUrl('');
        setSuccessMsg('');
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to add dish:', err);
      const message = err instanceof Error ? err.message : 'Error adding dish. Please try again.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-[500px] bg-bg-secondary border border-white/8 rounded-lg shadow-2xl glass-panel overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/8">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Add Dish</h3>
            <p className="text-xs text-text-secondary">Adding signature menu item to {restaurantName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label htmlFor="dishName" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Dish Name <span className="text-accent">*</span>
            </label>
            <input
              id="dishName"
              type="text"
              required
              disabled={loading}
              placeholder="e.g. Traditional Filter Coffee"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-tertiary/40 border border-white/8 rounded p-2.5 text-text-primary focus:outline-none focus:border-accent transition-all"
            />
          </div>

          {/* Price */}
          <div>
            <label htmlFor="dishPrice" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Price (₹) <span className="text-accent">*</span>
            </label>
            <input
              id="dishPrice"
              type="number"
              required
              min="0"
              disabled={loading}
              placeholder="e.g. 120"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-bg-tertiary/40 border border-white/8 rounded p-2.5 text-text-primary focus:outline-none focus:border-accent transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="dishDesc" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              id="dishDesc"
              disabled={loading}
              placeholder="Brief description of taste, ingredients, or size..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-20 bg-bg-tertiary/40 border border-white/8 rounded p-2.5 text-text-primary focus:outline-none focus:border-accent transition-all resize-none"
            />
          </div>

          {/* Signature Dish toggle */}
          <div className="flex items-center gap-2 py-1">
            <input
              id="dishSignature"
              type="checkbox"
              disabled={loading}
              checked={isSignature}
              onChange={(e) => setIsSignature(e.target.checked)}
              className="w-4 h-4 rounded border-white/8 bg-bg-tertiary/40 text-accent focus:ring-accent"
            />
            <label htmlFor="dishSignature" className="text-sm font-semibold text-text-secondary select-none cursor-pointer">
              Mark as signature/must-have dish
            </label>
          </div>

          {/* Photo Upload */}
          <div>
            <PhotoUpload
              onUploadSuccess={(fileId) => setPhotoUrl(fileId)}
              label="Upload Dish Photo"
            />
          </div>

          {/* Notifications */}
          {errorMsg && (
            <div className="text-red-500 font-medium bg-red-500/10 p-2.5 rounded border border-red-500/20 text-xs">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="text-green-500 font-medium bg-green-500/10 p-2.5 rounded border border-green-500/20 text-xs">
              {successMsg}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 bg-bg-tertiary/40 border border-white/8 rounded text-sm font-bold text-text-primary hover:bg-bg-tertiary transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-accent to-rose-600 hover:from-accent-hover hover:to-rose-700 text-white text-sm font-bold rounded shadow-lg transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add Dish</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
