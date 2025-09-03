"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getMonthlyWorkouts } from "@/lib/firestore"

interface WorkoutCalendarProps {
  userId?: string
  onNavigateToRecord?: (date: Date, isToday: boolean) => void
  refreshTrigger?: number
  selectedMonth?: Date
  onMonthChange?: (date: Date) => void
}

const MONTHS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月'
]

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function WorkoutCalendar({ 
  userId, 
  onNavigateToRecord, 
  refreshTrigger, 
  selectedMonth, 
  onMonthChange 
}: WorkoutCalendarProps) {
  const [currentDate, setCurrentDate] = useState(selectedMonth || new Date())
  const [workoutDates, setWorkoutDates] = useState<Record<string, { count: number; maxRpe: number }>>({})
  const [loading, setLoading] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const loadMonthlyWorkouts = useCallback(async () => {
    if (!userId) {
      setWorkoutDates({})
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const workouts = await getMonthlyWorkouts(userId, year, month)
      setWorkoutDates(workouts)
    } catch (error) {
      console.error('Error loading monthly workouts:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, currentDate])

  useEffect(() => {
    if (selectedMonth && selectedMonth.getTime() !== currentDate.getTime()) {
      setCurrentDate(selectedMonth)
    }
  }, [selectedMonth, currentDate])
  
  useEffect(() => {
    loadMonthlyWorkouts()
  }, [loadMonthlyWorkouts, refreshTrigger])

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    const firstDayOfWeek = firstDay.getDay()
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(day)
    }
    
    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      onMonthChange?.(newDate)
      return newDate
    })
  }
  
  // Handle touch events for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50
    
    if (isLeftSwipe) {
      navigateMonth('next')
    } else if (isRightSwipe) {
      navigateMonth('prev')
    }
  }
  
  const handleDayClick = (day: number) => {
    if (!onNavigateToRecord) return
    
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const today = new Date()
    const isToday = clickedDate.toDateString() === today.toDateString()
    
    onNavigateToRecord(clickedDate, isToday)
  }

  const getRpeIntensity = (maxRpe: number) => {
    if (maxRpe === 0) return 'bg-gray-100'
    if (maxRpe >= 1 && maxRpe <= 3) return 'bg-red-200'
    if (maxRpe >= 4 && maxRpe <= 6) return 'bg-red-400'
    if (maxRpe >= 7 && maxRpe <= 8) return 'bg-red-500'
    if (maxRpe >= 9 && maxRpe <= 10) return 'bg-red-600'
    return 'bg-gray-100'
  }

  const days = getDaysInMonth()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">ワークアウトカレンダー</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-[100px] text-center">
              {year}年{MONTHS[month]}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {loading ? (
          <div className="text-center py-4">読み込み中...</div>
        ) : (
          <>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                const workoutData = day ? workoutDates[day] : null
                const workoutCount = workoutData?.count || 0
                const maxRpe = workoutData?.maxRpe || 0
                const isToday = day && 
                  new Date().getFullYear() === year &&
                  new Date().getMonth() === month &&
                  new Date().getDate() === day
                
                return (
                  <div
                    key={index}
                    className={`
                      aspect-square flex items-center justify-center text-sm rounded-md
                      ${day ? 'cursor-pointer hover:ring-2 hover:ring-gray-300' : ''}
                      ${day ? getRpeIntensity(maxRpe) : ''}
                      ${isToday ? 'ring-2 ring-blue-500' : ''}
                    `}
                    title={day && workoutCount > 0 ? `${workoutCount}回のワークアウト${maxRpe > 0 ? `（最高RPE: ${maxRpe}）` : ''}` : ''}
                    onClick={day ? () => handleDayClick(day) : undefined}
                  >
                    {day && (
                      <div className="flex flex-col items-center">
                        <span className={`font-medium ${maxRpe >= 9 ? 'text-white' : 'text-gray-700'}`}>
                          {day}
                        </span>
                        {workoutCount > 0 && (
                          <div className={`text-xs ${maxRpe >= 9 ? 'text-white' : 'text-gray-600'}`}>
                            {maxRpe > 0 ? `RPE${maxRpe}` : `${workoutCount}回`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center space-x-3 mt-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-100 rounded"></div>
                <span>RPE なし</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-200 rounded"></div>
                <span>RPE 1-3</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-400 rounded"></div>
                <span>RPE 4-6</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>RPE 7-8</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span>RPE 9-10</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}