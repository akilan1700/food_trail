// File: src/app/components/ReviewModal.tsx
// Description: Interactive modal dialog for viewing, submitting, and managing user-written ratings, reviews, and comments.
// Author: Akilan M
// Created: 2026-09-10T12:59:02+05:30

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, X, MessageSquare, Trash2, Send, Loader2, LogIn, AlertCircle, WifiOff } from 'lucide-react';
import { Review, getReviews, createReview, deleteReview } from '../services/api';
import { useAppSelector } from '../services/hooks';
import { selectCurrentUser } from '../services/authSlice';
import { triggerHaptic } from '../services/usePwa';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'restaurant' | 'dish';
  targetId: string;
  targetName: string;
  currentRating?: number;
  reviewCount?: number;
  onReviewUpdated?: () => void;
}

/**
 * Formats an ISO date string into a user-friendly relative or date string.
 * @param dateStr - ISO date string
 * @returns Human-readable date label
 */
function formatReviewDate(dateStr: string): string {
  try {
    const reviewDate = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - reviewDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return reviewDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

/**
 * ReviewModal component allowing users to view community reviews and submit their own rating and review comments.
 */
export default function ReviewModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  currentRating,
  reviewCount,
  onReviewUpdated,
}: ReviewModalProps) {
  const currentUser = useAppSelector(selectCurrentUser);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');

  // Fetch reviews when modal opens or targetId changes
  useEffect(() => {
    if (!isOpen || !targetId) return;

    let isMounted = true;
    async function loadReviews() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const data = await getReviews(
          targetType === 'restaurant' ? { restaurantId: targetId } : { dishId: targetId }
        );
        if (isMounted) {
          setReviews(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const errStr = err instanceof Error ? err.message : 'Failed to load reviews';
          setErrorMessage(errStr);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadReviews();

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetId, targetType]);

  if (!isOpen) return null;

  /**
   * Handle user review form submission.
   */
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) {
      setErrorMessage('Please enter a review comment.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        restaurantId: targetType === 'restaurant' ? targetId : undefined,
        dishId: targetType === 'dish' ? targetId : undefined,
        rating: selectedRating,
        comment: commentText.trim(),
      };

      const newReview = await createReview(payload);
      setReviews((prev) => [newReview, ...prev]);
      setCommentText('');
      setSelectedRating(5);

      if (onReviewUpdated) {
        onReviewUpdated();
      }
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : 'Failed to submit review';
      setErrorMessage(errStr);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle deletion of user's own review.
   */
  const handleDeleteReview = async (reviewId: string) => {
    setDeletingId(reviewId);
    setErrorMessage(null);
    try {
      await deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r._id !== reviewId));
      if (onReviewUpdated) {
        onReviewUpdated();
      }
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : 'Failed to delete review';
      setErrorMessage(errStr);
    } finally {
      setDeletingId(null);
    }
  };

  const displayRating = currentRating && currentRating > 0 ? currentRating.toFixed(1) : '';
  const totalCount = reviews.length > 0 ? reviews.length : reviewCount || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-bg-secondary border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-bg-tertiary/40">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-widest mb-1">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Community Reviews & Ratings</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-text-primary tracking-tight">
              {targetName}
            </h2>
            <div className="flex items-center gap-3 mt-2 text-sm">
              {displayRating ? (
                <div className="flex items-center gap-1.5 font-bold text-rating bg-rating/10 border border-rating/20 px-2.5 py-0.5 rounded-full text-xs">
                  <Star className="w-3.5 h-3.5 fill-rating" />
                  <span>{displayRating}</span>
                </div>
              ) : null}
              <span className="text-xs text-text-secondary">
                {totalCount} {totalCount === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-white/5 transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow">
          {/* Error banner */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Write a Review Section */}
          {currentUser ? (
            <form
              onSubmit={handleSubmitReview}
              className="p-5 rounded-2xl bg-bg-tertiary/30 border border-white/8 space-y-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-text-primary">Rate & Share Your Review</h3>
                {/* Interactive Star Picker */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating !== null ? hoverRating : selectedRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                        onClick={() => {
                          triggerHaptic(15);
                          setSelectedRating(star);
                        }}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            isFilled
                              ? 'text-rating fill-rating'
                              : 'text-text-muted hover:text-rating'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-bold text-rating ml-1.5 min-w-[32px]">
                    {hoverRating !== null ? hoverRating : selectedRating} / 5
                  </span>
                </div>
              </div>

              {/* Review Comment Text Area */}
              <div>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={`Write your genuine experience about ${targetName}... (taste, service, ambiance, price)`}
                  className="w-full p-3.5 bg-bg-primary/70 border border-white/10 rounded-xl text-text-primary text-sm placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all resize-none"
                />
                <div className="flex justify-between items-center text-[0.7rem] text-text-muted mt-1 px-1">
                  <span>Authentic user comments help fellow food lovers</span>
                  <span>{commentText.length} / 1000</span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-md shadow-accent/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Login Prompt Banner */
            <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-text-primary">Want to review this spot?</h3>
                <p className="text-xs text-text-secondary">
                  Log in to write user comments and rate dining spots with the community.
                </p>
              </div>
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-md"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </Link>
            </div>
          )}

          {/* User Reviews List */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-text-muted flex items-center justify-between">
              <span>All Comments ({reviews.length})</span>
            </h3>

            {loading ? (
              <div className="text-center py-10 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto" />
                <p className="text-xs text-text-secondary">Loading user reviews...</p>
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((rev) => {
                  const currentUserId = currentUser?.id || currentUser?._id;
                  const isOwner = Boolean(currentUserId && rev.user && rev.user._id === currentUserId);
                  const isDeleting = deletingId === rev._id;

                  return (
                    <div
                      key={rev._id}
                      className="p-4 rounded-xl bg-bg-tertiary/20 border border-white/5 hover:border-white/10 transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Reviewer Info */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-rating flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0">
                            {rev.user?.name ? rev.user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-text-primary">
                              {rev.user?.name || 'Anonymous Foodie'}
                              {isOwner && (
                                <span className="ml-1.5 text-[0.65rem] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-semibold">
                                 You
                                </span>
                              )}
                              {rev.isOfflinePending && (
                                <span className="ml-1.5 text-[0.65rem] px-1.5 py-0.5 rounded bg-status-orange/15 text-status-orange font-semibold inline-flex items-center gap-1">
                                  <WifiOff className="w-2.5 h-2.5" />
                                  Queued for sync
                                </span>
                              )}
                            </div>
                            <div className="text-[0.65rem] text-text-muted">
                              {formatReviewDate(rev.createdAt)}
                            </div>
                          </div>
                        </div>

                        {/* Stars and Actions */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= rev.rating
                                    ? 'text-rating fill-rating'
                                    : 'text-white/10'
                                }`}
                              />
                            ))}
                          </div>

                          {/* Delete option if user owns this review */}
                          {isOwner && (
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteReview(rev._id)}
                              className="p-1.5 text-text-muted hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer ml-1"
                              title="Delete your review"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Comment text */}
                      <p className="text-xs text-text-secondary leading-relaxed pl-10 whitespace-pre-wrap">
                        {rev.comment}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty Reviews State */
              <div className="text-center py-10 px-4 rounded-2xl bg-bg-tertiary/10 border border-dashed border-white/8 space-y-2">
                <MessageSquare className="w-8 h-8 text-text-muted mx-auto" />
                <h4 className="text-sm font-bold text-text-primary">No user reviews yet</h4>
                <p className="text-xs text-text-secondary max-w-[340px] mx-auto">
                  Be the first to rate and write a genuine review about {targetName}!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
