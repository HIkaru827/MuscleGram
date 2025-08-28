"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, TrendingUp, Users, Brain, Smartphone, Target, Zap } from "lucide-react"

interface BrandingPageProps {
  onGetStarted: () => void
}

export default function BrandingPage({ onGetStarted }: BrandingPageProps) {
  const features = [
    {
      icon: Users,
      title: "仲間と繋がるソーシャルフィットネス",
      description: "一人では挫折しがちな筋トレも、仲間がいれば続けられる。ワークアウトの記録を写真やコメントと共に簡単にシェアし、他のユーザーの投稿から刺激を受けたり、応援し合ったりすることで、モチベーションを高く維持できます。"
    },
    {
      icon: Brain,
      title: "科学的なトレーニング分析",
      description: "あなたのワークアウトは、ただの記録ではありません。Epley公式による正確な推定1RM（最大挙上重量）計算、重量・回数・レップごとのPRを自動分類し、あなたの成長を科学的に証明します。"
    },
    {
      icon: TrendingUp,
      title: "高度なデータ可視化",
      description: "努力の成果を目で見て実感。日々のトレーニングから生成されるデータは、部位別の詳細分析チャートや、トレーニングの一貫性を示す独自のスコアで可視化されます。これにより、あなたの弱点や成長の軌跡が、一目で明確になります。"
    },
    {
      icon: Smartphone,
      title: "ストレスフリーな記録体験",
      description: "ジムでも、自宅でも。リアルタイムタイマー付きのライブ記録で、ワークアウト中の時間を正確に計測。もし記録を忘れても、カレンダーから過去に遡って入力できます。オフラインでも使える完全PWA対応なので、電波を気にせずいつでもどこでも記録できます。"
    },
    {
      icon: Target,
      title: "スマートレコメンデーション",
      description: "次に何をすべきか、もう迷わない。あなたの過去のトレーニングデータをAIが学習し、最適なトレーニング推奨日を提案することで、あなたのPR達成を強力にサポートします。"
    },
    {
      icon: Zap,
      title: "最新技術による圧倒的な体験",
      description: "高速、そしてシームレス。Next.js 15とReact 19の最新技術を駆使し、驚くほど高速でスムーズな動作を実現。Firebaseによるリアルタイム同期で、スマートフォンとタブレット間のデータ共有も一瞬です。ネイティブアプリと遜色のない快適なモバイル体験を提供します。"
    }
  ]

  const targetUsers = [
    "📈 成長をデータで実感したい方",
    "💪 モチベーションを維持したい方", 
    "🤝 仲間と励まし合いながら筋トレしたい方",
    "🧠 科学的な根拠に基づいたトレーニングをしたい方"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-center h-16 px-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Muscle<span className="text-red-500">Gram</span>
          </h1>
        </div>
      </header>

      <main className="pb-8">
        {/* Hero Section */}
        <section className="px-4 py-12 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <div className="inline-block px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium mb-6">
                ただ記録するだけのアプリは、もう終わり。
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                あなたの努力を<br />
                <span className="text-red-500">「なんとなく」</span>から<br />
                <span className="text-red-500">「確かな成果」</span>へ
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                <span className="font-bold text-red-500">MuscleGram</span>は、AI搭載型インテリジェント筋トレコーチです。<br />
                最先端のデータ分析、そして仲間との繋がりが、<br />
                あなたのトレーニングを次のレベルへと引き上げます。
              </p>
              <Button 
                onClick={onGetStarted}
                size="lg" 
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                今すぐ始める
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-4 py-16 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                MuscleGramが選ばれる<span className="text-red-500">6つの理由</span>
              </h3>
              <p className="text-gray-600 text-lg">
                科学的根拠とAI技術で、あなたの筋トレを革新します
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <div key={index} className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                          <Icon className="w-6 h-6 text-red-500" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-red-500 font-bold mr-2">{index + 1}.</span>
                          <h4 className="text-lg font-bold text-gray-900">{feature.title}</h4>
                        </div>
                        <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Target Users Section */}
        <section className="px-4 py-16 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-3xl font-bold text-gray-900 mb-8">
              MuscleGramは、<span className="text-red-500">こんなあなた</span>に最適です
            </h3>
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {targetUsers.map((user, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200">
                  <p className="text-lg font-medium text-gray-800">{user}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-16 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-4xl font-bold text-gray-900 mb-6">
              あなたの筋トレを、<br />
              <span className="text-red-500">インテリジェント</span>に。そして、<span className="text-red-500">ソーシャル</span>に。
            </h3>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              今すぐMuscleGramを始めて、<br />
              科学的データと仲間の力で、理想の体を手に入れましょう。
            </p>
            <Button 
              onClick={onGetStarted}
              size="lg" 
              className="bg-red-500 hover:bg-red-600 text-white px-12 py-4 text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              無料で始める
              <ArrowRight className="ml-3 w-6 h-6" />
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              登録は30秒で完了します
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}