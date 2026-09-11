// File: src/app/reviews/page.tsx
// Description: Administrator moderation view for listing and deleting platform reviews.
// Author: Akilan M
// Created: 2026-09-11

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getAdminReviews, deleteAdminReview, AdminReview } from '../../services/api';
import { MessageSquare, Search, Trash2, Loader2, Star } from 'lucide-react';

/**
 * Resolves a display name from a populated or raw review target field.
 */
function targetName(value: AdminReview['restaurantId'] | AdminReview['dishId'] | AdminReview['user']): string {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  return value.name || '—';
}

/**
 * AdminReviewsPage lists and deletes user reviews across restaurants and dishes.
 */
export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await getAdminReviews();
      setReviews(data);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return reviews.filter((r) => {
      const user = targetName(r.user).toLowerCase();
      const restaurant = targetName(r.restaurantId).toLowerCase();
      const dish = targetName(r.dishId).toLowerCase();
      const comment = (r.comment || '').toLowerCase();
      return user.includes(q) || restaurant.includes(q) || dish.includes(q) || comment.includes(q);
    });
  }, [reviews, searchQuery]);

  const handleDelete = async (review: AdminReview) => {
    if (!window.confirm('Delete this review permanently?')) return;
    setDeletingId(review._id);
    try {
      await deleteAdminReview(review._id);
      setReviews((prev) => prev.filter((r) => r._id !== review._id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete review.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Reviews</h1>
          <p className="text-xs text-text-secondary">
            Moderate community ratings and comments across spots and dishes.
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs self-start sm:self-auto flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{reviews.length} Reviews</span>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by user, spot, dish, or comment..."
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
            <MessageSquare className="w-12 h-12 text-text-muted mx-auto opacity-40" />
            <p className="text-sm font-semibold text-text-secondary">No reviews found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/8 text-text-muted uppercase tracking-wider font-semibold">
                  <th className="pb-3 px-3">User</th>
                  <th className="pb-3 px-3">Target</th>
                  <th className="pb-3 px-3">Rating</th>
                  <th className="pb-3 px-3">Comment</th>
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((review) => (
                  <tr key={review._id} className="hover:bg-white/3 transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-text-primary">
                      {targetName(review.user)}
                    </td>
                    <td className="py-3.5 px-3 text-text-secondary">
                      {review.restaurantId
                        ? `Spot: ${targetName(review.restaurantId)}`
                        : review.dishId
                          ? `Dish: ${targetName(review.dishId)}`
                          : '—'}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {review.rating}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-text-secondary max-w-xs">
                      <span className="line-clamp-2">{review.comment || '—'}</span>
                    </td>
                    <td className="py-3.5 px-3 text-text-muted">
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-3">
                      <button
                        type="button"
                        disabled={deletingId === review._id}
                        onClick={() => handleDelete(review)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {deletingId === review._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
