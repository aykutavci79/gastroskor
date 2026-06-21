import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

import { securityHeaders } from './lib/security-headers';

const configDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Next.js 15 "streaming metadata" — async generateMetadata tamamlaninca
 * title/meta bazen </head> sonrasina duser (Screaming Frog: Outside <head>).
 * Tum isteklerde metadata'yi head icinde bekle.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  htmlLimitedBots: /.*/,
  // Monorepo: ust dizindeki package-lock.json yanlis workspace root secilmesin.
  outputFileTracingRoot: configDir,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ci.turkpatent.gov.tr',
        pathname: '/Pictures/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'gastroskor.com.tr' }],
        destination: 'https://www.gastroskor.com.tr/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders(),
      },
    ];
  },
};

export default nextConfig;
