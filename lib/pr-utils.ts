// PR (Personal Record) utilities for e1RM calculation and PR tracking

export interface Set {
  weight: number
  reps: number
}

export interface PRRecord {
  id: string
  userId: string
  exerciseName: string
  prType: 'e1RM' | 'weight_reps' | '3RM' | '5RM' | '8RM' | 'session_volume'
  value: number // e1RM value, weight*reps, or volume
  weight?: number // for weight_reps PR
  reps?: number // for weight_reps PR
  date: Date
  workoutId?: string
  previousBest?: number
  improvement?: number // percentage improvement
}

// PR Category types
export type PRCategory = 'max_strength' | 'endurance' | 'volume'

export interface PRCategoryInfo {
  id: PRCategory
  name: string
  color: string
  description: string
}

// PR Recommendation
export interface PRRecommendation {
  nextTarget: number
  increment: number
  message: string
  targetDate?: Date
}

// PR Configuration
export const PR_CONFIG = {
  // Weight increments for recommendations (in kg)
  INCREMENTS: {
    e1RM: 2.5,
    weight_reps: 2.5,
    '3RM': 2.5,
    '5RM': 2.0,
    '8RM': 1.5,
    session_volume: 10.0 // in kg total
  },
  // Minimum improvement threshold for recommendations
  MIN_IMPROVEMENT_THRESHOLD: 0.5, // kg
  // Days to suggest for next attempt
  SUGGESTED_DAYS_NEXT_ATTEMPT: 7
} as const

// PR Categories
export const PR_CATEGORIES: Record<PRCategory, PRCategoryInfo> = {
  max_strength: {
    id: 'max_strength',
    name: '最大強度系',
    color: 'bg-red-100 text-red-800 border-red-200',
    description: '最大重量に焦点を当てたPR'
  },
  endurance: {
    id: 'endurance',
    name: '持久系',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: '持久力に焦点を当てたPR'
  },
  volume: {
    id: 'volume',
    name: '総量系',
    color: 'bg-green-100 text-green-800 border-green-200',
    description: '総合的なボリュームに焦点を当てたPR'
  }
} as const

// Get PR Category for PR type
export const getPRCategory = (prType: PRRecord['prType']): PRCategory => {
  switch (prType) {
    case 'e1RM':
    case '3RM':
      return 'max_strength'
    case '5RM':
    case '8RM':
      return 'endurance'
    case 'weight_reps':
    case 'session_volume':
      return 'volume'
    default:
      return 'max_strength'
  }
}

// Calculate estimated 1RM using Epley formula
export const calculateE1RM = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  
  // Epley formula: e1RM = weight * (1 + reps/30)
  const e1rm = weight * (1 + reps / 30)
  return Math.round(e1rm * 10000) / 10000 // Store with 4 decimal precision
}

// Format e1RM for display (2 decimal places)
export const formatE1RM = (e1rm: number): string => {
  return e1rm.toFixed(2)
}

// Calculate estimated RM for specific rep ranges
export const calculateEstimatedRM = (weight: number, reps: number, targetReps: number): number => {
  if (weight <= 0 || reps <= 0 || targetReps <= 0) return 0
  
  const e1rm = calculateE1RM(weight, reps)
  // Reverse Epley formula: weight = e1RM / (1 + targetReps/30)
  const estimatedWeight = e1rm / (1 + targetReps / 30)
  return Math.round(estimatedWeight * 100) / 100
}

// Find the best set from an array of sets for e1RM calculation
export const findBestE1RMSet = (sets: Set[]): { set: Set; e1rm: number } | null => {
  if (!sets.length) return null
  
  let bestSet = sets[0]
  let bestE1RM = calculateE1RM(bestSet.weight, bestSet.reps)
  
  for (const set of sets) {
    const e1rm = calculateE1RM(set.weight, set.reps)
    if (e1rm > bestE1RM) {
      bestSet = set
      bestE1RM = e1rm
    }
  }
  
  return { set: bestSet, e1rm: bestE1RM }
}

// Find best weight x reps combination
export const findBestWeightReps = (sets: Set[]): { set: Set; value: number } | null => {
  if (!sets.length) return null
  
  let bestSet = sets[0]
  let bestValue = bestSet.weight * bestSet.reps
  
  for (const set of sets) {
    const value = set.weight * set.reps
    if (value > bestValue) {
      bestSet = set
      bestValue = value
    }
  }
  
  return { set: bestSet, value: bestValue }
}

// Find best rep-specific PR (3RM, 5RM, 8RM)
export const findBestRepSpecificPR = (sets: Set[], targetReps: number): { set: Set; weight: number } | null => {
  if (!sets.length) return null
  
  // Find sets with exact target reps
  const targetRepsSets = sets.filter(set => set.reps === targetReps)
  if (!targetRepsSets.length) return null
  
  let bestSet = targetRepsSets[0]
  let bestWeight = bestSet.weight
  
  for (const set of targetRepsSets) {
    if (set.weight > bestWeight) {
      bestSet = set
      bestWeight = set.weight
    }
  }
  
  return { set: bestSet, weight: bestWeight }
}

