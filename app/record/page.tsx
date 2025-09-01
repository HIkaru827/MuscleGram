import type { Metadata } from 'next'
import FitnessApp from "../page"

export const metadata: Metadata = {
  title: 'トレーニング記録 - ワークアウトを記録しよう',
  description: 'トレーニングを記録して進歩を追跡。重量、セット数、レップ数を記録し、過去の成果と比較してより効果的なワークアウトを実現しましょう。',
  keywords: ['トレーニング記録', '筋トレログ', 'ワークアウト記録', '重量記録', 'レップ数', 'セット数', 'PR記録'],
  openGraph: {
    title: 'トレーニング記録 - MuscleGram',
    description: 'トレーニングを記録して進歩を追跡。重量、セット数、レップ数を記録し、効果的なワークアウトを実現。',
    url: '/record',
  },
  twitter: {
    title: 'トレーニング記録 - MuscleGram',
    description: 'トレーニングを記録して進歩を追跡。重量、セット数、レップ数を記録し、効果的なワークアウトを実現。',
  }
}

export default function RecordPage() {
  return <FitnessApp defaultScreen="record" />
}