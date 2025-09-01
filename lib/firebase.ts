import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics } from 'firebase/analytics'
import { getMessaging, isSupported } from 'firebase/messaging'

// Firebase configuration with fallback values for build process
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:demo',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-DEMO',
}

// Check if we're in demo mode or missing environment variables
const isDemoMode = process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo-api-key' || 
                   !process.env.NEXT_PUBLIC_FIREBASE_API_KEY

if (isDemoMode) {
  console.warn('Running in demo mode or missing Firebase config. Firebase services will not work properly.')
  console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 10) + '...',
    hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  })
}

// Only initialize Firebase if not in demo mode and we have valid config
let app: any = null

try {
  if (!isDemoMode && typeof window !== 'undefined') {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
  } else if (!isDemoMode) {
    // For SSR/build time, create a minimal app
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
  } else {
    // In demo mode, create a dummy app to prevent initialization errors
    console.log('Skipping Firebase initialization in demo mode')
  }
} catch (error) {
  console.error('Firebase initialization error:', error)
  // Create minimal config to prevent build failures
}

// Initialize Firebase services with error handling
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null

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

// Initialize Messaging lazily
let messaging: any = null
export const getMessagingInstance = async () => {
  if (typeof window !== 'undefined' && !messaging && app && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'demo-api-key') {
    try {
      const messagingSupported = await isSupported()
      if (messagingSupported) {
        messaging = getMessaging(app)
        console.log('Firebase Messaging initialized')
      } else {
        console.warn('Firebase Messaging not supported in this browser')
      }
    } catch (error) {
      console.warn('Messaging initialization failed:', error)
    }
  }
  return messaging
}

export default app