import type { Metadata } from 'next'
import LoginScreen from "@/components/auth/login-screen"

export const metadata: Metadata = {
  title: 'ログイン - MuscleGramでトレーニングを始めよう',
  description: 'MuscleGramにログインして、筋トレ記録、分析、コミュニティ機能を利用しましょう。あなたのフィットネスジャーニーをサポートします。',
  keywords: ['ログイン', '筋トレアプリ', 'フィットネスアプリ', 'トレーニング記録', 'MuscleGram'],
  openGraph: {
    title: 'ログイン - MuscleGram',
    description: 'MuscleGramにログインして、筋トレ記録、分析、コミュニティ機能を利用。あなたのフィットネスジャーニーをサポート。',
    url: '/login',
  },
  twitter: {
    title: 'ログイン - MuscleGram',
    description: 'MuscleGramにログインして、筋トレ記録、分析、コミュニティ機能を利用。あなたのフィットネスジャーニーをサポート。',
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function LoginPage() {
  return <LoginScreen />
}