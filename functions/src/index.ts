import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Type definitions
interface WorkoutPost {
  userId: string;
  exercises: {
    id: string;
    name: string;
    sets: { weight: number; reps: number }[];
  }[];
  createdAt: any; // Firestore Timestamp
  recordDate?: string; // ISO 8601 format YYYY-MM-DD
}

interface AnalyticsData {
  averageFrequency: number; // Average interval in days
  lastUpdated: string; // ISO 8601 format YYYY-MM-DD
}

/**
 * Calculate training frequency when a new workout post is created
 * Triggered on: workout_posts/{postId}
 */
export const calculateTrainingFrequency = onDocumentCreated(
  "workout_posts/{postId}",
  async (event) => {
    try {
      // Get the newly created document data
      const snapshot = event.data;
      if (!snapshot) {
        logger.warn("No data found in the event");
        return;
      }

      const post = snapshot.data() as WorkoutPost;
      const { userId, exercises, createdAt, recordDate } = post;
      
      if (!userId || !exercises || exercises.length === 0) {
        logger.warn("Missing required fields: userId or exercises", {
          userId,
          exercisesCount: exercises?.length || 0
        });
        return;
      }

      // Get the workout date (either recordDate for manual records or createdAt for live records)
      const workoutDate = recordDate || 
        (createdAt?.toDate ? createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      
      logger.info(`Processing training frequency for user ${userId}, ${exercises.length} exercises on ${workoutDate}`);

      // Process each exercise in the workout
      for (const exercise of exercises) {
        const exerciseName = exercise.name;
        
        try {
          // Query all workout posts for the same user (without ordering to avoid index requirement)
          const postsQuery = db
            .collection('workout_posts')
            .where('userId', '==', userId)
            .limit(200); // Add reasonable limit to avoid excessive reads

          const postsSnapshot = await postsQuery.get();
          
          // Filter posts that contain this specific exercise and extract workout dates
          const exerciseDates: string[] = [];
          postsSnapshot.forEach((doc) => {
            const postData = doc.data() as WorkoutPost;
            const hasExercise = postData.exercises.some(ex => ex.name === exerciseName);
            
            if (hasExercise) {
              const postDate = postData.recordDate || 
                (postData.createdAt?.toDate ? postData.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
              exerciseDates.push(postDate);
            }
          });

          // Remove duplicates and sort
          const uniqueDates = [...new Set(exerciseDates)].sort();
          
          if (uniqueDates.length <= 1) {
            logger.info(`Not enough records to calculate frequency for ${exerciseName}. Found ${uniqueDates.length} records`);
            continue;
          }

          // Calculate intervals between adjacent dates
          const intervals: number[] = [];
          for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i - 1]);
            const currentDate = new Date(uniqueDates[i]);
            const intervalDays = Math.ceil((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
            if (intervalDays > 0) {
              intervals.push(intervalDays);
            }
          }

          if (intervals.length === 0) {
            logger.warn(`No valid intervals calculated for ${exerciseName}`);
            continue;
          }

          // Calculate average frequency
          const totalDays = intervals.reduce((sum, interval) => sum + interval, 0);
          const averageFrequency = totalDays / intervals.length;

          // Get current date as YYYY-MM-DD
          const currentDate = new Date().toISOString().split('T')[0];

          const analyticsData: AnalyticsData = {
            averageFrequency: Math.round(averageFrequency * 10) / 10, // Round to 1 decimal place
            lastUpdated: currentDate
          };

          // Save analytics data
          await db
            .doc(`users/${userId}/analytics/${exerciseName}`)
            .set(analyticsData, { merge: true });

          logger.info(`Training frequency calculated for ${exerciseName}: ${averageFrequency} days`, {
            userId,
            exercise: exerciseName,
            totalRecords: uniqueDates.length,
            averageFrequency: analyticsData.averageFrequency,
            intervals: intervals
          });
          
        } catch (exerciseError) {
          logger.error(`Error processing exercise ${exerciseName}:`, exerciseError);
        }
      }

    } catch (error) {
      logger.error("Error calculating training frequency:", error);
      throw error;
    }
  }
);