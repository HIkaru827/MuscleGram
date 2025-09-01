import type { Metadata } from 'next'
import FitnessApp from "../page"

export const metadata: Metadata = {
  title: 'ホーム - 筋トレ記録とコミュニティ',
  description: 'MuscleGramのホーム画面。今日のトレーニング、進捗状況、コミュニティの最新情報をチェックして、モチベーションを維持しましょう。',
  openGraph: {
    title: 'ホーム - MuscleGram',
    description: '今日のトレーニング予定と進捗をチェック。筋トレ仲間との交流でモチベーションアップ！',
    url: '/home',
  },
  twitter: {
    title: 'ホーム - MuscleGram',
    description: '今日のトレーニング予定と進捗をチェック。筋トレ仲間との交流でモチベーションアップ！',
  }
}

export default function HomePage() {
  return <FitnessApp defaultScreen="home" />
}