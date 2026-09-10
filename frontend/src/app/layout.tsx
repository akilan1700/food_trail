// File: src/app/layout.tsx
// Description: Root Layout template containing HTML shell, PWA metadata, navigation, install banner, and service worker registration.
// Author: Akilan M
// Created: 2026-08-11T17:42:17+05:30

import type { Metadata, Viewport } from 'next';
import PwaRegister from './components/PwaRegister';
import PwaInstallBanner from './components/PwaInstallBanner';
import StoreProvider from './components/StoreProvider';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import SafeAreaSync from './components/SafeAreaSync';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0b0f19' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f19' },
  ],
};

export const metadata: Metadata = {
  title: 'FoodTrail - Walkable Food Trails & Dish Search',
  description: 'Find top dishes & walkable food trails in your area. Works seamlessly offline and as an installable PWA.',
  manifest: '/manifest.json',
  applicationName: 'FoodTrail',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FoodTrail',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
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
        {/* Cross-platform PWA / mobile chrome (Android + iOS + others) */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#0b0f19" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="FoodTrail" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FoodTrail" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <PwaRegister />
        <SafeAreaSync />
        <StoreProvider>
          <div className="flex flex-col min-h-screen min-h-[100dvh]">
            <div className="pwa-top-chrome">
              <PwaInstallBanner />
              <Navbar />
            </div>
            
            <main className="pwa-main">
              {children}
            </main>
            
            <BottomNav />
            
            <footer className="hidden md:block p-8 md:px-6 text-center border-t border-white/8 text-text-muted text-xs md:text-sm bg-bg-secondary">
              <p>© {new Date().getFullYear()} FoodTrail. Designed for walking food tours.</p>
              <p style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>PWA Installable App for tourists & locals.</p>
            </footer>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
