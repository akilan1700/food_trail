// File: src/app/components/Logo.tsx
// Description: Reusable and adaptable brand Logo component with support for custom logo assets, vector fallbacks, and multi-size variants.
// Author: Akilan M
// Created: 2026-09-09T17:34:00+05:30

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type LogoVariant = 'full' | 'mark' | 'text';

export interface LogoProps {
  /** Size preset for the logo */
  size?: LogoSize;
  /** Display variant: full (icon + text), mark (icon only), or text (text only) */
  variant?: LogoVariant;
  /** Custom image source path overriding default /logo.svg or /logo.png */
  src?: string;
  /** Whether to wrap the logo in a Next.js Link pointing to href */
  href?: string;
  /** Additional CSS class names for the container */
  className?: string;
  /** Additional CSS class names for the text */
  textClassName?: string;
  /** Custom text to display instead of 'FoodTrail' */
  altText?: string;
  /** Prioritize image loading */
  priority?: boolean;
}

const SIZE_CONFIGS: Record<LogoSize, { imgSize: number; textSize: string; iconClass: string; gap: string }> = {
  xs: { imgSize: 22, textSize: 'text-sm font-bold', iconClass: 'w-[22px] h-[22px]', gap: 'gap-1.5' },
  sm: { imgSize: 28, textSize: 'text-lg font-extrabold', iconClass: 'w-[28px] h-[28px]', gap: 'gap-2' },
  md: { imgSize: 36, textSize: 'text-2xl font-extrabold', iconClass: 'w-[36px] h-[36px]', gap: 'gap-2.5' },
  lg: { imgSize: 48, textSize: 'text-3xl font-extrabold', iconClass: 'w-[48px] h-[48px]', gap: 'gap-3' },
  xl: { imgSize: 64, textSize: 'text-4xl font-black', iconClass: 'w-[64px] h-[64px]', gap: 'gap-3.5' },
  '2xl': { imgSize: 84, textSize: 'text-5xl font-black', iconClass: 'w-[84px] h-[84px]', gap: 'gap-4' },
};

/**
 * Brand Logo component for FoodTrail.
 * Automatically attempts to load custom vector/raster logo from public/logo.svg (or public/logo.png),
 * falling back smoothly to a built-in glowing brand emblem if needed.
 *
 * @param {LogoProps} props - Logo customization properties.
 * @returns {React.ReactElement} The styled logo element.
 */
export default function Logo({
  size = 'md',
  variant = 'full',
  src = '/logo.svg',
  href,
  className = '',
  textClassName = '',
  altText = 'FoodTrail',
  priority = false,
}: LogoProps): React.ReactElement {
  const [imgError, setImgError] = useState(false);
  const config = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;

  const showMark = variant === 'full' || variant === 'mark';
  const showText = variant === 'full' || variant === 'text';

  const logoMark = (
    <div className={`relative flex items-center justify-center shrink-0 ${config.iconClass} transition-transform duration-300 group-hover:scale-105`}>
      {!imgError ? (
        <Image
          src={src}
          alt={altText}
          width={config.imgSize}
          height={config.imgSize}
          priority={priority}
          className="w-full h-full object-contain drop-shadow-md select-none"
          onError={() => setImgError(true)}
        />
      ) : (
        /* Fallback glowing vector mark if custom file is missing or invalid */
        <div className="w-full h-full rounded-xl bg-gradient-to-tr from-[#f18024] via-[#f6e132] to-[#348f91] p-[2px] shadow-lg shadow-accent/20">
          <div className="w-full h-full bg-bg-primary rounded-[10px] flex items-center justify-center">
            <span className="text-accent font-black text-xs leading-none">FT</span>
          </div>
        </div>
      )}
    </div>
  );

  const logoText = (
    <span className={`tracking-tight select-none text-text-primary ${config.textSize} ${textClassName}`}>
      Food<span className="text-accent drop-shadow-sm">Trail</span>
    </span>
  );

  const content = (
    <div className={`inline-flex items-center ${config.gap} group cursor-pointer ${className}`}>
      {showMark && logoMark}
      {showText && logoText}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg" aria-label={altText}>
        {content}
      </Link>
    );
  }

  return content;
}
