// File: frontend/src/app/trip/shared/[id]/page.tsx
// Description: Server page component providing generateStaticParams for Next.js static export.
// Author: Akilan M
// Created: 2026-09-10T17:28:00+05:30

import SharedTripClient from './SharedTripClient';

/**
 * generateStaticParams satisfies Next.js static HTML export (output: 'export') requirements.
 * Dynamic route IDs are resolved at runtime via client-side routing and Cloudflare Pages SPA rewrite.
 *
 * @returns Array of static parameter stubs for pre-rendering.
 */
export function generateStaticParams() {
  return [{ id: 'shared' }];
}

/**
 * SharedTripPage server component wrapper for static export compatibility.
 */
export default function SharedTripPage() {
  return <SharedTripClient />;
}
