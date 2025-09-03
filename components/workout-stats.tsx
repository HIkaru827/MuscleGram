"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Clock, Target, Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getUserStats } from "@/lib/firestore"

interface WorkoutStatsProps {
  userId: string
}

interface UserStats {
  totalWorkouts: number
  totalVolume: number
  averageDuration: number
  popularExercises: Array<{ name: string; count: number }>
  workoutDates: string[]
}

export default function WorkoutStats({ userId }: WorkoutStatsProps) {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserStats()
  }, [userId])

  const loadUserStats = async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const userStats = await getUserStats(userId)
      setStats(userStats)
    } catch (error) {
      console.error('Error loading user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}分`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}時間${remainingMinutes > 0 ? `${remainingMinutes}分` : ''}`
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M kg`
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K kg`
    }
    return `${volume} kg`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">読み込み中...</div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">統計情報を取得できませんでした</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Overall Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">総ワークアウト</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalWorkouts}</p>
                <p className="text-xs text-gray-500">回</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">総ボリューム</p>
                <p className="text-2xl font-bold text-gray-900">{formatVolume(stats.totalVolume)}</p>
                <p className="text-xs text-gray-500">重量×回数</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">平均時間</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.averageDuration > 0 ? formatDuration(stats.averageDuration) : '未記録'}
                </p>
                <p className="text-xs text-gray-500">1回あたり</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">継続日数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.workoutDates.length}</p>
                <p className="text-xs text-gray-500">日</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Exercises */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span>人気種目 TOP5</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.popularExercises.length > 0 ? (
            <div className="space-y-3">
              {stats.popularExercises.map((exercise, index) => (
                <div key={exercise.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{exercise.name}</span>
                  </div>
                  <Badge variant="secondary">
                    {exercise.count}回
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              まだエクササイズの記録がありません
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}