// Calculate session total volume
export const calculateSessionVolume = (exercises: Array<{ sets: Set[] }>): number => {
  return exercises.reduce((total, exercise) => {
    const exerciseVolume = exercise.sets.reduce((sum, set) => {
      return sum + (set.weight * set.reps)
    }, 0)
    return total + exerciseVolume
  }, 0)
}

// Calculate improvement percentage
export const calculateImprovement = (newValue: number, previousValue: number): number => {
  if (previousValue <= 0) return 0
  return Math.round(((newValue - previousValue) / previousValue * 100) * 100) / 100
}

// Get PR badge text and color
export const getPRBadgeInfo = (prType: PRRecord['prType'], improvement: number) => {
  const improvementText = improvement > 0 ? `+${improvement}%` : `${improvement}%`
  
  const badges = {
    'e1RM': {
      text: `e1RM ${improvementText} ↑`,
      color: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    'weight_reps': {
      text: `重量×回数 ${improvementText} ↑`,
      color: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    '3RM': {
      text: `3RM ${improvementText} ↑`,
      color: 'bg-green-100 text-green-800 border-green-200'
    },
    '5RM': {
      text: `5RM ${improvementText} ↑`,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    '8RM': {
      text: `8RM ${improvementText} ↑`,
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    'session_volume': {
      text: `セッション総重量 ${improvementText} ↑`,
      color: 'bg-red-100 text-red-800 border-red-200'
    }
  }
  
  return badges[prType] || badges['e1RM']
}

// Check if a date is within the last 7 days
export const isWithinLastWeek = (date: Date): boolean => {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return date >= weekAgo
}

// Group PRs by week
export const groupPRsByWeek = (prs: PRRecord[]): PRRecord[][] => {
  const weeks: PRRecord[][] = []
  const sortedPRs = [...prs].sort((a, b) => b.date.getTime() - a.date.getTime())
  
  if (!sortedPRs.length) return weeks
  
  let currentWeek: PRRecord[] = []
  let currentWeekStart = getWeekStart(sortedPRs[0].date)
  
  for (const pr of sortedPRs) {
    const prWeekStart = getWeekStart(pr.date)
    
    if (prWeekStart.getTime() === currentWeekStart.getTime()) {
      currentWeek.push(pr)
    } else {
      if (currentWeek.length > 0) {
        weeks.push(currentWeek)
      }
      currentWeek = [pr]
      currentWeekStart = prWeekStart
    }
  }
  
  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }
  
  return weeks
}

// Get the start of the week (Monday) for a given date
export const getWeekStart = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is Sunday
  return new Date(d.setDate(diff))
}

// Format date for display
export const formatPRDate = (date: Date): string => {
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return '今日'
  if (diffDays === 1) return '昨日'
  if (diffDays < 7) return `${diffDays}日前`
  
  return date.toLocaleDateString('ja-JP', { 
    month: 'short', 
    day: 'numeric' 
  })
}

// Calculate PR recommendation
export const calculatePRRecommendation = (pr: PRRecord): PRRecommendation => {
  const increment = PR_CONFIG.INCREMENTS[pr.prType] || 2.5
  let nextTarget: number
  let message: string
  
  switch (pr.prType) {
    case 'e1RM':
      nextTarget = pr.value + increment
      message = `次は e1RM ${nextTarget.toFixed(1)}kg を目標に！`
      break
    case 'weight_reps':
      nextTarget = (pr.weight || 0) + increment
      message = `次は ${nextTarget}kg での挑戦を！`
      break
    case '3RM':
    case '5RM':  
    case '8RM':
      nextTarget = (pr.weight || 0) + increment
      message = `次は ${nextTarget}kg で${pr.prType}に挑戦！`
      break
    case 'session_volume':
      nextTarget = pr.value + increment
      message = `次は総重量 ${(nextTarget / 1000).toFixed(1)}t を目指そう！`
      break
    default:
      nextTarget = pr.value + increment
      message = `次回は +${increment} を目標に！`
  }
  
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + PR_CONFIG.SUGGESTED_DAYS_NEXT_ATTEMPT)
  
  return {
    nextTarget: Math.round(nextTarget * 100) / 100,
    increment,
    message,
    targetDate
  }
}

// Get muscle group from exercise name (simple mapping)
export const getMuscleGroupFromExercise = (exerciseName: string): string => {
  const lowerName = exerciseName.toLowerCase()
  
  if (lowerName.includes('ベンチ') || lowerName.includes('プレス') || lowerName.includes('フライ')) {
    return '胸'
  }
  if (lowerName.includes('懸垂') || lowerName.includes('デッド') || lowerName.includes('ラット') || lowerName.includes('ロー')) {
    return '背中'
  }
  if (lowerName.includes('スクワット') || lowerName.includes('レッグ')) {
    return '脚'
  }
  if (lowerName.includes('カール') || lowerName.includes('ディップ') || lowerName.includes('トライ')) {
    return '腕'
  }
  if (lowerName.includes('ショルダー') || lowerName.includes('レイズ') || lowerName.includes('アップライト')) {
    return '肩'
  }
  if (lowerName.includes('ランニング') || lowerName.includes('サイクリング') || lowerName.includes('ウォーキング')) {
    return '有酸素'
  }
  
  return 'その他'
}