/* eslint-disable @next/next/no-img-element, react-hooks/set-state-in-effect */
// File: src/app/page.tsx
// Description: Home search dashboard implementing the dish-first search engine, vibe filters, and live busy indicators.
// Author: Akilan M
// Created: 2026-08-11T17:42:32+05:30

'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

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

interface Dish {
  _id: string;
  name: string;
  description: string;
  price: number;
  photoUrl?: string;
  restaurantId: Restaurant;
  rating: number;
  isSignature?: boolean;
}

const API_BASE = 'http://localhost:5001/api';
const AVAILABLE_VIBES = [
  'Pet-friendly',
  'Laptop-friendly',
  'Outdoor garden',
  'Vegan options',
  'Indoor AC',
  'Bakery',
  'Vintage vibe',
  'Eco-friendly',
  'Instagrammable',
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedRestIds, setSavedRestIds] = useState<string[]>([]);

  // Fetch initial featured dishes (signature or highly rated ones)
  const fetchFeaturedDishes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dishes`);
      if (res.ok) {
        const data = await res.json();
        // Initially show top 6 rated dishes
        const sorted = data.sort((a: Dish, b: Dish) => b.rating - a.rating).slice(0, 6);
        setDishes(sorted);
      }
    } catch (error) {
      console.error('Failed to fetch initial dishes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Perform search based on query and selected vibes
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const url = `${API_BASE}/dishes/search?`;
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }
      if (selectedVibes.length > 0) {
        params.append('vibe', selectedVibes.join(','));
      }
      
      const res = await fetch(url + params.toString());
      if (res.ok) {
        const data = await res.json();
        setDishes(data);
      }
    } catch (error) {
      console.error('Error executing search:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load saved trip items from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('foodtrail_saved_trip');
    if (saved) {
      try {
        setSavedRestIds(JSON.parse(saved));
      } catch (err) {
        console.error('Error parsing saved trip data:', err);
      }
    }
    fetchFeaturedDishes();
  }, []);

  // Trigger search when vibe pills change
  useEffect(() => {
    // Skip initial fetch on mount (handled by fetchFeaturedDishes)
    if (loading && dishes.length === 0) return;
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVibes]);

  // Toggle vibe filter pill
  const toggleVibe = (vibe: string) => {
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  };

  // Toggle restaurant in saved "My Trip" list
  const toggleSaveRestaurant = (restaurantId: string) => {
    let updated: string[];
    if (savedRestIds.includes(restaurantId)) {
      updated = savedRestIds.filter((id) => id !== restaurantId);
    } else {
      updated = [...savedRestIds, restaurantId];
    }
    setSavedRestIds(updated);
    localStorage.setItem('foodtrail_saved_trip', JSON.stringify(updated));
  };

  // Helper for busy status dot class
  const getStatusDotClass = (status: string) => {
    switch (status) {
      case 'Plenty of Tables': return 'green';
      case 'Filling Up': return 'orange';
      case '~15 Min Wait': return 'red';
      default: return 'red';
    }
  };

  return (
    <div className="animate-fade-in">
      <section className={styles.hero}>
        <h1 className={styles.title}>Find Puducherry&apos;s Best Dishes</h1>
        <p className={styles.subtitle}>
          Search for exact dishes (like Almond Croissants) and filter by cafe vibes. Get top spots, live busy statuses, and coordinates.
        </p>
      </section>

      <section className={styles.searchSection}>
        <form onSubmit={handleSearch} className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder='Try "Almond Croissant", "Pizza" or "Falafel"...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className={styles.searchButton}>
            🔍 Search
          </button>
        </form>

        <div className={styles.filterSection}>
          <h2 className={styles.filterTitle}>Filter by Vibe & Need</h2>
          <div className={styles.pillsContainer}>
            {AVAILABLE_VIBES.map((vibe) => {
              const isActive = selectedVibes.includes(vibe);
              return (
                <button
                  key={vibe}
                  type="button"
                  className={`${styles.pill} ${isActive ? styles.pillActive : ''}`}
                  onClick={() => toggleVibe(vibe)}
                >
                  {vibe}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.resultsSection}>
        <div className={styles.resultsHeader}>
          <h2 className={styles.resultsTitle}>
            {searchQuery || selectedVibes.length > 0 ? 'Top Matches' : 'Popular Signature Dishes'}
          </h2>
          <span className={styles.resultsCount}>
            {dishes.length} {dishes.length === 1 ? 'spot' : 'spots'} found
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="status-dot green" style={{ width: 16, height: 16 }}></div>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Searching top spots in Pondy...</p>
          </div>
        ) : dishes.length > 0 ? (
          <div className={styles.grid}>
            {dishes.map((dish) => {
              const rest = dish.restaurantId;
              const isSaved = savedRestIds.includes(rest._id);

              return (
                <div key={dish._id} className={`${styles.card} glass-card`}>
                  <div className={styles.imageWrapper}>
                    {dish.photoUrl && (
                      <img
                        src={dish.photoUrl}
                        alt={dish.name}
                        className={styles.dishImage}
                      />
                    )}
                    {dish.isSignature && (
                      <span className={styles.signatureBadge}>Signature</span>
                    )}
                    <span className={styles.priceTag}>₹{dish.price}</span>
                  </div>

                  <div className={styles.cardContent}>
                    <h3 className={styles.dishName}>{dish.name}</h3>
                    <p className={styles.dishDesc}>{dish.description}</p>

                    <div className={styles.restaurantMeta}>
                      <div className={styles.restNameRow}>
                        <span className={styles.restName}>{rest.name}</span>
                        <div className={styles.restRating}>
                          ★ {dish.rating || rest.rating}
                        </div>
                      </div>
                      
                      <div className={styles.restInfoRow}>
                        <span>📍 {rest.area}</span>
                        <div className={styles.busyBadge}>
                          <span className={`status-dot ${getStatusDotClass(rest.busyStatus)}`}></span>
                          <span>{rest.busyStatus}</span>
                        </div>
                      </div>

                      <div className={styles.vibeTags}>
                        {rest.vibeTags.map((v) => (
                          <span key={v} className={styles.vibeTag}>
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={isSaved ? styles.actionButtonSaved : styles.actionButton}
                      onClick={() => toggleSaveRestaurant(rest._id)}
                    >
                      {isSaved ? '★ Saved to Trip' : '☆ Save to My Trip'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🍽️</div>
            <h3 className={styles.emptyTitle}>No exact dishes found</h3>
            <p className={styles.emptyText}>
              We couldn&apos;t find a matching dish in Puducherry for that query. Try searching &quot;Almond Croissant&quot; or &quot;Pizza&quot;.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
