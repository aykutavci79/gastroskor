import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
