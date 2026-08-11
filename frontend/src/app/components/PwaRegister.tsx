// File: src/app/components/PwaRegister.tsx
// Description: Client component that registers the PWA service worker on mount.
// Author: Akilan M
// Created: 2026-08-11T17:42:03+05:30

'use client';

import { useEffect } from 'react';

/**
 * PwaRegister registers the service worker '/sw.js' in the browser
 * once the component is mounted (client-side only).
 */
export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered successfully with scope:', registration.scope);
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
