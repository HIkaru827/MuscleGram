"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Plus, Edit, Play, Home, BarChart3, Scale, ShoppingBag, Clock, Camera, Send, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { createPost } from "@/lib/firestore"
import { uploadMultipleImages, validateImageFile, compressImage } from "@/lib/storage"
import { toast } from "sonner"
import { usePWA } from "@/hooks/usePWA"
import TimerDialog from "./timer-dialog"

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

interface WorkoutEntry {
  exerciseId: string
  exerciseName: string
  sets: Array<{
    weight: number
    reps: number
  }>
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
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState<string | null>(null)
  const [newGroupForm, setNewGroupForm] = useState({ name: "", color: "bg-gray-600" })
  const [newExerciseForm, setNewExerciseForm] = useState({ name: "", hasVideo: false })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutEntry[]>([])
  const [isWorkoutActive, setIsWorkoutActive] = useState(false)
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null)
  const [showPostDialog, setShowPostDialog] = useState(false)
  const [postComment, setPostComment] = useState("")
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [posting, setPosting] = useState(false)
  const [showTimerDialog, setShowTimerDialog] = useState(false)

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

  // Update current time every second when workout is active
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isWorkoutActive) {
      interval = setInterval(() => {
        setCurrentTime(new Date())
      }, 1000)
    }
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isWorkoutActive])

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

  const startWorkout = () => {
    const now = new Date()
    setIsWorkoutActive(true)
    setWorkoutStartTime(now)
    setCurrentWorkout([])
    startWorkoutTimer(now.getTime())
  }

  const addExerciseToWorkout = (exercise: Exercise) => {
    const existingEntry = currentWorkout.find(entry => entry.exerciseId === exercise.id)
    
    if (!existingEntry) {
      const newEntry: WorkoutEntry = {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: [{ weight: exercise.lastPerformed?.weight || 0, reps: exercise.lastPerformed?.reps || 0 }]
      }
      setCurrentWorkout(prev => [...prev, newEntry])
    }
  }

  const updateSet = (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: number) => {
    setCurrentWorkout(prev =>
      prev.map(entry =>
        entry.exerciseId === exerciseId
          ? {
              ...entry,
              sets: entry.sets.map((set, index) =>
                index === setIndex ? { ...set, [field]: value } : set
              )
            }
          : entry
      )
    )
  }

  const addSet = (exerciseId: string) => {
    setCurrentWorkout(prev =>
      prev.map(entry =>
        entry.exerciseId === exerciseId
          ? {
              ...entry,
              sets: [...entry.sets, { weight: entry.sets[entry.sets.length - 1]?.weight || 0, reps: entry.sets[entry.sets.length - 1]?.reps || 0 }]
            }
          : entry
      )
    )
  }

  const finishWorkout = () => {
    if (currentWorkout.length > 0) {
      setShowPostDialog(true)
    } else {
      setIsWorkoutActive(false)
      setWorkoutStartTime(null)
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

  const removeSet = (exerciseId: string, setIndex: number) => {
    setCurrentWorkout(prev =>
      prev.map(entry =>
        entry.exerciseId === exerciseId
          ? {
              ...entry,
              sets: entry.sets.filter((_, index) => index !== setIndex)
            }
          : entry
      ).filter(entry => entry.sets.length > 0) // Remove exercise if no sets remain
    )
  }

  const handlePostWorkout = async () => {
    if (!user || currentWorkout.length === 0) return

    setPosting(true)

    try {
      let photoUrls: string[] = []

      // Upload photos if any
      if (selectedPhotos.length > 0) {
        const compressedPhotos = await Promise.all(
          selectedPhotos.map(photo => compressImage(photo))
        )
        photoUrls = await uploadMultipleImages(compressedPhotos, 'workout-photos')
      }

      // Calculate workout duration
      const duration = workoutStartTime 
        ? Math.round((new Date().getTime() - workoutStartTime.getTime()) / 60000) // in minutes
        : 0

      // Create post data
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
        isPublic: true
      }

      await createPost(postData)
      
      toast.success("ワークアウトを投稿しました！")
      
      // Reset state
      setCurrentWorkout([])
      setIsWorkoutActive(false)
      setWorkoutStartTime(null)
      setShowPostDialog(false)
      setPostComment("")
      setSelectedPhotos([])

    } catch (error) {
      console.error('Error posting workout:', error)
      toast.error("投稿に失敗しました")
    } finally {
      setPosting(false)
    }
  }

  if (isWorkoutActive) {
    const workoutDurationMs = workoutStartTime 
      ? currentTime.getTime() - workoutStartTime.getTime()
      : 0
    const workoutMinutes = Math.floor(workoutDurationMs / 60000)
    const workoutSeconds = Math.floor((workoutDurationMs % 60000) / 1000)
    const workoutDurationFormatted = `${workoutMinutes.toString().padStart(2, '0')}:${workoutSeconds.toString().padStart(2, '0')}`

    return (
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">ワークアウト中</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-red-600">
              <Clock className="w-5 h-5" />
              <span className="font-medium font-mono text-lg">{workoutDurationFormatted}</span>
            </div>
            <Button 
              onClick={() => setShowTimerDialog(true)} 
              variant="outline"
              size="sm"
            >
              <Clock className="w-4 h-4 mr-1" />
              タイマー
            </Button>
            <Button onClick={finishWorkout} className="bg-red-600 hover:bg-red-700">
              完了
            </Button>
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
                    const oneRM = calculate1RM(set.weight, set.reps)
                    return (
                      <div key={setIndex} className="flex items-center space-x-2">
                        <span className="w-8 text-sm text-gray-500">#{setIndex + 1}</span>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            placeholder="重量"
                            value={set.weight || ''}
                            onChange={(e) => updateSet(entry.exerciseId, setIndex, 'weight', Number(e.target.value))}
                            className="w-20"
                          />
                          <span className="text-sm text-gray-500">kg</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            placeholder="回数"
                            value={set.reps || ''}
                            onChange={(e) => updateSet(entry.exerciseId, setIndex, 'reps', Number(e.target.value))}
                            className="w-20"
                          />
                          <span className="text-sm text-gray-500">回</span>
                        </div>
                        {oneRM > 0 && (
                          <div className="flex items-center space-x-1 text-xs text-blue-600">
                            <span>1RM:</span>
                            <span className="font-medium">{oneRM}kg</span>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSet(entry.exerciseId, setIndex)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
                          onClick={() => addExerciseToWorkout(exercise)}
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
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {posting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      投稿
                    </>
                  )}
                </Button>
              </div>
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">ワークアウト記録</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => setShowAddGroup(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            部位追加
          </Button>
          <Button onClick={startWorkout} className="bg-red-600 hover:bg-red-700">
            <Play className="mr-2 h-4 w-4" />
            開始
          </Button>
        </div>
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
                    {group.lastWorkout && (
                      <p className="text-sm text-gray-500">{group.lastWorkout}</p>
                    )}
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
                        {exercise.lastPerformed && (
                          <p className="text-sm text-gray-500">
                            前回: {exercise.lastPerformed.weight}kg × {exercise.lastPerformed.reps}回
                          </p>
                        )}
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
    </div>
  )
}