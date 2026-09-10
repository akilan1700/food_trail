// File: src/components/PhotoUpload.tsx
// Description: Administrator photo uploader supporting direct in-memory streaming to Cloudinary and instant deletion.
// Author: Akilan M
// Created: 2026-09-10T11:27:35+05:30

'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { uploadImage, deleteUploadedImage, formatPhotoUrl } from '../services/api';

interface PhotoUploadProps {
  value?: string;
  folder?: 'spots' | 'dishes' | 'trails';
  onUploadSuccess: (fileId: string) => void;
  onClear: () => void;
  label?: string;
}

/**
 * Reusable Cloudinary photo upload component for administrator forms.
 */
export default function PhotoUpload({
  value,
  folder = 'dishes',
  onUploadSuccess,
  onClear,
  label = 'Upload Photo',
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles user file selection and streaming upload to backend.
   */
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 5MB.');
      return;
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    setErrorMsg('');
    setUploading(true);

    try {
      const res = await uploadImage(file, folder);
      if (res && res.fileId) {
        onUploadSuccess(res.fileId);
      }
    } catch (err: unknown) {
      console.error('Upload failed:', err);
      const message = err instanceof Error ? err.message : 'Photo upload failed. Please try again.';
      setErrorMsg(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Deletes the currently uploaded photo from Cloudinary and clears the form state.
   */
  const handleDeletePhoto = async () => {
    if (!value) return;
    try {
      setUploading(true);
      await deleteUploadedImage(value);
    } catch (err) {
      console.warn('Backend delete image warning:', err);
    } finally {
      setUploading(false);
      onClear();
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
          {label}
        </label>
      )}

      {value ? (
        <div className="relative group w-full h-44 rounded-lg overflow-hidden border border-white/10 bg-bg-tertiary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={formatPhotoUrl(value)}
            alt="Uploaded Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs">
            <button
              type="button"
              onClick={handleDeletePhoto}
              disabled={uploading}
              className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg cursor-pointer"
              title="Delete Photo"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`w-full h-36 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
            uploading
              ? 'border-accent bg-accent/5'
              : 'border-white/10 hover:border-accent/40 bg-bg-tertiary/40 hover:bg-bg-tertiary'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-accent">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-semibold">Uploading photo...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-text-secondary">
              <div className="p-2.5 rounded-full bg-white/5 text-accent">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-xs font-medium">
                <span className="text-accent font-semibold">Click to upload</span> or drag and drop
              </div>
              <span className="text-[0.7rem] text-text-muted">PNG, JPG, WEBP up to 5MB</span>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
