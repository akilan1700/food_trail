// File: src/app/settings/page.tsx
// Description: User Settings page enabling updates to user name, notifications, theme, and profile details.
// Author: Akilan M
// Created: 2026-08-13T11:42:00+05:30

'use client';

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../services/hooks';
import { selectCurrentUser, updateUserSettings } from '../services/authSlice';
import { updateProfile } from '../services/api';
import AuthForm from '../components/AuthForm';
import { Settings, Bell, Palette, User, Check, X, ShieldAlert } from 'lucide-react';

export default function SettingsPage() {
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();

  // Form states initialized from user object
  const [name, setName] = useState(user?.name || '');
  const [notifications, setNotifications] = useState(user?.settings?.notificationsEnabled ?? true);
  const [theme, setTheme] = useState<'Dark' | 'Light'>(user?.settings?.preferredTheme || 'Dark');
  const [phoneNumber, setPhoneNumber] = useState(user?.profile?.phoneNumber || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.profile?.dateOfBirth ? new Date(user.profile.dateOfBirth).toISOString().split('T')[0] : ''
  );
  const [city, setCity] = useState(user?.profile?.city || '');
  const [favoriteCuisine, setFavoriteCuisine] = useState(user?.profile?.favoriteCuisine || '');

  // Request statuses
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if user loads after mount
  const [hasSynced, setHasSynced] = useState(false);
  if (user && !hasSynced) {
    setName(user.name);
    setNotifications(user.settings.notificationsEnabled);
    setTheme(user.settings.preferredTheme);
    setPhoneNumber(user.profile?.phoneNumber || '');
    setBio(user.profile?.bio || '');
    setDateOfBirth(
      user.profile?.dateOfBirth ? new Date(user.profile.dateOfBirth).toISOString().split('T')[0] : ''
    );
    setCity(user.profile?.city || '');
    setFavoriteCuisine(user.profile?.favoriteCuisine || '');
    setHasSynced(true);
  }

  // Handle Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const data = await updateProfile(
        name,
        {
          notificationsEnabled: notifications,
          preferredTheme: theme,
        },
        {
          phoneNumber,
          bio,
          dateOfBirth: dateOfBirth || null,
          city,
          favoriteCuisine,
        }
      );

      // Update Redux state
      dispatch(
        updateUserSettings({
          name: data.user.name,
          settings: data.user.settings,
          profile: data.user.profile,
        })
      );

      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save settings. Please try again.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDismissSuccess = () => {
    setSuccess(false);
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center py-10 animate-fade-in">
        <div className="text-center mb-8 max-w-[400px]">
          <h1 className="text-3xl font-extrabold text-text-primary mb-2">Account Settings</h1>
          <p className="text-text-secondary">
            Sign in to view and customize notification preferences, theme choices, and account details.
          </p>
        </div>
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="max-w-[620px] mx-auto py-6 md:py-10 animate-fade-in text-left">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-accent animate-spin-slow" />
        <h1 className="text-2xl md:text-3xl font-black text-text-primary">Settings</h1>
      </div>

      {success && (
        <div className="flex items-center justify-between gap-2 bg-status-green/10 border border-status-green/20 text-status-green p-4 rounded-sm mb-6 animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 shrink-0" />
            <span className="font-semibold">Preferences saved successfully!</span>
          </div>
          <button
            type="button"
            onClick={handleDismissSuccess}
            className="bg-transparent border-none text-status-green hover:text-white cursor-pointer p-0.5 outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-status-red/10 border border-status-red/20 text-status-red p-4 rounded-sm mb-6 animate-fade-in">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="glass-panel p-6 md:p-8 flex flex-col gap-6">
        
        {/* Profile Details */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold border-b border-white/5 pb-2 flex items-center gap-2">
            <User className="w-4.5 h-4.5 text-accent" />
            <span>Profile Details</span>
          </h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-name" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Display Name</label>
            <input
              id="settings-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60"
            />
          </div>

          <div className="flex flex-col gap-1.5 opacity-70">
            <label className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Email Address (Read-only)</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full bg-bg-tertiary/20 border border-white/5 rounded-sm p-3 text-text-muted cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-phone" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Phone Number</label>
            <input
              id="settings-phone"
              type="tel"
              placeholder="+91 XXXXX XXXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-bio" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Bio</label>
            <textarea
              id="settings-bio"
              rows={3}
              placeholder="Tell us about yourself or culinary interests..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-dob" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Date of Birth</label>
            <input
              id="settings-dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-city" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">City</label>
            <input
              id="settings-city"
              type="text"
              placeholder="e.g., Puducherry"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-cuisine" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Favorite Cuisine</label>
            <input
              id="settings-cuisine"
              type="text"
              placeholder="e.g., French Cafe, South Indian, Italian"
              value={favoriteCuisine}
              onChange={(e) => setFavoriteCuisine(e.target.value)}
              className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60"
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="flex flex-col gap-4 mt-2">
          <h2 className="text-lg font-bold border-b border-white/5 pb-2 flex items-center gap-2">
            <Bell className="w-4.5 h-4.5 text-accent" />
            <span>Notifications</span>
          </h2>
          
          <div className="flex items-center justify-between p-3.5 bg-bg-tertiary/20 rounded-sm border border-white/5">
            <div className="flex flex-col text-left">
              <span className="font-semibold text-text-primary text-sm">Push notifications</span>
              <span className="text-xs text-text-secondary mt-0.5">Receive updates on trail status and busy indicators.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-bg-tertiary rounded-full peer peer-focus:ring-0 dark:bg-bg-tertiary peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-text-secondary after:border-white/10 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:after:bg-white"></div>
            </label>
          </div>
        </div>

        {/* Preferred Theme */}
        <div className="flex flex-col gap-4 mt-2">
          <h2 className="text-lg font-bold border-b border-white/5 pb-2 flex items-center gap-2">
            <Palette className="w-4.5 h-4.5 text-accent" />
            <span>Preferred Theme</span>
          </h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-theme" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Theme Selection</label>
            <select
              id="settings-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'Dark' | 'Light')}
              className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60"
            >
              <option value="Dark">Dark Mode</option>
              <option value="Light">Light Mode</option>
            </select>
          </div>
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={saving}
          className="mt-4 w-full bg-accent text-white border-none rounded-sm py-4 font-bold cursor-pointer transition-all duration-300 hover:bg-accent-hover hover:scale-[1.01] flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(244,63,94,0.25)] disabled:opacity-50"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span>Save Preferences</span>
          )}
        </button>
      </form>
    </div>
  );
}
