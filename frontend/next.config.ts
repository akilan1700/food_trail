// File: frontend/next.config.ts
// Description: Next.js build configuration configured for static export on Cloudflare Pages.
// Author: Akilan M
// Created: 2026-09-10T16:03:30+05:30

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;

