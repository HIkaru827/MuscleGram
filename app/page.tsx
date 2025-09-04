"use client"

import React, { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Home, Plus, BarChart3, Users, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { WorkoutProvider } from "@/contexts/WorkoutContext"
import { initializeFunctionWarmup } from "@/lib/warm-functions"
import { NotificationManager } from "@/lib/notification-manager"
import dynamic from "next/dynamic"
import { useDebugger } from "@/lib/debug-utils"
import { usePerformanceMonitor } from "@/lib/performance-monitor"

// Static imports for faster loading - no chunk loading delays
import HomeScreen from '@/components/home-screen'
import RecordScreen from '@/components/record-screen'
import AnalyticsScreen from '@/components/analytics-screen'  
import CommunityScreen from '@/components/community-screen'
import ProfileScreen from '@/components/profile-screen'
import LoginScreen from "@/components/auth/login-screen"
import BrandingPage from "@/components/branding-page"
import WorkoutIndicator from "@/components/workout-indicator"
import MobileErrorBoundary from "@/components/mobile-error-boundary"
import NotificationButton from "@/components/notification-button"

// Memoized components to prevent unnecessary re-renders
const MemoizedHomeScreen = React.memo(HomeScreen)
const MemoizedRecordScreen = React.memo(RecordScreen)
const MemoizedAnalyticsScreen = React.memo(AnalyticsScreen)
const MemoizedCommunityScreen = React.memo(CommunityScreen)
const MemoizedProfileScreen = React.memo(ProfileScreen)

type Screen = "home" | "record" | "analytics" | "community" | "profile"

interface FitnessAppProps {
  defaultScreen?: Screen
}

export default function FitnessApp({ defaultScreen = "home" }: FitnessAppProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [activeScreen, setActiveScreen] = useState<Screen>(defaultScreen)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [authTimeout, setAuthTimeout] = useState(false)
  const [showBranding, setShowBranding] = useState(true)
  const { logApp, markFirstRender } = useDebugger()
  const { trackRouteChange } = usePerformanceMonitor()

  // Debug logging with more details
  logApp('FitnessApp render', { 
    user: user?.uid, 
    loading, 
    isInitialLoad, 
    authTimeout,
    timestamp: new Date().toISOString() 
  })

  // URLパスからスクリーンを決定する関数
  const getScreenFromPath = (path: string): Screen => {
    if (path === '/home') return 'home'
    if (path === '/record') return 'record'  
    if (path === '/analytics' || path === '/analysis') return 'analytics'
    if (path === '/community') return 'community'
    if (path === '/profile') return 'profile'
    return 'home'
  }

  // URLが変更された時にactiveScreenを同期（初期読み込み時のみ）
  useEffect(() => {
    const startTime = performance.now()
    const screenFromPath = getScreenFromPath(pathname)
    
    // 初期読み込み時のみactiveScreenを同期
    if (isInitialLoad) {
      setActiveScreen(screenFromPath)
    }
    
    // パフォーマンス追跡 - モバイル互換性対応
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => {
        trackRouteChange(pathname, startTime)
      })
    } else {
      // Fallback for older mobile browsers
      setTimeout(() => {
        trackRouteChange(pathname, startTime)
      }, 0)
    }
  }, [pathname, trackRouteChange, isInitialLoad])

  // Listen for navigate to record event
  React.useEffect(() => {
    const handleNavigateToRecord = () => {
      setActiveScreen("record")
    }
    
    window.addEventListener('navigateToRecord', handleNavigateToRecord)
    return () => {
      window.removeEventListener('navigateToRecord', handleNavigateToRecord)
    }
  }, [])

  // Initialize function warmup on app load
  React.useEffect(() => {
    initializeFunctionWarmup()
  }, [])

  // Initialize training reminder service
  React.useEffect(() => {
    const initializeTrainingReminders = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { trainingReminderManager } = await import('@/lib/training-reminder')
        
        // Only start if user is logged in
        if (user) {
          trainingReminderManager.start()
          console.log('Training reminder service initialized')
        }
      } catch (error) {
        console.error('Error initializing training reminder service:', error)
      }
    }

    initializeTrainingReminders()
    
    // Cleanup on unmount
    return () => {
      import('@/lib/training-reminder').then(({ trainingReminderManager }) => {
        trainingReminderManager.stop()
      }).catch(console.error)
    }
  }, [user])

  // Initialize notification system when user is loaded
  React.useEffect(() => {
    if (user && !loading) {
      const notificationManager = NotificationManager.getInstance()
      
      // Load user notification settings and start daily checks
      notificationManager.loadSettings(user.uid).then(() => {
        notificationManager.startDailyCheck(user.uid)
      }).catch(console.error)
    }
  }, [user, loading])

  // Handle initial load completion with timeout fallback
  React.useEffect(() => {
    if (!loading) {
      // Immediate completion for faster loading
      setIsInitialLoad(false)
      markFirstRender()
      logApp('Initial load completed, isInitialLoad set to false')
    }
  }, [loading])

  // Authentication timeout - prevent infinite loading
  React.useEffect(() => {
    const authTimeoutTimer = setTimeout(() => {
      if (loading && isInitialLoad) {
        logApp('Authentication timeout - proceeding without user')
        setAuthTimeout(true)
        setIsInitialLoad(false)
      }
    }, 1000) // 1 second timeout - much faster

    return () => clearTimeout(authTimeoutTimer)
  }, [loading, isInitialLoad])

  // Force load completion if stuck
  React.useEffect(() => {
    const forceLoadTimer = setTimeout(() => {
      if (isInitialLoad) {
        logApp('Force completing initial load after 2 seconds')
        setIsInitialLoad(false)
      }
    }, 2000) // 2 second force timeout - much faster

    return () => clearTimeout(forceLoadTimer)
  }, [])

  const screens = [
    { id: "home" as Screen, label: "ホーム", icon: Home, path: "/home" },
    { id: "record" as Screen, label: "記録", icon: Plus, path: "/record" },
    { id: "analytics" as Screen, label: "分析", icon: BarChart3, path: "/analytics" },
    { id: "community" as Screen, label: "コミュニティ", icon: Users, path: "/community" },
    { id: "profile" as Screen, label: "プロフィール", icon: User, path: "/profile" },
  ]

  // No more preloading needed - all components are statically imported

  const renderActiveScreen = React.useMemo(() => {
    // Instant component switching with memoized components
    switch (activeScreen) {
      case "home":
        return <MemoizedHomeScreen />
      case "record":
        return <MemoizedRecordScreen />
      case "analytics":
        return <MemoizedAnalyticsScreen />
      case "community":
        return <MemoizedCommunityScreen />
      case "profile":
        return <MemoizedProfileScreen />
      default:
        return <MemoizedHomeScreen />
    }
  }, [activeScreen])

  if ((loading || isInitialLoad) && !authTimeout) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header Skeleton */}
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center justify-center h-16 px-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Muscle<span className="text-red-500">Gram</span>
            </h1>
          </div>
        </header>

        {/* Content Skeleton */}
        <main className="pb-20 p-4">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                <div className="flex items-start space-x-3 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Navigation Skeleton */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50">
          <div className="flex items-center justify-around h-20 px-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center justify-center flex-1 py-2 px-1">
                <div className="p-2 rounded-xl">
                  <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-3 w-8 bg-gray-200 rounded mt-1 animate-pulse"></div>
              </div>
            ))}
          </div>
        </nav>
      </div>
    )
  }

  // Show branding page first for non-authenticated users
  if (!user && !authTimeout && showBranding) {
    return <BrandingPage onGetStarted={() => setShowBranding(false)} />
  }

  if (!user && !authTimeout) {
    return <LoginScreen />
  }

  // If we hit auth timeout and no user, show login with retry option
  if (authTimeout && !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Muscle<span className="text-red-500">Gram</span>
          </h1>
          <div className="mb-6 space-y-2">
            <p className="text-gray-600">設定に問題があります</p>
            <p className="text-sm text-gray-500">
              Firebase環境変数が設定されていない可能性があります
            </p>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
            >
              再読み込み
            </button>
            <button 
              onClick={() => {
                const debugInfo = {
                  timestamp: new Date().toISOString(),
                  url: window.location.href,
                  userAgent: navigator.userAgent,
                  hasFirebaseConfig: !!(window as any).firebase,
                  localStorage: Object.keys(localStorage),
                }
                console.log('Debug Info:', debugInfo)
                alert('デバッグ情報がコンソールに出力されました')
              }}
              className="w-full bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors text-sm"
            >
              デバッグ情報を表示
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <MobileErrorBoundary>
      <WorkoutProvider>
        <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="w-10"></div>
            <h1 className="text-2xl font-bold text-gray-900">
              Muscle<span className="text-red-500">Gram</span>
            </h1>
            <div className="flex items-center">
              <NotificationButton />
            </div>
          </div>
        </header>

        {/* Workout Indicator */}
        {activeScreen !== "record" && <WorkoutIndicator />}

        {/* Main Content */}
        <main className="pb-20 min-h-[calc(100vh-144px)] hw-accelerate">{renderActiveScreen}</main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50">
          <div className="flex items-center justify-around h-20 px-2">
            {screens.map((screen) => {
              const Icon = screen.icon
              const isActive = activeScreen === screen.id

              return (
                <button
                  key={screen.id}
                  onClick={() => {
                    // Instant tab switching - only update state, no routing
                    setActiveScreen(screen.id)
                    // Update URL silently without triggering re-renders
                    window.history.replaceState(null, '', screen.path)
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 py-2 px-1 transition-all duration-200",
                    isActive ? "text-red-500" : "text-gray-500 hover:text-gray-700",
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-xl transition-all duration-200",
                      isActive ? "bg-red-50" : "hover:bg-gray-50",
                    )}
                  >
                    <Icon className={cn("w-6 h-6", isActive && "text-red-500")} />
                  </div>
                  <span className="text-xs font-medium mt-1">{screen.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
        </div>
      </WorkoutProvider>
    </MobileErrorBoundary>
  )
}
