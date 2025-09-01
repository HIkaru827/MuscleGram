import type { Metadata } from 'next'
import FitnessApp from "../page"

export const metadata: Metadata = {
  title: 'アナリティクス - トレーニング分析とデータ可視化',
  description: 'トレーニングデータを分析して成長を可視化。グラフとチャートで進歩を確認し、効果的なトレーニング計画を立てましょう。',
  keywords: ['トレーニング分析', 'データ可視化', 'グラフ', 'チャート', '進捗分析', 'パフォーマンス分析', '統計'],
  openGraph: {
    title: 'アナリティクス - MuscleGram',
    description: 'トレーニングデータを分析して成長を可視化。グラフとチャートで進歩を確認し、効果的なトレーニング計画を立案。',
    url: '/analytics',
  },
  twitter: {
    title: 'アナリティクス - MuscleGram',
    description: 'トレーニングデータを分析して成長を可視化。グラフとチャートで進歩を確認し、効果的なトレーニング計画を立案。',
  }
}

export default function AnalyticsPage() {
  return <FitnessApp defaultScreen="analytics" />
}