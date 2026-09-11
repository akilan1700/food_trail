// File: src/components/AdminLayout.tsx
// Description: Master layout wrapper providing the administrator command center navigation, sidebar, and session controls.
// Author: Akilan M
// Created: 2026-09-10T11:27:45+05:30
// Updated: 2026-09-11

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '../services/adminAuthContext';
import {
  LayoutDashboard,
  Store,
  UtensilsCrossed,
  Users,
  Shield,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Route,
  MessageSquare,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Master layout wrapper for all administrator pages.
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  const { admin, logout, loading } = useAdminAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If on login page, don't show admin sidebar/header
  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (loading || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
          <span className="text-xs text-text-muted">Loading Admin Console...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Registered Spots', href: '/restaurants', icon: Store },
    { label: 'Signature Dishes', href: '/dishes', icon: UtensilsCrossed },
    { label: 'Trails', href: '/trails', icon: Route },
    { label: 'Reviews', href: '/reviews', icon: MessageSquare },
    { label: 'Platform Users', href: '/users', icon: Users },
  ];

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex bg-bg-primary text-text-primary">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/8 bg-bg-secondary/90 backdrop-blur-md shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/8 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-wide text-text-primary flex items-center gap-1.5">
              FoodTrail <span className="text-accent text-[0.65rem] px-1.5 py-0.5 rounded-full bg-accent/10 border border-accent/20">ADMIN</span>
            </h1>
            <p className="text-[0.7rem] text-text-muted">Control & Curation Center</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-accent text-white shadow-md shadow-accent/20 font-semibold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-text-muted'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin User Profile & Logout */}
        <div className="p-4 border-t border-white/8 bg-black/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              {admin.name ? admin.name[0].toUpperCase() : 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-text-primary truncate">{admin.name}</p>
              <p className="text-[0.65rem] text-text-muted truncate">{admin.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 px-6 py-3.5 border-b border-white/8 bg-bg-secondary/70 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 lg:hidden text-text-secondary hover:text-text-primary rounded-md hover:bg-white/5"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="text-xs font-semibold text-text-muted hidden sm:inline">
              Authenticated as <strong className="text-text-primary">{admin.role.toUpperCase()}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Live Site</span>
            </a>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden p-4 border-b border-white/8 bg-bg-secondary/95 backdrop-blur-md space-y-1 animate-fade-in">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm ${
                    isActive ? 'bg-accent text-white font-bold' : 'text-text-secondary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Page Content — min-h-0 lets flex child scroll on desktop */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto min-h-0">{children}</main>
      </div>
    </div>
  );
}
