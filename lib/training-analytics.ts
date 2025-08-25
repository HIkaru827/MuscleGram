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
    // Query workout_posts instead of users/{userId}/records
    const postsRef = collection(db, 'workout_posts')
    const q = query(
      postsRef,
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    
    // Filter posts that contain the specific exercise and find the most recent date
    let latestDate: Date | null = null
    
    querySnapshot.forEach((doc) => {
      const postData = doc.data()
      const hasExercise = postData.exercises?.some((ex: any) => ex.name === exercise)
      
      if (hasExercise) {
        // Get the workout date (either recordDate for manual records or createdAt for live records)
        const workoutDate = postData.recordDate 
          ? parseISO(postData.recordDate)
          : postData.createdAt?.toDate ? postData.createdAt.toDate() : new Date()
        
        if (!latestDate || workoutDate > latestDate) {
          latestDate = workoutDate
        }
      }
    })
    
    return latestDate
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
    // Query workout_posts instead of users/{userId}/records
    const postsRef = collection(db, 'workout_posts')
    const q = query(
      postsRef,
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    
    // Filter posts that contain this specific exercise and extract workout dates
    const exerciseDates: Date[] = []
    querySnapshot.forEach((doc) => {
      const postData = doc.data()
      const hasExercise = postData.exercises?.some((ex: any) => ex.name === exercise)
      
      if (hasExercise) {
        // Get the workout date (either recordDate for manual records or createdAt for live records)
        const workoutDate = postData.recordDate 
          ? parseISO(postData.recordDate)
          : postData.createdAt?.toDate ? postData.createdAt.toDate() : new Date()
        exerciseDates.push(workoutDate)
      }
    })
    
    // Sort dates and remove duplicates
    const uniqueDates = [...new Set(exerciseDates.map(date => date.toISOString().split('T')[0]))]
      .sort()
      .map(dateStr => parseISO(dateStr))
    
    if (uniqueDates.length < 3) return 'low'
    
    // Calculate intervals between training sessions
    const intervals: number[] = []
    for (let i = 1; i < uniqueDates.length; i++) {
      intervals.push(differenceInDays(uniqueDates[i], uniqueDates[i - 1]))
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
    console.log('Getting training recommendations for user:', userId)
    
    // Get all analytics documents for the user
    const analyticsRef = collection(db, `users/${userId}/analytics`)
    const analyticsSnapshot = await getDocs(analyticsRef)
    
    console.log('Analytics snapshot:', {
      empty: analyticsSnapshot.empty,
      size: analyticsSnapshot.size,
      docs: analyticsSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
    })
    
    if (analyticsSnapshot.empty) {
      console.log('No analytics data found for user:', userId)
      
      // Also check if we have any workout posts for this user
      const postsRef = collection(db, 'workout_posts')
      const q = query(postsRef, where('userId', '==', userId))
      const postsSnapshot = await getDocs(q)
      
      console.log('Workout posts for user:', {
        empty: postsSnapshot.empty,
        size: postsSnapshot.size,
        docs: postsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          userId: doc.data().userId,
          exercises: doc.data().exercises?.map(ex => ex.name) || [],
          createdAt: doc.data().createdAt,
          recordDate: doc.data().recordDate
        }))
      })
      
      return []
    }
    
    const recommendations: NextRecommendation[] = []
    
    // Process each exercise
    for (const analyticsDoc of analyticsSnapshot.docs) {
      const exercise = analyticsDoc.id
      console.log(`Processing recommendation for exercise: ${exercise}`)
      
      const recommendation = await getNextTrainingRecommendation(userId, exercise)
      
      console.log(`Recommendation result for ${exercise}:`, recommendation)
      
      if (recommendation) {
        recommendations.push(recommendation)
      }
    }
    
    console.log(`Final recommendations count: ${recommendations.length}`)
    
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