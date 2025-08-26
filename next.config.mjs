/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-dialog', 
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip',
      'date-fns',
      'recharts',
      'firebase'
    ]
  },
  swcMinify: true,
  output: 'standalone',
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
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
        destination: 'https://us-central1-musclegram-d5b32.cloudfunctions.net/:path*'
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.gstatic.com *.vercel.app *.googletagmanager.com apis.google.com accounts.google.com *.google.com; script-src-elem 'self' 'unsafe-inline' *.googleapis.com *.gstatic.com *.googletagmanager.com apis.google.com accounts.google.com *.google.com; style-src 'self' 'unsafe-inline' *.googleapis.com *.gstatic.com; img-src 'self' data: blob: https: *.googleapis.com *.gstatic.com *.firebaseapp.com *.firebasestorage.app *.google.com; font-src 'self' *.gstatic.com *.googleapis.com; connect-src 'self' *.googleapis.com *.gstatic.com *.firebaseio.com *.cloudfunctions.net *.google-analytics.com *.googletagmanager.com accounts.google.com apis.google.com *.google.com wss:; object-src 'none'; media-src 'self' *.googleapis.com; frame-src 'self' *.firebaseapp.com *.google.com accounts.google.com musclegram-d5b32.firebaseapp.com; base-uri 'self'; form-action 'self';"
          }
        ]
      }
    ]
  }
}

export default nextConfig