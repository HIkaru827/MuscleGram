import type { Metadata } from 'next'
import FitnessApp from "../page"

export const metadata: Metadata = {
  title: 'コミュニティ - 筋トレ仲間とつながろう',
  description: '筋トレ仲間との交流でモチベーションアップ。トレーニングの投稿をシェアし、アドバイスをもらい、一緒に成長しましょう。',
  keywords: ['筋トレコミュニティ', 'フィットネスSNS', 'トレーニング仲間', 'モチベーション', 'ワークアウト投稿', 'ジム仲間'],
  openGraph: {
    title: 'コミュニティ - MuscleGram',
    description: '筋トレ仲間との交流でモチベーションアップ。トレーニングをシェアし、一緒に成長しましょう。',
    url: '/community',
  },
  twitter: {
    title: 'コミュニティ - MuscleGram',
    description: '筋トレ仲間との交流でモチベーションアップ。トレーニングをシェアし、一緒に成長しましょう。',
  }
}

export default function CommunityPage() {
  return <FitnessApp defaultScreen="community" />
}