// File: src/app/users/page.tsx
// Description: Administrator view for monitoring registered platform users, profile activity, and engagement.
// Author: Akilan M
// Created: 2026-09-10T11:29:00+05:30

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getAdminUsers, PlatformUser } from '../../services/api';
import { Users, Search, MapPin, Calendar, Footprints, Loader2 } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const data = await getAdminUsers();
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch platform users:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.profile?.city && u.profile.city.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [users, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Platform Users</h1>
          <p className="text-xs text-text-secondary">
            View public registered accounts, explorer statistics, and member engagement.
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs self-start sm:self-auto flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          <span>{users.length} Registered Members</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by user name, email, or city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-bg-tertiary/60 border border-white/8 rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
        />
      </div>

      {/* Users Table */}
      <div className="p-6 rounded-2xl glass-panel border border-white/8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Users className="w-12 h-12 text-text-muted mx-auto opacity-40" />
            <p className="text-sm font-semibold text-text-secondary">No users found matching your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/8 text-text-muted uppercase tracking-wider font-semibold">
                  <th className="pb-3 px-3">User</th>
                  <th className="pb-3 px-3">Location</th>
                  <th className="pb-3 px-3">Favorite Cuisine</th>
                  <th className="pb-3 px-3">Walks Completed</th>
                  <th className="pb-3 px-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-white/3 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-accent/20 text-accent border border-accent/30 flex items-center justify-center font-bold text-xs shrink-0">
                          {user.name ? user.name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-text-primary">{user.name}</p>
                          <p className="text-[0.65rem] text-text-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1 text-text-secondary">
                        <MapPin className="w-3 h-3 text-accent" />
                        <span>{user.profile?.city || 'Not specified'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-text-secondary">
                      {user.profile?.favoriteCuisine || 'None'}
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-text-primary">
                      <div className="flex items-center gap-1">
                        <Footprints className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{user.profile?.walksCompletedCount || 0} walks</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-text-muted">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
