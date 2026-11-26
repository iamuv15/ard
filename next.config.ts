import type { NextConfig } from 'next';

const APP_SLUG = (process.env.APP_SLUG || 'ard').toLowerCase();
const BASE_PATH = `/${APP_SLUG}`;

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  experimental: {
    serverActions: {
      allowedOrigins: [
        'liveshala.com',
        'www.liveshala.com',
        `${APP_SLUG}.liveshala.com`,
      ],
    },
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: BASE_PATH,
        basePath: false,
        permanent: false,
      },
      {
        source: `/:path((?!${APP_SLUG}(?:/|$)|_next(?:/|$)).*)`,
        destination: `${BASE_PATH}/:path`,
        basePath: false,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
