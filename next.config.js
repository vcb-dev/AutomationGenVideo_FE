/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  cleanDistDir: true,
  // Standalone output cho Docker (giảm image size ~70%)
  output: 'standalone',
  swcMinify: true,
  // Strip console.log in production builds (keeps warn/error)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  images: {
    domains: [
      'localhost',
      'wsrv.nl',
      'images.weserv.nl',
      'ui-avatars.com',
      'cdninstagram.com',
      'scontent.cdninstagram.com',
      'p16-sign-sg.tiktokcdn.com',
      'p16-sign.tiktokcdn-us.com',
      'scontent.xx.fbcdn.net',
      'scontent-xsp1-1.xx.fbcdn.net',
      'lh3.googleusercontent.com',
      'lh4.googleusercontent.com',
      'lh5.googleusercontent.com',
      'lh6.googleusercontent.com',
      'googleusercontent.com',
      'drive.google.com'
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: isDev ? 'no-store, must-revalidate' : 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        source: '/:path*.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        source: '/:path*.svg',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ];
  },
}

module.exports = nextConfig
