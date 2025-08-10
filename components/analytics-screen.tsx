"use client"

import { useState, useEffect } from "react"
import { TrendingUp, Award, Target, Calendar, BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { useAuth } from "@/contexts/AuthContext"
import { getPosts } from "@/lib/firestore"
import { WorkoutPost } from "@/types"
import { format, subDays, startOfWeek, startOfMonth, isAfter } from "date-fns"
import { ja } from "date-fns/locale"

interface AnalyticsData {
  totalWorkouts: number
  totalVolume: number
  averageWorkoutDuration: number
  workoutFrequency: number
  favoriteExercises: { name: string; count: number }[]
  progressData: { date: string; volume: number; workouts: number }[]
  exerciseProgress: { exercise: string; progress: { date: string; maxWeight: number }[] }[]
}

export default function AnalyticsScreen() {
  const { user } = useAuth()
  const [selectedExercise, setSelectedExercise] = useState("all")
  const [timeRange, setTimeRange] = useState("6months")
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (!user) {
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

        // Find favorite exercises
        const exerciseCounts: Record<string, number> = {}
        filteredPosts.forEach(post => {
          post.exercises.forEach(exercise => {
            exerciseCounts[exercise.name] = (exerciseCounts[exercise.name] || 0) + 1
          })
        })

        const favoriteExercises = Object.entries(exerciseCounts)
          .map(([name, count]) => ({ name, count }))
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

      } catch (error) {
        console.error('Error loading analytics data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAnalyticsData()
  }, [user, timeRange])

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

      {/* Charts */}
      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="progress">進捗</TabsTrigger>
          <TabsTrigger value="volume">ボリューム</TabsTrigger>
          <TabsTrigger value="exercises">種目別</TabsTrigger>
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

            {analyticsData.exerciseProgress.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>種目別進捗 ({analyticsData.exerciseProgress[0]?.exercise})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analyticsData.exerciseProgress[0]?.progress || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="maxWeight" stroke="#dc2626" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}