"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTrainingFrequency = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const firebase_functions_1 = require("firebase-functions");
// Initialize Firebase Admin
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
/**
 * Calculate training frequency when a new workout post is created
 * Triggered on: workout_posts/{postId}
 */
exports.calculateTrainingFrequency = (0, firestore_1.onDocumentCreated)("workout_posts/{postId}", async (event) => {
    try {
        // Get the newly created document data
        const snapshot = event.data;
        if (!snapshot) {
            firebase_functions_1.logger.warn("No data found in the event");
            return;
        }
        const post = snapshot.data();
        const { userId, exercises, createdAt, recordDate } = post;
        if (!userId || !exercises || exercises.length === 0) {
            firebase_functions_1.logger.warn("Missing required fields: userId or exercises", {
                userId,
                exercisesCount: (exercises === null || exercises === void 0 ? void 0 : exercises.length) || 0
            });
            return;
        }
        // Get the workout date (either recordDate for manual records or createdAt for live records)
        const workoutDate = recordDate ||
            ((createdAt === null || createdAt === void 0 ? void 0 : createdAt.toDate) ? createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        firebase_functions_1.logger.info(`Processing training frequency for user ${userId}, ${exercises.length} exercises on ${workoutDate}`);
        // Process each exercise in the workout
        for (const exercise of exercises) {
            const exerciseName = exercise.name;
            try {
                // Query all workout posts for the same user (without ordering to avoid index requirement)
                const postsQuery = db
                    .collection('workout_posts')
                    .where('userId', '==', userId);
                const postsSnapshot = await postsQuery.get();
                // Filter posts that contain this specific exercise and extract workout dates
                const exerciseDates = [];
                postsSnapshot.forEach((doc) => {
                    var _a;
                    const postData = doc.data();
                    const hasExercise = postData.exercises.some(ex => ex.name === exerciseName);
                    if (hasExercise) {
                        const postDate = postData.recordDate ||
                            (((_a = postData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) ? postData.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                        exerciseDates.push(postDate);
                    }
                });
                // Remove duplicates and sort
                const uniqueDates = [...new Set(exerciseDates)].sort();
                if (uniqueDates.length <= 1) {
                    firebase_functions_1.logger.info(`Not enough records to calculate frequency for ${exerciseName}. Found ${uniqueDates.length} records`);
                    continue;
                }
                // Calculate intervals between adjacent dates
                const intervals = [];
                for (let i = 1; i < uniqueDates.length; i++) {
                    const prevDate = new Date(uniqueDates[i - 1]);
                    const currentDate = new Date(uniqueDates[i]);
                    const intervalDays = Math.ceil((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
                    if (intervalDays > 0) {
                        intervals.push(intervalDays);
                    }
                }
                if (intervals.length === 0) {
                    firebase_functions_1.logger.warn(`No valid intervals calculated for ${exerciseName}`);
                    continue;
                }
                // Calculate average frequency
                const totalDays = intervals.reduce((sum, interval) => sum + interval, 0);
                const averageFrequency = totalDays / intervals.length;
                // Get current date as YYYY-MM-DD
                const currentDate = new Date().toISOString().split('T')[0];
                const analyticsData = {
                    averageFrequency: Math.round(averageFrequency * 10) / 10,
                    lastUpdated: currentDate
                };
                // Save analytics data
                await db
                    .doc(`users/${userId}/analytics/${exerciseName}`)
                    .set(analyticsData, { merge: true });
                firebase_functions_1.logger.info(`Training frequency calculated for ${exerciseName}: ${averageFrequency} days`, {
                    userId,
                    exercise: exerciseName,
                    totalRecords: uniqueDates.length,
                    averageFrequency: analyticsData.averageFrequency,
                    intervals: intervals
                });
            }
            catch (exerciseError) {
                firebase_functions_1.logger.error(`Error processing exercise ${exerciseName}:`, exerciseError);
            }
        }
    }
    catch (error) {
        firebase_functions_1.logger.error("Error calculating training frequency:", error);
        throw error;
    }
});
//# sourceMappingURL=index.js.map