import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Type definitions
interface TrainingRecord {
  date: string; // ISO 8601 format YYYY-MM-DD
  exercise: string;
  userId?: string;
}

interface AnalyticsData {
  averageFrequency: number; // Average interval in days
  lastUpdated: string; // ISO 8601 format YYYY-MM-DD
}

/**
 * Calculate training frequency when a new record is added
 * Triggered on: users/{userId}/records/{recordId}
 */
export const calculateTrainingFrequency = onDocumentCreated(
  "users/{userId}/records/{recordId}",
  async (event) => {
    try {
      // Get the newly created document data
      const snapshot = event.data;
      if (!snapshot) {
        logger.warn("No data found in the event");
        return;
      }

      const data = snapshot.data() as TrainingRecord;
      const { exercise, date } = data;
      
      // Extract userId from the document path
      const userId = event.params.userId;
      
      if (!exercise || !date || !userId) {
        logger.warn("Missing required fields: exercise, date, or userId", {
          exercise,
          date,
          userId
        });
        return;
      }

      logger.info(`Processing training frequency for user ${userId}, exercise: ${exercise}`);

      // Query all records for the same user and exercise, ordered by date
      const recordsQuery = db
        .collection(`users/${userId}/records`)
        .where("exercise", "==", exercise)
        .orderBy("date", "asc");

      const recordsSnapshot = await recordsQuery.get();
      
      if (recordsSnapshot.empty || recordsSnapshot.docs.length <= 1) {
        logger.info(`Not enough records to calculate frequency. Found ${recordsSnapshot.docs.length} records`);
        return;
      }

      // Extract dates and calculate intervals
      const dates: string[] = [];
      recordsSnapshot.forEach((doc) => {
        const recordData = doc.data() as TrainingRecord;
        dates.push(recordData.date);
      });

      // Calculate intervals between adjacent dates
      const intervals: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1]);
        const currDate = new Date(dates[i]);
        
        // Calculate difference in days
        const diffInMs = currDate.getTime() - prevDate.getTime();
        const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
        
        if (diffInDays > 0) {
          intervals.push(diffInDays);
        }
      }

      if (intervals.length === 0) {
        logger.warn("No valid intervals calculated");
        return;
      }

      // Calculate average frequency
      const averageFrequency = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      const roundedAverage = Math.round(averageFrequency * 10) / 10; // Round to 1 decimal place

      // Get current date in YYYY-MM-DD format
      const lastUpdated = new Date().toISOString().split('T')[0];

      // Save analytics data
      const analyticsData: AnalyticsData = {
        averageFrequency: roundedAverage,
        lastUpdated
      };

      const analyticsRef = db.doc(`users/${userId}/analytics/${exercise}`);
      await analyticsRef.set(analyticsData, { merge: true });

      logger.info(`Training frequency calculated and saved`, {
        userId,
        exercise,
        averageFrequency: roundedAverage,
        totalRecords: dates.length,
        intervals: intervals.length
      });

    } catch (error) {
      logger.error("Error calculating training frequency:", error);
      throw error;
    }
  }
);

/**
 * Get next recommended training date based on average frequency
 */
export const getNextRecommendedDate = (averageFrequency: number, lastTrainingDate: string): string => {
  const lastDate = new Date(lastTrainingDate);
  const nextDate = new Date(lastDate);
  nextDate.setDate(lastDate.getDate() + Math.round(averageFrequency));
  
  return nextDate.toISOString().split('T')[0];
};

/**
 * Calculate frequency statistics for better insights
 */
export const calculateFrequencyStats = (intervals: number[]) => {
  if (intervals.length === 0) return null;
  
  const average = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  const min = Math.min(...intervals);
  const max = Math.max(...intervals);
  
  // Calculate standard deviation
  const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - average, 2), 0) / intervals.length;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    average: Math.round(average * 10) / 10,
    min,
    max,
    standardDeviation: Math.round(standardDeviation * 10) / 10,
    consistency: standardDeviation < average * 0.3 ? 'high' : standardDeviation < average * 0.6 ? 'medium' : 'low'
  };
};