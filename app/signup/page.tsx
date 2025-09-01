import type { Metadata } from 'next'
import LoginScreen from "@/components/auth/login-screen"

export const metadata: Metadata = {
  title: 'アカウント作成 - MuscleGramで筋トレを始めよう',
  description: 'MuscleGramに新規登録して、筋トレ記録、AI分析、コミュニティ機能を体験。無料で始められる筋トレSNSアプリです。',
  keywords: ['アカウント作成', '新規登録', '筋トレアプリ', '無料', 'フィットネスSNS', 'MuscleGram'],
  openGraph: {
    title: 'アカウント作成 - MuscleGram',
    description: 'MuscleGramに新規登録して、筋トレ記録、AI分析、コミュニティ機能を体験。無料で始められる筋トレSNSアプリ。',
    url: '/signup',
  },
  twitter: {
    title: 'アカウント作成 - MuscleGram',
    description: 'MuscleGramに新規登録して、筋トレ記録、AI分析、コミュニティ機能を体験。無料で始められる筋トレSNSアプリ。',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function SignupPage() {
  return <LoginScreen />
}