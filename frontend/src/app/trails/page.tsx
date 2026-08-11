/* eslint-disable @next/next/no-img-element, react-hooks/set-state-in-effect */
// File: src/app/trails/page.tsx
// Description: Interactive walking trails page connecting food spots, allowing users to save full routes and simulate live busy updates.
// Author: Akilan M
// Created: 2026-08-11T17:42:55+05:30

'use client';

import { useState, useEffect } from 'react';
import styles from './trails.module.css';

interface Restaurant {
  _id: string;
  name: string;
  description: string;
  address: string;
  area: string;
  vibeTags: string[];
  busyStatus: 'Plenty of Tables' | 'Filling Up' | '~15 Min Wait' | 'Closed';
  rating: number;
  photoUrl?: string;
}

interface Stop {
  _id: string;
  order: number;
  restaurantId: Restaurant;
  description: string;
}

interface Trail {
  _id: string;
  name: string;
  description: string;
  estimatedDuration: number;
  distance: number;
  area: string;
  photoUrl?: string;
  stops: Stop[];
}

const API_BASE = 'http://localhost:5001/api';

export default function TrailsPage() {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchTrails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/trails`);
      if (res.ok) {
        const data = await res.json();
        setTrails(data);
        // Default to select first trail if available
        if (data.length > 0) {
          fetchTrailDetails(data[0]._id);
        }
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
      const res = await fetch(`${API_BASE}/trails/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTrail(data);
      }
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
      const res = await fetch(`${API_BASE}/restaurants/${restaurantId}/busy-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ busyStatus: newStatus }),
      });

      if (res.ok) {
        // Refresh details to show updated status
        if (selectedTrail) {
          fetchTrailDetails(selectedTrail._id);
        }
      }
    } catch (error) {
      console.error('Failed to update simulated busy status:', error);
    }
  };

  const getStatusDotClass = (status: string) => {
    switch (status) {
      case 'Plenty of Tables': return 'green';
      case 'Filling Up': return 'orange';
      case '~15 Min Wait': return 'red';
      default: return 'red';
    }
  };

  return (
    <div className={styles.container}>
      <section className={styles.header}>
        <h1 className={styles.title}>Walkable Food Trails</h1>
        <p className={styles.subtitle}>Explore Puducherry&apos;s heritage French streets &amp; organic eco-cafes on foot.</p>
      </section>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="status-dot green" style={{ width: 16, height: 16 }}></div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Loading trails...</p>
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {trails.map((trail) => {
              const isActive = selectedTrail?._id === trail._id;
              return (
                <div
                  key={trail._id}
                  className={`${styles.trailCard} glass-card ${isActive ? 'animate-pulse-glow' : ''}`}
                  onClick={() => fetchTrailDetails(trail._id)}
                  style={isActive ? { borderColor: 'var(--accent-color)' } : {}}
                >
                  <div className={styles.imageWrapper}>
                    {trail.photoUrl && (
                      <img
                        src={trail.photoUrl}
                        alt={trail.name}
                        className={styles.trailImage}
                      />
                    )}
                    <span className={styles.trailArea}>{trail.area}</span>
                    <span className={styles.trailMeta}>
                      🚶 {trail.estimatedDuration} Min Walk
                    </span>
                  </div>
                  <div className={styles.cardContent}>
                    <h3 className={styles.trailName}>{trail.name}</h3>
                    <p className={styles.trailDesc}>{trail.description}</p>
                    <div className={styles.statsRow}>
                      <div className={styles.statItem}>
                        <span>📏 {(trail.distance / 1000).toFixed(1)} km</span>
                      </div>
                      <div className={styles.statItem}>
                        <span>☕ {trail.stops?.length || 0} stops</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedTrail && (
            <div className={styles.detailSection}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="status-dot green" style={{ width: 16, height: 16 }}></div>
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Loading trail path details...</p>
                </div>
              ) : (
                <>
                  <div className={styles.detailHeader}>
                    <div>
                      <h2 className={styles.detailTitle}>{selectedTrail.name}</h2>
                      <p className={styles.detailDesc}>{selectedTrail.description}</p>
                    </div>
                    <button
                      type="button"
                      className={styles.saveTrailButton}
                      onClick={handleSaveTrailRestaurants}
                    >
                      ⭐ Save Route Stops
                    </button>
                  </div>

                  <div className={styles.mapAndTimeline}>
                    <div className={styles.timeline}>
                      {selectedTrail.stops
                        .sort((a, b) => a.order - b.order)
                        .map((stop) => {
                          const rest = stop.restaurantId;
                          return (
                            <div key={stop._id} className={styles.stopNode}>
                              <div className={styles.stopMarker}></div>
                              
                              <div className={styles.stopHeader}>
                                <div>
                                  <span className={styles.stopOrder}>Stop {stop.order}</span>
                                  <h4 className={styles.stopTitle}>{rest.name}</h4>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <div className="status-dot-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                                    <span className={`status-dot ${getStatusDotClass(rest.busyStatus)}`}></span>
                                    <span style={{ fontWeight: 600 }}>{rest.busyStatus}</span>
                                  </div>
                                </div>
                              </div>

                              <p className={styles.stopDesc}>{stop.description}</p>

                              <div className={styles.stopMeta}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  📍 {rest.address}
                                </span>

                                <div className={styles.simSection}>
                                  <span className={styles.simLabel}>Simulate Status:</span>
                                  <select
                                    className={styles.simSelect}
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
