// File: src/app/page.tsx
// Description: Admin Dashboard Overview displaying real-time system metrics, recent spots, and signature dish counts.
// Author: Akilan M
// Created: 2026-09-10T11:28:10+05:30

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getAdminStats,
  getAdminRestaurants,
  AdminStats,
  Restaurant,
  formatPhotoUrl,
} from '../services/api';
import { useAdminAuth } from '../services/adminAuthContext';
import {
  Store,
  UtensilsCrossed,
  Sparkles,
  Users,
  PlusCircle,
  ArrowRight,
  MapPin,
  Loader2,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { admin } = useAdminAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentRestaurants, setRecentRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsData, restsData] = await Promise.all([
          getAdminStats(),
          getAdminRestaurants(),
        ]);
        setStats(statsData);
        setRecentRestaurants(restsData.slice(0, 5));
      } catch (err) {
        console.error('Failed to load admin dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-bg-secondary border border-white/8 glass-panel">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Administrator Control Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight">
            Welcome back, {admin?.name || 'Administrator'}
          </h1>
          <p className="text-xs md:text-sm text-text-secondary mt-1">
            Manage registered dining spots and curate exclusive Signature Dishes for food explorers.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dishes"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shadow-lg transition-all"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>Curate Signature Dishes</span>
          </Link>
          <Link
            href="/restaurants"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-lg transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Spot</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spots */}
        <Link
          href="/restaurants"
          className="p-5 rounded-xl glass-card transition-all group block hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Registered Spots</span>
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-text-primary tracking-tight">
              {stats?.totalRestaurants ?? 0}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[0.7rem] text-text-muted">
              <span>View spots directory</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Total Dishes */}
        <Link
          href="/dishes"
          className="p-5 rounded-xl glass-card transition-all group block hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Total Menu Items</span>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-text-primary tracking-tight">
              {stats?.totalDishes ?? 0}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[0.7rem] text-text-muted">
              <span>Browse all dishes</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Signature Dishes */}
        <Link
          href="/dishes"
          className="p-5 rounded-xl glass-card border-amber-500/30 transition-all group block hover:-translate-y-0.5 bg-amber-500/5 hover:border-amber-500/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300">Signature Dishes</span>
            <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-amber-400 tracking-tight">
              {stats?.totalSignatureDishes ?? 0}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[0.7rem] text-amber-300/70">
              <span>Curate signature items</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Platform Users */}
        <Link
          href="/users"
          className="p-5 rounded-xl glass-card transition-all group block hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Registered Users</span>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-text-primary tracking-tight">
              {stats?.totalUsers ?? 0}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[0.7rem] text-text-muted">
              <span>View user base</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Dining Spots Section */}
      <div className="p-6 rounded-2xl glass-panel border border-white/8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Recent Registered Spots</h2>
            <p className="text-xs text-text-muted">Dining spots currently live in the FoodTrail platform</p>
          </div>
          <Link
            href="/restaurants"
            className="text-xs font-semibold text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
          >
            <span>View All ({stats?.totalRestaurants ?? 0})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/8 text-text-muted uppercase tracking-wider font-semibold">
                <th className="pb-3 px-3">Spot</th>
                <th className="pb-3 px-3">Area</th>
                <th className="pb-3 px-3">Dishes</th>
                <th className="pb-3 px-3">Signature</th>
                <th className="pb-3 px-3">Busy Status</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentRestaurants.map((rest) => (
                <tr key={rest._id} className="hover:bg-white/3 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formatPhotoUrl(rest.photoUrl)}
                        alt={rest.name}
                        className="w-9 h-9 rounded-lg object-cover border border-white/10"
                      />
                      <div>
                        <p className="font-bold text-text-primary">{rest.name}</p>
                        <p className="text-[0.65rem] text-text-muted line-clamp-1">{rest.description || 'No description'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1 text-text-secondary">
                      <MapPin className="w-3 h-3 text-accent" />
                      <span>{rest.area}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-semibold text-text-primary">
                    {rest.totalDishes || 0}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                      ★ {rest.signatureDishes || 0}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[0.65rem] font-semibold ${
                        rest.busyStatus === 'Plenty of Tables'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : rest.busyStatus === 'Filling Up'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {rest.busyStatus}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      href={`/dishes?restaurantId=${rest._id}`}
                      className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-accent hover:text-white text-text-secondary text-[0.7rem] font-semibold transition-all inline-flex items-center gap-1"
                    >
                      <UtensilsCrossed className="w-3 h-3" />
                      <span>Manage Dishes</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
