"use client"

import { useState, useEffect, useCallback } from "react"
import { TrendingUp, Award, Target, Calendar, BarChart3, Zap } from "lucide-react"
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
import EnhancedWeeklyPRs from "./enhanced-weekly-prs"
import NextTrainingRecommendations from "./next-training-recommendations"

interface AnalyticsData {
  totalWorkouts: number
  totalVolume: number
  averageWorkoutDuration: number
  workoutFrequency: number
  favoriteExercises: { name: string; count: number; bestE1RM?: number }[]
  progressData: { date: string; volume: number; workouts: number }[]
  exerciseProgress: { exercise: string; progress: { date: string; maxWeight: number }[] }[]
}

// 部位・種目フィルター定義
const MUSCLE_GROUPS = [
  {
    id: "chest",
    name: "胸",
    exercises: ["ベンチプレス", "インクラインプレス", "ダンベルフライ", "ペックフライ", "プッシュアップ", "ディップス"]
  },
  {
    id: "back", 
    name: "背中",
    exercises: ["ラットプルダウン", "チンニング", "ベントオーバーロウ", "ケーブルロー", "デッドリフト", "シュラッグ", "ローイング"]
  },
  {
    id: "legs",
    name: "脚",
    exercises: ["スクワット", "レッグプレス", "レッグエクステンション", "レッグカール", "カーフレイズ", "ランジ", "ブルガリアンスクワット"]
  },
  {
    id: "shoulders",
    name: "肩",
    exercises: ["ショルダープレス", "サイドレイズ", "フロントレイズ", "リアデルト", "アップライトロウ", "ダンベルプレス"]
  },
  {
    id: "arms",
    name: "腕",
    exercises: ["バーベルカール", "ダンベルカール", "ハンマーカール", "トライセプスエクステンション", "フレンチプレス", "ディップス"]
  },
  {
    id: "abs",
    name: "腹",
    exercises: ["プランク", "クランチ", "シットアップ", "レッグレイズ", "ロシアンツイスト", "マウンテンクライマー"]
  }
]

