/* eslint-disable @next/next/no-img-element, react-hooks/set-state-in-effect */
// File: src/app/trip/page.tsx
// Description: Saved trip (My Trip) page allowing users to view, manage, and share their walkable food trail route via WhatsApp.
// Author: Akilan M
// Created: 2026-08-11T17:43:13+05:30

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { useAppDispatch, useAppSelector } from '../services/hooks';
import { selectSavedRestIds, selectSavedTrailId, setSavedTrailId, removeRestaurant, clearTrip } from '../services/tripSlice';
import { selectCurrentUser, setCredentials, selectDetectedCity } from '../services/authSlice';
import { Restaurant, Trail, getRestaurants, getTrailDetails, createSharedTrip, formatPhotoUrl, updateRestaurantPhoto, completeWalk } from '../services/api';
import { Trash2, MessageCircle, MapPin, Star, Bookmark, Camera, PlusCircle, CheckCircle2 } from 'lucide-react';
import PhotoUpload from '../components/PhotoUpload';
import AddDishModal from '../components/AddDishModal';

export default function MyTripPage() {
  const dispatch = useAppDispatch();
  const savedRestIds = useAppSelector(selectSavedRestIds);
  const savedTrailId = useAppSelector(selectSavedTrailId);
  const user = useAppSelector(selectCurrentUser);
  const detectedCity = useAppSelector(selectDetectedCity);
  const [savedRestaurants, setSavedRestaurants] = useState<Restaurant[]>([]);
  const [parentTrail, setParentTrail] = useState<Trail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPhotoRestId, setEditingPhotoRestId] = useState<string | null>(null);
  const [selectedAddDishRest, setSelectedAddDishRest] = useState<{ id: string; name: string } | null>(null);
  
  const [shareLink, setShareLink] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  // Fetch parent trail details if trail ID is saved
  useEffect(() => {
    const fetchParentTrail = async () => {
      if (!savedTrailId) {
        setParentTrail(null);
        return;
      }
      try {
        const data = await getTrailDetails(savedTrailId);
        setParentTrail(data);
      } catch (err) {
        console.error('Failed to load parent trail details:', err);
      }
    };
    fetchParentTrail();
  }, [savedTrailId]);

  const loadSavedTripData = async () => {
    if (savedRestIds.length === 0) {
      setSavedRestaurants([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch all restaurants and filter to match saved IDs
      const allRestaurants = await getRestaurants();
      // Maintain the order of saved IDs
      const matched = savedRestIds
        .map((id) => allRestaurants.find((r) => r._id === id))
        .filter((r): r is Restaurant => !!r);
      setSavedRestaurants(matched);
    } catch (error) {
      console.error('Error loading saved trip details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSavedTripData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedRestIds]);

  const handleRemove = (restaurantId: string) => {
    dispatch(removeRestaurant(restaurantId));
    setShareLink(''); // Reset share link as list changed
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear your saved food trail?')) {
      dispatch(clearTrip());
      setShareLink('');
    }
  };

  // Generate share ID in backend and construct WhatsApp share link
  const handleGenerateShare = async () => {
    if (savedRestIds.length === 0) return;
    setShareLoading(true);
    setShareLink('');

    try {
      const data = await createSharedTrip(savedRestIds, savedTrailId || undefined);
      const generatedLink = `${window.location.origin}/trip/shared/${data.shareId}`;
      setShareLink(generatedLink);
      
      // Trigger WhatsApp redirection with pre-filled message
      const tripCity = detectedCity || user?.profile?.city;
      const text = encodeURIComponent(
        `Hey! Check out my walkable Food Trail route${tripCity ? ` in ${tripCity}` : ''}: ${generatedLink}`
      );
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    } catch (error) {
      console.error('Error sharing trip:', error);
      alert('Error connecting to backend server or generating share link.');
    } finally {
      setShareLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    alert('Share link copied to clipboard!');
  };

  const handleCompleteWalk = async () => {
    if (!user) {
      alert('Please log in to complete walks and track your statistics!');
      return;
    }
    
    setCompleteLoading(true);
    try {
      const data = await completeWalk(savedTrailId || undefined);
      dispatch(setCredentials({ user: data.user, token: localStorage.getItem('foodtrail_token') || '' }));
      setShowSuccessBanner(true);
      dispatch(clearTrip());
    } catch (err) {
      console.error('Failed to complete walk:', err);
      alert('Failed to save completed walk to profile.');
    } finally {
      setCompleteLoading(false);
    }
  };

  const getStatusDotClass = (status: string) => {
    switch (status) {
      case 'Plenty of Tables': return 'status-dot-green';
      case 'Filling Up': return 'status-dot-orange';
      case '~15 Min Wait': return 'status-dot-red';
      default: return 'status-dot-red';
    }
  };

  return (
    <div className="max-w-[800px] mx-auto animate-fade-in">
      <section className="text-center my-8 md:my-12">
        <h1 className="text-[2.25rem] font-extrabold mb-2">My Walking Food Trail</h1>
        <p className="text-text-secondary">Curate your custom walkable trail and keep track of live tables.</p>
      </section>

      {showSuccessBanner && (
        <div className="mb-6 p-5 bg-status-green/10 border border-status-green/20 rounded-md text-left flex justify-between items-center animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-status-green flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Walk Completed!</span>
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Congratulations! Your completed walk has been recorded in your profile.
            </p>
          </div>
          <button
            type="button"
            className="text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer text-sm font-bold"
            onClick={() => setShowSuccessBanner(false)}
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="status-dot status-dot-green" style={{ width: 16, height: 16 }}></div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Loading your saved spots...</p>
        </div>
      ) : savedRestaurants.length > 0 ? (
        <>
          {parentTrail && (
            <div className="mb-8 p-5 rounded-md border border-white/8 bg-bg-secondary/40 flex gap-5 items-center flex-col sm:flex-row glass-panel animate-fade-in">
              {parentTrail.photoUrl && (
                <img
                  src={formatPhotoUrl(parentTrail.photoUrl)}
                  alt={parentTrail.name}
                  className="w-full sm:w-[120px] h-[80px] object-cover rounded-sm shrink-0 bg-bg-tertiary"
                />
              )}
              <div className="flex-grow text-left">
                <span className="text-[0.7rem] bg-accent/15 text-accent px-2 py-0.5 rounded font-bold uppercase tracking-wider">Associated Walking Route</span>
                <h3 className="text-lg font-bold text-text-primary mt-1">{parentTrail.name}</h3>
                <p className="text-xs text-text-secondary mt-1">{parentTrail.description}</p>
              </div>
              <button
                type="button"
                className="bg-transparent border border-white/10 text-text-muted hover:text-text-primary hover:border-white/20 rounded-sm px-4 py-2 text-xs font-semibold cursor-pointer transition-all duration-300 shrink-0"
                onClick={() => dispatch(setSavedTrailId(null))}
              >
                Unlink Route
              </button>
            </div>
          )}
          <div className="flex justify-end mb-8 gap-4 flex-col sm:flex-row">
            <button
              type="button"
              className="bg-transparent text-text-secondary border border-white/10 rounded-sm px-5 py-3 font-semibold cursor-pointer transition-all duration-300 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500 flex items-center justify-center gap-2"
              onClick={handleClear}
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Clear Route</span>
            </button>
            <button
              type="button"
              className="bg-[#25d366] text-white border-none rounded-sm px-5 py-3 font-bold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(37,211,102,0.25)] hover:bg-[#20ba5a] hover:scale-[1.02]"
              onClick={handleGenerateShare}
              disabled={shareLoading}
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>{shareLoading ? 'Generating...' : 'Share on WhatsApp'}</span>
            </button>
            <button
              type="button"
              className="bg-accent text-white border-none rounded-sm px-5 py-3 font-bold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(244,63,94,0.25)] hover:bg-accent-hover hover:scale-[1.02]"
              onClick={handleCompleteWalk}
              disabled={completeLoading}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{completeLoading ? 'Completing...' : 'Complete Walk'}</span>
            </button>
          </div>

          {shareLink && (
            <div className="mb-10 p-6 bg-[#25d366]/8 border border-[#25d366]/20 rounded-md flex flex-col gap-3 animate-fade-in">
              <span className="text-[0.85rem] font-bold text-[#25d366] uppercase tracking-wider">Share Link Active</span>
              <div className="flex gap-2 flex-col sm:flex-row">
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  className="flex-grow bg-bg-primary border border-white/8 text-text-primary rounded-sm p-3 text-sm outline-none font-mono"
                />
                <button
                  type="button"
                  className="bg-bg-tertiary text-text-primary border border-white/8 rounded-sm py-3 sm:py-0 px-5 font-semibold cursor-pointer transition-all duration-300 hover:bg-white/5"
                  onClick={copyToClipboard}
                >
                  Copy Link
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6 relative pl-10 mb-12 before:content-[''] before:absolute before:left-[11px] before:top-6 before:bottom-6 before:w-[2px] before:border-dashed before:border-white/15">
            {savedRestaurants.map((rest, index) => {
              return (
                <div key={rest._id} className="relative bg-bg-tertiary/30 border border-white/8 rounded-md flex gap-6 p-5 items-center flex-col sm:flex-row hover:border-white/15 glass-card">
                  <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-6 h-6 bg-bg-primary border-3 border-accent text-text-primary rounded-full flex items-center justify-center text-[0.75rem] font-extrabold z-10 shadow-[0_0_10px_rgba(244,63,94,0.2)]">{index + 1}</div>
                  
                  {rest.photoUrl && (
                    <img
                      src={formatPhotoUrl(rest.photoUrl)}
                      alt={rest.name}
                      className="w-full sm:w-[100px] h-[140px] sm:h-[100px] object-cover rounded-sm shrink-0 bg-bg-tertiary"
                    />
                  )}

                  <div className="flex-grow w-full">
                    <div className="flex justify-between items-start mb-1 gap-4">
                      <h3 className="text-[1.15rem] font-bold">{rest.name}</h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="bg-transparent border-none text-text-muted cursor-pointer transition-all duration-300 p-1 flex items-center justify-center hover:text-accent"
                          onClick={() => setSelectedAddDishRest({ id: rest._id, name: rest.name })}
                          title="Add Dish"
                        >
                          <PlusCircle className="w-4 h-4 shrink-0" />
                        </button>
                        <button
                          type="button"
                          className="bg-transparent border-none text-text-muted cursor-pointer transition-all duration-300 p-1 flex items-center justify-center hover:text-accent"
                          onClick={() => setEditingPhotoRestId(editingPhotoRestId === rest._id ? null : rest._id)}
                          title="Update photo"
                        >
                          <Camera className="w-4 h-4 shrink-0" />
                        </button>
                        <button
                          type="button"
                          className="bg-transparent border-none text-text-muted cursor-pointer transition-all duration-300 p-1 flex items-center justify-center hover:text-red-500"
                          onClick={() => handleRemove(rest._id)}
                          title="Remove stop"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-6 text-[0.85rem] text-text-secondary mb-2">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
                        <span>{rest.area}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                        <span className={`status-dot ${getStatusDotClass(rest.busyStatus)}`}></span>
                        <span>{rest.busyStatus}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-rating text-rating shrink-0" />
                        <span>{rest.rating}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {rest.vibeTags.map((v) => (
                        <span key={v} className="text-[0.7rem] bg-white/4 text-text-muted px-1.5 py-0.5 rounded">
                          {v}
                        </span>
                      ))}
                    </div>

                    {editingPhotoRestId === rest._id && (
                      <div className="mt-4 border-t border-white/5 pt-4 animate-fade-in">
                        <PhotoUpload
                          label="Change Spot Cover Photo"
                          onUploadSuccess={async (fileId) => {
                            try {
                              await updateRestaurantPhoto(rest._id, fileId);
                              setEditingPhotoRestId(null);
                              loadSavedTripData();
                            } catch (err) {
                              console.error('Photo db association error:', err);
                              alert('Photo uploaded successfully to Drive, but failed to link in Database.');
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-20 px-8 bg-bg-tertiary/20 rounded-lg border border-dashed border-white/8">
          <Bookmark className="w-16 h-16 text-text-muted mx-auto mb-4 shrink-0" />
          <h3 className="text-2xl font-bold mb-2">Your saved list is empty</h3>
          <p className="text-text-secondary text-[0.95rem] mb-6 max-w-[420px] mx-auto">
            Star cafes and bakery dishes on the search page or save entire curated trails to build your custom walking route.
          </p>
          <Link href="/">
            <button type="button" className="bg-accent text-white border-none rounded-sm px-6 py-3 font-bold cursor-pointer transition-all duration-300 hover:bg-accent-hover">
              Go Find Food
            </button>
          </Link>
        </div>
      )}

      <AddDishModal
        isOpen={selectedAddDishRest !== null}
        restaurantId={selectedAddDishRest?.id || ''}
        restaurantName={selectedAddDishRest?.name || ''}
        onClose={() => setSelectedAddDishRest(null)}
        onDishAdded={() => {
          loadSavedTripData();
        }}
      />
    </div>
  );
}
