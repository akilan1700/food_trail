// File: src/services/adminAuthContext.tsx
// Description: Admin auth context using HttpOnly cookie plus Bearer fallback so login never blocks across origins.
// Author: Akilan M
// Updated: 2026-09-11

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

/** Align with backend admin cookie (7 days). */
const ADMIN_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

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
      const storedUser = localStorage.getItem('foodtrail_admin_user');

      try {
        const profileRes = await getAdminProfile();
        if (isMounted) {
          setAdmin(profileRes.admin);
          setToken(storedToken);
          localStorage.setItem('foodtrail_admin_user', JSON.stringify(profileRes.admin));
          if (!localStorage.getItem('foodtrail_admin_expires_at')) {
            localStorage.setItem('foodtrail_admin_expires_at', String(Date.now() + ADMIN_SESSION_MS));
          }
        }
      } catch {
        // Fall back to cached admin if cookie check fails but token/user exist
        if (storedToken && storedUser && isMounted) {
          try {
            setAdmin(JSON.parse(storedUser));
            setToken(storedToken);
          } catch {
            purgeAdminSession();
          }
        } else if (isMounted) {
          purgeAdminSession();
        }
      }

      if (isMounted) setLoading(false);
    }

    initAuth();

    const handleFocus = () => checkAdminExpiry();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [checkAdminExpiry, purgeAdminSession]);

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
    const expiresAt = Date.now() + ADMIN_SESSION_MS;
    setToken(res.token || null);
    setAdmin(res.admin);
    if (res.token) {
      localStorage.setItem('foodtrail_admin_jwt', res.token);
    }
    localStorage.setItem('foodtrail_admin_user', JSON.stringify(res.admin));
    localStorage.setItem('foodtrail_admin_expires_at', String(expiresAt));
    router.replace('/');
  };

  const logout = async () => {
    try {
      await adminLogout();
    } catch {
      // ignore logout network errors
    }
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
