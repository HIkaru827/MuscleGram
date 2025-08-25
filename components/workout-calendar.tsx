"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Zap, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { getPosts, getUserPRs } from "@/lib/firestore"
import { format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  addMonths, 
  subMonths,
  parseISO,
  isToday,
  differenceInDays
} from "date-fns"
import { ja } from "date-fns/locale"

interface WorkoutDay {
  date: Date
  workouts: {
    id: string
    muscleGroups: string[]
    totalVolume: number
    duration: number
    exercises: {
      name: string
      sets: { weight: number; reps: number }[]
    }[]
  }[]
  prs: {
    id: string
    exerciseName: string
    prType: string
    value: number
  }[]
}

interface WorkoutCalendarProps {
  onDateSelect?: (date: Date, workouts: WorkoutDay['workouts']) => void
  onNavigateToRecord?: (date: Date, isToday: boolean) => void
  refreshTrigger?: number // 外部からリフレッシュをトリガーするためのプロパティ
}

const muscleGroupColors = {
  '胸': 'bg-red-100 text-red-700',
  '背中': 'bg-blue-100 text-blue-700', 
  '脚': 'bg-green-100 text-green-700',
  '腕': 'bg-purple-100 text-purple-700',
  '肩': 'bg-orange-100 text-orange-700',
  '有酸素': 'bg-pink-100 text-pink-700',
}

const getMuscleGroupFromExercise = (exerciseName: string): string => {
  const exerciseMapping: Record<string, string> = {
    'ベンチプレス': '胸',
    'インクラインプレス': '胸',
    'ディクラインプレス': '胸',
    'ダンベルフライ': '胸',
    'チェストプレス': '胸',
    '懸垂': '背中',
    'デッドリフト': '背中',
    'ラットプルダウン': '背中',
    'ベントオーバーロー': '背中',
    'スクワット': '脚',
    'レッグプレス': '脚',
    'レッグエクステンション': '脚',
    'バーベルカール': '腕',
    'ハンマーカール': '腕',
    'トライセプスエクステンション': '腕',
    'ディップス': '腕',
    'プリーチャーカール': '腕',
    'ショルダープレス': '肩',
    'サイドレイズ': '肩',
    'リアレイズ': '肩',
    'フロントレイズ': '肩',
    'アップライトロー': '肩',
    'ランニング': '有酸素',
    'サイクリング': '有酸素',
    'エリプティカル': '有酸素',
    'ローイング': '有酸素',
    'ウォーキング': '有酸素',
  }
  
  return exerciseMapping[exerciseName] || '胸'
}

const getVolumeColorIntensity = (volume: number): string => {
  if (volume === 0) return 'bg-gray-50'
  if (volume < 5000) return 'bg-red-100'
  if (volume < 10000) return 'bg-red-200'
  if (volume < 15000) return 'bg-red-300'
  if (volume < 20000) return 'bg-red-400'
  return 'bg-red-500'
}

const calculateStreak = (workoutDays: WorkoutDay[], targetDate: Date): number => {
  let streak = 0
  let currentDate = new Date(targetDate)
  
  // Go backward from target date
  while (true) {
    const dayData = workoutDays.find(day => isSameDay(day.date, currentDate))
    if (dayData && dayData.workouts.length > 0) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }
  
  return streak
}

const createDemoWorkoutData = (): WorkoutDay[] => {
  const currentDate = new Date()
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  
  return allDays.map(date => {
    const daysSinceStart = differenceInDays(date, monthStart)
    const hasWorkout = daysSinceStart % 3 === 0 && daysSinceStart >= 0 && daysSinceStart <= 30
    
    if (!hasWorkout) {
      return { date, workouts: [], prs: [] }
    }
    
    // Create demo workout data
    const muscleGroups = ['胸', '背中', '脚', '腕', '肩'][daysSinceStart % 5]
    const exercises = [
      { name: 'ベンチプレス', sets: [{ weight: 80, reps: 10 }, { weight: 85, reps: 8 }] },
      { name: 'インクラインプレス', sets: [{ weight: 60, reps: 12 }] }
    ]
    
    const totalVolume = exercises.reduce((total, ex) => 
      total + ex.sets.reduce((exTotal, set) => exTotal + (set.weight * set.reps), 0), 0
    )
    
    const workout = {
      id: `demo-${daysSinceStart}`,
      muscleGroups: [muscleGroups],
      totalVolume,
      duration: 45 + (daysSinceStart % 3) * 15,
      exercises
    }
    
    // Add PR for some days
    const prs = daysSinceStart % 7 === 0 ? [{
      id: `pr-${daysSinceStart}`,
      exerciseName: 'ベンチプレス',
      prType: 'e1RM',
      value: 100 + daysSinceStart
    }] : []
    
    return { date, workouts: [workout], prs }
  })
}

