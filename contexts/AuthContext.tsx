"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  updateProfile
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  bio?: string
  followers: number
  following: number
  postsCount: number
  createdAt: any
  updatedAt: any
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInAsGuest: () => Promise<void>
  logout: () => Promise<void>
  refreshUserProfile: () => Promise<void>
  clearPWACache: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const createUserProfile = async (user: User, additionalData?: any) => {
    if (!user) return

    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      const { displayName, email, photoURL } = user
      const createdAt = serverTimestamp()

      try {
        await setDoc(userRef, {
          displayName: displayName || additionalData?.displayName || '',
          email,
          photoURL: photoURL || '',
          bio: '',
          followers: 0,
          following: 0,
          postsCount: 0,
          createdAt,
          updatedAt: createdAt,
          ...additionalData,
        })
      } catch (error) {
        console.error('Error creating user profile:', error)
        throw error
      }
    }

    // Fetch and set user profile
    const updatedUserSnap = await getDoc(userRef)
    if (updatedUserSnap.exists()) {
      setUserProfile({ uid: user.uid, ...updatedUserSnap.data() } as UserProfile)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      await createUserProfile(result.user)
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(result.user, { displayName })
      await createUserProfile(result.user, { displayName })
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  const signInWithGoogle = async () => {
    // Check if we're in demo mode
    const isDemoMode = process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo-api-key'
    
    if (isDemoMode) {
      throw new Error('デモモードではGoogleログインは利用できません。Firebase設定を完了してください。')
    }

    console.log('Starting Google sign in...')
    console.log('Current domain:', window.location.origin)
    
    try {
      const provider = new GoogleAuthProvider()
      // Add additional scopes if needed
      provider.addScope('email')
      provider.addScope('profile')
      
      // Set custom parameters
      provider.setCustomParameters({
        prompt: 'select_account'
      })
      
      console.log('Opening Google sign in popup...')
      const result = await signInWithPopup(auth, provider)
      console.log('Google sign in successful:', result.user.email)
      
      await createUserProfile(result.user)
      console.log('User profile created/updated')
    } catch (error: any) {
      console.error('Google sign in error details:', {
        code: error.code,
        message: error.message,
        customData: error.customData,
        stack: error.stack,
        error: error
      })
      
      // More specific error handling
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('ポップアップが閉じられました。再度お試しください。')
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('ポップアップがブロックされています。ブラウザの設定を確認してください。')
      } else if (error.code === 'auth/unauthorized-domain') {
        throw new Error(`このドメイン(${window.location.origin})はFirebase Authで承認されていません。Firebase Consoleで承認済みドメインに追加してください。`)
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('ネットワークエラーが発生しました。接続を確認してください。')
      } else if (error.code === 'auth/internal-error') {
        throw new Error('内部エラーが発生しました。しばらく後に再度お試しください。')
      } else if (error.code === 'auth/configuration-not-found') {
        throw new Error('Firebase設定が見つかりません。設定を確認してください。')
      } else if (error.code === 'auth/invalid-api-key') {
        throw new Error('無効なAPIキーです。Firebase設定を確認してください。')
      }
      
      throw error
    }
  }

  const signInAsGuest = async () => {
    // Check if we're in demo mode
    const isDemoMode = process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo-api-key'
    
    if (isDemoMode) {
      throw new Error('デモモードではゲストログインは利用できません。Firebase設定を完了してください。')
    }

    console.log('Starting guest sign in...')
    
    try {
      const result = await signInAnonymously(auth)
      console.log('Guest sign in successful:', result.user.uid)
      
      // Create a guest user profile
      await createUserProfile(result.user, { 
        displayName: `ゲスト${result.user.uid.slice(-6)}`,
        isGuest: true 
      })
      console.log('Guest profile created')
    } catch (error: any) {
      console.error('Guest sign in error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
        error: error
      })
      
      // Specific error handling
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('匿名認証が無効になっています。Firebase Consoleで匿名認証を有効にしてください。')
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('ネットワークエラーが発生しました。接続を確認してください。')
      }
      
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      setUserProfile(null)
      // Clear PWA cache on logout
      await clearPWACache()
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  // Refresh user profile from Firestore
  const refreshUserProfile = async () => {
    if (!user) return
    
    try {
      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      
      if (userSnap.exists()) {
        const newProfile = { uid: user.uid, ...userSnap.data() } as UserProfile
        setUserProfile(newProfile)
        
        // Clear browser cache to ensure PWA gets latest data
        await clearPWACache()
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error)
    }
  }

  // Clear PWA cache and force refresh
  const clearPWACache = async () => {
    if (typeof window === 'undefined') return
    
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
        console.log('PWA cache cleared')
      }
      
      // Reload service worker if available
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CACHE_REFRESH' })
      }
      
      // Force page reload in standalone mode (PWA)
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Error clearing PWA cache:', error)
    }
  }

  useEffect(() => {
    // Delay Firebase initialization to prioritize initial render
    const delayedInit = setTimeout(() => {
      // Check if we're in demo mode
      const isDemoMode = process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo-api-key'
      
      if (isDemoMode) {
        // In demo mode, create a mock user to show UI
        const mockUser = {
          uid: 'demo-user',
          email: 'demo@example.com',
          displayName: 'Demo User',
          photoURL: null,
        } as any

        setUser(mockUser)
        setUserProfile({
          uid: 'demo-user',
          email: 'demo@example.com',
          displayName: 'Demo User',
          photoURL: '',
          bio: 'This is a demo user for testing the UI',
          followers: 10,
          following: 5,
          postsCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        setLoading(false)
        setInitialized(true)
        return
      }

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setUser(user)
          await createUserProfile(user)
          
          // Set up real-time listener for user profile updates
          const userRef = doc(db, 'users', user.uid)
          const unsubscribeProfile = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
              const newProfile = { uid: user.uid, ...doc.data() } as UserProfile
              setUserProfile(newProfile)
              console.log('Profile updated in real-time:', newProfile.displayName)
            }
          }, (error) => {
            console.error('Error listening to profile updates:', error)
          })
          
          // Store unsubscribe function for cleanup
          return unsubscribeProfile
        } else {
          setUser(null)
          setUserProfile(null)
        }
        setLoading(false)
        setInitialized(true)
      })

      return () => unsubscribe()
    }, 50) // 50ms delay to allow skeleton render first

    return () => clearTimeout(delayedInit)
  }, [])

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInAsGuest,
    logout,
    refreshUserProfile,
    clearPWACache,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}