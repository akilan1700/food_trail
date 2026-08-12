/* eslint-disable @next/next/no-img-element */
// File: src/app/components/PhotoUpload.tsx
// Description: Reusable React component for uploading images to the backend and returning the Google Drive File ID.
// Author: Akilan M
// Created: 2026-08-12T14:38:00+05:30

'use client';

import { useState, ChangeEvent } from 'react';
import { uploadImage } from '../services/api';
import { Camera, AlertCircle } from 'lucide-react';

interface PhotoUploadProps {
  onUploadSuccess: (fileId: string) => void;
  label?: string;
}

export default function PhotoUpload({ onUploadSuccess, label = 'Upload Photo' }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
      const response = await uploadImage(file);
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
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-text-secondary">
            <Camera className="w-10 h-10 text-text-muted" />
            <span className="text-xs">No image selected (Max 5MB)</span>
          </div>
        )}
        <input
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
          <span>Uploading to Google Drive...</span>
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
