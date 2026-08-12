// File: src/app/components/TripLink.tsx
// Description: Client-side link component showing dynamically updated trip stop count in a premium badge.
// Author: Akilan M
// Created: 2026-08-12T14:29:00+05:30

'use client';

import Link from 'next/link';
import { useAppSelector } from '../services/hooks';
import { selectSavedRestCount } from '../services/tripSlice';
import { Bookmark } from 'lucide-react';

export default function TripLink() {
  const count = useAppSelector(selectSavedRestCount);

  return (
    <Link
      href="/trip"
      className="flex flex-col md:flex-row items-center gap-1.5 text-xs md:text-[0.95rem] font-medium text-text-secondary p-[0.35rem] md:px-3 md:py-2 rounded-sm transition-all duration-300 hover:text-text-primary hover:bg-bg-tertiary"
    >
      <Bookmark className="w-4 h-4 shrink-0" />
      <span>My Trip</span>
      {count > 0 && (
        <span className="bg-accent text-white px-2 py-0.5 rounded-full text-[0.7rem] font-extrabold animate-fade-in shadow-[0_0_8px_rgba(244,63,94,0.4)]">
          {count}
        </span>
      )}
    </Link>
  );
}
