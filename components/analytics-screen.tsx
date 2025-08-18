"use client"

import { useState, useEffect, useCallback } from "react"
import { TrendingUp, Award, Target, Calendar, BarChart3, Trophy, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { useAuth } from "@/contexts/AuthContext"
import { getPosts, getUserPRs, getWeeklyPRs, getPRTrendData } from "@/lib/firestore"
import { WorkoutPost } from "@/types"
import { format, subDays, startOfWeek, startOfMonth, isAfter } from "date-fns"
import { ja } from "date-fns/locale"
import { PRRecord, calculateE1RM, formatE1RM, findBestE1RMSet, getPRBadgeInfo, groupPRsByWeek, formatPRDate, getPRCategory, PR_CATEGORIES } from "@/lib/pr-utils"
import PRTrendModal from "./PR/PRTrendModal"
import MuscleGroupAnalysis from "./PR/MuscleGroupAnalysis"

interface AnalyticsData {
  totalWorkouts: number
  totalVolume: number
  averageWorkoutDuration: number
  workoutFrequency: number
  favoriteExercises: { name: string; count: number; bestE1RM?: number }[]
  progressData: { date: string; volume: number; workouts: number }[]
  exerciseProgress: { exercise: string; progress: { date: string; maxWeight: number }[] }[]
}

export default function AnalyticsScreen() {
  const { user } = useAuth()
  const [selectedExercise, setSelectedExercise] = useState("all")
  const [timeRange, setTimeRange] = useState("6months")
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [weeklyPRs, setWeeklyPRs] = useState<PRRecord[]>([])
  const [allPRs, setAllPRs] = useState<PRRecord[]>([])
  const [showTrendModal, setShowTrendModal] = useState(false)
  const [trendModalData, setTrendModalData] = useState<{
    exerciseName: string
    prType: PRRecord['prType']
    trendData: PRRecord[]
  } | null>(null)

  const openTrendModal = async (exerciseName: string, prType: PRRecord['prType']) => {
    if (!user) return
    
    // Check if we're in demo mode
    const isDemoMode = process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo-api-key'
    
    if (isDemoMode) {
      // Create demo trend data
      const demoTrendData = [
        { id: '1', exerciseName, prType, value: 80, date: new Date('2024-01-01') },
        { id: '2', exerciseName, prType, value: 85, date: new Date('2024-02-01') },
        { id: '3', exerciseName, prType, value: 90, date: new Date('2024-03-01') },
      ] as PRRecord[]
      
      setTrendModalData({ exerciseName, prType, trendData: demoTrendData })
      setShowTrendModal(true)
      return
    }
    
    try {
      const trendData = await getPRTrendData(user.uid, exerciseName, prType, 6)
      if (trendData.length >= 2) { // Need at least 2 points for a trend
        setTrendModalData({
          exerciseName,
          prType,
          trendData
        })
        setShowTrendModal(true)
      }
    } catch (error) {
      console.error('Error loading trend data:', error)
    }
  }

  const loadAnalyticsData = useCallback(async () => {
      if (!user) {
        setLoading(false)
        return
      }

      // Check if we're in demo mode
      const isDemoMode = process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo-api-key'
      
      if (isDemoMode) {
        // Create demo analytics data
        const demoData: AnalyticsData = {
          totalWorkouts: 15,
          totalVolume: 12500,
          averageWorkoutDuration: 52,
          workoutFrequency: 3.2,
          favoriteExercises: [
            { name: 'ベンチプレス', count: 8, bestE1RM: 105 },
            { name: 'スクワット', count: 6, bestE1RM: 120 },
            { name: 'デッドリフト', count: 5, bestE1RM: 140 },
          ],
          progressData: [
            { date: '1月', volume: 8000, workouts: 4 },
            { date: '2月', volume: 9500, workouts: 5 },
            { date: '3月', volume: 11000, workouts: 6 },
          ],
          exerciseProgress: []
        }
        
        setAnalyticsData(demoData)
        setWeeklyPRs([])
        setAllPRs([])
        setLoading(false)
        return
      }

      try {
        // Get user's posts
        const posts = await getPosts(user.uid, 100) // Get more posts for analysis

        // Calculate date range
        const now = new Date()
        const daysToSubtract = timeRange === "1month" ? 30 : timeRange === "3months" ? 90 : 180
        const startDate = subDays(now, daysToSubtract)

        // Filter posts by date range
        const filteredPosts = posts.filter(post => 
          post.createdAt && isAfter(post.createdAt.toDate(), startDate)
        )

        // Calculate analytics
        const totalWorkouts = filteredPosts.length
        
        // Calculate total volume (weight × reps for all sets)
        const totalVolume = filteredPosts.reduce((sum, post) => {
          const postVolume = post.exercises.reduce((exerciseSum, exercise) => {
            const exerciseVolume = exercise.sets.reduce((setSum, set) => {
              return setSum + (set.weight * set.reps)
            }, 0)
            return exerciseSum + exerciseVolume
          }, 0)
          return sum + postVolume
        }, 0)

        // Calculate average workout duration
        const averageWorkoutDuration = totalWorkouts > 0 
          ? Math.round(filteredPosts.reduce((sum, post) => sum + post.duration, 0) / totalWorkouts)
          : 0

        // Calculate workout frequency (workouts per week)
        const workoutFrequency = totalWorkouts > 0 ? (totalWorkouts / (daysToSubtract / 7)) : 0

        // Find favorite exercises with best e1RM
        const exerciseCounts: Record<string, { count: number; bestE1RM: number }> = {}
        filteredPosts.forEach(post => {
          post.exercises.forEach(exercise => {
            if (!exerciseCounts[exercise.name]) {
              exerciseCounts[exercise.name] = { count: 0, bestE1RM: 0 }
            }
            exerciseCounts[exercise.name].count += 1
            
            // Calculate best e1RM for this exercise
            const bestSet = findBestE1RMSet(exercise.sets)
            if (bestSet && bestSet.e1rm > exerciseCounts[exercise.name].bestE1RM) {
              exerciseCounts[exercise.name].bestE1RM = bestSet.e1rm
            }
          })
        })

        const favoriteExercises = Object.entries(exerciseCounts)
          .map(([name, data]) => ({ name, count: data.count, bestE1RM: data.bestE1RM }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        // Create progress data grouped by week/month
        const progressData: { date: string; volume: number; workouts: number }[] = []
        const groupedData: Record<string, { volume: number; workouts: number }> = {}

        filteredPosts.forEach(post => {
          if (!post.createdAt) return
          
          const postDate = post.createdAt.toDate()
          const groupKey = timeRange === "1month" 
            ? format(startOfWeek(postDate), 'MM/dd', { locale: ja })
            : format(startOfMonth(postDate), 'MM月', { locale: ja })

          if (!groupedData[groupKey]) {
            groupedData[groupKey] = { volume: 0, workouts: 0 }
          }

          const postVolume = post.exercises.reduce((sum, exercise) => {
            return sum + exercise.sets.reduce((setSum, set) => setSum + (set.weight * set.reps), 0)
          }, 0)

          groupedData[groupKey].volume += postVolume
          groupedData[groupKey].workouts += 1
        })

        Object.entries(groupedData).forEach(([date, data]) => {
          progressData.push({ date, ...data })
        })

        // Create exercise-specific progress data
        const exerciseProgress: { exercise: string; progress: { date: string; maxWeight: number }[] }[] = []
        
        favoriteExercises.slice(0, 3).forEach(({ name }) => {
          const exerciseData: { date: string; maxWeight: number }[] = []
          const monthlyMaxes: Record<string, number> = {}

          filteredPosts.forEach(post => {
            if (!post.createdAt) return

            const exercise = post.exercises.find(ex => ex.name === name)
            if (exercise) {
              const maxWeight = Math.max(...exercise.sets.map(set => set.weight))
              const monthKey = format(post.createdAt.toDate(), 'MM月', { locale: ja })
              
              monthlyMaxes[monthKey] = Math.max(monthlyMaxes[monthKey] || 0, maxWeight)
            }
          })

          Object.entries(monthlyMaxes).forEach(([date, maxWeight]) => {
            exerciseData.push({ date, maxWeight })
          })

          exerciseProgress.push({ exercise: name, progress: exerciseData })
        })

        setAnalyticsData({
          totalWorkouts,
          totalVolume,
          averageWorkoutDuration,
          workoutFrequency,
          favoriteExercises,
          progressData: progressData.sort((a, b) => a.date.localeCompare(b.date)),
          exerciseProgress
        })

        // Load PR data
        const [weeklyPRsData, allPRsData] = await Promise.all([
          getWeeklyPRs(user.uid),
          getUserPRs(user.uid)
        ])
        
        setWeeklyPRs(weeklyPRsData)
        setAllPRs(allPRsData)

      } catch (error) {
        console.error('Error loading analytics data:', error)
      } finally {
        setLoading(false)
      }
    }, [user, timeRange])

  useEffect(() => {
    loadAnalyticsData()
  }, [loadAnalyticsData])

  // Reload analytics data when component becomes visible or when posts are deleted
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadAnalyticsData()
      }
    }

    const handlePostDeleted = () => {
      if (user) {
        loadAnalyticsData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('postDeleted', handlePostDeleted)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('postDeleted', handlePostDeleted)
    }
  }, [user, loadAnalyticsData])

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center">ログインしてください</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center">データを読み込み中...</div>
      </div>
    )
  }

  if (!analyticsData || analyticsData.totalWorkouts === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">まだデータがありません</h2>
            <p className="text-gray-500">ワークアウトを記録して分析データを確認しましょう！</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">分析</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">1ヶ月</SelectItem>
            <SelectItem value="3months">3ヶ月</SelectItem>
            <SelectItem value="6months">6ヶ月</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">総ワークアウト数</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.totalWorkouts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">総ボリューム</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(analyticsData.totalVolume / 1000).toFixed(1)}
                  <span className="text-sm text-gray-500 ml-1">t</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">平均時間</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.averageWorkoutDuration}
                  <span className="text-sm text-gray-500 ml-1">分</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">週頻度</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.workoutFrequency.toFixed(1)}
                  <span className="text-sm text-gray-500 ml-1">回</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PR Board */}
      {weeklyPRs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span>今週のPR ({weeklyPRs.length}件)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyPRs.slice(0, 5).map((pr) => {
                const badgeInfo = getPRBadgeInfo(pr.prType, pr.improvement || 0)
                const category = getPRCategory(pr.prType)
                const categoryInfo = PR_CATEGORIES[category]
                return (
                  <div key={pr.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">{pr.exerciseName}</span>
                        <Badge className={`text-xs ${categoryInfo.color}`}>
                          {categoryInfo.name}
                        </Badge>
                        <Badge className={`text-xs ${badgeInfo.color}`}>
                          <Zap className="w-3 h-3 mr-1" />
                          {badgeInfo.text}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {pr.prType === 'e1RM' && `e1RM: ${formatE1RM(pr.value)}kg`}
                        {pr.prType === 'weight_reps' && `${pr.weight}kg × ${pr.reps}回`}
                        {pr.prType === 'session_volume' && `総重量: ${(pr.value / 1000).toFixed(1)}t`}
                        {['3RM', '5RM', '8RM'].includes(pr.prType) && `${pr.weight}kg`}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openTrendModal(pr.exerciseName, pr.prType)}
                        className="h-8 w-8 p-0"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                      <div className="text-right text-sm text-gray-500">
                        <div>{formatPRDate(pr.date)}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="progress">進捗</TabsTrigger>
          <TabsTrigger value="volume">ボリューム</TabsTrigger>
          <TabsTrigger value="exercises">種目別</TabsTrigger>
          <TabsTrigger value="prs">PR履歴</TabsTrigger>
          <TabsTrigger value="muscle-groups">部位別</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ワークアウト頻度</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="workouts" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ボリューム推移</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="volume" stroke="#dc2626" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exercises" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>人気の種目</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analyticsData.favoriteExercises.map((exercise, index) => (
                  <div key={exercise.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{exercise.name}</span>
                    </div>
                    <span className="text-gray-600">{exercise.count}回</span>
                  </div>
                ))}
                {analyticsData.favoriteExercises.length === 0 && (
                  <p className="text-gray-500 text-center py-4">データがありません</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>e1RM ランキング</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analyticsData.favoriteExercises
                  .filter(exercise => exercise.bestE1RM > 0)
                  .sort((a, b) => (b.bestE1RM || 0) - (a.bestE1RM || 0))
                  .slice(0, 5)
                  .map((exercise, index) => (
                  <div key={exercise.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{exercise.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-purple-600">
                        {formatE1RM(exercise.bestE1RM || 0)}kg
                      </div>
                      <div className="text-xs text-gray-500">e1RM</div>
                    </div>
                  </div>
                ))}
                {analyticsData.favoriteExercises.filter(e => e.bestE1RM > 0).length === 0 && (
                  <p className="text-gray-500 text-center py-4">データがありません</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prs" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {allPRs.length > 0 ? (
              groupPRsByWeek(allPRs).slice(0, 8).map((weekPRs, weekIndex) => (
                <Card key={weekIndex}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {formatPRDate(weekPRs[0].date)}の週 ({weekPRs.length}件のPR)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {weekPRs.map((pr) => {
                        const badgeInfo = getPRBadgeInfo(pr.prType, pr.improvement || 0)
                        const category = getPRCategory(pr.prType)
                        const categoryInfo = PR_CATEGORIES[category]
                        return (
                          <div key={pr.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm">{pr.exerciseName}</span>
                                <Badge className={`text-xs ${categoryInfo.color}`}>
                                  {categoryInfo.name}
                                </Badge>
                                <Badge className={`text-xs ${badgeInfo.color}`}>
                                  {pr.prType === 'e1RM' ? 'e1RM' : pr.prType === 'weight_reps' ? '重量×回数' : pr.prType}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {pr.prType === 'e1RM' && `${formatE1RM(pr.value)}kg`}
                                {pr.prType === 'weight_reps' && `${pr.weight}kg × ${pr.reps}回`}
                                {pr.prType === 'session_volume' && `${(pr.value / 1000).toFixed(1)}t`}
                                {['3RM', '5RM', '8RM'].includes(pr.prType) && `${pr.weight}kg`}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openTrendModal(pr.exerciseName, pr.prType)}
                                className="h-6 w-6 p-0"
                              >
                                <BarChart3 className="w-3 h-3" />
                              </Button>
                              <div className="text-right">
                                <div className="text-xs text-green-600 font-medium">
                                  {pr.improvement && pr.improvement > 0 ? `+${pr.improvement}%` : ''}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatPRDate(pr.date)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h2 className="text-xl font-semibold text-gray-700 mb-2">まだPRがありません</h2>
                  <p className="text-gray-500">ワークアウトを記録してPRを達成しましょう！</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="muscle-groups" className="space-y-4">
          <MuscleGroupAnalysis onTrendClick={openTrendModal} />
        </TabsContent>
      </Tabs>

      {/* PR Trend Modal */}
      {showTrendModal && trendModalData && (
        <PRTrendModal
          isOpen={showTrendModal}
          onOpenChange={setShowTrendModal}
          exerciseName={trendModalData.exerciseName}
          prType={trendModalData.prType}
          trendData={trendModalData.trendData}
        />
      )}
    </div>
  )
}