// File: src/app/layout.tsx
// Description: Root Layout template containing HTML shell, PWA metadata, navigation, and service worker registration.
// Author: Akilan M
// Created: 2026-08-11T17:42:17+05:30

import type { Metadata } from 'next';
import Link from 'next/link';
import PwaRegister from './components/PwaRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'FoodTrail Puducherry',
  description: 'Find top dishes & walkable food trails in Puducherry.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FoodTrail',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0b0f19" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <PwaRegister />
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 px-4 md:px-6 py-4 md:py-3 flex flex-col md:flex-row justify-between items-center border-b border-white/8 glass-panel gap-4 md:gap-0">
            <Link href="/" className="flex items-center gap-2 text-2xl font-extrabold text-text-primary">
              📍 Food<span className="text-accent">Trail</span>
            </Link>
            <nav className="flex items-center w-full md:w-auto justify-around md:justify-end gap-2 md:gap-6">
              <Link href="/" className="flex flex-col md:flex-row items-center gap-1 text-xs md:text-[0.95rem] font-medium text-text-secondary p-[0.35rem] md:px-3 md:py-2 rounded-sm transition-all duration-300 hover:text-text-primary hover:bg-bg-tertiary">
                🔍 Dish Search
              </Link>
              <Link href="/trails" className="flex flex-col md:flex-row items-center gap-1 text-xs md:text-[0.95rem] font-medium text-text-secondary p-[0.35rem] md:px-3 md:py-2 rounded-sm transition-all duration-300 hover:text-text-primary hover:bg-bg-tertiary">
                🗺️ Walking Trails
              </Link>
              <Link href="/trip" className="flex flex-col md:flex-row items-center gap-1 text-xs md:text-[0.95rem] font-medium text-text-secondary p-[0.35rem] md:px-3 md:py-2 rounded-sm transition-all duration-300 hover:text-text-primary hover:bg-bg-tertiary">
                ⭐ My Trip
              </Link>
            </nav>
          </header>
          
          <main className="flex-grow p-6 w-full max-w-[1200px] mx-auto">
            {children}
          </main>
          
          <footer className="p-8 md:px-6 text-center border-t border-white/8 text-text-muted text-xs md:text-sm bg-bg-secondary">
            <p>© {new Date().getFullYear()} FoodTrail Puducherry. Designed for walking food tours.</p>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>PWA Installable App for tourists & locals.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