export default function WorkoutCalendar({ onDateSelect, onNavigateToRecord, refreshTrigger }: WorkoutCalendarProps) {
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedWorkouts, setSelectedWorkouts] = useState<WorkoutDay['workouts']>([])
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    if (user) {
      loadWorkoutData()
    }
  }, [user, currentMonth])

  // refreshTriggerが変更された時にデータを再読み込み
  useEffect(() => {
    if (user && refreshTrigger) {
      console.log('Calendar refresh triggered:', refreshTrigger)
      loadWorkoutData()
    }
  }, [refreshTrigger])

  const loadWorkoutData = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo-api-key'
      
      if (isDemoMode) {
        // Create demo workout data
        const demoWorkouts = createDemoWorkoutData()
        setWorkoutDays(demoWorkouts)
        setLoading(false)
        return
      }
      
      // Get posts for current month range
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
      
      // Fetch all user posts (we'll filter by date in memory)
      const posts = await getPosts(user.uid, 100)
      
      // Fetch PRs for the same period
      const prs = await getUserPRs(user.uid)
      
      // Process workout data by date
      const workoutMap = new Map<string, WorkoutDay>()
      
      // Initialize all days in calendar view
      const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
      allDays.forEach(date => {
        const dateKey = format(date, 'yyyy-MM-dd')
        workoutMap.set(dateKey, {
          date,
          workouts: [],
          prs: []
        })
      })
      
      // Process posts
      posts.forEach(post => {
        if (!post.createdAt) return
        
        const postDate = post.createdAt.toDate ? post.createdAt.toDate() : new Date(post.createdAt)
        const dateKey = format(postDate, 'yyyy-MM-dd')
        
        console.log('Processing post:', {
          postId: post.id,
          createdAt: post.createdAt,
          postDate,
          dateKey,
          recordMode: post.recordMode,
          recordDate: post.recordDate
        })
        
        if (workoutMap.has(dateKey)) {
          const muscleGroups = [...new Set(
            post.exercises.map(ex => getMuscleGroupFromExercise(ex.name))
          )]
          
          const totalVolume = post.exercises.reduce((total, ex) => {
            return total + ex.sets.reduce((exTotal, set) => {
              return exTotal + (set.weight * set.reps)
            }, 0)
          }, 0)
          
          workoutMap.get(dateKey)!.workouts.push({
            id: post.id,
            muscleGroups,
            totalVolume,
            duration: post.duration || 0,
            exercises: post.exercises
          })
        }
      })
      
      // Process PRs
      prs.forEach(pr => {
        const prDate = pr.date
        const dateKey = format(prDate, 'yyyy-MM-dd')
        
        if (workoutMap.has(dateKey)) {
          workoutMap.get(dateKey)!.prs.push({
            id: pr.id,
            exerciseName: pr.exerciseName,
            prType: pr.prType,
            value: pr.value
          })
        }
      })
      
      setWorkoutDays(Array.from(workoutMap.values()))
    } catch (error) {
      console.error('Error loading workout data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateClick = (date: Date) => {
    const dayData = workoutDays.find(day => isSameDay(day.date, date))
    const hasWorkouts = dayData && dayData.workouts.length > 0
    const clickedIsToday = isToday(date)
    
    // 既存のワークアウト詳細表示機能
    if (hasWorkouts) {
      setSelectedDate(date)
      setSelectedWorkouts(dayData.workouts)
      setShowDetailModal(true)
      onDateSelect?.(date, dayData.workouts)
    }
    
    // 新しいナビゲーション機能 - 全ての日付でクリック可能
    if (onNavigateToRecord) {
      onNavigateToRecord(date, clickedIsToday)
    }
  }

  const renderCalendarDay = (date: Date) => {
    const dayData = workoutDays.find(day => isSameDay(day.date, date))
    const hasWorkout = dayData && dayData.workouts.length > 0
    const hasPR = dayData && dayData.prs.length > 0
    const isCurrentMonth = isSameMonth(date, currentMonth)
    const isToday = isSameDay(date, new Date())
    
    let totalVolume = 0
    let uniqueMuscleGroups: string[] = []
    
    if (dayData) {
      totalVolume = dayData.workouts.reduce((sum, workout) => sum + workout.totalVolume, 0)
      uniqueMuscleGroups = [...new Set(
        dayData.workouts.flatMap(workout => workout.muscleGroups)
      )]
    }
    
    const streak = hasWorkout ? calculateStreak(workoutDays, date) : 0
    const volumeColor = getVolumeColorIntensity(totalVolume)

    return (
      <div
        key={format(date, 'yyyy-MM-dd')}
        className={cn(
          "relative p-1.5 h-12 sm:h-16 border border-gray-100 cursor-pointer transition-all duration-200",
          !isCurrentMonth && "text-gray-300 bg-gray-50",
          isCurrentMonth && "hover:bg-gray-50 hover:shadow-sm",
          hasWorkout && isCurrentMonth && volumeColor,
          hasWorkout && "hover:shadow-md",
          isToday && "ring-2 ring-red-500 ring-inset"
        )}
        onClick={() => handleDateClick(date)}
        title={hasWorkout ? `${format(date, 'M月d日')} - ワークアウト詳細を表示 / 記録画面へ` : `${format(date, 'M月d日')} - 記録画面へ`}
      >
        {/* Date number */}
        <div className={cn(
          "text-xs sm:text-sm font-medium",
          isToday && "text-red-600 font-bold",
          !isCurrentMonth && "text-gray-400"
        )}>
          {format(date, 'd')}
        </div>
        
        {/* Workout indicators */}
        {hasWorkout && isCurrentMonth && (
          <div className="absolute inset-1 top-4 sm:top-5 flex flex-col space-y-0.5">
            {/* Muscle group indicators */}
            <div className="flex flex-wrap gap-0.5">
              {uniqueMuscleGroups.slice(0, 4).map((muscleGroup) => (
                <div
                  key={muscleGroup}
                  className={cn(
                    "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
                    muscleGroupColors[muscleGroup as keyof typeof muscleGroupColors] || 'bg-gray-300'
                  )}
                />
              ))}
              {uniqueMuscleGroups.length > 4 && (
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-400" />
              )}
            </div>
            
            {/* Badges */}
            {hasPR && (
              <div className="flex items-center">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-600 rounded-full" />
                <span className="text-xs font-bold text-yellow-700 ml-0.5 hidden sm:inline">
                  {dayData.prs.length}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="text-center text-gray-500">カレンダーを読み込み中...</div>
        </CardContent>
      </Card>
    )
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  return (
    <>
      <Card className="w-full">
        <CardContent className="p-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <h3 className="text-lg font-semibold text-gray-900">
              {format(currentMonth, 'yyyy年 M月', { locale: ja })}
            </h3>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center space-x-4 mb-4 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-600 rounded-full" />
              <span>PR達成</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-300 rounded-full" />
              <span>ワークアウト日</span>
            </div>
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
            {/* Day headers */}
            {['月', '火', '水', '木', '金', '土', '日'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-700 bg-gray-50 border-b border-gray-200">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {allDays.map(renderCalendarDay)}
          </div>
        </CardContent>
      </Card>

      {/* Workout Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-md mx-auto max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, 'M月d日(E)', { locale: ja })} のワークアウト
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {selectedWorkouts.map((workout, index) => (
                <Card key={workout.id} className="border border-gray-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">
                          ワークアウト {index + 1}
                        </h4>
                        {workout.duration > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {workout.duration}分
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        総重量: {(workout.totalVolume / 1000).toFixed(1)}t
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {workout.muscleGroups.map((muscleGroup) => (
                        <Badge 
                          key={muscleGroup}
                          className={cn(
                            "text-xs",
                            muscleGroupColors[muscleGroup as keyof typeof muscleGroupColors] || 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {muscleGroup}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      {workout.exercises.map((exercise, exIndex) => (
                        <div key={exIndex} className="text-sm">
                          <div className="font-medium text-gray-900 mb-1">
                            {exercise.name}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                            {exercise.sets.map((set, setIndex) => (
                              <div key={setIndex}>
                                {set.weight}kg × {set.reps}回
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}