// File: src/app/settings/page.tsx
// Description: User Settings page enabling updates to user name, notifications, theme, and profile details.
// Author: Akilan M
// Created: 2026-08-13T11:42:00+05:30

'use client';

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../services/hooks';
import { selectCurrentUser, updateUserSettings } from '../services/authSlice';
import { updateProfile } from '../services/api';
import LoadingScreen from '../components/LoadingScreen';
import { useRouter } from 'next/navigation';
import { Settings, Bell, User, Check, X, ShieldAlert, Pencil, Sparkles } from 'lucide-react';

/**
 * SettingsPage component allowing users to view and update their profile details,
 * app settings, notifications, and preferred theme.
 *
 * @returns {React.ReactElement} The settings page layout or loading screen.
 */
export default function SettingsPage() {
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Form states initialized from user object
  const [name, setName] = useState(user?.name || '');
  const [notifications, setNotifications] = useState(user?.settings?.notificationsEnabled ?? true);
  const [theme, setTheme] = useState<'Dark' | 'Light'>(user?.settings?.preferredTheme || 'Dark');
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

  // Sync state if user loads or updates after mount
  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => {
        setName(user.name);
        setNotifications(user.settings.notificationsEnabled);
        setTheme(user.settings.preferredTheme);
        setBio(user.profile?.bio || '');
        setDateOfBirth(
          user.profile?.dateOfBirth ? new Date(user.profile.dateOfBirth).toISOString().split('T')[0] : ''
        );
        setCity(user.profile?.city || '');
        setFavoriteCuisine(user.profile?.favoriteCuisine || '');
      });
    }
  }, [user]);

  /**
   * Resets the local form states to match the current Redux user state
   * and exits edit mode.
   */
  const resetForm = () => {
    if (user) {
      setName(user.name);
      setNotifications(user.settings.notificationsEnabled);
      setTheme(user.settings.preferredTheme);
      setBio(user.profile?.bio || '');
      setDateOfBirth(
        user.profile?.dateOfBirth ? new Date(user.profile.dateOfBirth).toISOString().split('T')[0] : ''
      );
      setCity(user.profile?.city || '');
      setFavoriteCuisine(user.profile?.favoriteCuisine || '');
    }
    setIsEditing(false);
    setError(null);
  };

  /**
   * Saves the updated user preferences and profile details to the API
   * and dispatches the changes to the Redux store.
   *
   * @param {React.FormEvent} e The form submit event.
   */
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
      setIsEditing(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save settings. Please try again.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Dismisses the success notification banner.
   */
  const handleDismissSuccess = () => {
    setSuccess(false);
  };

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <div className="max-w-[880px] mx-auto px-4 md:px-0 py-6 md:py-10 animate-fade-in text-left">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-accent animate-spin-slow" />
          <h1 className="text-2xl md:text-3xl font-black text-text-primary">Settings</h1>
        </div>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              setSuccess(false);
            }}
            className="bg-bg-tertiary/60 border border-white/8 text-text-secondary hover:text-white hover:bg-accent/15 hover:border-accent/20 px-4 py-2 rounded-sm text-sm font-semibold cursor-pointer transition-all duration-300 flex items-center gap-1.5"
          >
            <Pencil className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={resetForm}
            className="bg-bg-tertiary/60 border border-white/8 text-text-secondary hover:text-white hover:bg-status-red/15 hover:border-status-red/20 px-4 py-2 rounded-sm text-sm font-semibold cursor-pointer transition-all duration-300 flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        )}
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
        
        {/* Grid Wrapper */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          
          {/* Column 1: Personal Info */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold border-b border-white/5 pb-2 flex items-center gap-2">
              <User className="w-4.5 h-4.5 text-accent" />
              <span>Personal Info</span>
            </h2>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="settings-name" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Display Name</label>
              <input
                id="settings-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
                className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60 disabled:opacity-75 disabled:cursor-default"
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
              <label htmlFor="settings-dob" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Date of Birth</label>
              <input
                id="settings-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={!isEditing}
                className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60 disabled:opacity-75 disabled:cursor-default"
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
                disabled={!isEditing}
                className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60 disabled:opacity-75 disabled:cursor-default"
              />
            </div>
          </div>

          {/* Column 2: Preferences, Culinary & App Settings */}
          <div className="flex flex-col gap-6">
            
            {/* Culinary Preferences */}
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold border-b border-white/5 pb-2 flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-accent" />
                <span>Preferences & Bio</span>
              </h2>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="settings-cuisine" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Favorite Cuisine</label>
                <input
                  id="settings-cuisine"
                  type="text"
                  placeholder="e.g., French Cafe, South Indian, Italian"
                  value={favoriteCuisine}
                  onChange={(e) => setFavoriteCuisine(e.target.value)}
                  disabled={!isEditing}
                  className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60 disabled:opacity-75 disabled:cursor-default"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="settings-bio" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Bio</label>
                <textarea
                  id="settings-bio"
                  rows={4}
                  placeholder="Tell us about yourself or culinary interests..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={!isEditing}
                  className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60 resize-none disabled:opacity-75 disabled:cursor-default"
                />
              </div>
            </div>

            {/* App Preferences */}
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold border-b border-white/5 pb-2 flex items-center gap-2">
                <Bell className="w-4.5 h-4.5 text-accent" />
                <span>App Settings</span>
              </h2>

              <div className="flex items-center justify-between p-3.5 bg-bg-tertiary/20 rounded-sm border border-white/5">
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-text-primary text-sm">Push notifications</span>
                  <span className="text-xs text-text-secondary mt-0.5">Receive updates on trail status and busy indicators.</span>
                </div>
                <label className={`relative inline-flex items-center select-none ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
                    disabled={!isEditing}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-bg-tertiary rounded-full peer peer-focus:ring-0 dark:bg-bg-tertiary peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-text-secondary after:border-white/10 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:after:bg-white"></div>
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="settings-theme" className="text-xs uppercase tracking-wider text-text-secondary font-semibold">Theme Selection</label>
                <select
                  id="settings-theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as 'Dark' | 'Light')}
                  disabled={!isEditing}
                  className="w-full bg-bg-tertiary/40 border border-white/8 rounded-sm p-3 outline-none text-text-primary transition-all duration-300 focus:border-accent focus:bg-bg-tertiary/60 disabled:opacity-75 disabled:cursor-default"
                >
                  <option value="Dark">Dark Mode</option>
                  <option value="Light">Light Mode</option>
                </select>
              </div>
            </div>

          </div>

        </div>

        {/* Save button */}
        {isEditing && (
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
        )}
      </form>
    </div>
  );
}
