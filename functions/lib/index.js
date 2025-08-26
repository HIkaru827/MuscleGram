"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkoutAnalytics = exports.calculateWorkoutFrequency = exports.getTrainingRecommendations = exports.calculateTrainingFrequency = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const firebase_functions_1 = require("firebase-functions");
const cors_1 = __importDefault(require("cors"));
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
                    .where('userId', '==', userId)
                    .limit(200); // Add reasonable limit to avoid excessive reads
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
// CORS configuration
const corsHandler = (0, cors_1.default)({
    origin: [
        'https://musclegram.net',
        'https://www.musclegram.net',
        'https://musclegram-app.vercel.app',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
});
/**
 * Get training recommendations based on user's analytics data
 */
exports.getTrainingRecommendations = (0, https_1.onRequest)({ cors: true }, async (request, response) => {
    return corsHandler(request, response, async () => {
        var _a, _b, _c;
        try {
            // Handle warmup requests first
            if (((_a = request.body) === null || _a === void 0 ? void 0 : _a.warmup) || ((_b = request.body) === null || _b === void 0 ? void 0 : _b.userId) === 'warmup-ping') {
                response.json({ status: 'warmed up', function: 'getTrainingRecommendations' });
                return;
            }
            const userId = ((_c = request.body) === null || _c === void 0 ? void 0 : _c.userId) || request.query.userId;
            if (!userId) {
                response.status(400).json({ error: 'userId is required' });
                return;
            }
            firebase_functions_1.logger.info(`Getting training recommendations for user: ${userId}`);
            // Get user's analytics data
            const analyticsQuery = await db
                .collection(`users/${userId}/analytics`)
                .get();
            const recommendations = [];
            const currentDate = new Date();
            analyticsQuery.forEach((doc) => {
                const exerciseName = doc.id;
                const data = doc.data();
                // Calculate days since last update
                const lastUpdated = new Date(data.lastUpdated);
                const daysSinceLastWorkout = Math.ceil((currentDate.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
                // Recommend if it's been longer than average frequency
                if (daysSinceLastWorkout >= data.averageFrequency) {
                    const urgencyScore = daysSinceLastWorkout / data.averageFrequency;
                    recommendations.push({
                        exercise: exerciseName,
                        averageFrequency: data.averageFrequency,
                        daysSinceLastWorkout,
                        urgencyScore,
                        lastUpdated: data.lastUpdated,
                        recommendation: urgencyScore > 1.5 ? 'urgent' : 'suggested'
                    });
                }
            });
            // Sort by urgency score (highest first)
            recommendations.sort((a, b) => b.urgencyScore - a.urgencyScore);
            firebase_functions_1.logger.info(`Found ${recommendations.length} recommendations for user ${userId}`);
            response.json({
                userId,
                recommendations,
                generatedAt: currentDate.toISOString()
            });
        }
        catch (error) {
            firebase_functions_1.logger.error('Error getting training recommendations:', error);
            response.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
});
/**
 * Calculate workout frequency for a user
 */
exports.calculateWorkoutFrequency = (0, https_1.onRequest)({ cors: true }, async (request, response) => {
    return corsHandler(request, response, async () => {
        var _a, _b;
        try {
            const userId = ((_a = request.body) === null || _a === void 0 ? void 0 : _a.userId) || request.query.userId;
            if (!userId) {
                response.status(400).json({ error: 'userId is required' });
                return;
            }
            // Handle warmup requests
            if ((_b = request.body) === null || _b === void 0 ? void 0 : _b.warmup) {
                response.json({ status: 'warmed up', function: 'calculateWorkoutFrequency' });
                return;
            }
            firebase_functions_1.logger.info(`Calculating workout frequency for user: ${userId}`);
            // Get user's workout posts
            const postsQuery = await db
                .collection('workout_posts')
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
            const workouts = postsQuery.docs.map(doc => {
                var _a, _b;
                return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: ((_b = (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || new Date(doc.data().createdAt) }));
            });
            if (workouts.length < 2) {
                response.json({
                    userId,
                    frequency: 0,
                    totalWorkouts: workouts.length,
                    message: 'Not enough data to calculate frequency'
                });
                return;
            }
            // Calculate average frequency between workouts
            const dates = workouts.map(w => new Date(w.createdAt).getTime()).sort((a, b) => a - b);
            const intervals = [];
            for (let i = 1; i < dates.length; i++) {
                const intervalDays = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
                intervals.push(intervalDays);
            }
            const averageFrequency = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
            response.json({
                userId,
                frequency: Math.round(averageFrequency * 10) / 10,
                totalWorkouts: workouts.length,
                intervals,
                calculatedAt: new Date().toISOString()
            });
        }
        catch (error) {
            firebase_functions_1.logger.error('Error calculating workout frequency:', error);
            response.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
});
/**
 * Get workout analytics for a user
 */
exports.getWorkoutAnalytics = (0, https_1.onRequest)({ cors: true }, async (request, response) => {
    return corsHandler(request, response, async () => {
        var _a, _b, _c;
        try {
            // Handle warmup requests first
            if (((_a = request.body) === null || _a === void 0 ? void 0 : _a.warmup) || ((_b = request.body) === null || _b === void 0 ? void 0 : _b.userId) === 'warmup-ping') {
                response.json({ status: 'warmed up', function: 'getWorkoutAnalytics' });
                return;
            }
            const userId = ((_c = request.body) === null || _c === void 0 ? void 0 : _c.userId) || request.query.userId;
            if (!userId) {
                response.status(400).json({ error: 'userId is required' });
                return;
            }
            firebase_functions_1.logger.info(`Getting workout analytics for user: ${userId}`);
            // Get user's analytics data
            const analyticsQuery = await db
                .collection(`users/${userId}/analytics`)
                .get();
            const analytics = [];
            analyticsQuery.forEach((doc) => {
                analytics.push(Object.assign({ exercise: doc.id }, doc.data()));
            });
            response.json({
                userId,
                analytics,
                totalExercises: analytics.length,
                generatedAt: new Date().toISOString()
            });
        }
        catch (error) {
            firebase_functions_1.logger.error('Error getting workout analytics:', error);
            response.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
});
//# sourceMappingURL=index.js.map