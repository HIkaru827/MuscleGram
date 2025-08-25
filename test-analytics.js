// Test script to verify training analytics
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp } = require('firebase/firestore');

// Initialize Firebase (using same config as your app)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestData() {
  const userId = 'test-user-id'; // Replace with actual user ID
  
  try {
    // Create test workout posts (3 bench press sessions over 2 weeks)
    console.log('Creating test workout posts...');
    
    const now = new Date();
    const workoutDates = [
      new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),  // 7 days ago
      new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),  // 1 day ago
    ];
    
    for (let i = 0; i < workoutDates.length; i++) {
      const workoutData = {
        userId: userId,
        exercises: [
          {
            id: `bench-press-${i}`,
            name: 'ベンチプレス',
            sets: [
              { weight: 60, reps: 10 },
              { weight: 70, reps: 8 },
              { weight: 80, reps: 6 }
            ]
          }
        ],
        createdAt: workoutDates[i],
        recordMode: 'live'
      };
      
      await addDoc(collection(db, 'workout_posts'), workoutData);
      console.log(`Created workout post for ${workoutDates[i].toDateString()}`);
    }
    
    // Create test analytics data
    console.log('Creating test analytics data...');
    
    const analyticsData = {
      averageFrequency: 6.5, // Average 6.5 days between workouts
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    
    await setDoc(doc(db, `users/${userId}/analytics/ベンチプレス`), analyticsData);
    console.log('Created analytics data for ベンチプレス');
    
    console.log('Test data creation complete!');
    
  } catch (error) {
    console.error('Error creating test data:', error);
  }
}

// Run the test
createTestData();