export default function AnalyticsScreen() {
  const { user } = useAuth()
  const [selectedExercise, setSelectedExercise] = useState("all")
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("all") 
  const [timeRange, setTimeRange] = useState("all")
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [originalAnalyticsData, setOriginalAnalyticsData] = useState<AnalyticsData | null>(null)
  const [originalPosts, setOriginalPosts] = useState<WorkoutPost[]>([])
  const [filteredWeeklyPRs, setFilteredWeeklyPRs] = useState<PRRecord[]>([])
  const [filteredAllPRs, setFilteredAllPRs] = useState<PRRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [weeklyPRs, setWeeklyPRs] = useState<PRRecord[]>([])
  const [allPRs, setAllPRs] = useState<PRRecord[]>([])
  const [showTrendModal, setShowTrendModal] = useState(false)
  const [trendModalData, setTrendModalData] = useState<{
    exerciseName: string
    prType: PRRecord['prType']
    trendData: PRRecord[]
  } | null>(null)
  const [availableExercises, setAvailableExercises] = useState<string[]>([])

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

  // データをフィルタリングする関数
  const applyFilters = useCallback((data: AnalyticsData, posts: WorkoutPost[]) => {
    if (!data) return { filteredData: data, filteredPosts: posts }
    
    // 部位フィルター
    const muscleGroupExercises = selectedMuscleGroup !== "all" 
      ? MUSCLE_GROUPS.find(g => g.id === selectedMuscleGroup)?.exercises || []
      : []
    
    // 種目フィルター
    const shouldIncludeExercise = (exerciseName: string) => {
      if (selectedExercise !== "all" && selectedExercise !== exerciseName) return false
      if (selectedMuscleGroup !== "all" && !muscleGroupExercises.includes(exerciseName)) return false
      return true
    }
    
    // 投稿をフィルタリング
    const filteredPosts = posts.filter(post => 
      post.exercises.some(exercise => shouldIncludeExercise(exercise.name))
    )
    
    // フィルタリングされた投稿から新しい分析データを計算
    if (selectedMuscleGroup === "all" && selectedExercise === "all") {
      return { 
        filteredData: data, 
        filteredPosts: posts 
      }
    }
    
    // ワークアウト日数を再計算
    const workoutDays = new Set<string>()
    filteredPosts.forEach(post => {
      if (post.createdAt) {
        workoutDays.add(format(post.createdAt.toDate(), 'yyyy-MM-dd'))
      }
    })
    const totalWorkouts = workoutDays.size
    
    // 総ボリュームを再計算（フィルターされた種目のみ）
    const totalVolume = filteredPosts.reduce((sum, post) => {
      const postVolume = post.exercises
        .filter(exercise => shouldIncludeExercise(exercise.name))
        .reduce((exerciseSum, exercise) => {
          const exerciseVolume = exercise.sets.reduce((setSum, set) => {
            return setSum + (set.weight * set.reps)
          }, 0)
          return exerciseSum + exerciseVolume
        }, 0)
      return sum + postVolume
    }, 0)
    
    // 平均時間を再計算
    const averageWorkoutDuration = totalWorkouts > 0 
      ? Math.round(filteredPosts.reduce((sum, post) => sum + post.duration, 0) / totalWorkouts)
      : 0
    
    // 頻度を再計算
    let workoutFrequency = 0
    if (totalWorkouts > 0) {
      // 全期間の場合は実際の期間で計算
      if (filteredPosts.length > 0) {
        const dates = filteredPosts
          .map(post => post.createdAt?.toDate())
          .filter((date): date is Date => !!date)
          .sort((a, b) => a.getTime() - b.getTime())
        
        if (dates.length > 1) {
          const daysDiff = Math.max(1, Math.ceil((dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)))
          workoutFrequency = totalWorkouts / (daysDiff / 7)
        } else {
          workoutFrequency = totalWorkouts // 1日だけの場合
        }
      }
    }
    
    // 人気種目を再計算
    const exerciseCounts: Record<string, { count: number; bestE1RM: number }> = {}
    filteredPosts.forEach(post => {
      post.exercises.filter(exercise => shouldIncludeExercise(exercise.name)).forEach(exercise => {
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
    
    // 進捗データを再計算
    const progressData: { date: string; volume: number; workouts: number }[] = []
    const groupedData: Record<string, { volume: number; workoutDays: Set<string> }> = {}

    filteredPosts.forEach(post => {
      if (!post.createdAt) return
      
      const postDate = post.createdAt.toDate()
      const groupKey = format(startOfWeek(postDate), 'MM/dd', { locale: ja })
      const dayKey = format(postDate, 'yyyy-MM-dd')

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = { volume: 0, workoutDays: new Set<string>() }
      }

      const postVolume = post.exercises
        .filter(exercise => shouldIncludeExercise(exercise.name))
        .reduce((sum, exercise) => {
          return sum + exercise.sets.reduce((setSum, set) => setSum + (set.weight * set.reps), 0)
        }, 0)

      groupedData[groupKey].volume += postVolume
      groupedData[groupKey].workoutDays.add(dayKey)
    })

    Object.entries(groupedData).forEach(([date, data]) => {
      progressData.push({ 
        date, 
        volume: data.volume, 
        workouts: data.workoutDays.size 
      })
    })
    
    const filteredData = {
      ...data,
      totalWorkouts,
      totalVolume,
      averageWorkoutDuration,
      workoutFrequency,
      favoriteExercises,
      progressData: progressData.sort((a, b) => a.date.localeCompare(b.date)),
      exerciseProgress: data.exerciseProgress.filter(ex => shouldIncludeExercise(ex.exercise))
    }
    
    return { filteredData, filteredPosts }
  }, [selectedMuscleGroup, selectedExercise])

  // PRデータをフィルタリングする関数
  const filterPRs = useCallback((prs: PRRecord[]) => {
    if (selectedMuscleGroup === "all" && selectedExercise === "all") {
      return prs
    }
    
    const muscleGroupExercises = selectedMuscleGroup !== "all" 
      ? MUSCLE_GROUPS.find(g => g.id === selectedMuscleGroup)?.exercises || []
      : []
    
    return prs.filter(pr => {
      if (selectedExercise !== "all" && selectedExercise !== pr.exerciseName) return false
      if (selectedMuscleGroup !== "all" && !muscleGroupExercises.includes(pr.exerciseName)) return false
      return true
    })
  }, [selectedMuscleGroup, selectedExercise])

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
        
        // 元データと利用可能な種目を保存
        setOriginalAnalyticsData(demoData)
        setOriginalPosts([])
        setAvailableExercises(demoData.favoriteExercises.map(ex => ex.name))
        
        // フィルターを適用してセット
        const { filteredData } = applyFilters(demoData, [])
        setAnalyticsData(filteredData)
        setWeeklyPRs([])
        setAllPRs([])
        setFilteredWeeklyPRs([])
        setFilteredAllPRs([])
        setLoading(false)
        return
      }

      try {
        // Get user's posts
        const posts = await getPosts(user.uid, 100) // Get more posts for analysis

        // Calculate date range
        let filteredPosts = posts
        if (timeRange !== "all") {
          const now = new Date()
          const daysToSubtract = timeRange === "1month" ? 30 : timeRange === "3months" ? 90 : 180
          const startDate = subDays(now, daysToSubtract)
          
          // Filter posts by date range
          filteredPosts = posts.filter(post => 
            post.createdAt && isAfter(post.createdAt.toDate(), startDate)
          )
        }

        // Calculate analytics - count unique workout days
        const workoutDays = new Set<string>()
        filteredPosts.forEach(post => {
          if (post.createdAt) {
            workoutDays.add(format(post.createdAt.toDate(), 'yyyy-MM-dd'))
          }
        })
        const totalWorkouts = workoutDays.size
        
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
        let workoutFrequency = 0
        if (totalWorkouts > 0) {
          if (timeRange === "all") {
            // 全期間の場合は実際の期間で計算
            if (filteredPosts.length > 0) {
              const dates = filteredPosts
                .map(post => post.createdAt?.toDate())
                .filter((date): date is Date => !!date)
                .sort((a, b) => a.getTime() - b.getTime())
              
              if (dates.length > 1) {
                const daysDiff = Math.max(1, Math.ceil((dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)))
                workoutFrequency = totalWorkouts / (daysDiff / 7)
              } else {
                workoutFrequency = totalWorkouts // 1日だけの場合
              }
            }
          } else {
            const daysToSubtract = timeRange === "1month" ? 30 : timeRange === "3months" ? 90 : 180
            workoutFrequency = totalWorkouts / (daysToSubtract / 7)
          }
        }

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

        // Create progress data grouped by week/month, counting unique days only
        const progressData: { date: string; volume: number; workouts: number }[] = []
        const groupedData: Record<string, { volume: number; workoutDays: Set<string> }> = {}

        filteredPosts.forEach(post => {
          if (!post.createdAt) return
          
          const postDate = post.createdAt.toDate()
          const groupKey = timeRange === "1month" 
            ? format(startOfWeek(postDate), 'MM/dd', { locale: ja })
            : format(startOfMonth(postDate), 'MM月', { locale: ja })
          
          // Use date string as unique day identifier
          const dayKey = format(postDate, 'yyyy-MM-dd')

          if (!groupedData[groupKey]) {
            groupedData[groupKey] = { volume: 0, workoutDays: new Set<string>() }
          }

          const postVolume = post.exercises.reduce((sum, exercise) => {
            return sum + exercise.sets.reduce((setSum, set) => setSum + (set.weight * set.reps), 0)
          }, 0)

          groupedData[groupKey].volume += postVolume
          groupedData[groupKey].workoutDays.add(dayKey)
        })

        Object.entries(groupedData).forEach(([date, data]) => {
          progressData.push({ 
            date, 
            volume: data.volume, 
            workouts: data.workoutDays.size 
          })
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

        const fullData = {
          totalWorkouts,
          totalVolume,
          averageWorkoutDuration,
          workoutFrequency,
          favoriteExercises,
          progressData: progressData.sort((a, b) => a.date.localeCompare(b.date)),
          exerciseProgress
        }
        
        // 元データと利用可能な種目を保存
        setOriginalAnalyticsData(fullData)
        setOriginalPosts(filteredPosts)
        setAvailableExercises(favoriteExercises.map(ex => ex.name))
        
        // Load PR data
        const [weeklyPRsData, allPRsData] = await Promise.all([
          getWeeklyPRs(user.uid),
          getUserPRs(user.uid)
        ])
        
        setWeeklyPRs(weeklyPRsData)
        setAllPRs(allPRsData)
        
        // フィルターを適用してセット
        const { filteredData } = applyFilters(fullData, filteredPosts)
        setAnalyticsData(filteredData)
        setFilteredWeeklyPRs(filterPRs(weeklyPRsData))
        setFilteredAllPRs(filterPRs(allPRsData))

      } catch (error) {
        console.error('Error loading analytics data:', error)
      } finally {
        setLoading(false)
      }
    }, [user, timeRange])

  useEffect(() => {
    loadAnalyticsData()
  }, [loadAnalyticsData])

  // フィルターが変更された時にデータを再フィルタリング
  useEffect(() => {
    if (originalAnalyticsData && originalPosts) {
      const { filteredData } = applyFilters(originalAnalyticsData, originalPosts)
      setAnalyticsData(filteredData)
      setFilteredWeeklyPRs(filterPRs(weeklyPRs))
      setFilteredAllPRs(filterPRs(allPRs))
    }
  }, [originalAnalyticsData, originalPosts, applyFilters, filterPRs, weeklyPRs, allPRs])

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
          <SelectTrigger className="w-32 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">全期間</SelectItem>
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

      {/* Next Training Recommendations */}
      <NextTrainingRecommendations 
        maxItems={5}
        onExerciseSelect={(exerciseName) => {
          // Could navigate to record screen or show exercise details
          console.log('Selected exercise for training:', exerciseName)
        }}
      />

      {/* フィルター */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">フィルター:</span>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {/* 部位フィルター */}
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">部位</label>
                <Select value={selectedMuscleGroup} onValueChange={(value) => {
                  setSelectedMuscleGroup(value)
                  if (value !== "all") setSelectedExercise("all") // 部位選択時は種目をリセット
                }}>
                  <SelectTrigger className="w-24 sm:w-28 h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">全部位</SelectItem>
                    {MUSCLE_GROUPS.map(group => (
                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 種目フィルター */}
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">種目</label>
                <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                  <SelectTrigger className="w-32 sm:w-40 h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">全種目</SelectItem>
                    {(selectedMuscleGroup !== "all" 
                      ? MUSCLE_GROUPS.find(g => g.id === selectedMuscleGroup)?.exercises.filter(ex => 
                          availableExercises.includes(ex)
                        ) || []
                      : availableExercises
                    ).map(exercise => (
                      <SelectItem key={exercise} value={exercise}>{exercise}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* フィルター状態表示 */}
              {(selectedMuscleGroup !== "all" || selectedExercise !== "all") && (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSelectedMuscleGroup("all")
                      setSelectedExercise("all")
                    }}
                    className="h-8 px-3 text-xs"
                  >
                    フィルターをクリア
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* アクティブフィルター表示 */}
          {(selectedMuscleGroup !== "all" || selectedExercise !== "all") && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {selectedMuscleGroup !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    部位: {MUSCLE_GROUPS.find(g => g.id === selectedMuscleGroup)?.name}
                  </Badge>
                )}
                {selectedExercise !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    種目: {selectedExercise}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                  <YAxis domain={[0, timeRange === "1month" ? 7 : 30]} />
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
          {/* 今週のPR - 改善版 */}
          <EnhancedWeeklyPRs 
            weeklyPRs={filteredWeeklyPRs} 
            onTrendClick={openTrendModal} 
          />
          
          {/* 過去のPR履歴 */}
          {filteredAllPRs.length > filteredWeeklyPRs.length && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mt-8">過去のPR履歴</h3>
              <div className="grid grid-cols-1 gap-4">
                {groupPRsByWeek(filteredAllPRs.filter(pr => !filteredWeeklyPRs.find(wpr => wpr.id === pr.id)))
                  .slice(0, 4).map((weekPRs, weekIndex) => (
                  <Card key={weekIndex}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {formatPRDate(weekPRs[0].date)}の週 ({weekPRs.length}件のPR)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {weekPRs.slice(0, 3).map((pr) => {
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
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {pr.prType === 'e1RM' && `e1RM ${formatE1RM(pr.value)}kg`}
                                  {pr.prType === 'weight_reps' && `${pr.weight}kg × ${pr.reps}回`}
                                  {pr.prType === 'session_volume' && `総重量 ${(pr.value / 1000).toFixed(1)}t`}
                                  {['3RM', '5RM', '8RM'].includes(pr.prType) && `${pr.prType} ${pr.weight}kg`}
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
                                    {pr.improvement && pr.improvement > 0 ? `+${pr.improvement.toFixed(1)}%` : ''}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatPRDate(pr.date)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {weekPRs.length > 3 && (
                          <div className="text-center py-2">
                            <span className="text-xs text-gray-500">他{weekPRs.length - 3}件</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
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