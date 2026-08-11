// File: src/app/layout.tsx
// Description: Root Layout template containing HTML shell, PWA metadata, navigation, and service worker registration.
// Author: Akilan M
// Created: 2026-08-11T17:42:17+05:30

import type { Metadata } from 'next';
import Link from 'next/link';
import PwaRegister from './components/PwaRegister';
import styles from './layout.module.css';
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
        <div className={styles.wrapper}>
          <header className={`${styles.header} glass-panel`}>
            <Link href="/" className={styles.brand}>
              📍 Food<span className={styles.brandHighlight}>Trail</span>
            </Link>
            <nav className={styles.nav}>
              <Link href="/" className={styles.navLink}>
                🔍 Dish Search
              </Link>
              <Link href="/trails" className={styles.navLink}>
                🗺️ Walking Trails
              </Link>
              <Link href="/trip" className={styles.navLink}>
                ⭐ My Trip
              </Link>
            </nav>
          </header>
          
          <main className={styles.main}>
            {children}
          </main>
          
          <footer className={styles.footer}>
            <p>© {new Date().getFullYear()} FoodTrail Puducherry. Designed for walking food tours.</p>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>PWA Installable App for tourists & locals.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
