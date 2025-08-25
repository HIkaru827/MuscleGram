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
  updateProfile
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
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
  logout: () => Promise<void>
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

    try {
      const provider = new GoogleAuthProvider()
      // Add additional scopes if needed
      provider.addScope('email')
      provider.addScope('profile')
      
      // Set custom parameters
      provider.setCustomParameters({
        prompt: 'select_account'
      })
      
      const result = await signInWithPopup(auth, provider)
      await createUserProfile(result.user)
    } catch (error: any) {
      console.error('Google sign in error:', error)
      
      // More specific error handling
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('ポップアップが閉じられました。再度お試しください。')
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('ポップアップがブロックされています。ブラウザの設定を確認してください。')
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

  const logout = async () => {
    try {
      await signOut(auth)
      setUserProfile(null)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  useEffect(() => {
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
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)
        await createUserProfile(user)
      } else {
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}