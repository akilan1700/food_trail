// File: src/app/components/LoadingScreen.tsx
// Description: Reusable loading screen component displaying a spinner to indicate content loading.
// Author: Akilan M
// Created: 2026-08-13T17:41:00+05:30

import React from 'react';

/**
 * A reusable loading screen component that displays a spinner.
 * Used to indicate active loading state or during client-side hydration.
 *
 * @returns {React.ReactElement} The loading screen element.
 */
export default function LoadingScreen(): React.ReactElement {
  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center py-10 animate-fade-in" id="loading-screen">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
