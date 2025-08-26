/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/functions/:path*',
        destination: 'https://asia-northeast1-musclegram-app.cloudfunctions.net/:path*'
      }
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.gstatic.com *.vercel.app *.googletagmanager.com apis.google.com; script-src-elem 'self' 'unsafe-inline' *.googleapis.com *.gstatic.com *.googletagmanager.com apis.google.com; style-src 'self' 'unsafe-inline' *.googleapis.com *.gstatic.com; img-src 'self' data: blob: https: *.googleapis.com *.gstatic.com *.firebaseapp.com *.firebasestorage.app; font-src 'self' *.gstatic.com *.googleapis.com; connect-src 'self' *.googleapis.com *.gstatic.com *.firebaseio.com *.cloudfunctions.net *.google-analytics.com *.googletagmanager.com wss:; object-src 'none'; media-src 'self' *.googleapis.com; frame-src 'self' *.firebaseapp.com *.google.com accounts.google.com; base-uri 'self'; form-action 'self';"
          }
        ]
      }
    ]
  }
}

export default nextConfig