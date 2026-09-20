// File: src/app/trails/page.tsx
// Description: Administrator moderation view for listing, lightly editing, and deleting walking food trails.
// Author: Akilan M
// Created: 2026-09-11

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  getAdminTrails,
  updateAdminTrail,
  deleteAdminTrail,
  AdminTrail,
} from '../../services/api';
import ModalPortal from '../../components/ModalPortal';
import { Route, Search, Trash2, Edit2, X, Loader2, MapPin } from 'lucide-react';

/**
 * AdminTrailsPage lists and moderates community walking trails.
 */
export default function AdminTrailsPage() {
  const [trails, setTrails] = useState<AdminTrail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminTrail | null>(null);
  const [editName, setEditName] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadTrails = async () => {
    try {
      setLoading(true);
      const data = await getAdminTrails();
      setTrails(data);
    } catch (err) {
      console.error('Failed to fetch trails:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getAdminTrails()
      .then((data) => {
        if (isMounted) {
          setTrails(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch trails:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return trails.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.area?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }, [trails, searchQuery]);

  const openEdit = (trail: AdminTrail) => {
    setEditing(trail);
    setEditName(trail.name || '');
    setEditArea(trail.area || '');
    setEditDescription(trail.description || '');
    setErrorMsg('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editName.trim()) {
      setErrorMsg('Name is required.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      await updateAdminTrail(editing._id, {
        name: editName.trim(),
        area: editArea.trim(),
        description: editDescription.trim(),
      });
      setEditing(null);
      await loadTrails();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update trail.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (trail: AdminTrail) => {
    if (!window.confirm(`Delete trail "${trail.name}"?`)) return;
    setDeletingId(trail._id);
    try {
      await deleteAdminTrail(trail._id);
      setTrails((prev) => prev.filter((t) => t._id !== trail._id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete trail.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Walking Trails</h1>
          <p className="text-xs text-text-secondary">
            Moderate curated walking food routes across the platform.
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent font-bold text-xs self-start sm:self-auto flex items-center gap-1.5">
          <Route className="w-3.5 h-3.5" />
          <span>{trails.length} Trails</span>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search trails by name or area..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-bg-tertiary/60 border border-white/8 rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
        />
      </div>

      <div className="p-6 rounded-2xl glass-panel border border-white/8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Route className="w-12 h-12 text-text-muted mx-auto opacity-40" />
            <p className="text-sm font-semibold text-text-secondary">No trails found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((trail) => (
              <div
                key={trail._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/3 border border-white/5"
              >
                <div className="min-w-0">
                  <p className="font-bold text-text-primary truncate">{trail.name}</p>
                  <p className="text-[0.7rem] text-text-muted flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-accent" />
                    <span>{trail.area || 'Unspecified area'}</span>
                    <span className="opacity-50">·</span>
                    <span>{trail.stops?.length || 0} stops</span>
                  </p>
                  {trail.description && (
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">{trail.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(trail)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-xs font-semibold text-text-secondary flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === trail._id}
                    onClick={() => handleDelete(trail)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-xs font-semibold text-red-400 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === trail._id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm p-4 sm:p-6 flex min-h-screen items-center justify-center animate-fade-in">
            <div className="relative w-full max-w-md rounded-2xl glass-panel border border-white/10 p-6 space-y-4 my-auto bg-bg-secondary">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary cursor-pointer p-1 rounded-full hover:bg-white/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-text-primary">Edit Trail</h3>
              {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
              <form onSubmit={handleSave} className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Name"
                  required
                  className="w-full bg-bg-tertiary/60 border border-white/8 rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-accent"
                />
                <input
                  type="text"
                  value={editArea}
                  onChange={(e) => setEditArea(e.target.value)}
                  placeholder="Area"
                  className="w-full bg-bg-tertiary/60 border border-white/8 rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-accent"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                  rows={3}
                  className="w-full bg-bg-tertiary/60 border border-white/8 rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-accent resize-none"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
