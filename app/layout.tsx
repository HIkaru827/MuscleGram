import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import PWAInstallPrompt from "@/components/pwa-install"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MuscleGram - 筋トレSNSアプリ",
  description: "筋力トレーニングに特化したソーシャルネットワークアプリケーション",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MuscleGram",
  },
    generator: 'v0.dev'
}

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
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <PWAInstallPrompt />
        </AuthProvider>
      </body>
    </html>
  )
}
