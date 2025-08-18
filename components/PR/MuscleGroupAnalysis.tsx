"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, Trophy, Target } from "lucide-react"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { getBestPRsByMuscleGroup, getPRAchievementFrequency } from "@/lib/firestore"
import { PRRecord, getMuscleGroupFromExercise, getPRCategory, PR_CATEGORIES, formatE1RM } from "@/lib/pr-utils"
import { useAuth } from "@/contexts/AuthContext"

interface MuscleGroupAnalysisProps {
  onTrendClick?: (exerciseName: string, prType: PRRecord['prType']) => void
}

interface MuscleGroupData {
  muscleGroup: string
  bestPRs: PRRecord[]
  achievementCount: number
}

const MUSCLE_GROUP_COLORS = {
  '胸': '#ef4444',
  '背中': '#3b82f6', 
  '肩': '#f59e0b',
  '腕': '#10b981',
  '脚': '#8b5cf6',
  'その他': '#6b7280'
}

/**
 * Muscle Group Analysis Component
 * 
 * Displays muscle group best PRs and achievement frequency analysis
 * Shows bar charts and pie charts for muscle group performance visualization
 * 
 * @param onTrendClick - Optional callback for trend chart display
 */
export default function MuscleGroupAnalysis({ onTrendClick }: MuscleGroupAnalysisProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [muscleGroupData, setMuscleGroupData] = useState<MuscleGroupData[]>([])
  const [viewMode, setViewMode] = useState<'best' | 'frequency'>('best')

  useEffect(() => {
    const loadMuscleGroupData = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const [bestPRs, achievementFrequency] = await Promise.all([
          getBestPRsByMuscleGroup(user.uid),
          getPRAchievementFrequency(user.uid)
        ])

        // Group best PRs by muscle group
        const muscleGroupMap: Record<string, PRRecord[]> = {}
        
        bestPRs.forEach(pr => {
          const muscleGroup = getMuscleGroupFromExercise(pr.exerciseName)
          if (!muscleGroupMap[muscleGroup]) {
            muscleGroupMap[muscleGroup] = []
          }
          muscleGroupMap[muscleGroup].push(pr)
        })

        // Combine with achievement frequency data
        const combinedData: MuscleGroupData[] = Object.keys(muscleGroupMap).map(muscleGroup => ({
          muscleGroup,
          bestPRs: muscleGroupMap[muscleGroup].sort((a, b) => b.value - a.value).slice(0, 3), // Top 3 PRs per muscle group
          achievementCount: achievementFrequency[muscleGroup] || 0
        }))

        // Add muscle groups that have achievements but no PRs
        Object.keys(achievementFrequency).forEach(muscleGroup => {
          if (!muscleGroupMap[muscleGroup]) {
            combinedData.push({
              muscleGroup,
              bestPRs: [],
              achievementCount: achievementFrequency[muscleGroup]
            })
          }
        })

        // Sort by achievement count descending
        combinedData.sort((a, b) => b.achievementCount - a.achievementCount)
        
        setMuscleGroupData(combinedData)
      } catch (error) {
        console.error('Error loading muscle group data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMuscleGroupData()
  }, [user])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">部位別データを読み込み中...</div>
        </CardContent>
      </Card>
    )
  }

  if (muscleGroupData.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">部位別データがありません</h3>
          <p className="text-gray-500">ワークアウトを記録して部位別分析を確認しましょう！</p>
        </CardContent>
      </Card>
    )
  }

  // Prepare chart data for achievement frequency
  const frequencyChartData = muscleGroupData
    .filter(data => data.achievementCount > 0)
    .map(data => ({
      name: data.muscleGroup,
      count: data.achievementCount,
      fill: MUSCLE_GROUP_COLORS[data.muscleGroup as keyof typeof MUSCLE_GROUP_COLORS] || MUSCLE_GROUP_COLORS['その他']
    }))

  const totalAchievements = frequencyChartData.reduce((sum, data) => sum + data.count, 0)

  return (
    <div className="space-y-6">
      {/* Header with view toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-purple-600" />
              <span>部位別ベスト＆達成頻度</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'best' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('best')}
              >
                ベストPR
              </Button>
              <Button
                variant={viewMode === 'frequency' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('frequency')}
              >
                達成頻度
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {viewMode === 'best' && (
        <div className="grid grid-cols-1 gap-4">
          {muscleGroupData
            .filter(data => data.bestPRs.length > 0)
            .map(({ muscleGroup, bestPRs, achievementCount }) => (
              <Card key={muscleGroup}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ 
                          backgroundColor: MUSCLE_GROUP_COLORS[muscleGroup as keyof typeof MUSCLE_GROUP_COLORS] || MUSCLE_GROUP_COLORS['その他']
                        }}
                      />
                      <span>{muscleGroup}</span>
                      <Badge variant="outline" className="text-xs">
                        30日間: {achievementCount}PR
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {bestPRs.map((pr, index) => {
                      const category = getPRCategory(pr.prType)
                      const categoryInfo = PR_CATEGORIES[category]
                      
                      return (
                        <div key={pr.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                              <span className="font-medium text-gray-900">{pr.exerciseName}</span>
                              <Badge className={`text-xs ${categoryInfo.color}`}>
                                {categoryInfo.name}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              {pr.prType === 'e1RM' && `e1RM: ${formatE1RM(pr.value)}kg`}
                              {pr.prType === 'weight_reps' && `${pr.weight}kg × ${pr.reps}回`}
                              {pr.prType === 'session_volume' && `総重量: ${(pr.value / 1000).toFixed(1)}t`}
                              {['3RM', '5RM', '8RM'].includes(pr.prType) && `${pr.weight}kg (${pr.prType})`}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {onTrendClick && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onTrendClick(pr.exerciseName, pr.prType)}
                                className="h-8 w-8 p-0"
                              >
                                <BarChart3 className="w-4 h-4" />
                              </Button>
                            )}
                            <div className="text-right text-xs text-gray-500">
                              {pr.date.toLocaleDateString('ja-JP')}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {viewMode === 'frequency' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>30日間のPR達成回数</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={frequencyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                            <div className="font-medium text-gray-900">{label}</div>
                            <div className="text-sm text-gray-600">
                              PR達成: {data.count}回
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span>部位別達成割合</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={frequencyChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {frequencyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload
                        const percentage = ((data.count / totalAchievements) * 100).toFixed(1)
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                            <div className="font-medium text-gray-900">{data.name}</div>
                            <div className="text-sm text-gray-600">
                              {data.count}回 ({percentage}%)
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry) => `${value} (${entry.payload.count}回)`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{muscleGroupData.length}</div>
                  <div className="text-sm text-gray-600">鍛えた部位数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{totalAchievements}</div>
                  <div className="text-sm text-gray-600">総PR達成数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {muscleGroupData.reduce((sum, data) => sum + data.bestPRs.length, 0)}
                  </div>
                  <div className="text-sm text-gray-600">ベストPR記録数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {frequencyChartData.length > 0 
                      ? Math.max(...frequencyChartData.map(d => d.count))
                      : 0
                    }
                  </div>
                  <div className="text-sm text-gray-600">最多達成部位</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}