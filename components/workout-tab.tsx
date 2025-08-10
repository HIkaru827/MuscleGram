"use client"

import { useState } from "react"
import { Plus, Camera, Save, TrendingUp, ArrowLeft, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

const muscleGroups = [
  {
    id: "chest",
    name: "胸",
    color: "bg-red-100 text-red-700 border-red-200",
    exercises: ["ベンチプレス", "インクラインプレス", "ダンベルフライ", "ペックフライ", "プッシュアップ", "ディップス"],
  },
  {
    id: "back",
    name: "背中",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    exercises: ["デッドリフト", "ラットプルダウン", "ベントオーバーロー", "チンアップ", "シーテッドロー", "プルアップ"],
  },
  {
    id: "legs",
    name: "脚",
    color: "bg-green-100 text-green-700 border-green-200",
    exercises: [
      "スクワット",
      "レッグプレス",
      "ルーマニアンデッドリフト",
      "レッグカール",
      "レッグエクステンション",
      "カーフレイズ",
    ],
  },
  {
    id: "shoulders",
    name: "肩",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    exercises: [
      "ショルダープレス",
      "サイドレイズ",
      "リアデルトフライ",
      "アップライトロー",
      "フロントレイズ",
      "シュラッグ",
    ],
  },
  {
    id: "arms",
    name: "腕",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    exercises: [
      "バーベルカール",
      "アームカール",
      "ハンマーカール",
      "トライセップスエクステンション",
      "ディップス",
      "クローズグリップベンチプレス",
    ],
  },
  {
    id: "abs",
    name: "腹筋",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    exercises: [
      "プランク",
      "クランチ",
      "レッグレイズ",
      "ロシアンツイスト",
      "マウンテンクライマー",
      "バイシクルクランチ",
    ],
  },
  {
    id: "cardio",
    name: "有酸素",
    color: "bg-pink-100 text-pink-700 border-pink-200",
    exercises: ["ランニング", "サイクリング", "エリプティカル", "ローイング", "ステップアップ", "バーピー"],
  },
]

interface WorkoutSet {
  weight: number
  reps: number
  completed: boolean
}

interface Exercise {
  name: string
  sets: WorkoutSet[]
  previousRecord?: {
    weight: number
    reps: number
    date: string
  }
}

export default function WorkoutTab() {
  const [currentView, setCurrentView] = useState<"start" | "muscle-select" | "exercise-select" | "recording">("start")
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null)
  const [currentWorkout, setCurrentWorkout] = useState<Exercise[]>([])
  const [workoutNotes, setWorkoutNotes] = useState("")

  const today = new Date()
  const todayString = today.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })

  const addExercise = (exerciseName: string) => {
    const newExercise: Exercise = {
      name: exerciseName,
      sets: [{ weight: 0, reps: 0, completed: false }],
      previousRecord: {
        weight: 80,
        reps: 10,
        date: "2024-01-08",
      },
    }
    setCurrentWorkout([...currentWorkout, newExercise])
    setCurrentView("recording")
  }

  const addSet = (exerciseIndex: number) => {
    const updatedWorkout = [...currentWorkout]
    updatedWorkout[exerciseIndex].sets.push({ weight: 0, reps: 0, completed: false })
    setCurrentWorkout(updatedWorkout)
  }

  const updateSet = (exerciseIndex: number, setIndex: number, field: "weight" | "reps", value: number) => {
    const updatedWorkout = [...currentWorkout]
    updatedWorkout[exerciseIndex].sets[setIndex][field] = value
    setCurrentWorkout(updatedWorkout)
  }

  const calculate1RM = (weight: number, reps: number) => {
    if (weight === 0 || reps === 0) return 0
    return Math.round((weight * reps) / 40 + weight)
  }

  const resetWorkout = () => {
    setCurrentView("start")
    setSelectedMuscleGroup(null)
    setCurrentWorkout([])
    setWorkoutNotes("")
  }

  // Start View
  if (currentView === "start") {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-red-600 mr-2" />
            <h2 className="text-xl font-bold">ワークアウト記録</h2>
          </div>
          <p className="text-lg text-gray-700 mb-2">{todayString}</p>
          <p className="text-sm text-gray-500">今日のトレーニングを記録しましょう</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <Button
              onClick={() => setCurrentView("muscle-select")}
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-lg"
            >
              記録を開始
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-gradient-to-r from-red-50 to-red-100">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-red-600" />
              今週の記録
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-red-600">3</div>
                <div className="text-sm text-gray-600">ワークアウト</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">12</div>
                <div className="text-sm text-gray-600">種目</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Muscle Group Selection
  if (currentView === "muscle-select") {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => setCurrentView("start")} className="mr-2 p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold">部位を選択</h2>
        </div>

        <div className="space-y-3">
          {muscleGroups.map((group) => (
            <Card
              key={group.id}
              className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
              onClick={() => {
                setSelectedMuscleGroup(group.id)
                setCurrentView("exercise-select")
              }}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-lg">{group.name}</span>
                  <Badge className={group.color}>{group.exercises.length}種目</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Exercise Selection
  if (currentView === "exercise-select" && selectedMuscleGroup) {
    const selectedGroup = muscleGroups.find((g) => g.id === selectedMuscleGroup)

    return (
      <div className="max-w-md mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => setCurrentView("muscle-select")} className="mr-2 p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold">{selectedGroup?.name}の種目</h2>
        </div>

        <div className="space-y-3">
          {selectedGroup?.exercises.map((exercise) => (
            <Card key={exercise} className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{exercise}</span>
                  <Button size="sm" onClick={() => addExercise(exercise)} className="bg-red-600 hover:bg-red-700">
                    追加
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Recording View
  return (
    <div className="max-w-md mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">ワークアウト記録</h2>
        <Button
          variant="outline"
          onClick={() => setCurrentView("muscle-select")}
          className="border-red-200 text-red-600 hover:bg-red-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          種目追加
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-250px)]">
        <div className="space-y-4">
          {currentWorkout.map((exercise, exerciseIndex) => (
            <Card key={exerciseIndex}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{exercise.name}</CardTitle>
                    {exercise.previousRecord && (
                      <p className="text-sm text-gray-500">
                        前回: {exercise.previousRecord.weight}kg × {exercise.previousRecord.reps}回
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exercise.sets.map((set, setIndex) => (
                    <div key={setIndex} className="flex items-center space-x-2">
                      <span className="w-8 text-sm font-medium">{setIndex + 1}</span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">重量(kg)</Label>
                          <Input
                            type="number"
                            value={set.weight || ""}
                            onChange={(e) => updateSet(exerciseIndex, setIndex, "weight", Number(e.target.value))}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">回数</Label>
                          <Input
                            type="number"
                            value={set.reps || ""}
                            onChange={(e) => updateSet(exerciseIndex, setIndex, "reps", Number(e.target.value))}
                            className="h-8"
                          />
                        </div>
                      </div>
                      {set.weight > 0 && set.reps > 0 && (
                        <div className="text-xs text-gray-500">1RM: {calculate1RM(set.weight, set.reps)}kg</div>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addSet(exerciseIndex)} className="w-full">
                    <Plus className="w-4 h-4 mr-1" />
                    セット追加
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Notes and Save */}
      <div className="mt-4 space-y-3">
        <div>
          <Label>メモ</Label>
          <Textarea
            placeholder="今日のワークアウトについてメモ..."
            value={workoutNotes}
            onChange={(e) => setWorkoutNotes(e.target.value)}
            className="h-20"
          />
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex-1 bg-transparent">
            <Camera className="w-4 h-4 mr-1" />
            写真
          </Button>
          <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={resetWorkout}>
            <Save className="w-4 h-4 mr-1" />
            保存
          </Button>
        </div>
      </div>
    </div>
  )
}
