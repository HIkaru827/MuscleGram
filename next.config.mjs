/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.gstatic.com *.vercel.app; style-src 'self' 'unsafe-inline' *.googleapis.com *.gstatic.com; img-src 'self' data: https: *.googleapis.com *.gstatic.com *.firebaseapp.com; font-src 'self' *.gstatic.com *.googleapis.com; connect-src 'self' *.googleapis.com *.gstatic.com *.firebaseio.com *.cloudfunctions.net wss:; object-src 'none'; media-src 'self' *.googleapis.com; frame-src 'self' *.firebaseapp.com; base-uri 'self'; form-action 'self';"
          }
        ]
      }
    ]
  }
}

export default nextConfig
