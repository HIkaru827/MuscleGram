"use client"

import { useState, useEffect } from "react"
import React from "react"
import { ArrowLeft, Plus, Edit, Play, Home, BarChart3, Scale, ShoppingBag, Clock, Camera, Send, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useWorkout } from "@/contexts/WorkoutContext"
import { createPost, savePR, getLatestPRForExercise } from "@/lib/firestore"
import { uploadMultipleImages, validateImageFile, compressImage } from "@/lib/storage"
import { toast } from "sonner"
import { usePWA } from "@/hooks/usePWA"
import { isToday as isTodayFn, format } from "date-fns"
import { Timestamp } from "firebase/firestore"
import TimerDialog from "./timer-dialog"
import PRRecommendationModal from "./PR/PRRecommendationModal"
import WorkoutCalendar from "./workout-calendar"
import { 
  calculateE1RM, 
  findBestE1RMSet, 
  findBestWeightReps, 
  findBestRepSpecificPR, 
  calculateSessionVolume, 
  calculateImprovement,
  getPRBadgeInfo,
  PRRecord 
} from "@/lib/pr-utils"
import { trackWorkoutEvent, trackUserEvent, trackConversion } from "@/lib/analytics"

interface Exercise {
  id: string
  name: string
  hasVideo: boolean
  lastPerformed?: {
    date: string
    weight: number
    reps: number
  }
}

interface MuscleGroup {
  id: string
  name: string
  color: string
  lastWorkout?: string
  exercises: Exercise[]
  showAll: boolean
}

// 記録モードの型定義
type RecordMode = 'live' | 'manual'

interface ManualTimeInput {
  startTime: string
  endTime: string
}


const defaultMuscleGroups: MuscleGroup[] = [
  {
    id: "chest",
    name: "胸",
    color: "bg-red-600",
    lastWorkout: "1日22時間前",
    showAll: false,
    exercises: [
      { id: "1", name: "ベンチプレス", hasVideo: true, lastPerformed: { date: "2024-01-10", weight: 80, reps: 10 } },
      { id: "2", name: "インクラインプレス", hasVideo: true, lastPerformed: { date: "2024-01-08", weight: 60, reps: 12 } },
      { id: "3", name: "ディクラインプレス", hasVideo: false },
      { id: "4", name: "ダンベルフライ", hasVideo: true },
      { id: "5", name: "チェストプレス", hasVideo: false },
    ]
  },
  {
    id: "back",
    name: "背中",
    color: "bg-blue-600",
    lastWorkout: "2日前",
    showAll: false,
    exercises: [
      { id: "6", name: "懸垂", hasVideo: true },
      { id: "7", name: "デッドリフト", hasVideo: true },
      { id: "8", name: "ラットプルダウン", hasVideo: true },
      { id: "9", name: "ベントオーバーロー", hasVideo: true },
    ]
  },
  {
    id: "legs",
    name: "脚",
    color: "bg-green-600",
    lastWorkout: "3日前",
    showAll: false,
    exercises: [
      { id: "10", name: "スクワット", hasVideo: true },
      { id: "11", name: "レッグプレス", hasVideo: true },
      { id: "12", name: "レッグエクステンション", hasVideo: false },
    ]
  },
  {
    id: "arms",
    name: "腕",
    color: "bg-purple-600",
    showAll: false,
    exercises: [
      { id: "13", name: "バーベルカール", hasVideo: true },
      { id: "14", name: "ハンマーカール", hasVideo: true },
      { id: "15", name: "トライセプスエクステンション", hasVideo: false },
      { id: "16", name: "ディップス", hasVideo: true },
      { id: "17", name: "プリーチャーカール", hasVideo: false },
    ]
  },
  {
    id: "shoulders",
    name: "肩",
    color: "bg-orange-600",
    showAll: false,
    exercises: [
      { id: "18", name: "ショルダープレス", hasVideo: true },
      { id: "19", name: "サイドレイズ", hasVideo: true },
      { id: "20", name: "リアレイズ", hasVideo: false },
      { id: "21", name: "フロントレイズ", hasVideo: false },
      { id: "22", name: "アップライトロー", hasVideo: true },
    ]
  },
  {
    id: "cardio",
    name: "有酸素",
    color: "bg-pink-600",
    showAll: false,
    exercises: [
      { id: "23", name: "ランニング", hasVideo: false },
      { id: "24", name: "サイクリング", hasVideo: false },
      { id: "25", name: "エリプティカル", hasVideo: false },
      { id: "26", name: "ローイング", hasVideo: true },
      { id: "27", name: "ウォーキング", hasVideo: false },
    ]
  }
]

