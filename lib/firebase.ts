import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Check if we're in demo mode
const isDemoMode = process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo-api-key'

if (isDemoMode) {
  console.warn('Running in demo mode. Firebase services will not work. Please configure your Firebase project.')
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Initialize Analytics lazily
let analytics: any = null
export const getAnalyticsInstance = () => {
  if (typeof window !== 'undefined' && !analytics && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'demo-api-key') {
    try {
      analytics = getAnalytics(app)
    } catch (error) {
      console.warn('Analytics initialization failed:', error)
    }
  }
  return analytics
}

export default app