// File: src/app/layout.tsx
// Description: Root layout configuring Next.js HTML structure and admin authentication provider wrapping.
// Author: Akilan M
// Created: 2026-09-10T11:27:55+05:30

import './globals.css';
import type { Metadata } from 'next';
import { AdminAuthProvider } from '../services/adminAuthContext';
import AdminLayout from '../components/AdminLayout';

export const metadata: Metadata = {
  title: 'FoodTrail Admin Control Center',
  description: 'Administrative command center for managing registered dining spots and signature dishes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-bg-primary text-text-primary min-h-screen">
        <AdminAuthProvider>
          <AdminLayout>{children}</AdminLayout>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
