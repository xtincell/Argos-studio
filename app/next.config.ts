import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // typedRoutes will be re-enabled once all stub routes (/contact, /journal, /brand/[slug] etc.) are implemented.
  typedRoutes: false,
  images: {
    // Argos aggregates marketing assets from arbitrary brand-owned and
    // award-archive hostnames. A wildcard pattern lets the crawler and the
    // manual ingester surface assets without per-host config updates.
    // Production should narrow this to known-good CDNs and add a verification
    // step (HEAD probe + content-type allowlist).
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
