/* eslint-disable @next/next/no-img-element */
// File: src/app/trip/shared/[id]/page.tsx
// Description: Shared trip view page allowing visitors to view and import a friend's curated Puducherry food trail route.
// Author: Akilan M
// Created: 2026-08-11T17:43:22+05:30

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { SavedTrip, getSharedTrip, formatPhotoUrl, getGoogleMapsUrl } from '../../../services/api';
import { AlertCircle, Download, MapPin, Star } from 'lucide-react';

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
      if (typeof id === 'string') {
        const data = await getSharedTrip(id);
        setTrip(data);
      }
    } catch (error) {
      console.error('Error fetching shared trip:', error);
      setErrorMsg('This shared food trail could not be found or could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      Promise.resolve().then(() => {
        fetchSharedTrip();
      });
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

  return (
    <div className="max-w-[800px] mx-auto animate-fade-in">
      <section className="text-center my-8 md:my-12">
        <h1 className="text-[2.25rem] font-extrabold mb-2">Shared Food Trail</h1>
        <p className="text-text-secondary">Someone shared this custom food walk route with you!</p>
      </section>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="status-dot status-dot-green" style={{ width: 16, height: 16 }}></div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Loading shared route...</p>
        </div>
      ) : errorMsg ? (
        <div className="text-center py-20 px-8 bg-bg-tertiary/20 rounded-lg border border-dashed border-white/8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 shrink-0" />
          <h3 className="text-xl font-bold mb-2">Shared route not found</h3>
          <p className="text-text-secondary text-[0.95rem] mb-6 max-w-[420px] mx-auto">{errorMsg}</p>
          <Link href="/">
            <button type="button" className="bg-accent text-white border-none rounded-sm px-6 py-3 font-bold cursor-pointer transition-all duration-300 hover:bg-accent-hover">
              Create My Own Route
            </button>
          </Link>
        </div>
      ) : trip && trip.restaurantIds.length > 0 ? (
        <>
          <div className="flex justify-center mb-10 gap-4 flex-col sm:flex-row">
            <button
              type="button"
              className="bg-accent text-white border-none rounded-sm px-5 py-3 font-bold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(241,128,36,0.25)] hover:bg-accent-hover"
              onClick={handleImportRoute}
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Import to My Saved Trip</span>
            </button>
          </div>

          <div className="flex flex-col gap-6 relative pl-10 mb-12 before:content-[''] before:absolute before:left-[11px] before:top-6 before:bottom-6 before:w-[2px] before:border-dashed before:border-white/15">
            {trip.restaurantIds.map((rest, index) => {
              return (
                <div key={rest._id} className="relative bg-bg-tertiary/30 border border-white/8 rounded-md flex gap-6 p-5 items-center flex-col sm:flex-row hover:border-white/15 glass-card">
                  <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-6 h-6 bg-bg-primary border-3 border-accent text-text-primary rounded-full flex items-center justify-center text-[0.75rem] font-extrabold z-10 shadow-[0_0_10px_rgba(241,128,36,0.2)]">{index + 1}</div>
                  
                  <img
                    src={formatPhotoUrl(rest.photoUrl)}
                    alt={rest.name}
                    className="w-full sm:w-[100px] h-[140px] sm:h-[100px] object-cover rounded-sm shrink-0 bg-bg-tertiary"
                  />

                  <div className="flex-grow w-full">
                    <div className="flex justify-between items-start mb-1 gap-4">
                      <h3 className="text-[1.15rem] font-bold">{rest.name}</h3>
                    </div>

                    <div className="flex gap-6 text-[0.85rem] text-text-secondary mb-2">
                      <a
                        href={getGoogleMapsUrl(rest)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-accent transition-colors duration-200 group/pin"
                        title={`View ${rest.name} on Google Maps`}
                      >
                        <MapPin className="w-3.5 h-3.5 text-text-muted group-hover/pin:text-accent shrink-0 transition-colors" />
                        <span className="hover:underline decoration-dotted underline-offset-2">{rest.area}</span>
                      </a>
                      <div className="flex items-center gap-1 text-rating font-bold">
                        <Star className="w-3.5 h-3.5 fill-rating text-rating shrink-0" />
                        <span>{rest.rating > 0 ? rest.rating.toFixed(1) : ''}</span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {rest.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {rest.vibeTags.map((v) => (
                        <span key={v} className="text-[0.7rem] bg-white/4 text-text-muted px-1.5 py-0.5 rounded">
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
        <div className="text-center py-20 px-8 bg-bg-tertiary/20 rounded-lg border border-dashed border-white/8">
          <div className="text-[4.5rem] mb-4 text-text-muted">🍽️</div>
          <h3 className="text-2xl font-bold mb-2">Empty route shared</h3>
          <p className="text-text-secondary text-[0.95rem] mb-6 max-w-[420px] mx-auto">This shared link doesn&apos;t contain any restaurant stops.</p>
        </div>
      )}
    </div>
  );
}
