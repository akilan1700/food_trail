/* eslint-disable @next/next/no-img-element, react-hooks/set-state-in-effect */
// File: src/app/trails/page.tsx
// Description: Interactive walking trails page connecting food spots, allowing users to save full routes and simulate live busy updates.
// Author: Akilan M
// Created: 2026-08-11T17:42:55+05:30

'use client';

import { useState, useEffect } from 'react';

import { Trail, getTrails, getTrailDetails, updateBusyStatus } from '../services/api';

export default function TrailsPage() {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

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
    fetchTrails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save all stops/restaurants of this trail to My Trip saved list
  const handleSaveTrailRestaurants = () => {
    if (!selectedTrail) return;
    
    const restIdsToSave = selectedTrail.stops.map(stop => stop.restaurantId._id);
    const existing = localStorage.getItem('foodtrail_saved_trip');
    let updated: string[] = [];
    
    if (existing) {
      try {
        const parsed = JSON.parse(existing) as string[];
        // Merge and avoid duplicates
        updated = Array.from(new Set([...parsed, ...restIdsToSave]));
      } catch (err) {
        console.error('Error parsing existing saved trip in trail add:', err);
        updated = restIdsToSave;
      }
    } else {
      updated = restIdsToSave;
    }
    
    localStorage.setItem('foodtrail_saved_trip', JSON.stringify(updated));
    alert(`Added all ${selectedTrail.stops.length} places from "${selectedTrail.name}" to your Trip list!`);
  };

  // Simulate updating live busy status of a restaurant
  const handleUpdateBusyStatus = async (restaurantId: string, newStatus: string) => {
    try {
      await updateBusyStatus(restaurantId, newStatus);
      // Refresh details to show updated status
      if (selectedTrail) {
        fetchTrailDetails(selectedTrail._id);
      }
    } catch (error) {
      console.error('Failed to update simulated busy status:', error);
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
    <div className="max-w-[900px] mx-auto animate-fade-in">
      <section className="text-center my-8 md:my-12">
        <h1 className="text-[2.25rem] font-extrabold mb-2">Walkable Food Trails</h1>
        <p className="text-text-secondary">Explore Puducherry&apos;s heritage French streets &amp; organic eco-cafes on foot.</p>
      </section>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="status-dot status-dot-green" style={{ width: 16, height: 16 }}></div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Loading trails...</p>
        </div>
      ) : (
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
                    {trail.photoUrl && (
                      <img
                        src={trail.photoUrl}
                        alt={trail.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <span className="absolute bottom-4 left-4 bg-bg-primary/85 backdrop-blur-sm px-2.5 py-1 rounded-sm text-[0.75rem] font-semibold border border-white/8">{trail.area}</span>
                    <span className="absolute top-4 right-4 bg-accent text-white px-2.5 py-1 rounded-sm text-[0.75rem] font-bold shadow-[0_4px_8px_rgba(244,63,94,0.3)]">
                      🚶 {trail.estimatedDuration} Min Walk
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 text-text-primary">{trail.name}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed mb-4">{trail.description}</p>
                    <div className="flex gap-6 text-[0.85rem] text-text-muted">
                      <div className="flex items-center gap-1.5">
                        <span>📏 {(trail.distance / 1000).toFixed(1)} km</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>☕ {trail.stops?.length || 0} stops</span>
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
                      ⭐ Save Route Stops
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    <div className="flex flex-col gap-6 relative pl-8 before:content-[''] before:absolute before:left-[7px] before:top-6 before:bottom-6 before:w-[2px] before:bg-gradient-to-b before:from-accent before:to-bg-tertiary">
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
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <div className="status-dot-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                                    <span className={`status-dot ${getStatusDotClass(rest.busyStatus)}`}></span>
                                    <span style={{ fontWeight: 600 }}>{rest.busyStatus}</span>
                                  </div>
                                </div>
                              </div>

                              <p className="text-sm text-text-secondary mb-4 leading-relaxed">{stop.description}</p>

                              <div className="flex justify-between items-center border-t border-white/5 pt-3 flex-wrap gap-2">
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  📍 {rest.address}
                                </span>

                                <div className="flex items-center gap-2 text-[0.8rem]">
                                  <span className="text-text-muted">Simulate Status:</span>
                                  <select
                                    className="bg-bg-tertiary text-text-primary border border-white/10 rounded px-2 py-1 text-[0.8rem] outline-none cursor-pointer"
                                    value={rest.busyStatus}
                                    onChange={(e) => handleUpdateBusyStatus(rest._id, e.target.value)}
                                  >
                                    <option value="Plenty of Tables">Plenty of Tables</option>
                                    <option value="Filling Up">Filling Up</option>
                                    <option value="~15 Min Wait">~15 Min Wait</option>
                                    <option value="Closed">Closed</option>
                                  </select>
                                </div>
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
      )}
    </div>
  );
}
