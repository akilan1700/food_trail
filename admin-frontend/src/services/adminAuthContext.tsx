// File: src/services/adminAuthContext.tsx
// Description: React Authentication Context managing admin session state, token persistence, and route protection.
// Author: Akilan M
// Created: 2026-09-10T11:27:30+05:30

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminUser, adminLogin, adminLogout, getAdminProfile } from './api';

interface AdminAuthContextType {
  admin: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, mpin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

/**
 * Provider component wrapping admin views to supply administrative authentication state.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const purgeAdminSession = useCallback(() => {
    localStorage.removeItem('foodtrail_admin_jwt');
    localStorage.removeItem('foodtrail_admin_user');
    localStorage.removeItem('foodtrail_admin_expires_at');
    setAdmin(null);
    setToken(null);
  }, []);

  const checkAdminExpiry = useCallback(() => {
    const expiryStr = localStorage.getItem('foodtrail_admin_expires_at');
    if (expiryStr && Date.now() >= Number(expiryStr)) {
      purgeAdminSession();
    }
  }, [purgeAdminSession]);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const expiryStr = localStorage.getItem('foodtrail_admin_expires_at');
      const isExpired = expiryStr ? Date.now() >= Number(expiryStr) : false;

      if (isExpired) {
        purgeAdminSession();
        if (isMounted) setLoading(false);
        return;
      }

      const storedToken = localStorage.getItem('foodtrail_admin_jwt');
      const storedAdmin = localStorage.getItem('foodtrail_admin_user');

      if (storedToken) {
        if (isMounted) setToken(storedToken);
        if (storedAdmin) {
          try {
            if (isMounted) setAdmin(JSON.parse(storedAdmin));
          } catch {}
        }
        // Verify with backend
        try {
          const profileRes = await getAdminProfile();
          if (isMounted) {
            setAdmin(profileRes.admin);
            localStorage.setItem('foodtrail_admin_user', JSON.stringify(profileRes.admin));
          }
        } catch {
          console.warn('Session expired or invalid token');
          if (isMounted) {
            purgeAdminSession();
          }
        }
      }
      if (isMounted) setLoading(false);
    }

    initAuth();

    // Heartbeat & focus/visibility listeners for session auto-destruction
    const handleFocus = () => checkAdminExpiry();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [checkAdminExpiry, purgeAdminSession]);

  // Route protection guard
  useEffect(() => {
    if (!loading) {
      if (!admin && pathname !== '/login') {
        router.replace('/login');
      } else if (admin && pathname === '/login') {
        router.replace('/');
      }
    }
  }, [admin, loading, pathname, router]);

  const login = async (email: string, mpin: string) => {
    const res = await adminLogin(email, mpin);
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour expiration
    setToken(res.token);
    setAdmin(res.admin);
    localStorage.setItem('foodtrail_admin_jwt', res.token);
    localStorage.setItem('foodtrail_admin_user', JSON.stringify(res.admin));
    localStorage.setItem('foodtrail_admin_expires_at', String(expiresAt));
    router.replace('/');
  };

  const logout = async () => {
    try {
      await adminLogout();
    } catch {}
    purgeAdminSession();
    router.replace('/login');
  };

  return (
    <AdminAuthContext.Provider value={{ admin, token, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

/**
 * Hook to access the administrator auth context.
 */
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
