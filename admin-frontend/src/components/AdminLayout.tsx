// File: src/components/AdminLayout.tsx
// Description: Admin shell with logo branding and working collapse/expand sidebar (desktop + mobile).
// Author: Akilan M
// Updated: 2026-09-11

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '../services/adminAuthContext';
import {
  LayoutDashboard,
  Store,
  UtensilsCrossed,
  Users,
  LogOut,
  Menu,
  X,
  Route,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = 'foodtrail_admin_sidebar_collapsed';

/**
 * Master layout wrapper for all administrator pages.
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  const { admin, logout, loading } = useAdminAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
      } catch {
        return false;
      }
    }
    return false;
  });

  /**
   * Toggles desktop sidebar collapse and persists preference.
   */
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (loading || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
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

  /**
   * Renders sidebar navigation links.
   * @param compact - Icon-only mode when desktop sidebar is collapsed
   * @param onNavigate - Optional callback after link click (closes mobile drawer)
   */
  const renderNav = (compact: boolean, onNavigate?: () => void) =>
    navItems.map((item) => {
      const Icon = item.icon;
      const isActive = pathname === item.href;
      return (
        <Link
          key={item.href}
          href={item.href}
          title={item.label}
          onClick={onNavigate}
          className={`flex items-center rounded-lg text-sm font-medium transition-all ${
            compact ? 'justify-center px-2.5 py-2.5' : 'gap-3 px-3.5 py-2.5'
          } ${
            isActive
              ? 'bg-accent text-[#1a1208] shadow-md shadow-accent/25 font-bold'
              : 'text-text-secondary hover:text-text-primary hover:bg-accent/10'
          }`}
        >
          <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-[#1a1208]' : 'text-teal'}`} />
          {!compact && <span className="truncate">{item.label}</span>}
        </Link>
      );
    });

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex bg-bg-primary text-text-primary relative">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-accent/20 bg-bg-secondary/95 backdrop-blur-md shrink-0 transition-[width] duration-200 ease-out ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        <div
          className={`border-b border-accent/20 flex items-center ${
            collapsed ? 'p-3 justify-center' : 'p-4 gap-3'
          }`}
        >
          <Image
            src="/logo.svg"
            alt="FoodTrail"
            width={collapsed ? 40 : 36}
            height={collapsed ? 40 : 36}
            className="shrink-0"
            priority
          />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-black text-sm tracking-wide text-text-primary flex items-center gap-1.5">
                FoodTrail{' '}
                <span className="text-accent text-[0.65rem] px-1.5 py-0.5 rounded-full bg-accent/15 border border-accent/35">
                  ADMIN
                </span>
              </h1>
              <p className="text-[0.7rem] text-text-muted truncate">Control & Curation</p>
            </div>
          )}
        </div>

        <nav className={`flex-1 space-y-1.5 overflow-y-auto ${collapsed ? 'p-2' : 'p-4'}`}>
          {renderNav(collapsed)}
        </nav>

        <div
          className={`border-t border-accent/20 bg-bg-tertiary/40 ${
            collapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-4 flex items-center justify-between gap-2'
          }`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              <div className="w-8 h-8 rounded-full bg-accent/20 text-accent border border-accent/40 flex items-center justify-center font-bold text-xs shrink-0">
                {admin.name ? admin.name[0].toUpperCase() : 'A'}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-bold text-text-primary truncate">{admin.name}</p>
                <p className="text-[0.65rem] text-text-muted truncate">{admin.email}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className="btn-danger !p-2"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="lg:hidden fixed inset-0 z-40 bg-black/55"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r border-accent/20 bg-bg-secondary shadow-2xl transition-transform duration-200 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-accent/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Image src="/logo.svg" alt="FoodTrail" width={36} height={36} priority />
            <div className="min-w-0">
              <h1 className="font-black text-sm text-text-primary flex items-center gap-1.5">
                FoodTrail
                <span className="text-accent text-[0.65rem] px-1.5 py-0.5 rounded-full bg-accent/15 border border-accent/35">
                  ADMIN
                </span>
              </h1>
            </div>
          </div>
          <button type="button" className="btn-ghost !px-2.5" onClick={() => setMobileOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {renderNav(false, () => setMobileOpen(false))}
        </nav>
        <div className="p-4 border-t border-accent/20">
          <button type="button" onClick={logout} className="btn-danger w-full">
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="sticky top-0 z-30 px-4 sm:px-6 py-3.5 border-b border-accent/20 bg-bg-secondary/85 backdrop-blur-md flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile: open drawer (wrapper needed — .btn-ghost overrides Tailwind hidden) */}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="btn-ghost !px-2.5"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Desktop: collapse / expand sidebar */}
            <div className="hidden lg:block">
              <button
                type="button"
                onClick={toggleCollapsed}
                className="btn-ghost !px-2.5"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? (
                  <PanelLeftOpen className="w-5 h-5 text-accent" />
                ) : (
                  <PanelLeftClose className="w-5 h-5 text-accent" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 min-w-0 lg:hidden">
              <Image src="/logo.svg" alt="FoodTrail" width={28} height={28} />
              <span className="text-sm font-bold text-text-primary truncate">Admin</span>
            </div>

            <span className="text-xs font-semibold text-text-muted hidden sm:inline truncate">
              Authenticated as{' '}
              <strong className="text-accent">{admin.role.toUpperCase()}</strong>
            </span>
          </div>

          <button type="button" onClick={logout} className="btn-danger shrink-0">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto min-h-0">{children}</main>
      </div>
    </div>
  );
}
