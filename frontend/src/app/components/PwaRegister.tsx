// File: src/app/components/PwaRegister.tsx
// Description: Client component managing PWA service worker registration, lifecycle updates, and background sync listeners.
// Author: Akilan M
// Created: 2026-08-11T17:42:03+05:30

'use client';

import { useEffect } from 'react';
import { flushOfflineQueue } from '../services/offlineSync';
import { executeQueuedMutation } from '../services/api';

/**
 * PwaRegister registers the service worker '/sw.js' in the browser
 * and monitors for service worker update events and sync triggers.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // Check if there is an update waiting
        if (registration.waiting) {
          window.dispatchEvent(new CustomEvent('foodtrail_sw_update_ready'));
        }

        // Listen for new service worker updates found
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent('foodtrail_sw_update_ready'));
              }
            });
          }
        });

        // Listen for messages dispatched by Service Worker (e.g. background sync)
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'TRIGGER_OFFLINE_SYNC') {
            flushOfflineQueue(executeQueuedMutation);
          }
        });
      } catch (error) {
        console.error('[PWA Register] Service Worker registration failed:', error);
      }
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
      return () => window.removeEventListener('load', registerSW);
    }
  }, []);

  return null;
}
