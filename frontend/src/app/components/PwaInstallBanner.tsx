// File: src/app/components/PwaInstallBanner.tsx
// Description: Interactive PWA component displaying install prompts, offline connection banners, and auto-sync status.
// Author: Akilan M
// Created: 2026-09-10T15:25:25+05:30

'use client';

import React, { useState, useEffect } from 'react';
import { useNetworkStatus, usePwaInstall, triggerHaptic } from '../services/usePwa';
import { executeQueuedMutation } from '../services/api';
import {
  Download,
  WifiOff,
  Wifi,
  RefreshCw,
  X,
  Share,
  PlusSquare,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export default function PwaInstallBanner() {
  const { isOnline, pendingCount, syncing, syncNow, lastSyncResult } = useNetworkStatus(executeQueuedMutation);
  const { isInstallable, isStandalone, isIosSafari, triggerInstall } = usePwaInstall();

  const [dismissedInstall, setDismissedInstall] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Listen for SW update waiting event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSwUpdate = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('foodtrail_sw_update_ready', handleSwUpdate);

    return () => {
      window.removeEventListener('foodtrail_sw_update_ready', handleSwUpdate);
    };
  }, []);

  // Show sync success feedback when items get synced
  useEffect(() => {
    if (lastSyncResult && lastSyncResult.processed > 0) {
      Promise.resolve().then(() => {
        setShowSyncSuccess(true);
      });
    }
  }, [lastSyncResult]);

  const handleInstallClick = async () => {
    triggerHaptic(20);
    const success = await triggerInstall();
    if (success) {
      setDismissedInstall(true);
    }
  };

  const handleUpdateApp = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  return (
    <aside aria-label="Application Notifications" className="w-full">
      {/* 1. App Update Banner */}
      {updateAvailable && (
        <div className="bg-gradient-to-r from-accent to-orange-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin-slow shrink-0" />
            <span>A new version of FoodTrail is available!</span>
          </div>
          <button
            type="button"
            onClick={handleUpdateApp}
            className="bg-white text-accent font-bold px-3 py-1 rounded shadow cursor-pointer hover:bg-white/90 transition-all text-xs"
          >
            Update Now
          </button>
        </div>
      )}

      {/* 2. Offline Status Banner */}
      {!isOnline && (
        <div className="bg-status-red/90 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md animate-fade-in backdrop-blur-sm border-b border-red-500/30">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              Offline Mode Active — You can continue browsing food trails and saved spots.
            </span>
          </div>
          {pendingCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded text-[0.7rem] font-bold">
              {pendingCount} action{pendingCount > 1 ? 's' : ''} queued for sync
            </span>
          )}
        </div>
      )}

      {/* 3. Back Online Synced Toast */}
      {isOnline && showSyncSuccess && (
        <div className="bg-status-green/90 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md animate-fade-in backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Back online! All queued offline actions were synchronized with the server.</span>
          </div>
          <button
            type="button"
            onClick={() => setShowSyncSuccess(false)}
            className="p-1 hover:bg-white/20 rounded cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Manual Sync Button when online with pending items */}
      {isOnline && pendingCount > 0 && (
        <div className="bg-bg-tertiary/90 border-b border-white/10 px-4 py-2 text-xs text-text-secondary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-status-green" />
            <span>{pendingCount} pending offline action{pendingCount > 1 ? 's' : ''} waiting to sync.</span>
          </div>
          <button
            type="button"
            disabled={syncing}
            onClick={syncNow}
            className="flex items-center gap-1 text-accent font-bold hover:underline cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      )}

      {/* 5. Android / Chrome / Desktop PWA Install Prompt Banner */}
      {isInstallable && !dismissedInstall && !isStandalone && (
        <div className="relative mx-auto max-w-[1200px] mt-2 mb-2 px-4">
          <div className="bg-gradient-to-r from-bg-secondary via-bg-tertiary to-bg-secondary border border-accent/30 rounded-xl p-3.5 md:p-4 shadow-xl flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shrink-0 shadow-inner">
                <Download className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-text-primary">Install FoodTrail App</h4>
                <p className="text-xs text-text-secondary">
                  Get full-screen walking trails, instant offline access, and fast dish searches.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleInstallClick}
                className="bg-accent hover:bg-accent-hover text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md shadow-accent/20 cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
              <button
                type="button"
                onClick={() => setDismissedInstall(true)}
                className="text-text-muted hover:text-text-primary p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. iOS Safari PWA Install Instructions Banner */}
      {isIosSafari && !isStandalone && !dismissedInstall && (
        <div className="relative mx-auto max-w-[1200px] mt-2 mb-2 px-4">
          <div className="bg-bg-secondary/90 border border-white/10 rounded-xl p-3.5 text-left shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-accent" />
                <span className="text-xs font-bold text-text-primary">
                  Install FoodTrail on your iPhone / iPad
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowIosGuide(!showIosGuide)}
                  className="text-xs text-accent font-semibold px-2 py-1 rounded hover:bg-accent/10 transition-colors cursor-pointer"
                >
                  {showIosGuide ? 'Hide Instructions' : 'View Instructions'}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedInstall(true)}
                  className="text-text-muted hover:text-text-primary p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {showIosGuide && (
              <div className="mt-3 pt-3 border-t border-white/8 text-xs text-text-secondary space-y-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-black flex items-center justify-center text-[0.7rem] shrink-0">
                    1
                  </span>
                  <span>Tap the <strong>Share</strong> button <Share className="inline w-3.5 h-3.5 mx-1" /> in Safari&apos;s bottom toolbar.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent/20 text-accent font-black flex items-center justify-center text-[0.7rem] shrink-0">
                    2
                  </span>
                  <span>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="inline w-3.5 h-3.5 mx-1" />.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
