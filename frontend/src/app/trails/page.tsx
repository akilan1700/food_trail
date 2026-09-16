/* eslint-disable @next/next/no-img-element */
// File: src/app/trails/page.tsx
// Description: Interactive walking trails page connecting food spots, allowing users to save full routes and explore curated culinary trails.
// Author: Akilan M
// Created: 2026-08-11T17:42:55+05:30

'use client';

import { useState, useEffect, useSyncExternalStore, type MouseEvent } from 'react';
import Link from 'next/link';

import { Trail, getTrails, getTrailDetails, formatPhotoUrl, getGoogleMapsUrl, shareFoodTrail, deleteTrail } from '../services/api';
import { Footprints, Route, Compass, Bookmark, MapPin, Sun, SunMedium, Share2, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../services/hooks';
import { addRestaurants, setSavedTrailId } from '../services/tripSlice';
import { selectCurrentUser, selectDetectedCity } from '../services/authSlice';
import { useWakeLock, triggerHaptic } from '../services/usePwa';

/**
 * Returns true when the signed-in user may delete this trail.
 * @param trail - Trail record
 * @param userId - Current user id
 */
function canDeleteTrail(trail: Trail, userId?: string | null): boolean {
  if (!userId) return false;
  if (!trail.createdBy) return true;
  return String(trail.createdBy) === String(userId);
}

export default function TrailsPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const detectedCity = useAppSelector(selectDetectedCity);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const userId = user?.id || user?._id || null;

  const { isSupported: isWakeLockSupported, isLocked: isWakeLocked, toggleWakeLock } = useWakeLock();

  const fetchTrails = async () => {
    setLoading(true);
    try {
      const data = await getTrails();
      setTrails(data);
      if (data.length > 0) {
        fetchTrailDetails(data[0]._id);
      } else {
        setSelectedTrail(null);
      }
    } catch (error) {
      console.error('Error fetching trails:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrailDetails = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await getTrailDetails(id);
      setSelectedTrail(data);
    } catch (error) {
      console.error('Error fetching trail detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchTrails();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveTrailRestaurants = () => {
    if (!selectedTrail) return;
    triggerHaptic(20);
    const restIdsToSave = selectedTrail.stops.map(stop => stop.restaurantId._id);
    dispatch(addRestaurants(restIdsToSave));
    dispatch(setSavedTrailId(selectedTrail._id));
    alert(`Added all ${selectedTrail.stops.length} places from "${selectedTrail.name}" to your Trip list!`);
  };

  const handleShareTrail = async (trail: Trail) => {
    triggerHaptic(15);
    const url = typeof window !== 'undefined' ? `${window.location.origin}/trails` : '';
    await shareFoodTrail({
      title: trail.name,
      text: `Walk this food trail: ${trail.name} (${(trail.distance / 1000).toFixed(1)} km, ${trail.estimatedDuration} mins)!`,
      url,
    });
  };

  /**
   * Deletes a trail after confirmation and refreshes the list.
   * @param trail - Trail to remove
   * @param event - Click event (stops card selection)
   */
  const handleDeleteTrail = async (trail: Trail, event?: MouseEvent) => {
    event?.stopPropagation();
    if (!userId) {
      setDeleteError('Sign in to delete a walking trail.');
      return;
    }
    if (!window.confirm(`Delete walking trail "${trail.name}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(trail._id);
    setDeleteError(null);
    try {
      await deleteTrail(trail._id);
      triggerHaptic(20);
      const remaining = trails.filter((t) => t._id !== trail._id);
      setTrails(remaining);
      if (selectedTrail?._id === trail._id) {
        if (remaining.length > 0) {
          fetchTrailDetails(remaining[0]._id);
        } else {
          setSelectedTrail(null);
        }
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete trail.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-[900px] mx-auto animate-fade-in">
      <section className="text-center my-8 md:my-12">
        <h1 className="text-[2.25rem] font-extrabold mb-2">Walkable Food Trails</h1>
        <p className="text-text-secondary mb-6">Explore {isClient && (detectedCity || user?.profile?.city) ? `${detectedCity || user?.profile?.city}'s` : 'local'} heritage streets &amp; organic eco-cafes on foot.</p>
        <Link href="/trails/create">
          <button
            type="button"
            className="bg-accent text-white border border-accent rounded-sm px-5 py-3 font-semibold cursor-pointer transition-all duration-300 hover:bg-accent-hover shadow-[0_4px_12px_rgba(241,128,36,0.2)]"
          >
            Create Custom Walking Trail
          </button>
        </Link>
        {deleteError && (
          <p className="mt-4 text-sm text-red-400" role="alert">{deleteError}</p>
        )}
      </section>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="status-dot status-dot-green" style={{ width: 16, height: 16 }}></div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Loading trails...</p>
        </div>
      ) : trails.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {trails.map((trail) => {
              const isActive = selectedTrail?._id === trail._id;
              const showDelete = canDeleteTrail(trail, userId);
              return (
                <div
                  key={trail._id}
                  className={`overflow-hidden cursor-pointer glass-card relative ${isActive ? 'animate-pulse-glow' : ''}`}
                  onClick={() => fetchTrailDetails(trail._id)}
                  style={isActive ? { borderColor: 'var(--color-accent)' } : {}}
                >
                  {showDelete && (
                    <button
                      type="button"
                      aria-label={`Delete trail ${trail.name}`}
                      title="Delete trail"
                      disabled={deletingId === trail._id}
                      onClick={(e) => handleDeleteTrail(trail, e)}
                      className="absolute top-3 left-3 z-20 bg-bg-primary/90 border border-white/15 text-text-secondary hover:text-red-400 hover:border-red-400/50 rounded-sm p-2 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="h-[180px] relative bg-bg-tertiary">
                    <img
                      src={formatPhotoUrl(trail.photoUrl)}
                      alt={trail.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-4 left-4 bg-bg-primary/85 backdrop-blur-sm px-2.5 py-1 rounded-sm text-[0.75rem] font-semibold border border-white/8">{trail.area}</span>
                    <span className="absolute top-4 right-4 bg-accent text-white px-2.5 py-1 rounded-sm text-[0.75rem] font-bold shadow-[0_4px_8px_rgba(241,128,36,0.3)] flex items-center gap-1">
                      <Footprints className="w-3.5 h-3.5 shrink-0" />
                      <span>{trail.estimatedDuration} Min Walk</span>
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 text-text-primary">{trail.name}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed mb-4">{trail.description}</p>
                    <div className="flex gap-6 text-[0.85rem] text-text-muted">
                      <div className="flex items-center gap-1.5">
                        <Route className="w-4 h-4 shrink-0" />
                        <span>{(trail.distance / 1000).toFixed(1)} km</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Compass className="w-4 h-4 shrink-0" />
                        <span>{trail.stops?.length || 0} stops</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedTrail && (
            <div className="mt-12 p-8 rounded-lg border border-white/8 bg-bg-secondary/50 animate-fade-in">
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="status-dot status-dot-green" style={{ width: 16, height: 16 }}></div>
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Loading trail path details...</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-8 border-b border-white/8 pb-6 gap-4 flex-col sm:flex-row">
                    <div>
                      <h2 className="text-[1.75rem] font-extrabold mb-2">{selectedTrail.name}</h2>
                      <p className="text-text-secondary text-[0.95rem] leading-relaxed max-w-[600px]">{selectedTrail.description}</p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {isWakeLockSupported && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic(15);
                            toggleWakeLock();
                          }}
                          className={`border rounded-sm px-3.5 py-2.5 text-xs font-semibold cursor-pointer transition-all duration-300 flex items-center gap-1.5 ${
                            isWakeLocked
                              ? 'bg-accent/20 border-accent text-accent shadow-[0_0_10px_rgba(241,128,36,0.3)]'
                              : 'bg-bg-tertiary/40 border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20'
                          }`}
                          title="Keep screen awake while following this walking trail"
                        >
                          {isWakeLocked ? <Sun className="w-3.5 h-3.5 text-accent animate-pulse" /> : <SunMedium className="w-3.5 h-3.5" />}
                          <span>{isWakeLocked ? 'Screen awake: On' : 'Keep screen awake'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="bg-bg-tertiary text-text-primary border border-white/10 rounded-sm px-3.5 py-2.5 text-xs font-semibold cursor-pointer transition-all duration-300 hover:bg-white/10 flex items-center gap-1.5"
                        onClick={() => handleShareTrail(selectedTrail)}
                      >
                        <Share2 className="w-3.5 h-3.5 text-accent" />
                        <span>Share</span>
                      </button>
                      <button
                        type="button"
                        className="bg-accent text-white border-none rounded-sm px-4 py-2.5 text-xs font-bold cursor-pointer transition-all duration-300 flex items-center gap-1.5 shrink-0 hover:bg-accent-hover shadow-md shadow-accent/20"
                        onClick={handleSaveTrailRestaurants}
                      >
                        <Bookmark className="w-3.5 h-3.5 fill-white shrink-0" />
                        <span>Save Route Stops</span>
                      </button>
                      {canDeleteTrail(selectedTrail, userId) && (
                        <button
                          type="button"
                          className="bg-bg-tertiary text-text-secondary border border-white/10 rounded-sm px-3.5 py-2.5 text-xs font-semibold cursor-pointer transition-all duration-300 hover:text-red-400 hover:border-red-400/40 flex items-center gap-1.5 disabled:opacity-50"
                          disabled={deletingId === selectedTrail._id}
                          onClick={() => handleDeleteTrail(selectedTrail)}
                          title="Delete this walking trail"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{deletingId === selectedTrail._id ? 'Deleting…' : 'Delete'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    <div className="flex flex-col gap-6 relative pl-8 before:content-[''] before:absolute before:left-[7px] before:top-6 before:bottom-6 before:w-[2px] before:bg-accent/30">
                      {selectedTrail.stops
                        .sort((a, b) => a.order - b.order)
                        .map((stop) => {
                          const rest = stop.restaurantId;
                          return (
                            <div key={stop._id} className="relative bg-bg-tertiary/30 border border-white/8 rounded-md p-5">
                              <div className="absolute -left-8 top-5 -translate-x-1/2 w-[18px] h-[18px] bg-bg-primary border-3 border-accent rounded-full z-10 shadow-[0_0_8px_var(--color-accent)]"></div>
                              
                              <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                                <div>
                                  <span className="text-[0.75rem] font-bold uppercase text-accent tracking-wider">Stop {stop.order}</span>
                                  <h4 className="text-[1.15rem] font-bold text-text-primary">{rest.name}</h4>
                                </div>
                              </div>

                              <p className="text-sm text-text-secondary mb-4 leading-relaxed">{stop.description}</p>

                              <div className="flex justify-between items-center border-t border-white/5 pt-3 flex-wrap gap-2">
                                <a
                                  href={getGoogleMapsUrl(rest)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[0.8rem] text-text-secondary hover:text-accent transition-colors duration-200 group/pin"
                                  title={`View ${rest.name} on Google Maps`}
                                >
                                  <MapPin className="w-3.5 h-3.5 text-text-muted group-hover/pin:text-accent shrink-0 transition-colors" />
                                  <span className="hover:underline decoration-dotted underline-offset-2">{rest.area || rest.address || 'Location'}</span>
                                </a>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 px-8 bg-bg-tertiary/20 rounded-md border border-dashed border-white/8 mb-12 animate-fade-in">
          <Footprints className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No walking trails created yet</h3>
          <p className="text-text-secondary text-sm max-w-[400px] mx-auto mb-6">
            Build your own walking food route through {isClient && (detectedCity || user?.profile?.city) ? (detectedCity || user?.profile?.city) : 'your area'} using the creator.
          </p>
          <Link href="/trails/create">
            <span className="inline-block bg-accent hover:bg-accent-hover text-white font-semibold px-6 py-3 rounded-sm transition-all duration-300 transform hover:scale-[1.02] cursor-pointer">
              Create Walking Trail
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
