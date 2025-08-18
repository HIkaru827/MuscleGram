import { db } from './firebase'
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { format, addDays, differenceInDays, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

// Type definitions
export interface TrainingAnalytics {
  averageFrequency: number // Average interval in days
  lastUpdated: string // ISO 8601 format YYYY-MM-DD
}

export interface NextRecommendation {
  exerciseName: string
  nextRecommendedDate: Date
  daysUntilNext: number
  averageFrequency: number
  lastTrainingDate: Date
  consistency: 'high' | 'medium' | 'low'
  status: 'overdue' | 'due_soon' | 'on_track' | 'ahead'
}

/**
 * Get training analytics for a specific exercise
 */
export const getTrainingAnalytics = async (
  userId: string, 
  exercise: string
): Promise<TrainingAnalytics | null> => {
  try {
    const analyticsRef = doc(db, `users/${userId}/analytics/${exercise}`)
    const analyticsDoc = await getDoc(analyticsRef)
    
    if (analyticsDoc.exists()) {
      return analyticsDoc.data() as TrainingAnalytics
    }
    
    return null
  } catch (error) {
    console.error('Error fetching training analytics:', error)
    return null
  }
}

/**
 * Get last training date for a specific exercise
 */
export const getLastTrainingDate = async (
  userId: string, 
  exercise: string
): Promise<Date | null> => {
  try {
    const recordsRef = collection(db, `users/${userId}/records`)
    const q = query(
      recordsRef,
      where('exercise', '==', exercise),
      orderBy('date', 'desc'),
      limit(1)
    )
    
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const lastRecord = querySnapshot.docs[0].data()
      return parseISO(lastRecord.date)
    }
    
    return null
  } catch (error) {
    console.error('Error fetching last training date:', error)
    return null
  }
}

/**
 * Calculate next recommended training date
 */
export const calculateNextRecommendedDate = (
  lastTrainingDate: Date, 
  averageFrequency: number
): Date => {
  return addDays(lastTrainingDate, Math.round(averageFrequency))
}

/**
 * Get training status based on current date and recommendation
 */
export const getTrainingStatus = (
  nextRecommendedDate: Date, 
  currentDate: Date = new Date()
): NextRecommendation['status'] => {
  const daysUntilNext = differenceInDays(nextRecommendedDate, currentDate)
  
  if (daysUntilNext < -1) return 'overdue'
  if (daysUntilNext <= 1) return 'due_soon'
  if (daysUntilNext <= 3) return 'on_track'
  return 'ahead'
}

/**
 * Calculate consistency level based on frequency variation
 */
export const calculateConsistency = async (
  userId: string, 
  exercise: string
): Promise<NextRecommendation['consistency']> => {
  try {
    const recordsRef = collection(db, `users/${userId}/records`)
    const q = query(
      recordsRef,
      where('exercise', '==', exercise),
      orderBy('date', 'asc')
    )
    
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.docs.length < 3) return 'low'
    
    // Calculate intervals between training sessions
    const dates: Date[] = []
    querySnapshot.forEach(doc => {
      dates.push(parseISO(doc.data().date))
    })
    
    const intervals: number[] = []
    for (let i = 1; i < dates.length; i++) {
      intervals.push(differenceInDays(dates[i], dates[i - 1]))
    }
    
    // Calculate standard deviation
    const average = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - average, 2), 0) / intervals.length
    const standardDeviation = Math.sqrt(variance)
    
    // Determine consistency level
    const coefficientOfVariation = standardDeviation / average
    
    if (coefficientOfVariation < 0.3) return 'high'
    if (coefficientOfVariation < 0.6) return 'medium'
    return 'low'
    
  } catch (error) {
    console.error('Error calculating consistency:', error)
    return 'low'
  }
}

/**
 * Get comprehensive next training recommendation
 */
export const getNextTrainingRecommendation = async (
  userId: string, 
  exercise: string
): Promise<NextRecommendation | null> => {
  try {
    // Get analytics data and last training date
    const [analytics, lastTrainingDate, consistency] = await Promise.all([
      getTrainingAnalytics(userId, exercise),
      getLastTrainingDate(userId, exercise),
      calculateConsistency(userId, exercise)
    ])
    
    if (!analytics || !lastTrainingDate) {
      return null
    }
    
    const nextRecommendedDate = calculateNextRecommendedDate(
      lastTrainingDate, 
      analytics.averageFrequency
    )
    
    const daysUntilNext = differenceInDays(nextRecommendedDate, new Date())
    const status = getTrainingStatus(nextRecommendedDate)
    
    return {
      exerciseName: exercise,
      nextRecommendedDate,
      daysUntilNext,
      averageFrequency: analytics.averageFrequency,
      lastTrainingDate,
      consistency,
      status
    }
  } catch (error) {
    console.error('Error getting next training recommendation:', error)
    return null
  }
}

/**
 * Get recommendations for all exercises
 */
export const getAllTrainingRecommendations = async (
  userId: string
): Promise<NextRecommendation[]> => {
  try {
    // Get all analytics documents for the user
    const analyticsRef = collection(db, `users/${userId}/analytics`)
    const analyticsSnapshot = await getDocs(analyticsRef)
    
    if (analyticsSnapshot.empty) return []
    
    const recommendations: NextRecommendation[] = []
    
    // Process each exercise
    for (const analyticsDoc of analyticsSnapshot.docs) {
      const exercise = analyticsDoc.id
      const recommendation = await getNextTrainingRecommendation(userId, exercise)
      
      if (recommendation) {
        recommendations.push(recommendation)
      }
    }
    
    // Sort by urgency (overdue first, then due soon)
    return recommendations.sort((a, b) => {
      const statusOrder = { overdue: 0, due_soon: 1, on_track: 2, ahead: 3 }
      return statusOrder[a.status] - statusOrder[b.status]
    })
    
  } catch (error) {
    console.error('Error getting all training recommendations:', error)
    return []
  }
}

/**
 * Format recommendation message for display
 */
export const formatRecommendationMessage = (recommendation: NextRecommendation): string => {
  const { exerciseName, daysUntilNext, status } = recommendation
  
  switch (status) {
    case 'overdue':
      return `${exerciseName}は${Math.abs(daysUntilNext)}日遅れています`
    case 'due_soon':
      return daysUntilNext === 0 
        ? `${exerciseName}の推奨日は今日です`
        : `${exerciseName}の推奨日は明日です`
    case 'on_track':
      return `${exerciseName}は${daysUntilNext}日後に推奨されます`
    case 'ahead':
      return `${exerciseName}は${daysUntilNext}日後に推奨されます`
    default:
      return `${exerciseName}の推奨日を計算中...`
  }
}

/**
 * Get status color for UI display
 */
export const getStatusColor = (status: NextRecommendation['status']): string => {
  const colors = {
    overdue: 'text-red-600 bg-red-50 border-red-200',
    due_soon: 'text-orange-600 bg-orange-50 border-orange-200',
    on_track: 'text-green-600 bg-green-50 border-green-200',
    ahead: 'text-blue-600 bg-blue-50 border-blue-200'
  }
  
  return colors[status]
}