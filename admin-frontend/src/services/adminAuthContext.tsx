// File: src/services/adminAuthContext.tsx
// Description: React Authentication Context managing admin session state, token persistence, and route protection.
// Author: Akilan M
// Created: 2026-09-10T11:27:30+05:30

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem('foodtrail_admin_jwt');
      const storedAdmin = localStorage.getItem('foodtrail_admin_user');

      if (storedToken) {
        setToken(storedToken);
        if (storedAdmin) {
          try {
            setAdmin(JSON.parse(storedAdmin));
          } catch {}
        }
        // Verify with backend
        try {
          const profileRes = await getAdminProfile();
          setAdmin(profileRes.admin);
          localStorage.setItem('foodtrail_admin_user', JSON.stringify(profileRes.admin));
        } catch {
          console.warn('Session expired or invalid token');
          localStorage.removeItem('foodtrail_admin_jwt');
          localStorage.removeItem('foodtrail_admin_user');
          setAdmin(null);
          setToken(null);
        }
      }
      setLoading(false);
    }

    initAuth();
  }, []);

  // Route protection guard
  useEffect(() => {
    if (!loading) {
      if (!admin && pathname !== '/login') {
        router.push('/login');
      } else if (admin && pathname === '/login') {
        router.push('/');
      }
    }
  }, [admin, loading, pathname, router]);

  const login = async (email: string, mpin: string) => {
    const res = await adminLogin(email, mpin);
    setToken(res.token);
    setAdmin(res.admin);
    localStorage.setItem('foodtrail_admin_jwt', res.token);
    localStorage.setItem('foodtrail_admin_user', JSON.stringify(res.admin));
    router.push('/');
  };

  const logout = async () => {
    try {
      await adminLogout();
    } catch {}
    setAdmin(null);
    setToken(null);
    localStorage.removeItem('foodtrail_admin_jwt');
    localStorage.removeItem('foodtrail_admin_user');
    router.push('/login');
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
