import type { Metadata } from 'next'
import FitnessApp from "../page"

export const metadata: Metadata = {
  title: 'プロフィール - ユーザー設定と個人情報',
  description: 'あなたのプロフィールとアカウント設定を管理。個人情報、トレーニング目標、プライバシー設定をカスタマイズしましょう。',
  keywords: ['プロフィール管理', 'アカウント設定', '個人情報', 'トレーニング目標', 'プライバシー設定'],
  openGraph: {
    title: 'プロフィール - MuscleGram',
    description: 'あなたのプロフィールとアカウント設定を管理。個人情報、トレーニング目標、プライバシー設定をカスタマイズ。',
    url: '/profile',
  },
  twitter: {
    title: 'プロフィール - MuscleGram',
    description: 'あなたのプロフィールとアカウント設定を管理。個人情報、トレーニング目標、プライバシー設定をカスタマイズ。',
  }
}

export default function ProfilePage() {
  return <FitnessApp defaultScreen="profile" />
}