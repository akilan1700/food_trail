/* eslint-disable @next/next/no-img-element */
// File: src/app/trails/page.tsx
// Description: Interactive walking trails page connecting food spots, allowing users to save full routes and explore curated culinary trails.
// Author: Akilan M
// Created: 2026-08-11T17:42:55+05:30

'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';

import { Trail, getTrails, getTrailDetails, formatPhotoUrl, getGoogleMapsUrl } from '../services/api';
import { Footprints, Route, Compass, Bookmark, MapPin } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../services/hooks';
import { addRestaurants, setSavedTrailId } from '../services/tripSlice';
import { selectCurrentUser, selectDetectedCity } from '../services/authSlice';

export default function TrailsPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const detectedCity = useAppSelector(selectDetectedCity);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const fetchTrails = async () => {
    setLoading(true);
    try {
      const data = await getTrails();
      setTrails(data);
      // Default to select first trail if available
      if (data.length > 0) {
        fetchTrailDetails(data[0]._id);
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

  // Fetch all trails on load
  useEffect(() => {
    Promise.resolve().then(() => {
      fetchTrails();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save all stops/restaurants of this trail to My Trip saved list
  const handleSaveTrailRestaurants = () => {
    if (!selectedTrail) return;
    
    const restIdsToSave = selectedTrail.stops.map(stop => stop.restaurantId._id);
    dispatch(addRestaurants(restIdsToSave));
    dispatch(setSavedTrailId(selectedTrail._id));
    alert(`Added all ${selectedTrail.stops.length} places from "${selectedTrail.name}" to your Trip list!`);
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
              return (
                <div
                  key={trail._id}
                  className={`overflow-hidden cursor-pointer glass-card ${isActive ? 'animate-pulse-glow' : ''}`}
                  onClick={() => fetchTrailDetails(trail._id)}
                  style={isActive ? { borderColor: 'var(--color-accent)' } : {}}
                >
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
                    <button
                      type="button"
                      className="bg-accent text-white border-none rounded-sm px-5 py-3 font-semibold cursor-pointer transition-all duration-300 flex items-center gap-2 shrink-0 hover:bg-accent-hover"
                      onClick={handleSaveTrailRestaurants}
                    >
                      <Bookmark className="w-4 h-4 fill-white shrink-0" />
                      <span>Save Route Stops</span>
                    </button>
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
