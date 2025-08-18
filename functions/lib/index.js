"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFrequencyStats = exports.getNextRecommendedDate = exports.calculateTrainingFrequency = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const firebase_functions_1 = require("firebase-functions");
// Initialize Firebase Admin
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
/**
 * Calculate training frequency when a new record is added
 * Triggered on: users/{userId}/records/{recordId}
 */
exports.calculateTrainingFrequency = (0, firestore_1.onDocumentCreated)("users/{userId}/records/{recordId}", async (event) => {
    try {
        // Get the newly created document data
        const snapshot = event.data;
        if (!snapshot) {
            firebase_functions_1.logger.warn("No data found in the event");
            return;
        }
        const data = snapshot.data();
        const { exercise, date } = data;
        // Extract userId from the document path
        const userId = event.params.userId;
        if (!exercise || !date || !userId) {
            firebase_functions_1.logger.warn("Missing required fields: exercise, date, or userId", {
                exercise,
                date,
                userId
            });
            return;
        }
        firebase_functions_1.logger.info(`Processing training frequency for user ${userId}, exercise: ${exercise}`);
        // Query all records for the same user and exercise, ordered by date
        const recordsQuery = db
            .collection(`users/${userId}/records`)
            .where("exercise", "==", exercise)
            .orderBy("date", "asc");
        const recordsSnapshot = await recordsQuery.get();
        if (recordsSnapshot.empty || recordsSnapshot.docs.length <= 1) {
            firebase_functions_1.logger.info(`Not enough records to calculate frequency. Found ${recordsSnapshot.docs.length} records`);
            return;
        }
        // Extract dates and calculate intervals
        const dates = [];
        recordsSnapshot.forEach((doc) => {
            const recordData = doc.data();
            dates.push(recordData.date);
        });
        // Calculate intervals between adjacent dates
        const intervals = [];
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
            firebase_functions_1.logger.warn("No valid intervals calculated");
            return;
        }
        // Calculate average frequency
        const averageFrequency = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const roundedAverage = Math.round(averageFrequency * 10) / 10; // Round to 1 decimal place
        // Get current date in YYYY-MM-DD format
        const lastUpdated = new Date().toISOString().split('T')[0];
        // Save analytics data
        const analyticsData = {
            averageFrequency: roundedAverage,
            lastUpdated
        };
        const analyticsRef = db.doc(`users/${userId}/analytics/${exercise}`);
        await analyticsRef.set(analyticsData, { merge: true });
        firebase_functions_1.logger.info(`Training frequency calculated and saved`, {
            userId,
            exercise,
            averageFrequency: roundedAverage,
            totalRecords: dates.length,
            intervals: intervals.length
        });
    }
    catch (error) {
        firebase_functions_1.logger.error("Error calculating training frequency:", error);
        throw error;
    }
});
/**
 * Get next recommended training date based on average frequency
 */
const getNextRecommendedDate = (averageFrequency, lastTrainingDate) => {
    const lastDate = new Date(lastTrainingDate);
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + Math.round(averageFrequency));
    return nextDate.toISOString().split('T')[0];
};
exports.getNextRecommendedDate = getNextRecommendedDate;
/**
 * Calculate frequency statistics for better insights
 */
const calculateFrequencyStats = (intervals) => {
    if (intervals.length === 0)
        return null;
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
exports.calculateFrequencyStats = calculateFrequencyStats;
//# sourceMappingURL=index.js.map