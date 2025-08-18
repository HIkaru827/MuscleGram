"use client"

import { useState } from "react"
import React from "react"
import { Home, Plus, BarChart3, Users, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { WorkoutProvider } from "@/contexts/WorkoutContext"
import HomeScreen from "@/components/home-screen"
import RecordScreen from "@/components/record-screen"
import AnalyticsScreen from "@/components/analytics-screen"
import CommunityScreen from "@/components/community-screen"
import ProfileScreen from "@/components/profile-screen"
import LoginScreen from "@/components/auth/login-screen"
import WorkoutIndicator from "@/components/workout-indicator"

type Screen = "home" | "record" | "analytics" | "community" | "profile"

export default function FitnessApp() {
  const { user, loading } = useAuth()
  const [activeScreen, setActiveScreen] = useState<Screen>("home")

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

  const screens = [
    { id: "home" as Screen, label: "ホーム", icon: Home },
    { id: "record" as Screen, label: "記録", icon: Plus },
    { id: "analytics" as Screen, label: "分析", icon: BarChart3 },
    { id: "community" as Screen, label: "コミュニティ", icon: Users },
    { id: "profile" as Screen, label: "プロフィール", icon: User },
  ]

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case "home":
        return <HomeScreen />
      case "record":
        return <RecordScreen />
      case "analytics":
        return <AnalyticsScreen />
      case "community":
        return <CommunityScreen />
      case "profile":
        return <ProfileScreen />
      default:
        return <HomeScreen />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-red-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <WorkoutProvider>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center justify-center h-16 px-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Muscle<span className="text-red-600">Gram</span>
            </h1>
          </div>
        </header>

        {/* Workout Indicator */}
        {activeScreen !== "record" && <WorkoutIndicator />}

        {/* Main Content */}
        <main className="pb-20">{renderActiveScreen()}</main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50">
          <div className="flex items-center justify-around h-20 px-2">
            {screens.map((screen) => {
              const Icon = screen.icon
              const isActive = activeScreen === screen.id

              return (
                <button
                  key={screen.id}
                  onClick={() => setActiveScreen(screen.id)}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 py-2 px-1 transition-all duration-200",
                    isActive ? "text-red-600" : "text-gray-500 hover:text-gray-700",
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-xl transition-all duration-200",
                      isActive ? "bg-red-50" : "hover:bg-gray-50",
                    )}
                  >
                    <Icon className={cn("w-6 h-6", isActive && "text-red-600")} />
                  </div>
                  <span className="text-xs font-medium mt-1">{screen.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </WorkoutProvider>
  )
}
