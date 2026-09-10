// File: src/app/services/usePwa.ts
// Description: Custom React hooks for PWA install prompt, network connectivity status, Screen Wake Lock, and haptic feedback.
// Author: Akilan M
// Created: 2026-09-10T15:24:50+05:30

'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { getPendingMutationCount, flushOfflineQueue, OfflineMutationItem } from './offlineSync';

// Extended Event interface for beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Hook to track online/offline connectivity and pending offline queue sync status.
 */
export function useNetworkStatus(
  mutationProcessor?: (item: OfflineMutationItem) => Promise<unknown>
) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  const [pendingCount, setPendingCount] = useState<number>(() => getPendingMutationCount());
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ processed: number; failed: number } | null>(null);

  const handleSync = useCallback(async () => {
    if (!navigator.onLine || !mutationProcessor || syncing) return;
    setSyncing(true);
    try {
      const res = await flushOfflineQueue(mutationProcessor);
      setLastSyncResult(res);
      setPendingCount(getPendingMutationCount());
    } catch (err) {
      console.error('[useNetworkStatus] Sync error:', err);
    } finally {
      setSyncing(false);
    }
  }, [mutationProcessor, syncing]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onOnline = () => {
      setIsOnline(true);
      if (mutationProcessor) {
        handleSync();
      }
    };

    const onOffline = () => {
      setIsOnline(false);
    };

    const onQueueChanged = (e: Event) => {
      const custom = e as CustomEvent<{ count: number }>;
      setPendingCount(custom.detail?.count ?? getPendingMutationCount());
    };

    const onSynced = () => {
      setPendingCount(getPendingMutationCount());
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('foodtrail_offline_queue_changed', onQueueChanged);
    window.addEventListener('foodtrail_offline_synced', onSynced);

    // Initial sync check on mount
    if (navigator.onLine && mutationProcessor && getPendingMutationCount() > 0) {
      void Promise.resolve().then(() => {
        handleSync();
      });
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('foodtrail_offline_queue_changed', onQueueChanged);
      window.removeEventListener('foodtrail_offline_synced', onSynced);
    };
  }, [handleSync, mutationProcessor]);

  return {
    isOnline,
    pendingCount,
    syncing,
    lastSyncResult,
    syncNow: handleSync,
  };
}

/**
 * Hook to manage PWA Installation prompt and standalone display mode detection.
 */
export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const isStandalone = isClient
    ? window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    : false;

  const isIos = isClient
    ? /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream: unknown }).MSStream
    : false;

  const isIosSafari = isIos && isClient && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS/.test(navigator.userAgent);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) return false;
    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setInstallPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[usePwaInstall] Prompt error:', err);
      return false;
    }
  }, [installPrompt]);

  return {
    isInstallable: isInstallable && !isStandalone && !isInstalled,
    isStandalone,
    isInstalled,
    isIos,
    isIosSafari,
    triggerInstall,
  };
}

/**
 * Hook to manage Screen Wake Lock API so screen stays awake while walking trails.
 */
export function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [wakeLockSentinel, setWakeLockSentinel] = useState<any>(null);

  const isSupported = typeof window !== 'undefined' && 'wakeLock' in navigator;

  const requestWakeLock = useCallback(async () => {
    if (!isSupported) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sentinel = await (navigator as any).wakeLock.request('screen');
      setWakeLockSentinel(sentinel);
      setIsLocked(true);

      sentinel.addEventListener('release', () => {
        setIsLocked(false);
        setWakeLockSentinel(null);
      });
    } catch (err) {
      console.warn('[useWakeLock] Failed to obtain wake lock:', err);
      setIsLocked(false);
    }
  }, [isSupported]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinel) {
      try {
        await wakeLockSentinel.release();
        setWakeLockSentinel(null);
        setIsLocked(false);
      } catch (err) {
        console.warn('[useWakeLock] Failed to release wake lock:', err);
      }
    }
  }, [wakeLockSentinel]);

  const toggleWakeLock = useCallback(async () => {
    if (isLocked) {
      await releaseWakeLock();
    } else {
      await requestWakeLock();
    }
  }, [isLocked, releaseWakeLock, requestWakeLock]);

  // Re-acquire lock on visibility change if page comes back into view
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (isLocked && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [isLocked, requestWakeLock, wakeLockSentinel]);

  return {
    isSupported,
    isLocked,
    requestWakeLock,
    releaseWakeLock,
    toggleWakeLock,
  };
}

/**
 * Trigger subtle device vibration feedback.
 * @param durationMs - Duration in milliseconds (defaults to 15ms).
 */
export function triggerHaptic(durationMs = 15): void {
  if (typeof window !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(durationMs);
    } catch {
      // Ignore unsupported browser environments
    }
  }
}
