/* eslint-disable @next/next/no-img-element, react-hooks/set-state-in-effect */
// File: src/app/trip/page.tsx
// Description: Saved trip (My Trip) page allowing users to view, manage, and share their walkable food trail route via WhatsApp.
// Author: Akilan M
// Created: 2026-08-11T17:43:13+05:30

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './trip.module.css';

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

const API_BASE = 'http://localhost:5001/api';

export default function MyTripPage() {
  const [savedRestaurants, setSavedRestaurants] = useState<Restaurant[]>([]);
  const [savedRestIds, setSavedRestIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [shareLink, setShareLink] = useState('');
  const [shareLoading, setShareLoading] = useState(false);

  const loadSavedTripData = async () => {
    setLoading(true);
    const saved = localStorage.getItem('foodtrail_saved_trip');
    if (!saved) {
      setLoading(false);
      return;
    }

    try {
      const parsedIds = JSON.parse(saved) as string[];
      setSavedRestIds(parsedIds);

      if (parsedIds.length > 0) {
        // Fetch all restaurants and filter to match saved IDs
        const res = await fetch(`${API_BASE}/restaurants`);
        if (res.ok) {
          const allRestaurants = (await res.json()) as Restaurant[];
          // Maintain the order of saved IDs
          const matched = parsedIds
            .map((id) => allRestaurants.find((r) => r._id === id))
            .filter((r): r is Restaurant => !!r);
          setSavedRestaurants(matched);
        }
      } else {
        setSavedRestaurants([]);
      }
    } catch (error) {
      console.error('Error loading saved trip details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSavedTripData();
  }, []);

  const handleRemove = (restaurantId: string) => {
    const updatedIds = savedRestIds.filter((id) => id !== restaurantId);
    setSavedRestIds(updatedIds);
    setSavedRestaurants((prev) => prev.filter((r) => r._id !== restaurantId));
    localStorage.setItem('foodtrail_saved_trip', JSON.stringify(updatedIds));
    setShareLink(''); // Reset share link as list changed
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear your saved food trail?')) {
      localStorage.removeItem('foodtrail_saved_trip');
      setSavedRestIds([]);
      setSavedRestaurants([]);
      setShareLink('');
    }
  };

  // Generate share ID in backend and construct WhatsApp share link
  const handleGenerateShare = async () => {
    if (savedRestIds.length === 0) return;
    setShareLoading(true);
    setShareLink('');

    try {
      const res = await fetch(`${API_BASE}/trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantIds: savedRestIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const generatedLink = `${window.location.origin}/trip/shared/${data.shareId}`;
        setShareLink(generatedLink);
        
        // Trigger WhatsApp redirection with pre-filled message
        const text = encodeURIComponent(
          `Hey! Check out my walkable Food Trail route in Puducherry: ${generatedLink}`
        );
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
      } else {
        alert('Failed to generate share link. Please try again.');
      }
    } catch (error) {
      console.error('Error sharing trip:', error);
      alert('Error connecting to backend server.');
    } finally {
      setShareLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    alert('Share link copied to clipboard!');
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
        <h1 className={styles.title}>My Walking Food Trail</h1>
        <p className={styles.subtitle}>Curate your custom walkable trail and keep track of live tables.</p>
      </section>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="status-dot green" style={{ width: 16, height: 16 }}></div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Loading your saved spots...</p>
        </div>
      ) : savedRestaurants.length > 0 ? (
        <>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClear}
            >
              Clear Route
            </button>
            <button
              type="button"
              className={styles.shareBtn}
              onClick={handleGenerateShare}
              disabled={shareLoading}
            >
              {shareLoading ? 'Generating...' : '💬 Share on WhatsApp'}
            </button>
          </div>

          {shareLink && (
            <div className={styles.shareBox}>
              <span className={styles.shareLabel}>Share Link Active</span>
              <div className={styles.shareInputRow}>
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  className={styles.shareInput}
                />
                <button
                  type="button"
                  className={styles.copyBtn}
                  onClick={copyToClipboard}
                >
                  Copy Link
                </button>
              </div>
            </div>
          )}

          <div className={styles.routeTimeline}>
            {savedRestaurants.map((rest, index) => {
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
                      <button
                        type="button"
                        className={styles.routeRemove}
                        onClick={() => handleRemove(rest._id)}
                        title="Remove stop"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className={styles.routeInfo}>
                      <span>📍 {rest.area}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                        <span className={`status-dot ${getStatusDotClass(rest.busyStatus)}`}></span>
                        <span>{rest.busyStatus}</span>
                      </div>
                      <span>★ {rest.rating}</span>
                    </div>

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
          <div className={styles.emptyIcon}>⭐</div>
          <h3 className={styles.emptyTitle}>Your saved list is empty</h3>
          <p className={styles.emptyText}>
            Star cafes and bakery dishes on the search page or save entire curated trails to build your custom walking route.
          </p>
          <Link href="/">
            <button type="button" className={styles.emptyBtn}>
              Go Find Food
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
