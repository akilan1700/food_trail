/* eslint-disable @next/next/no-img-element */
// File: src/app/page.tsx
// Description: Home search dashboard implementing the dish-first search engine, vibe filters, and live busy indicators.
// Author: Akilan M
// Created: 2026-08-11T17:42:32+05:30

'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Dish, getDishes, searchDishes, formatPhotoUrl } from './services/api';
import { useAppDispatch, useAppSelector } from './services/hooks';
import { selectSavedRestIds, addRestaurant, removeRestaurant } from './services/tripSlice';
import { selectCurrentUser, selectDetectedCity } from './services/authSlice';
import { Search, Star, MapPin, Bookmark, Utensils, Plus } from 'lucide-react';
import AddDishModal from './components/AddDishModal';

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
  const [selectedAddDishRest, setSelectedAddDishRest] = useState<{ id: string; name: string } | null>(null);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const dispatch = useAppDispatch();
  const savedRestIds = useAppSelector(selectSavedRestIds);
  const user = useAppSelector(selectCurrentUser);
  const detectedCity = useAppSelector(selectDetectedCity);

  const currentCity = detectedCity || user?.profile?.city;

  // Fetch initial featured dishes (signature or highly rated ones)
  const fetchFeaturedDishes = async () => {
    setLoading(true);
    try {
      const data = await getDishes();
      // Initially show top 6 rated dishes
      const sorted = data.sort((a: Dish, b: Dish) => b.rating - a.rating).slice(0, 6);
      setDishes(sorted);
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
      const data = await searchDishes(searchQuery, selectedVibes);
      setDishes(data);
    } catch (error) {
      console.error('Error executing search:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load featured dishes on mount
  useEffect(() => {
    Promise.resolve().then(() => {
      fetchFeaturedDishes();
    });
  }, []);

  // Trigger search when vibe pills change
  useEffect(() => {
    // Skip initial fetch on mount (handled by fetchFeaturedDishes)
    if (loading && dishes.length === 0) return;
    Promise.resolve().then(() => {
      handleSearch();
    });
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
    if (savedRestIds.includes(restaurantId)) {
      dispatch(removeRestaurant(restaurantId));
    } else {
      dispatch(addRestaurant(restaurantId));
    }
  };

  // Helper for busy status dot class
  const getStatusDotClass = (status: string) => {
    switch (status) {
      case 'Plenty of Tables': return 'status-dot-green';
      case 'Filling Up': return 'status-dot-orange';
      case '~15 Min Wait': return 'status-dot-red';
      default: return 'status-dot-red';
    }
  };

  return (
    <div className="animate-fade-in">
      <section className="text-center my-10 md:my-14 animate-fade-in">
        <h1 className="text-[2rem] md:text-[2.75rem] font-extrabold leading-tight mb-3 text-text-primary">
          Find {isClient && currentCity ? `the Best Dishes in ${currentCity}` : "Your Area's Best Dishes"}
        </h1>
        <p className="text-lg text-text-secondary max-w-[600px] mx-auto">
          Search for exact dishes (like Almond Croissants) and filter by cafe vibes. Get top spots, live busy statuses, and coordinates.
        </p>
      </section>

      <section className="max-w-[680px] mx-auto mb-12">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row sm:bg-bg-tertiary/40 sm:border sm:border-white/8 sm:rounded-md sm:p-2 sm:shadow-lg transition-all duration-300 sm:focus-within:border-accent sm:focus-within:shadow-[0_0_15px_rgba(244,63,94,0.25)] gap-3 sm:gap-0">
          <input
            type="text"
            className="flex-grow bg-bg-tertiary/40 sm:bg-transparent border border-white/8 sm:border-none rounded-sm sm:rounded-none outline-none text-text-primary text-lg p-4 sm:py-3 sm:px-4 placeholder:text-text-muted"
            placeholder='Try "Almond Croissant", "Pizza" or "Falafel"...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="bg-accent text-white border-none rounded-sm px-6 py-4 sm:py-0 font-semibold cursor-pointer transition-all duration-300 hover:bg-accent-hover hover:scale-[1.02] flex items-center justify-center gap-2">
            <Search className="w-4 h-4 shrink-0" />
            <span>Search</span>
          </button>
        </form>

        <div className="mt-5">
          <h2 className="text-[0.85rem] uppercase tracking-wider text-text-muted mb-3 text-left">Filter by Vibe & Need</h2>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_VIBES.map((vibe) => {
              const isActive = selectedVibes.includes(vibe);
              return (
                <button
                  key={vibe}
                  type="button"
                  className={`bg-bg-tertiary/30 border border-white/5 text-text-secondary px-4 py-2 rounded-full text-[0.85rem] font-medium cursor-pointer transition-all duration-300 select-none hover:bg-bg-tertiary/60 hover:text-text-primary ${isActive ? 'bg-accent border-accent text-white' : ''}`}
                  onClick={() => toggleVibe(vibe)}
                >
                  {vibe}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-2">
          <h2 className="text-xl font-bold">
            {searchQuery || selectedVibes.length > 0 ? 'Top Matches' : 'Popular Signature Dishes'}
          </h2>
          <span className="text-text-muted text-sm">
            {dishes.length} {dishes.length === 1 ? 'spot' : 'spots'} found
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="status-dot status-dot-green" style={{ width: 16, height: 16 }}></div>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Searching top spots in Pondy...</p>
          </div>
        ) : dishes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-4">
            {dishes.map((dish) => {
              const rest = dish.restaurantId;
              const isSaved = savedRestIds.includes(rest._id);

              return (
                <div key={dish._id} className="relative overflow-hidden flex flex-col h-full glass-card">
                  <div className="relative h-[200px] w-full bg-bg-tertiary">
                    {dish.photoUrl && (
                      <img
                        src={formatPhotoUrl(dish.photoUrl)}
                        alt={dish.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {dish.isSignature && (
                      <span className="absolute top-4 left-4 bg-rating px-3 py-1.5 rounded-full font-bold text-white text-[0.75rem] uppercase tracking-wide shadow-[0_4px_10px_rgba(245,158,11,0.2)]">Signature</span>
                    )}
                    <span className="absolute top-4 right-4 bg-bg-primary/80 backdrop-blur-sm px-3 py-1.5 rounded-full font-bold text-text-primary border border-white/8 text-sm">₹{dish.price}</span>
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold mb-1.5 text-text-primary">{dish.name}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed mb-4 flex-grow">{dish.description}</p>

                    <div className="border-t border-white/5 pt-4 mb-4">
                      <div className="flex justify-between items-center mb-2 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-text-primary text-base truncate" title={rest.name}>{rest.name}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedAddDishRest({ id: rest._id, name: rest.name })}
                            className="text-[0.7rem] text-accent hover:text-accent-hover font-bold flex items-center gap-0.5 border border-accent/15 bg-accent/5 px-2 py-0.5 rounded-full hover:bg-accent/10 transition-all cursor-pointer shrink-0"
                            title="Add signature dish to this cafe"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Add Dish</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-1 text-[0.85rem] text-rating font-bold shrink-0">
                          <Star className="w-4 h-4 fill-rating text-rating shrink-0" />
                          <span>{dish.rating || rest.rating}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-text-secondary">
                        <div className="flex items-center gap-1 text-text-secondary">
                          <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span>{rest.area}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-semibold bg-white/3 px-2 py-1 rounded">
                          <span className={`status-dot ${getStatusDotClass(rest.busyStatus)}`}></span>
                          <span>{rest.busyStatus}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {rest.vibeTags.map((v) => (
                          <span key={v} className="text-[0.7rem] bg-white/4 text-text-muted px-1.5 py-0.5 rounded">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={isSaved ? "w-full bg-accent text-white border border-accent p-3 rounded-sm font-semibold cursor-pointer flex items-center justify-center gap-2 text-sm" : "w-full bg-transparent text-text-primary border border-white/10 p-3 rounded-sm font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 text-sm hover:bg-accent-light hover:border-accent hover:text-accent"}
                      onClick={() => toggleSaveRestaurant(rest._id)}
                    >
                      {isSaved ? (
                        <>
                          <Bookmark className="w-4 h-4 fill-white shrink-0" />
                          <span>Saved to Trip</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4 shrink-0" />
                          <span>Save to My Trip</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          searchQuery || selectedVibes.length > 0 ? (
            <div className="text-center py-16 px-8 bg-bg-tertiary/20 rounded-md border border-dashed border-white/8">
              <Utensils className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No exact dishes found</h3>
              <p className="text-text-secondary text-sm max-w-[400px] mx-auto">
                We couldn&apos;t find a matching dish {isClient && currentCity ? `in ${currentCity}` : 'in your area'} for that query. Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="text-center py-16 px-8 bg-bg-tertiary/20 rounded-md border border-dashed border-white/8">
              <Utensils className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No spots added yet</h3>
              <p className="text-text-secondary text-sm max-w-[400px] mx-auto mb-6">
                Your culinary map is a clean slate! Add a dining spot and its signature dishes to start building food trails.
              </p>
              <Link href="/add-spot">
                <span className="inline-block bg-accent hover:bg-accent-hover text-white font-semibold px-6 py-3 rounded-sm transition-all duration-300 transform hover:scale-[1.02] cursor-pointer">
                  Add New Dining Spot
                </span>
              </Link>
            </div>
          )
        )}
      </section>

      <AddDishModal
        isOpen={selectedAddDishRest !== null}
        restaurantId={selectedAddDishRest?.id || ''}
        restaurantName={selectedAddDishRest?.name || ''}
        onClose={() => setSelectedAddDishRest(null)}
        onDishAdded={() => {
          if (searchQuery || selectedVibes.length > 0) {
            handleSearch();
          } else {
            fetchFeaturedDishes();
          }
        }}
      />
    </div>
  );
}
