// 筋肉部位と種目の定義を共通化
export interface MuscleGroupDefinition {
  id: string
  name: string
  color?: string
  exercises: string[]
}

export interface Exercise {
  id: string
  name: string
  hasVideo: boolean
  lastPerformed?: {
    date: string
    weight: number
    reps: number
  }
}

export interface RecordMuscleGroup {
  id: string
  name: string
  color: string
  lastWorkout?: string
  exercises: Exercise[]
  showAll: boolean
}

// 分析用のデフォルト筋肉部位定義
export const DEFAULT_MUSCLE_GROUPS: MuscleGroupDefinition[] = [
  {
    id: "chest",
    name: "胸",
    exercises: ["ベンチプレス", "インクラインプレス", "ディクラインプレス", "ダンベルフライ", "チェストプレス", "プッシュアップ", "ペックフライ", "ディップス"]
  },
  {
    id: "back",
    name: "背中",
    exercises: ["懸垂", "デッドリフト", "ラットプルダウン", "ベントオーバーロー", "チンニング", "ケーブルロー", "シュラッグ", "ローイング"]
  },
  {
    id: "legs",
    name: "脚",
    exercises: ["スクワット", "レッグプレス", "レッグエクステンション", "レッグカール", "カーフレイズ", "ランジ", "ブルガリアンスクワット"]
  },
  {
    id: "shoulders",
    name: "肩",
    exercises: ["ショルダープレス", "サイドレイズ", "リアレイズ", "フロントレイズ", "アップライトロー", "ダンベルプレス", "リアデルト"]
  },
  {
    id: "arms",
    name: "腕",
    exercises: ["バーベルカール", "ハンマーカール", "ダンベルカール", "トライセプスエクステンション", "ディップス", "プリーチャーカール", "フレンチプレス"]
  },
  {
    id: "abs",
    name: "腹",
    exercises: ["プランク", "クランチ", "シットアップ", "レッグレイズ", "ロシアンツイスト", "マウンテンクライマー"]
  },
  {
    id: "cardio",
    name: "有酸素",
    exercises: ["ランニング", "サイクリング", "エリプティカル", "ローイング", "ウォーキング"]
  }
]

// 記録タブ用のデフォルト筋肉部位定義（既存の形式を維持）
export const DEFAULT_RECORD_MUSCLE_GROUPS: RecordMuscleGroup[] = [
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

/**
 * 記録タブのmuscleGroupsから分析用のMuscleGroupDefinitionに変換
 */
export function convertToAnalyticsMuscleGroups(recordMuscleGroups: RecordMuscleGroup[]): MuscleGroupDefinition[] {
  return recordMuscleGroups.map(group => ({
    id: group.id,
    name: group.name,
    exercises: group.exercises.map(ex => ex.name)
  }))
}

/**
 * 記録タブのmuscleGroupsから利用可能な全種目を抽出
 */
export function extractAvailableExercises(recordMuscleGroups: RecordMuscleGroup[]): string[] {
  const exercises = new Set<string>()
  recordMuscleGroups.forEach(group => {
    group.exercises.forEach(exercise => {
      exercises.add(exercise.name)
    })
  })
  return Array.from(exercises).sort()
}

/**
 * LocalStorageから記録タブのmuscleGroupsを読み込み、なければデフォルトを返す
 */
export function loadRecordMuscleGroups(): RecordMuscleGroup[] {
  if (typeof window === 'undefined') return DEFAULT_RECORD_MUSCLE_GROUPS
  
  const saved = localStorage.getItem('muscleGroups')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (error) {
      console.error('Error parsing saved muscle groups:', error)
    }
  }
  return DEFAULT_RECORD_MUSCLE_GROUPS
}

/**
 * 部位IDから部位名を取得
 */
export function getMuscleGroupNameById(id: string, muscleGroups: MuscleGroupDefinition[]): string {
  const group = muscleGroups.find(g => g.id === id)
  return group?.name || id
}

/**
 * 種目名から所属する部位IDを取得
 */
export function getMuscleGroupIdByExercise(exerciseName: string, muscleGroups: MuscleGroupDefinition[]): string | undefined {
  for (const group of muscleGroups) {
    if (group.exercises.includes(exerciseName)) {
      return group.id
    }
  }
  return undefined
}