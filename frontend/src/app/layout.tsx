// File: src/app/layout.tsx
// Description: Root Layout template containing HTML shell, PWA metadata, navigation, and service worker registration.
// Author: Akilan M
// Created: 2026-08-11T17:42:17+05:30

import type { Metadata, Viewport } from 'next';
import PwaRegister from './components/PwaRegister';
import StoreProvider from './components/StoreProvider';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'FoodTrail',
  description: 'Find top dishes & walkable food trails in your area.',
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
        <StoreProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            
            <main className="flex-grow p-4 pb-28 md:p-6 w-full max-w-[1200px] mx-auto">
              {children}
            </main>
            
            <BottomNav />
            
            <footer className="p-8 md:px-6 text-center border-t border-white/8 text-text-muted text-xs md:text-sm bg-bg-secondary pb-32 md:pb-8">
              <p>© {new Date().getFullYear()} FoodTrail. Designed for walking food tours.</p>
              <p style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>PWA Installable App for tourists & locals.</p>
            </footer>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
