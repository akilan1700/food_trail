// File: src/app/trails/create/page.tsx
// Description: Page route for constructing and saving custom curated walking food trails.
// Author: Akilan M
// Created: 2026-08-12T17:23:00+05:30
// Updated: 2026-09-11

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRestaurants, Restaurant } from '../../services/api';
import TrailCreator from '../../components/TrailCreator';
import LoadingScreen from '../../components/LoadingScreen';
import { useAppSelector } from '../../services/hooks';
import { selectCurrentUser } from '../../services/authSlice';

export default function CreateTrailPage() {
  const router = useRouter();
  const user = useAppSelector(selectCurrentUser);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;

    const loadRestaurants = async () => {
      try {
        const data = await getRestaurants();
        setAllRestaurants(data);
      } catch (err) {
        console.error('Failed to load restaurants for trail builder:', err);
      } finally {
        setLoading(false);
      }
    };
    loadRestaurants();
  }, [user]);

  const handleSuccess = () => {
    alert('Walking Trail created successfully!');
    router.push('/trails');
  };

  const handleCancel = () => {
    router.push('/trails');
  };

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="max-w-[900px] mx-auto animate-fade-in">
      <section className="my-8">
        <h1 className="text-[2.25rem] font-extrabold mb-2 text-text-primary">New Walking Trail</h1>
        <p className="text-text-secondary">Build a new sequential food route through Pondicherry.</p>
      </section>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="status-dot status-dot-green" style={{ width: 16, height: 16 }}></div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Loading restaurants...</p>
        </div>
      ) : (
        <TrailCreator
          allRestaurants={allRestaurants}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
