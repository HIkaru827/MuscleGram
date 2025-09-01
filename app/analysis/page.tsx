import type { Metadata } from 'next'
import FitnessApp from "../page"

export const metadata: Metadata = {
  title: 'AI分析 - トレーニングをAIで最適化',
  description: 'AIがあなたのトレーニングデータを分析し、個人に最適化されたアドバイスを提供。より効果的で安全なワークアウトを実現しましょう。',
  keywords: ['AI分析', 'トレーニング最適化', 'パーソナライズド', 'AI アドバイス', 'ワークアウト最適化', '筋トレAI'],
  openGraph: {
    title: 'AI分析 - MuscleGram',
    description: 'AIがトレーニングデータを分析し、個人に最適化されたアドバイスを提供。効果的で安全なワークアウトを実現。',
    url: '/analysis',
  },
  twitter: {
    title: 'AI分析 - MuscleGram',
    description: 'AIがトレーニングデータを分析し、個人に最適化されたアドバイスを提供。効果的で安全なワークアウトを実現。',
  }
}

export default function AnalysisPage() {
  return <FitnessApp defaultScreen="analytics" />
}