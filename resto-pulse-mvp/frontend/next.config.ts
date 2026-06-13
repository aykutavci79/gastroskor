import type { NextConfig } from 'next';

/**
 * Next.js 15 "streaming metadata" — async generateMetadata tamamlaninca
 * title/meta bazen </head> sonrasina duser (Screaming Frog: Outside <head>).
 * Tum isteklerde metadata'yi head icinde bekle.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  htmlLimitedBots: /.*/,
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
};

export default nextConfig;
