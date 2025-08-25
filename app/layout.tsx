import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { WorkoutProvider } from "@/contexts/WorkoutContext"
import PWAInstallPrompt from "@/components/pwa-install"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "MuscleGram - 筋トレSNSアプリ",
  description: "筋力トレーニングに特化したソーシャルネットワークアプリ。筋トレ記録、分析、継続サポート、他のユーザーとの交流であなたのワークアウトを強力にサポート！",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MuscleGram",
  },
  generator: 'Vercel', // Vercelは自動で追加するため、もしあれば削除またはVercelに設定
  
  // ここからOGP設定を追加！
  openGraph: {
    title: "MuscleGram - 筋トレSNSアプリ",
    description: "筋力トレーニングに特化したソーシャルネットワークアプリ。筋トレ記録、分析、継続サポート、他のユーザーとの交流であなたのワークアウトを強力にサポート！",
    url: "https://musclegram.net",
    siteName: "MuscleGram",
    images: [
      {
        url: '/app_logo.png', // OGP用の画像URL
        width: 1200,
        height: 630,
        alt: 'MuscleGram - 筋トレSNSアプリ',
      },
    ],
    locale: "ja_JP",
    type: "website",
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
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <WorkoutProvider>
            {children}
            <PWAInstallPrompt />
          </WorkoutProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
