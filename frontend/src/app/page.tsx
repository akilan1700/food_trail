/* eslint-disable @next/next/no-img-element */
// File: src/app/page.tsx
// Description: Home search dashboard implementing dish-first search, dining spots directory, vibe filters, and community reviews.
// Author: Akilan M
// Created: 2026-08-11T17:42:32+05:30

'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  Dish,
  Restaurant,
  getDishes,
  getRestaurants,
  searchDishes,
  formatPhotoUrl,
  getGoogleMapsUrl,
} from './services/api';
import { useAppDispatch, useAppSelector } from './services/hooks';
import { selectSavedRestIds, addRestaurant, removeRestaurant } from './services/tripSlice';
import { selectCurrentUser, selectDetectedCity } from './services/authSlice';
import { triggerHaptic } from './services/usePwa';
import { Search, Star, MapPin, Bookmark, Utensils, Plus, Store, ExternalLink, MessageSquare } from 'lucide-react';
import AddDishModal from './components/AddDishModal';
import ReviewModal from './components/ReviewModal';

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
  const [activeTab, setActiveTab] = useState<'dishes' | 'spots'>('dishes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddDishRest, setSelectedAddDishRest] = useState<{ id: string; name: string } | null>(null);
  const [selectedReviewTarget, setSelectedReviewTarget] = useState<{
    type: 'restaurant' | 'dish';
    id: string;
    name: string;
    rating?: number;
    reviewCount?: number;
  } | null>(null);

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

  // Fetch initial featured dishes and all spots
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [dishesData, restsData] = await Promise.all([
        getDishes().catch(() => [] as Dish[]),
        getRestaurants().catch(() => [] as Restaurant[]),
      ]);
      const sortedDishes = dishesData.sort((a: Dish, b: Dish) => b.rating - a.rating);
      setDishes(sortedDishes);
      setRestaurants(restsData);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Perform search based on query and selected vibes
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const [dishesData, restsData] = await Promise.all([
        searchDishes(searchQuery, selectedVibes).catch(() => [] as Dish[]),
        getRestaurants().catch(() => [] as Restaurant[]),
      ]);
      setDishes(dishesData);

      // Filter spots by query and vibes client-side
      let filteredRests = restsData;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        filteredRests = filteredRests.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.area.toLowerCase().includes(q) ||
            (r.description && r.description.toLowerCase().includes(q))
        );
      }
      if (selectedVibes.length > 0) {
        filteredRests = filteredRests.filter((r) => {
          const restVibes = r.vibeTags.map((v) => v.toLowerCase());
          return selectedVibes.every((v) => restVibes.includes(v.toLowerCase()));
        });
      }
      setRestaurants(filteredRests);
    } catch (error) {
      console.error('Error executing search:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data on mount
  useEffect(() => {
    Promise.resolve().then(() => {
      loadInitialData();
    });
  }, []);

  // Trigger search when vibe pills change
  useEffect(() => {
    if (loading && dishes.length === 0 && restaurants.length === 0) return;
    Promise.resolve().then(() => {
      handleSearch();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVibes]);

  // Toggle vibe filter pill
  const toggleVibe = (vibe: string) => {
    triggerHaptic(10);
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  };

  // Toggle restaurant in saved "My Trip" list
  const toggleSaveRestaurant = (restaurantId: string) => {
    triggerHaptic(15);
    if (savedRestIds.includes(restaurantId)) {
      dispatch(removeRestaurant(restaurantId));
    } else {
      dispatch(addRestaurant(restaurantId));
    }
  };

  return (
    <div className="animate-fade-in">
      <section className="text-center my-10 md:my-14 animate-fade-in">
        <h1 className="text-[2rem] md:text-[2.75rem] font-extrabold leading-tight mb-3 text-text-primary">
          Find {isClient && currentCity ? `the Best Food & Spots in ${currentCity}` : "Your Area's Best Food & Spots"}
        </h1>
        <p className="text-lg text-text-secondary max-w-[600px] mx-auto">
          Explore signature dishes and all community-added dining spots with vibes, ratings, and location pins.
        </p>
      </section>

      {/* Search Input Section */}
      <section className="max-w-[680px] mx-auto mb-8">
        <form
          onSubmit={handleSearch}
          className="flex flex-col sm:flex-row sm:bg-bg-tertiary/40 sm:border sm:border-white/8 sm:rounded-md sm:p-2 sm:shadow-lg transition-all duration-300 sm:focus-within:border-accent sm:focus-within:shadow-[0_0_15px_rgba(241,128,36,0.25)] gap-3 sm:gap-0"
        >
          <input
            type="text"
            className="flex-grow bg-bg-tertiary/40 sm:bg-transparent border border-white/8 sm:border-none rounded-sm sm:rounded-none outline-none text-text-primary text-lg p-4 sm:py-3 sm:px-4 placeholder:text-text-muted"
            placeholder='Try "Almond Croissant", "Cafe des Arts", "Indiranagar"...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="submit"
            className="bg-accent text-white border-none rounded-sm px-6 py-4 sm:py-0 font-semibold cursor-pointer transition-all duration-300 hover:bg-accent-hover hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span>Search</span>
          </button>
        </form>

        {/* Vibe Filter Pills */}
        <div className="mt-5">
          <h2 className="text-[0.85rem] uppercase tracking-wider text-text-muted mb-3 text-left">Filter by Vibe & Need</h2>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_VIBES.map((vibe) => {
              const isActive = selectedVibes.includes(vibe);
              return (
                <button
                  key={vibe}
                  type="button"
                  className={`bg-bg-tertiary/30 border border-white/5 text-text-secondary px-4 py-2 rounded-full text-[0.85rem] font-medium cursor-pointer transition-all duration-300 select-none hover:bg-bg-tertiary/60 hover:text-text-primary ${
                    isActive ? 'bg-accent border-accent text-white' : ''
                  }`}
                  onClick={() => toggleVibe(vibe)}
                >
                  {vibe}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* View Tabs: Dishes vs Dining Spots */}
      <section className="mt-6">
        <div className="flex justify-between items-center mb-6 border-b border-white/8 pb-4 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('dishes')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 cursor-pointer ${
                activeTab === 'dishes'
                  ? 'bg-accent text-white shadow-[0_4px_12px_rgba(241,128,36,0.3)]'
                  : 'bg-bg-tertiary/40 border border-white/5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Signature Dishes ({dishes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('spots')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 cursor-pointer ${
                activeTab === 'spots'
                  ? 'bg-accent text-white shadow-[0_4px_12px_rgba(241,128,36,0.3)]'
                  : 'bg-bg-tertiary/40 border border-white/5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>All Dining Spots ({restaurants.length})</span>
            </button>
          </div>

          <Link
            href="/add-spot"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-accent bg-accent/10 border border-accent/20 px-3.5 py-2 rounded hover:bg-accent hover:text-white transition-all duration-300 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Spot</span>
          </Link>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="status-dot status-dot-green" style={{ width: 16, height: 16 }}></div>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Searching top spots and dishes...</p>
          </div>
        ) : activeTab === 'dishes' ? (
          /* Dishes Grid */
          dishes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-4">
              {dishes.map((dish) => {
                const rest = dish.restaurantId;
                const isSaved = rest && savedRestIds.includes(rest._id);

                return (
                  <div key={dish._id} className="relative overflow-hidden flex flex-col h-full glass-card">
                    <div className="relative h-[200px] w-full bg-bg-tertiary">
                      <img
                        src={formatPhotoUrl(dish.photoUrl)}
                        alt={dish.name}
                        className="w-full h-full object-cover"
                      />
                      {dish.isSignature && (
                        <span className="absolute top-4 left-4 bg-rating px-3 py-1.5 rounded-full font-bold text-white text-[0.75rem] uppercase tracking-wide shadow-[0_4px_10px_rgba(245,158,11,0.2)]">
                          Signature
                        </span>
                      )}
                      <span className="absolute top-4 right-4 bg-bg-primary/80 backdrop-blur-sm px-3 py-1.5 rounded-full font-bold text-text-primary border border-white/8 text-sm">
                        ₹{dish.price}
                      </span>
                    </div>

                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="text-xl font-bold mb-1.5 text-text-primary">{dish.name}</h3>
                      <p className="text-sm text-text-secondary leading-relaxed mb-4 flex-grow">{dish.description}</p>

                      {rest && (
                        <div className="border-t border-white/5 pt-4 mb-4">
                          <div className="flex justify-between items-center mb-2 gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-text-primary text-base truncate" title={rest.name}>
                                {rest.name}
                              </span>
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
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedReviewTarget({
                                  type: 'dish',
                                  id: dish._id,
                                  name: dish.name,
                                  rating: dish.rating,
                                  reviewCount: dish.reviewCount,
                                })
                              }
                              className="flex items-center gap-1 text-[0.8rem] text-rating font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer bg-rating/10 hover:bg-rating/20 border border-rating/25 px-2 py-0.5 rounded-full"
                              title="Click to view & write dish reviews and comments"
                            >
                              <Star className="w-3.5 h-3.5 fill-rating text-rating shrink-0" />
                              <span>{dish.rating > 0 ? dish.rating.toFixed(1) : ''}</span>
                              {dish.reviewCount !== undefined && dish.reviewCount > 0 && (
                                <span className="text-[0.65rem] opacity-80">({dish.reviewCount})</span>
                              )}
                            </button>
                          </div>

                          <div className="flex justify-between items-center text-xs text-text-secondary">
                            <a
                              href={getGoogleMapsUrl(rest)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-text-secondary hover:text-accent transition-colors duration-200 group/pin"
                              title={`View ${rest.name} on Google Maps`}
                            >
                              <MapPin className="w-3.5 h-3.5 text-text-muted group-hover/pin:text-accent shrink-0 transition-colors" />
                              <span className="hover:underline decoration-dotted underline-offset-2">{rest.area}</span>
                            </a>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {rest.vibeTags.map((v) => (
                              <span key={v} className="text-[0.7rem] bg-white/4 text-text-muted px-1.5 py-0.5 rounded">
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedReviewTarget({
                              type: 'dish',
                              id: dish._id,
                              name: dish.name,
                              rating: dish.rating,
                              reviewCount: dish.reviewCount,
                            })
                          }
                          className="bg-bg-tertiary/60 border border-white/10 hover:bg-bg-tertiary text-text-primary p-3 rounded-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 text-xs transition-all"
                          title="View & write dish reviews and comments"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reviews {dish.reviewCount ? `(${dish.reviewCount})` : ''}</span>
                        </button>

                        {rest ? (
                          <button
                            type="button"
                            className={
                              isSaved
                                ? 'bg-accent text-white border border-accent p-3 rounded-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 text-xs'
                                : 'bg-transparent text-text-primary border border-white/10 p-3 rounded-sm font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-1.5 text-xs hover:bg-accent-light hover:border-accent hover:text-accent'
                            }
                            onClick={() => toggleSaveRestaurant(rest._id)}
                          >
                            {isSaved ? (
                              <>
                                <Bookmark className="w-3.5 h-3.5 fill-white shrink-0" />
                                <span>Saved</span>
                              </>
                            ) : (
                              <>
                                <Bookmark className="w-3.5 h-3.5 shrink-0" />
                                <span>Save Spot</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <div />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 px-8 bg-bg-tertiary/20 rounded-md border border-dashed border-white/8 space-y-4">
              <Utensils className="w-12 h-12 text-text-muted mx-auto" />
              <h3 className="text-xl font-bold">No exact dishes found</h3>
              <p className="text-text-secondary text-sm max-w-[450px] mx-auto">
                {restaurants.length > 0
                  ? `There are ${restaurants.length} dining spots registered. Check the "All Dining Spots" tab to view them and add signature dishes.`
                  : 'No dishes or spots matched your search. Try adjusting your query or add a new dining spot.'}
              </p>
              <div className="flex justify-center gap-3 pt-2">
                {restaurants.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('spots')}
                    className="bg-accent text-white font-semibold px-5 py-2.5 rounded-sm hover:bg-accent-hover transition-all"
                  >
                    View All Dining Spots ({restaurants.length})
                  </button>
                )}
                <Link
                  href="/add-spot"
                  className="bg-bg-tertiary/60 border border-white/10 text-text-primary font-semibold px-5 py-2.5 rounded-sm hover:bg-bg-tertiary transition-all"
                >
                  Add New Spot
                </Link>
              </div>
            </div>
          )
        ) : (
          /* Dining Spots & Cafes Grid */
          restaurants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-4">
              {restaurants.map((rest) => {
                const isSaved = savedRestIds.includes(rest._id);

                return (
                  <div key={rest._id} className="relative overflow-hidden flex flex-col h-full glass-card">
                    <div className="relative h-[200px] w-full bg-bg-tertiary">
                      <img
                        src={formatPhotoUrl(rest.photoUrl)}
                        alt={rest.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-4 left-4 bg-bg-primary/85 backdrop-blur-sm px-3 py-1 rounded-full font-bold text-text-primary border border-white/8 text-xs flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-accent" />
                        <span>{rest.area}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedReviewTarget({
                            type: 'restaurant',
                            id: rest._id,
                            name: rest.name,
                            rating: rest.rating,
                            reviewCount: rest.reviewCount,
                          })
                        }
                        className="absolute top-4 right-4 flex items-center gap-1 bg-bg-primary/85 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-rating border border-white/8 hover:border-rating/40 transition-all cursor-pointer shadow-md hover:scale-105"
                        title="Click to view & write reviews and comments"
                      >
                        <Star className="w-3.5 h-3.5 fill-rating text-rating shrink-0" />
                        <span>{rest.rating > 0 ? rest.rating.toFixed(1) : ''}</span>
                        {rest.reviewCount !== undefined && rest.reviewCount > 0 && (
                          <span className="text-[0.65rem] opacity-80">({rest.reviewCount})</span>
                        )}
                      </button>
                    </div>

                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-text-primary">{rest.name}</h3>
                      </div>

                      {rest.description && (
                        <p className="text-sm text-text-secondary leading-relaxed mb-4 flex-grow">
                          {rest.description}
                        </p>
                      )}

                      <div className="border-t border-white/5 pt-4 mb-4 space-y-3">
                        {/* Google Maps */}
                        <div className="flex justify-between items-center text-xs">
                          <a
                            href={getGoogleMapsUrl(rest)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-text-secondary hover:text-accent transition-colors group/map"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-text-muted group-hover/map:text-accent" />
                            <span className="underline decoration-dotted">Google Maps</span>
                          </a>
                        </div>

                        {/* Vibe Tags */}
                        {rest.vibeTags && rest.vibeTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {rest.vibeTags.map((v) => (
                              <span key={v} className="text-[0.7rem] bg-white/4 text-text-muted px-2 py-0.5 rounded">
                                {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedAddDishRest({ id: rest._id, name: rest.name })}
                          className="bg-bg-tertiary/60 border border-white/10 hover:bg-bg-tertiary text-text-primary p-2.5 rounded-sm font-semibold cursor-pointer flex items-center justify-center gap-1 text-[0.75rem] transition-all"
                        >
                          <Plus className="w-3.5 h-3.5 text-accent" />
                          <span>Add Dish</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedReviewTarget({
                              type: 'restaurant',
                              id: rest._id,
                              name: rest.name,
                              rating: rest.rating,
                              reviewCount: rest.reviewCount,
                            })
                          }
                          className="bg-bg-tertiary/60 border border-white/10 hover:bg-bg-tertiary text-text-primary p-2.5 rounded-sm font-semibold cursor-pointer flex items-center justify-center gap-1 text-[0.75rem] transition-all"
                          title="View & write user reviews"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reviews {rest.reviewCount ? `(${rest.reviewCount})` : ''}</span>
                        </button>

                        <button
                          type="button"
                          className={
                            isSaved
                              ? 'bg-accent text-white border border-accent p-2.5 rounded-sm font-semibold cursor-pointer flex items-center justify-center gap-1 text-[0.75rem]'
                              : 'bg-transparent text-text-primary border border-white/10 p-2.5 rounded-sm font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-1 text-[0.75rem] hover:bg-accent-light hover:border-accent hover:text-accent'
                          }
                          onClick={() => toggleSaveRestaurant(rest._id)}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : ''}`} />
                          <span>{isSaved ? 'Saved' : 'Save'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 px-8 bg-bg-tertiary/20 rounded-md border border-dashed border-white/8 space-y-4">
              <Store className="w-12 h-12 text-text-muted mx-auto" />
              <h3 className="text-xl font-bold">No dining spots found</h3>
              <p className="text-text-secondary text-sm max-w-[400px] mx-auto">
                No dining spots matched your search query or filters. Add a new dining spot to share it with the community!
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

      {/* Add Dish Modal */}
      <AddDishModal
        isOpen={selectedAddDishRest !== null}
        restaurantId={selectedAddDishRest?.id || ''}
        restaurantName={selectedAddDishRest?.name || ''}
        onClose={() => setSelectedAddDishRest(null)}
        onDishAdded={() => {
          loadInitialData();
        }}
      />

      {/* Community Ratings, Reviews & Comments Modal */}
      <ReviewModal
        isOpen={selectedReviewTarget !== null}
        targetType={selectedReviewTarget?.type || 'restaurant'}
        targetId={selectedReviewTarget?.id || ''}
        targetName={selectedReviewTarget?.name || ''}
        currentRating={selectedReviewTarget?.rating}
        reviewCount={selectedReviewTarget?.reviewCount}
        onClose={() => setSelectedReviewTarget(null)}
        onReviewUpdated={() => {
          loadInitialData();
        }}
      />
    </div>
  );
}
