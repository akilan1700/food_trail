/* eslint-disable @next/next/no-img-element */
// File: src/app/components/PhotoUpload.tsx
// Description: Reusable React component for uploading image assets to the backend.
// Author: Akilan M
// Created: 2026-08-12T14:38:00+05:30

'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { uploadImage, deleteUploadedImage, formatPhotoUrl } from '../services/api';
import { Camera, AlertCircle, X, Loader2 } from 'lucide-react';

interface PhotoUploadProps {
  onUploadSuccess: (fileId: string) => void;
  label?: string;
  value?: string;
  folder?: string;
  onClear?: () => void;
}

export default function PhotoUpload({ onUploadSuccess, label = 'Upload Photo', value, folder, onClear }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(value ? formatPhotoUrl(value) : null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync / reset preview when parent value changes or is cleared
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      setErrorMsg('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setPreviewUrl(formatPhotoUrl(value));
    }
  }, [value]);

  /**
   * Handles deleting/clearing the selected image and removes it from Cloudinary.
   */
  const handleRemovePhoto = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    const currentPhoto = value;
    if (onClear) {
      onClear();
    }
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (currentPhoto && currentPhoto.includes('cloudinary.com')) {
      setDeleting(true);
      try {
        await deleteUploadedImage(currentPhoto);
      } catch (err) {
        console.warn('Failed to delete image from Cloudinary:', err);
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Generate local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploading(true);
    setErrorMsg('');
    try {
      const response = await uploadImage(file, folder);
      if (response.success && response.fileId) {
        onUploadSuccess(response.fileId);
      } else {
        setErrorMsg('Upload failed: Did not receive File ID.');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      const message = error instanceof Error ? error.message : 'Error occurred during upload.';
      setErrorMsg(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-bg-tertiary/20 rounded-md border border-white/5 max-w-sm">
      {label && <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{label}</span>}
      
      <div className="relative flex items-center justify-center h-40 bg-bg-tertiary/40 border border-dashed border-white/10 rounded-sm overflow-hidden group">
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Upload preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
              <span className="text-xs text-white font-semibold">Change Photo</span>
            </div>
            {onClear && (
              <button
                type="button"
                disabled={deleting}
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-white transition-colors disabled:opacity-50 cursor-pointer"
                title="Delete photo"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-text-secondary">
            <Camera className="w-10 h-10 text-text-muted" />
            <span className="text-xs">No image selected (Max 5MB)</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>

      {uploading && (
        <div className="flex items-center gap-2 justify-center text-xs text-accent">
          <span className="status-dot status-dot-green animate-status-pulse"></span>
          <span>Uploading image...</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-red-500 font-medium bg-red-500/10 p-2 rounded border border-red-500/20">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
