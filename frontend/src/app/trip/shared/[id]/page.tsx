/* eslint-disable @next/next/no-img-element, react-hooks/set-state-in-effect */
// File: src/app/trip/shared/[id]/page.tsx
// Description: Shared trip view page allowing visitors to view and import a friend's curated Puducherry food trail route.
// Author: Akilan M
// Created: 2026-08-11T17:43:22+05:30

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../../trip.module.css';

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

interface SavedTrip {
  _id: string;
  shareId: string;
  restaurantIds: Restaurant[];
}

const API_BASE = 'http://localhost:5001/api';

export default function SharedTripViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchSharedTrip = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/trips/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTrip(data);
      } else {
        setErrorMsg('This shared food trail could not be found. It may have expired or been removed.');
      }
    } catch (error) {
      console.error('Error fetching shared trip:', error);
      setErrorMsg('Could not connect to the server to load the shared trail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchSharedTrip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Import all restaurant IDs into visitor's LocalStorage saved trip list
  const handleImportRoute = () => {
    if (!trip) return;

    const restIdsToImport = trip.restaurantIds.map((r) => r._id);
    localStorage.setItem('foodtrail_saved_trip', JSON.stringify(restIdsToImport));
    
    alert('Successfully imported this food trail! Redirecting to your My Trip dashboard...');
    router.push('/trip');
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
        <h1 className={styles.title}>Shared Food Trail</h1>
        <p className={styles.subtitle}>Someone shared this custom Puducherry food walk route with you!</p>
      </section>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="status-dot green" style={{ width: 16, height: 16 }}></div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Loading shared route...</p>
        </div>
      ) : errorMsg ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚠️</div>
          <h3 className={styles.emptyTitle}>Shared route not found</h3>
          <p className={styles.emptyText}>{errorMsg}</p>
          <Link href="/">
            <button type="button" className={styles.emptyBtn}>
              Create My Own Route
            </button>
          </Link>
        </div>
      ) : trip && trip.restaurantIds.length > 0 ? (
        <>
          <div className={styles.actionRow} style={{ justifyContent: 'center', marginBottom: '2.5rem' }}>
            <button
              type="button"
              className={styles.shareBtn}
              onClick={handleImportRoute}
              style={{ background: 'var(--accent-color)', boxShadow: '0 4px 12px rgba(244, 63, 94, 0.25)' }}
            >
              📥 Import to My Saved Trip
            </button>
          </div>

          <div className={styles.routeTimeline}>
            {trip.restaurantIds.map((rest, index) => {
              return (
                <div key={rest._id} className={`${styles.routeCard} glass-card`}>
                  <div className={styles.routeMarker}>{index + 1}</div>
                  
                  {rest.photoUrl && (
                    <img
                      src={rest.photoUrl}
                      alt={rest.name}
                      className={styles.routeImg}
                    />
                  )}

                  <div className={styles.routeDetails}>
                    <div className={styles.routeNameRow}>
                      <h3 className={styles.routeName}>{rest.name}</h3>
                    </div>

                    <div className={styles.routeInfo}>
                      <span>📍 {rest.area}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                        <span className={`status-dot ${getStatusDotClass(rest.busyStatus)}`}></span>
                        <span>{rest.busyStatus}</span>
                      </div>
                      <span>★ {rest.rating}</span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {rest.description}
                    </p>

                    <div className={styles.routeVibes}>
                      {rest.vibeTags.map((v) => (
                        <span key={v} className={styles.routeVibe}>
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🍽️</div>
          <h3 className={styles.emptyTitle}>Empty route shared</h3>
          <p className={styles.emptyText}>This shared link doesn&apos;t contain any restaurant stops.</p>
        </div>
      )}
    </div>
  );
}
