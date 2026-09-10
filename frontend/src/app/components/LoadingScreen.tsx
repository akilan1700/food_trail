// File: src/app/components/LoadingScreen.tsx
// Description: Reusable loading screen component displaying a spinner to indicate content loading.
// Author: Akilan M
// Created: 2026-08-13T17:41:00+05:30

import React from 'react';
import Logo from './Logo';

/**
 * A reusable loading screen component that displays a spinner with branded logo.
 * Used to indicate active loading state or during client-side hydration.
 *
 * @returns {React.ReactElement} The loading screen element.
 */
export default function LoadingScreen(): React.ReactElement {
  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center py-10 animate-fade-in gap-4" id="loading-screen">
      <div className="relative flex items-center justify-center">
        {/* Subtle glowing ring animation */}
        <div className="absolute w-16 h-16 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
        <Logo size="sm" variant="mark" />
      </div>
      <span className="text-xs text-text-muted uppercase tracking-widest animate-pulse font-medium">Loading FoodTrail</span>
    </div>
  );
}
