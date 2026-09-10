// File: src/app/components/SafeAreaSync.tsx
// Description: Keeps CSS safe-area variables in sync on all mobile platforms (Android, iOS, etc.).
// Author: Akilan M
// Created: 2026-09-10T18:40:00+05:30

'use client';

import { useEffect } from 'react';

/**
 * Reads env(safe-area-inset-*) via a probe element and writes --sat/--sab/--sal/--sar
 * so layout updates on rotate, cutout changes, and Android visualViewport shifts.
 */
export default function SafeAreaSync() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = [
      'position:fixed',
      'inset:0',
      'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)',
      'pointer-events:none',
      'visibility:hidden',
      'z-index:-1',
    ].join(';');
    document.body.appendChild(probe);

    const sync = () => {
      const style = getComputedStyle(probe);
      const root = document.documentElement;
      root.style.setProperty('--sat', style.paddingTop);
      root.style.setProperty('--sar', style.paddingRight);
      root.style.setProperty('--sab', style.paddingBottom);
      root.style.setProperty('--sal', style.paddingLeft);
      root.style.setProperty('--app-vh', `${window.innerHeight}px`);
    };

    sync();

    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    window.visualViewport?.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('scroll', sync);

    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      window.visualViewport?.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('scroll', sync);
      probe.remove();
    };
  }, []);

  return null;
}
