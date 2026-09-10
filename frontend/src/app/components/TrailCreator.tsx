// File: src/app/components/TrailCreator.tsx
// Description: Modular React component providing a dynamic form to construct and save custom curated walking food trails.
// Author: Akilan M
// Created: 2026-08-12T17:21:00+05:30

'use client';

import { useState } from 'react';
import { Trail, createTrail, Restaurant, Stop } from '../services/api';
import { Plus, Trash2, X } from 'lucide-react';
import { useAppSelector } from '../services/hooks';
import { selectDetectedCity } from '../services/authSlice';
import PhotoUpload from './PhotoUpload';

interface TrailCreatorProps {
  allRestaurants: Restaurant[];
  onSuccess: (newTrail: Trail) => void;
  onCancel: () => void;
}

export default function TrailCreator({ allRestaurants, onSuccess, onCancel }: TrailCreatorProps) {
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDuration, setFormDuration] = useState(30);
  const [formDistance, setFormDistance] = useState(1200);
  const detectedCity = useAppSelector(selectDetectedCity);
  const [formArea, setFormArea] = useState(detectedCity || '');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formStops, setFormStops] = useState<{ order: number; restaurantId: string; description: string }[]>([
    { order: 1, restaurantId: '', description: '' }
  ]);

  /**
   * Resets all fields in the walking trail form.
   */
  const resetForm = (): void => {
    setFormName('');
    setFormDesc('');
    setFormDuration(30);
    setFormDistance(1200);
    setFormArea(detectedCity || '');
    setFormPhotoUrl('');
    setFormStops([{ order: 1, restaurantId: '', description: '' }]);
  };

  /**
   * Cancels trail creation and resets the form.
   */
  const handleCancel = (): void => {
    resetForm();
    onCancel();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formDuration || !formDistance || !formArea) {
      alert('Please fill out all required fields.');
      return;
    }
    const filteredStops = formStops.filter(s => s.restaurantId);
    if (filteredStops.length === 0) {
      alert('Please add at least one stop with a selected restaurant.');
      return;
    }

    try {
      const newTrail = await createTrail({
        name: formName,
        description: formDesc,
        estimatedDuration: Number(formDuration),
        distance: Number(formDistance),
        area: formArea,
        photoUrl: formPhotoUrl,
        stops: filteredStops.map((s, idx) => ({
          order: idx + 1,
          restaurantId: s.restaurantId,
          description: s.description,
        })) as unknown as Stop[],
      });

      resetForm();
      onSuccess(newTrail);
    } catch (error) {
      console.error('Failed to create trail:', error);
      alert('Error creating trail in backend.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-12 p-6 md:p-8 rounded-lg border border-white/8 bg-bg-secondary/40 glass-panel animate-fade-in flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <h2 className="text-xl font-bold text-text-primary">Create Walking Trail</h2>
        <button
          type="button"
          className="text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer"
          onClick={handleCancel}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Trail Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. French Quarter Pastry Crawl"
              className="bg-bg-tertiary/40 border border-white/8 text-text-primary rounded-sm p-3 outline-none focus:border-accent text-sm"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Description</label>
            <textarea
              placeholder="Describe the walk, landmarks, and highlights..."
              className="bg-bg-tertiary/40 border border-white/8 text-text-primary rounded-sm p-3 outline-none min-h-[100px] focus:border-accent resize-y text-sm"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Walk Duration (Min) *</label>
              <input
                type="number"
                required
                min={5}
                className="bg-bg-tertiary/40 border border-white/8 text-text-primary rounded-sm p-3 outline-none focus:border-accent text-sm"
                value={formDuration}
                onChange={(e) => setFormDuration(Number(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Walk Distance (Meters) *</label>
              <input
                type="number"
                required
                min={50}
                className="bg-bg-tertiary/40 border border-white/8 text-text-primary rounded-sm p-3 outline-none focus:border-accent text-sm"
                value={formDistance}
                onChange={(e) => setFormDistance(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Area *</label>
            <input
              type="text"
              required
              placeholder="e.g. White Town, MG Road, Indiranagar"
              className="bg-bg-tertiary/40 border border-white/8 text-text-primary rounded-sm p-3 outline-none focus:border-accent text-sm"
              value={formArea}
              onChange={(e) => setFormArea(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Trail Cover Image</label>
            <PhotoUpload
              value={formPhotoUrl}
              folder="trails"
              onUploadSuccess={(fileId) => setFormPhotoUrl(fileId)}
              onClear={() => setFormPhotoUrl('')}
              label="Upload Trail Cover Photo"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 pt-6 mt-2">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-text-primary uppercase tracking-wide">Route Stops *</h3>
          <button
            type="button"
            className="bg-bg-tertiary text-text-primary border border-white/8 rounded-sm px-3 py-1.5 text-xs font-semibold cursor-pointer flex items-center gap-1.5 hover:bg-white/5"
            onClick={() => setFormStops([...formStops, { order: formStops.length + 1, restaurantId: '', description: '' }])}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Stop</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2">
          {formStops.map((stop, idx) => (
            <div key={idx} className="bg-bg-tertiary/20 border border-white/5 rounded-md p-4 flex gap-4 items-start relative">
              <span className="bg-accent text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 mt-2">
                {idx + 1}
              </span>
              
              <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.7rem] font-bold text-text-muted uppercase">Select Cafe / Restaurant</label>
                  <select
                    required
                    className="bg-bg-tertiary text-text-primary border border-white/8 rounded-sm p-2 outline-none text-sm cursor-pointer"
                    value={stop.restaurantId}
                    onChange={(e) => {
                      const updated = [...formStops];
                      updated[idx].restaurantId = e.target.value;
                      setFormStops(updated);
                    }}
                  >
                    <option value="">-- Choose Spot --</option>
                    {allRestaurants.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name} ({r.area})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.7rem] font-bold text-text-muted uppercase">Highlights / What to try</label>
                  <input
                    type="text"
                    placeholder="e.g. Try their almond croissants..."
                    className="bg-bg-tertiary/40 border border-white/8 text-text-primary rounded-sm p-2 outline-none text-sm"
                    value={stop.description}
                    onChange={(e) => {
                      const updated = [...formStops];
                      updated[idx].description = e.target.value;
                      setFormStops(updated);
                    }}
                  />
                </div>
              </div>

              {formStops.length > 1 && (
                <button
                  type="button"
                  className="text-text-muted hover:text-red-500 bg-transparent border-none cursor-pointer mt-2"
                  onClick={() => {
                    const updated = formStops.filter((_, sIdx) => sIdx !== idx);
                    setFormStops(updated.map((s, sIdx) => ({ ...s, order: sIdx + 1 })));
                  }}
                  title="Remove Stop"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-white/5 pt-6 mt-4">
        <button
          type="button"
          className="bg-transparent text-text-secondary border border-white/10 rounded-sm px-6 py-3 font-semibold cursor-pointer transition-all duration-300 hover:bg-white/5"
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-accent text-white border-none rounded-sm px-8 py-3 font-bold cursor-pointer transition-all duration-300 hover:bg-accent-hover shadow-[0_4px_12px_rgba(244,63,94,0.25)]"
        >
          Save Walking Trail
        </button>
      </div>
    </form>
  );
}