export default function RecordScreen() {
  const { user } = useAuth()
  const { startWorkoutTimer, setTimer } = usePWA()
  const {
    isWorkoutActive,
    workoutStartTime,
    currentWorkout,
    workoutDuration,
    startWorkout: startWorkoutContext,
    finishWorkout: finishWorkoutContext,
    addExerciseToWorkout,
    updateSet,
    addSet,
    removeSet
  } = useWorkout()
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState<string | null>(null)
  const [newGroupForm, setNewGroupForm] = useState({ name: "", color: "bg-gray-600" })
  const [newExerciseForm, setNewExerciseForm] = useState({ name: "", hasVideo: false })
  const [showPostDialog, setShowPostDialog] = useState(false)
  const [postComment, setPostComment] = useState("")
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [posting, setPosting] = useState(false)
  const [rpe, setRpe] = useState<number>(5) // RPE初期値を5に設定
  const [rpePublic, setRpePublic] = useState<boolean>(false) // デフォルトは非公開
  const [showTimerDialog, setShowTimerDialog] = useState(false)
  const [newPRs, setNewPRs] = useState<PRRecord[]>([])
  const [showPRCelebration, setShowPRCelebration] = useState(false)
  const [showPRRecommendation, setShowPRRecommendation] = useState(false)
  
  // 記録モード関連の状態
  const [recordMode, setRecordMode] = useState<RecordMode>('live')
  const [manualTimeInput, setManualTimeInput] = useState<ManualTimeInput>({
    startTime: '',
    endTime: ''
  })
  const [recordDate, setRecordDate] = useState<string>('')
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState<number>(0)
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState<Date>(new Date())

  // 初期化：デフォルトでライブ記録モードに設定
  useEffect(() => {
    setRecordMode('live')
    setRecordDate('')
    setManualTimeInput({ startTime: '', endTime: '' })
    
    // 他のタブから戻ってきた場合（セッションストレージから判定）、今月にリセット
    const hasLeftRecord = sessionStorage.getItem('hasLeftRecordTab') === 'true'
    if (hasLeftRecord) {
      setSelectedCalendarMonth(new Date())
      sessionStorage.removeItem('hasLeftRecordTab')
    }
  }, [])
  
  // コンポーネントがアンマウントされる時（他のタブに移動時）を記録
  useEffect(() => {
    return () => {
      sessionStorage.setItem('hasLeftRecordTab', 'true')
    }
  }, [])

  // ワークアウト状態の変化を監視して適切にタイマーを制御
  const [prevWorkoutActive, setPrevWorkoutActive] = useState(isWorkoutActive)
  
  useEffect(() => {
    // ワークアウトが終了した場合（アクティブ→非アクティブ）のみタイマーを閉じる
    if (prevWorkoutActive && !isWorkoutActive) {
      setShowTimerDialog(false)
    }
    setPrevWorkoutActive(isWorkoutActive)
  }, [isWorkoutActive, prevWorkoutActive])

  // Load muscle groups from localStorage or use defaults
  useEffect(() => {
    const savedGroups = localStorage.getItem('muscleGroups')
    if (savedGroups) {
      setMuscleGroups(JSON.parse(savedGroups))
    } else {
      setMuscleGroups(defaultMuscleGroups)
      localStorage.setItem('muscleGroups', JSON.stringify(defaultMuscleGroups))
    }
    setLoadingGroups(false)
  }, [])

  // Save to localStorage whenever muscle groups change
  const saveMuscleGroups = (groups: MuscleGroup[]) => {
    setMuscleGroups(groups)
    localStorage.setItem('muscleGroups', JSON.stringify(groups))
  }


  // Calculate 1RM using Epley formula: weight * (1 + reps/30)
  const calculate1RM = (weight: number, reps: number): number => {
    if (weight <= 0 || reps <= 0) return 0
    return Math.round(weight * (1 + reps / 30))
  }

  const toggleMuscleGroup = (groupId: string) => {
    const updatedGroups = muscleGroups.map(group => 
      group.id === groupId 
        ? { ...group, showAll: !group.showAll }
        : group
    )
    saveMuscleGroups(updatedGroups)
  }

  const addMuscleGroup = () => {
    if (!newGroupForm.name.trim()) return
    
    const newGroup: MuscleGroup = {
      id: Date.now().toString(),
      name: newGroupForm.name,
      color: newGroupForm.color,
      showAll: false,
      exercises: []
    }
    
    saveMuscleGroups([...muscleGroups, newGroup])
    setNewGroupForm({ name: "", color: "bg-gray-600" })
    setShowAddGroup(false)
  }

  const addExercise = (groupId: string) => {
    if (!newExerciseForm.name.trim()) return
    
    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: newExerciseForm.name,
      hasVideo: newExerciseForm.hasVideo
    }
    
    const updatedGroups = muscleGroups.map(group =>
      group.id === groupId
        ? { ...group, exercises: [...group.exercises, newExercise] }
        : group
    )
    
    saveMuscleGroups(updatedGroups)
    setNewExerciseForm({ name: "", hasVideo: false })
    setShowAddExercise(null)
  }

  // 手動記録モード用のヘルパー関数
  const calculateManualDuration = (): number => {
    if (!manualTimeInput.startTime || !manualTimeInput.endTime) return 0
    
    const startTime = new Date(`2000-01-01T${manualTimeInput.startTime}:00`)
    const endTime = new Date(`2000-01-01T${manualTimeInput.endTime}:00`)
    
    const diffMs = endTime.getTime() - startTime.getTime()
    return Math.max(0, Math.round(diffMs / 60000)) // 分単位
  }

  const isValidManualTime = (): boolean => {
    if (!manualTimeInput.startTime || !manualTimeInput.endTime) return false
    
    const startTime = new Date(`2000-01-01T${manualTimeInput.startTime}:00`)
    const endTime = new Date(`2000-01-01T${manualTimeInput.endTime}:00`)
    
    return endTime >= startTime
  }

  const startWorkout = () => {
    // アナリティクス追跡
    trackWorkoutEvent.start(recordMode)
    
    if (recordMode === 'manual') {
      // 手動記録モードでは即座にワークアウトを開始
      startWorkoutContext()
    } else {
      // ライブ記録モードでは通常通りタイマーを開始
      startWorkoutContext()
      if (workoutStartTime) {
        startWorkoutTimer(workoutStartTime.getTime())
      }
    }
  }

  const handleAddExerciseToWorkout = (exercise: Exercise) => {
    // アナリティクス追跡
    trackWorkoutEvent.exerciseAdded(exercise.name)
    
    addExerciseToWorkout(exercise.id, exercise.name, exercise.lastPerformed)
  }

  // カレンダー日付クリック時のナビゲーション処理
  const handleCalendarNavigation = (clickedDate: Date, isToday: boolean) => {
    // ローカルタイムゾーンを考慮した日付文字列を生成
    const dateStr = format(clickedDate, 'yyyy-MM-dd')
    
    // クリックした日付の月を保存（記録完了後もこの月を維持）
    setSelectedCalendarMonth(clickedDate)
    
    console.log('Calendar navigation:', {
      clickedDate,
      dateStr,
      isToday,
      clickedDateString: format(clickedDate, 'yyyy-MM-dd HH:mm:ss')
    })
    
    if (isToday) {
      // 今日をクリックした場合はライブ記録モード
      setRecordMode('live')
      setRecordDate('')
      setManualTimeInput({ startTime: '', endTime: '' })
    } else {
      // 過去の日付をクリックした場合は手動記録モード
      setRecordMode('manual')
      setRecordDate(dateStr)
      
      // 現在の時刻を初期値として設定
      const now = new Date()
      const currentTime = now.toTimeString().slice(0, 5) // HH:MM形式
      setManualTimeInput({
        startTime: currentTime,
        endTime: currentTime
      })
      
      // 手動記録モードの場合は即座にワークアウトを開始
      if (!isWorkoutActive) {
        startWorkoutContext()
      }
    }
  }



  const finishWorkout = () => {
    // 完了時にタイマーダイアログを閉じる
    setShowTimerDialog(false)
    
    if (currentWorkout.length > 0) {
      setShowPostDialog(true)
    } else {
      finishWorkoutContext()
    }
  }

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    try {
      files.forEach(file => validateImageFile(file))
      setSelectedPhotos(prev => [...prev, ...files].slice(0, 4)) // Max 4 photos
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index))
  }


  const calculateWorkoutPRs = async (): Promise<PRRecord[]> => {
    if (!user || !workoutStartTime) return []

    const prs: PRRecord[] = []
    const workoutId = Date.now().toString()

    // Calculate session volume PR
    const sessionVolume = calculateSessionVolume(currentWorkout)
    const latestVolumePR = await getLatestPRForExercise(user.uid, 'session', 'session_volume')
    
    if (!latestVolumePR || sessionVolume > latestVolumePR.value) {
      const improvement = latestVolumePR ? calculateImprovement(sessionVolume, latestVolumePR.value) : 0
      const prRecord: PRRecord = {
        id: `${workoutId}_session_volume`,
        userId: user.uid,
        exerciseName: 'session',
        prType: 'session_volume',
        value: sessionVolume,
        date: new Date(),
        workoutId,
        improvement
      }
      
      // Only add previousBest if it exists
      if (latestVolumePR?.value !== undefined) {
        prRecord.previousBest = latestVolumePR.value
      }
      
      prs.push(prRecord)
    }

    // Calculate exercise-specific PRs
    for (const workout of currentWorkout) {
      const { exerciseId, exerciseName, sets } = workout
      
      // e1RM PR
      const bestE1RMSet = findBestE1RMSet(sets)
      if (bestE1RMSet) {
        const latestE1RMPR = await getLatestPRForExercise(user.uid, exerciseName, 'e1RM')
        
        if (!latestE1RMPR || bestE1RMSet.e1rm > latestE1RMPR.value) {
          const improvement = latestE1RMPR ? calculateImprovement(bestE1RMSet.e1rm, latestE1RMPR.value) : 0
          const prRecord: PRRecord = {
            id: `${workoutId}_${exerciseId}_e1rm`,
            userId: user.uid,
            exerciseName,
            prType: 'e1RM',
            value: bestE1RMSet.e1rm,
            weight: bestE1RMSet.set.weight,
            reps: bestE1RMSet.set.reps,
            date: new Date(),
            workoutId,
            improvement
          }
          
          // Only add previousBest if it exists
          if (latestE1RMPR?.value !== undefined) {
            prRecord.previousBest = latestE1RMPR.value
          }
          
          prs.push(prRecord)
        }
      }

      // Weight x Reps PR
      const bestWeightReps = findBestWeightReps(sets)
      if (bestWeightReps) {
        const latestWeightRepsPR = await getLatestPRForExercise(user.uid, exerciseName, 'weight_reps')
        
        if (!latestWeightRepsPR || bestWeightReps.value > latestWeightRepsPR.value) {
          const improvement = latestWeightRepsPR ? calculateImprovement(bestWeightReps.value, latestWeightRepsPR.value) : 0
          const prRecord: PRRecord = {
            id: `${workoutId}_${exerciseId}_weight_reps`,
            userId: user.uid,
            exerciseName,
            prType: 'weight_reps',
            value: bestWeightReps.value,
            weight: bestWeightReps.set.weight,
            reps: bestWeightReps.set.reps,
            date: new Date(),
            workoutId,
            improvement
          }
          
          // Only add previousBest if it exists
          if (latestWeightRepsPR?.value !== undefined) {
            prRecord.previousBest = latestWeightRepsPR.value
          }
          
          prs.push(prRecord)
        }
      }

      // Rep-specific PRs (3RM, 5RM, 8RM)
      for (const targetReps of [3, 5, 8]) {
        const repPR = findBestRepSpecificPR(sets, targetReps)
        if (repPR) {
          const prType = `${targetReps}RM` as PRRecord['prType']
          const latestRepPR = await getLatestPRForExercise(user.uid, exerciseName, prType)
          
          if (!latestRepPR || repPR.weight > latestRepPR.value) {
            const improvement = latestRepPR ? calculateImprovement(repPR.weight, latestRepPR.value) : 0
            const prRecord: PRRecord = {
              id: `${workoutId}_${exerciseId}_${targetReps}rm`,
              userId: user.uid,
              exerciseName,
              prType,
              value: repPR.weight,
              weight: repPR.weight,
              reps: targetReps,
              date: new Date(),
              workoutId,
              improvement
            }
            
            // Only add previousBest if it exists
            if (latestRepPR?.value !== undefined) {
              prRecord.previousBest = latestRepPR.value
            }
            
            prs.push(prRecord)
          }
        }
      }
    }

    return prs
  }

  const handlePostWorkout = async () => {
    if (!user || currentWorkout.length === 0) return

    setPosting(true)

    try {
      // Calculate PRs before posting
      const calculatedPRs = await calculateWorkoutPRs()
      setNewPRs(calculatedPRs)
      
      let photoUrls: string[] = []

      // Upload photos if any
      if (selectedPhotos.length > 0) {
        const compressedPhotos = await Promise.all(
          selectedPhotos.map(photo => compressImage(photo))
        )
        photoUrls = await uploadMultipleImages(compressedPhotos, 'workout-photos')
      }

      // Calculate workout duration based on mode
      const duration = recordMode === 'manual' 
        ? calculateManualDuration()
        : workoutStartTime 
          ? Math.round((new Date().getTime() - workoutStartTime.getTime()) / 60000) // in minutes
          : 0

      // Create post data with appropriate date
      const postDate = recordMode === 'manual' && recordDate 
        ? (() => {
            // 手動記録の場合：ローカル時間で指定日の12:00に設定
            const [year, month, day] = recordDate.split('-').map(Number)
            const localDate = new Date(year, month - 1, day, 12, 0, 0)
            return Timestamp.fromDate(localDate)
          })()
        : Timestamp.fromDate(new Date()) // ライブ記録の場合は現在時刻

      const postData = {
        userId: user.uid,
        exercises: currentWorkout.map(entry => ({
          id: entry.exerciseId,
          name: entry.exerciseName,
          sets: entry.sets
        })),
        comment: postComment,
        photos: photoUrls,
        duration,
        likes: 0,
        likedBy: [],
        comments: 0,
        isPublic: true,
        rpe: rpe, // RPE値を追加
        rpePublic: rpePublic, // RPE公開設定を追加
        createdAt: postDate, // 手動記録の場合は指定した日付を設定
        recordMode: recordMode, // 記録モードも保存
        recordDate: recordDate || format(new Date(), 'yyyy-MM-dd') // 記録対象日
      }

      console.log('Creating post with data:', {
        recordMode,
        recordDate,
        createdAt: postData.createdAt,
        createdAtDate: postData.createdAt.toDate(),
        localDateString: format(postData.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss')
      })
      
      const postRef = await createPost(postData)
      
      // Save PRs to Firestore
      await Promise.all(
        calculatedPRs.map(pr => 
          savePR({ ...pr, workoutId: postRef.id })
        )
      )
      
      // アナリティクス追跡 - ワークアウト完了
      const exerciseCount = currentWorkout.length
      const totalSets = currentWorkout.reduce((sum, entry) => sum + entry.sets.length, 0)
      trackWorkoutEvent.complete(duration, exerciseCount, totalSets)
      
      // アナリティクス追跡 - 投稿
      trackWorkoutEvent.post(selectedPhotos.length > 0, postComment.length)
      
      // PRイベント追跡
      calculatedPRs.forEach(pr => {
        trackWorkoutEvent.prAchieved(pr.exerciseName, pr.prType, pr.improvement || 0)
      })
      
      // コンバージョン追跡
      if (calculatedPRs.length > 0) {
        trackConversion('first_pr')
      }
      
      if (calculatedPRs.length > 0) {
        setShowPRCelebration(true)
        // Show recommendation modal after celebration
        setTimeout(() => {
          setShowPRRecommendation(true)
        }, 3000)
        toast.success(`ワークアウトを投稿しました！${calculatedPRs.length}件のPR達成！`)
      } else {
        toast.success("ワークアウトを投稿しました！")
      }
      
      // Reset state and mode
      finishWorkoutContext()
      setShowPostDialog(false)
      setShowTimerDialog(false)
      setPostComment("")
      setSelectedPhotos([])
      setRpe(5) // RPEを初期値に戻す
      setRpePublic(false) // RPE公開設定をリセット
      
      // Force reset timer dialog state - ensure it's truly closed
      setTimeout(() => {
        setShowTimerDialog(false)
      }, 100)
      
      // カレンダーを更新（新しい記録を反映）
      setCalendarRefreshTrigger(Date.now())
      
      // 記録モードをリセット（手動モードの場合はライブモードに戻る）
      if (recordMode === 'manual') {
        setRecordMode('live')
        setRecordDate('')
        setManualTimeInput({ startTime: '', endTime: '' })
        // 注意：selectedCalendarMonth は維持する（月を保持）
      }

    } catch (error) {
      console.error('Error posting workout:', error)
      toast.error("投稿に失敗しました")
    } finally {
      setPosting(false)
    }
  }

  // Debug: Add console.log to help locate the issue
  console.log('About to check isWorkoutActive:', isWorkoutActive)

  if (isWorkoutActive) {
    return (
      <div className="max-w-2xl mx-auto p-4 pb-24">
        {/* ヘッダー部分 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">ワークアウト中</h2>
              {recordMode === 'manual' && recordDate && (
                <p className="text-sm text-gray-600 mt-1">
                  記録日: {recordDate}
                </p>
              )}
            </div>
            <Button 
              onClick={finishWorkout} 
              disabled={recordMode === 'manual' && !isValidManualTime()}
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 shrink-0"
            >
              完了
            </Button>
          </div>

          {/* タイマー・時間入力部分を分離 */}
          <div className="bg-gray-50 rounded-lg p-4">
            {recordMode === 'live' ? (
              // ライブ記録モード: ストップウォッチ表示
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-red-600">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium font-mono text-lg">{workoutDuration}</span>
                </div>
                <Button 
                  onClick={() => setShowTimerDialog(true)} 
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Clock className="w-4 h-4 mr-1" />
                  タイマー
                </Button>
              </div>
            ) : (
              // 手動記録モード: 時間入力フォーム
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="startTime" className="text-sm text-gray-600 w-12">開始:</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={manualTimeInput.startTime}
                      onChange={(e) => setManualTimeInput(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-32"
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="endTime" className="text-sm text-gray-600 w-12">終了:</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={manualTimeInput.endTime}
                      onChange={(e) => setManualTimeInput(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-32"
                      size="sm"
                    />
                  </div>
                  {isValidManualTime() && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium text-sm">{calculateManualDuration()}分</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={() => setShowTimerDialog(true)} 
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    タイマー
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {currentWorkout.map((entry, index) => (
            <Card key={entry.exerciseId} className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{entry.exerciseName}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSet(entry.exerciseId)}
                  >
                    セット追加
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {entry.sets.map((set, setIndex) => {
                    const e1rm = calculateE1RM(set.weight, set.reps)
                    return (
                      <div key={setIndex} className="flex flex-col sm:flex-row gap-2 p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <span className="w-8 text-sm text-gray-500 shrink-0">#{setIndex + 1}</span>
                          <div className="flex items-center space-x-1">
                            <Input
                              type="number"
                              placeholder="重量"
                              value={set.weight || ''}
                              onChange={(e) => updateSet(entry.exerciseId, setIndex, 'weight', Number(e.target.value))}
                              className="w-16 text-sm"
                              size="sm"
                            />
                            <span className="text-xs text-gray-500">kg</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Input
                              type="number"
                              placeholder="回数"
                              value={set.reps || ''}
                              onChange={(e) => updateSet(entry.exerciseId, setIndex, 'reps', Number(e.target.value))}
                              className="w-16 text-sm"
                              size="sm"
                            />
                            <span className="text-xs text-gray-500">回</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0">
                          {e1rm > 0 && (
                            <div className="flex items-center space-x-1 text-xs text-purple-600">
                              <span>e1RM:</span>
                              <span className="font-medium">{e1rm.toFixed(1)}kg</span>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSet(entry.exerciseId, setIndex)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Exercise Selection */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">種目を追加</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAddGroup(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              部位追加
            </Button>
          </div>
          
          {/* Add Group Dialog */}
          {showAddGroup && (
            <Card className="mb-4 border-2 border-red-200">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Input
                    placeholder="部位名を入力..."
                    value={newGroupForm.name}
                    onChange={(e) => setNewGroupForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">色:</span>
                    {['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-pink-600', 'bg-gray-600'].map((color) => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded-full ${color} ${newGroupForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                        onClick={() => setNewGroupForm(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={addMuscleGroup} size="sm">追加</Button>
                    <Button variant="outline" onClick={() => setShowAddGroup(false)} size="sm">キャンセル</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="grid grid-cols-1 gap-4">
            {muscleGroups.map((group) => (
              <Card key={group.id} className="border border-gray-100">
                <CardContent className="p-4">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleMuscleGroup(group.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${group.color}`} />
                      <span className="font-medium text-gray-900">{group.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowAddExercise(group.id)
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Add Exercise Dialog */}
                  {showAddExercise === group.id && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="space-y-2">
                        <Input
                          placeholder="種目名を入力..."
                          value={newExerciseForm.name}
                          onChange={(e) => setNewExerciseForm(prev => ({ ...prev, name: e.target.value }))}
                          size="sm"
                        />
                        <div className="flex space-x-2">
                          <Button onClick={() => addExercise(group.id)} size="sm">追加</Button>
                          <Button variant="outline" onClick={() => setShowAddExercise(null)} size="sm">キャンセル</Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {group.showAll && (
                    <div className="mt-4 space-y-2">
                      {group.exercises.map((exercise) => (
                        <Button
                          key={exercise.id}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleAddExerciseToWorkout(exercise)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {exercise.name}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Post Workout Dialog */}
        <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
          <DialogContent className="max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>ワークアウトを投稿</DialogTitle>
              <DialogDescription>
                今回のワークアウト記録をコミュニティに投稿します
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="comment">コメント</Label>
                <Textarea
                  id="comment"
                  placeholder="今日のワークアウトはどうでしたか？"
                  value={postComment}
                  onChange={(e) => setPostComment(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>写真を追加</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="photo-upload"
                    max="4"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    className="w-full"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    写真を選択 ({selectedPhotos.length}/4)
                  </Button>
                </div>

                {selectedPhotos.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {selectedPhotos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Selected photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => removePhoto(index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RPE入力欄 */}
              <div>
                <Label htmlFor="rpe">今日のワークアウトのキツさはどれくらいでしたか？（RPE）</Label>
                <div className="mt-2 space-y-3">
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                      <Button
                        key={value}
                        type="button"
                        variant={rpe === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRpe(value)}
                        className={`h-10 ${rpe === value ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300'}`}
                      >
                        {value}
                      </Button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1-3: とても楽</span>
                    <span className="font-semibold text-gray-900">RPE: {rpe}</span>
                    <span>8-10: 限界</span>
                  </div>
                </div>
              </div>

              {/* RPE公開設定 */}
              <div className="flex items-center justify-between">
                <Label htmlFor="rpe-public" className="text-sm">
                  RPEを公開する
                </Label>
                <Switch
                  id="rpe-public"
                  checked={rpePublic}
                  onCheckedChange={setRpePublic}
                />
              </div>
            </div>

            <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPostDialog(false)}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handlePostWorkout}
                  disabled={posting}
                  variant="outline"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                >
                  {posting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      投稿
                    </>
                  )}
                </Button>
              </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (loadingGroups) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">ワークアウト記録</h2>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {recordMode === 'manual' && (
                <Badge variant="secondary" className="text-xs">
                  📝 手動記録
                </Badge>
              )}
              {recordMode === 'manual' && recordDate && (
                <span className="text-sm text-gray-600">対象日: {recordDate}</span>
              )}
            </div>
          </div>
          <Button 
            onClick={startWorkout} 
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 shrink-0"
          >
            <Play className="mr-2 h-4 w-4" />
            開始
          </Button>
        </div>
        
        {/* 追加ボタンを分離 */}
        <div className="flex justify-center">
          <Button 
            variant="outline"
            onClick={() => setShowAddGroup(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            部位追加
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="text-center text-gray-600 mb-4">
          習慣の可視化とモチベーション強化のために、あなたのワークアウト履歴をカレンダーで確認しましょう。
        </div>
        <WorkoutCalendar 
          onNavigateToRecord={handleCalendarNavigation}
          refreshTrigger={calendarRefreshTrigger}
          selectedMonth={selectedCalendarMonth}
          onMonthChange={setSelectedCalendarMonth}
        />
      </div>
      
      {/* Add Group Dialog */}
      {showAddGroup && (
        <Card className="mb-4 border-2 border-red-200">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Input
                placeholder="部位名を入力..."
                value={newGroupForm.name}
                onChange={(e) => setNewGroupForm(prev => ({ ...prev, name: e.target.value }))}
              />
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">色:</span>
                {['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-pink-600', 'bg-gray-600'].map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded-full ${color} ${newGroupForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                    onClick={() => setNewGroupForm(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
              <div className="flex space-x-2">
                <Button onClick={addMuscleGroup} size="sm">追加</Button>
                <Button variant="outline" onClick={() => setShowAddGroup(false)} size="sm">キャンセル</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {muscleGroups.map((group) => (
          <Card key={group.id} className="border border-gray-100 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleMuscleGroup(group.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${group.color}`} />
                  <div>
                    <h3 className="font-medium text-gray-900">{group.name}</h3>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {group.exercises.length}種目
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAddExercise(group.id)
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Add Exercise Dialog */}
              {showAddExercise === group.id && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <Input
                      placeholder="種目名を入力..."
                      value={newExerciseForm.name}
                      onChange={(e) => setNewExerciseForm(prev => ({ ...prev, name: e.target.value }))}
                      size="sm"
                    />
                    <div className="flex space-x-2">
                      <Button onClick={() => addExercise(group.id)} size="sm">追加</Button>
                      <Button variant="outline" onClick={() => setShowAddExercise(null)} size="sm">キャンセル</Button>
                    </div>
                  </div>
                </div>
              )}
              
              {group.showAll && (
                <div className="mt-4 space-y-2">
                  {group.exercises.map((exercise) => (
                    <div key={exercise.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{exercise.name}</p>
                      </div>
                      {exercise.hasVideo && (
                        <Badge variant="secondary" className="text-xs">
                          動画あり
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <TimerDialog 
        isOpen={showTimerDialog} 
        onOpenChange={setShowTimerDialog} 
      />

      {/* PR Celebration Dialog */}
      <Dialog open={showPRCelebration} onOpenChange={setShowPRCelebration}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              PR達成！
            </DialogTitle>
            <DialogDescription className="text-center">
              おめでとうございます！新しい個人記録を達成しました
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center text-gray-600 mb-4">
              {newPRs.length}件の新記録を達成しました！
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {newPRs.map((pr) => {
                const badgeInfo = getPRBadgeInfo(pr.prType, pr.improvement || 0)
                return (
                  <div key={pr.id} className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">{pr.exerciseName}</span>
                          <Badge className={`text-xs ${badgeInfo.color}`}>
                            {badgeInfo.text}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {pr.prType === 'e1RM' && `e1RM: ${pr.value.toFixed(2)}kg`}
                          {pr.prType === 'weight_reps' && `${pr.weight}kg × ${pr.reps}回`}
                          {pr.prType === 'session_volume' && `総重量: ${(pr.value / 1000).toFixed(1)}t`}
                          {['3RM', '5RM', '8RM'].includes(pr.prType) && `${pr.weight}kg`}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="flex justify-center pt-4">
              <Button 
                onClick={() => setShowPRCelebration(false)}
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                続ける
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PR Recommendation Modal */}
      <PRRecommendationModal
        isOpen={showPRRecommendation}
        onOpenChange={setShowPRRecommendation}
        prs={newPRs}
      />
    </div>
  )
}