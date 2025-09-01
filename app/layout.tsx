import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { WorkoutProvider } from "@/contexts/WorkoutContext"
import PWAInstallPrompt from "@/components/pwa-install"
import StructuredData from "@/components/structured-data"
import PerformanceOptimizer from "@/components/performance-optimizer"
import CookieConsent from "@/components/cookie-consent"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "MuscleGram - 筋トレSNSアプリ",
    template: "%s | MuscleGram"
  },
  description: "筋力トレーニングに特化したソーシャルネットワークアプリ。筋トレ記録、分析、継続サポート、他のユーザーとの交流であなたのワークアウトを強力にサポート！",
  keywords: ["筋トレ", "フィットネス", "ワークアウト", "記録", "分析", "SNS", "筋力トレーニング", "トレーニング記録", "PR記録", "AI分析", "パーソナライズド", "筋トレアプリ", "フィットネスアプリ", "トレーニングアプリ", "筋トレSNS"],
  authors: [{ name: "MuscleGram Team" }],
  creator: "MuscleGram",
  publisher: "MuscleGram",
  metadataBase: new URL('https://musclegram.net'),
  alternates: {
    canonical: '/',
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MuscleGram",
  },
  
  openGraph: {
    title: "MuscleGram - 筋トレSNSアプリ",
    description: "筋力トレーニングに特化したソーシャルネットワークアプリ。筋トレ記録、分析、継続サポート、他のユーザーとの交流であなたのワークアウトを強力にサポート！",
    url: "https://musclegram.net",
    siteName: "MuscleGram",
    images: [
      {
        url: '/app_logo.png',
        width: 1200,
        height: 630,
        alt: 'MuscleGram - 筋トレSNSアプリ',
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'MuscleGram - 筋トレSNSアプリ',
    description: '筋力トレーニングに特化したソーシャルネットワークアプリ。筋トレ記録、分析、継続サポート！',
    images: ['/app_logo.png'],
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};
export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#dc2626',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MuscleGram" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        <link rel="dns-prefetch" href="https://firebase.googleapis.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <style>{`
          .skeleton-box{background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:loading 2s infinite}
          @keyframes loading{0%{background-position:200% 0}100%{background-position:-200% 0}}
          .prevent-cls{min-height:100vh;display:flex;flex-direction:column}
          .hw-accelerate{transform:translateZ(0);will-change:transform}
          body{font-synthesis:none;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
        `}</style>
      </head>
      <body className={inter.className}>
        <StructuredData />
        <PerformanceOptimizer />
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-PWQPJNRZ73" />
        <script dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PWQPJNRZ73', {
              page_path: window.location.pathname,
              cookie_flags: 'SameSite=None;Secure'
            });
          `
        }} />
        
        <script dangerouslySetInnerHTML={{
          __html: `
            // Mobile-specific error handling
            window.addEventListener('error', function(e) {
              console.error('Global error caught:', e.error);
              
              // Send error to Google Analytics if available
              if (typeof gtag !== 'undefined') {
                gtag('event', 'exception', {
                  description: e.message || 'Unknown error',
                  fatal: false,
                  event_category: 'javascript_error',
                  event_label: e.filename || 'unknown_file'
                });
              }
              
              // Send error to console for debugging
              if (typeof e.error === 'object') {
                console.error('Error details:', {
                  message: e.message,
                  filename: e.filename,
                  line: e.lineno,
                  column: e.colno,
                  stack: e.error?.stack,
                  userAgent: navigator.userAgent
                });
              }
            });
            
            window.addEventListener('unhandledrejection', function(e) {
              console.error('Unhandled promise rejection:', e.reason);
              
              // Send error to Google Analytics if available
              if (typeof gtag !== 'undefined') {
                gtag('event', 'exception', {
                  description: 'Unhandled Promise Rejection: ' + (e.reason || 'Unknown'),
                  fatal: false,
                  event_category: 'promise_rejection'
                });
              }
              
              // Prevent default behavior that shows error page
              e.preventDefault();
            });
          `
        }} />
        <AuthProvider>
          <WorkoutProvider>
            {children}
            <PWAInstallPrompt />
            <CookieConsent />
            <Toaster position="top-center" richColors />
          </WorkoutProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
