"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getMonthlyWorkouts } from "@/lib/firestore"

interface WorkoutCalendarProps {
  userId: string
}

const MONTHS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月'
]

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function WorkoutCalendar({ userId }: WorkoutCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [workoutDates, setWorkoutDates] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadMonthlyWorkouts()
  }, [userId, currentDate])

  const loadMonthlyWorkouts = async () => {
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
  }

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
      return newDate
    })
  }

  const getWorkoutIntensity = (workoutCount: number) => {
    if (workoutCount === 0) return 'bg-gray-100'
    if (workoutCount === 1) return 'bg-green-200'
    if (workoutCount === 2) return 'bg-green-400'
    return 'bg-green-600'
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
      <CardContent>
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
                const workoutCount = day ? workoutDates[day] || 0 : 0
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
                      ${day ? getWorkoutIntensity(workoutCount) : ''}
                      ${isToday ? 'ring-2 ring-blue-500' : ''}
                    `}
                    title={day && workoutCount > 0 ? `${workoutCount}回のワークアウト` : ''}
                  >
                    {day && (
                      <div className="flex flex-col items-center">
                        <span className={`font-medium ${workoutCount > 2 ? 'text-white' : 'text-gray-700'}`}>
                          {day}
                        </span>
                        {workoutCount > 0 && (
                          <div className={`text-xs ${workoutCount > 2 ? 'text-white' : 'text-gray-600'}`}>
                            {workoutCount}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center space-x-4 mt-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-100 rounded"></div>
                <span>0回</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-200 rounded"></div>
                <span>1回</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-400 rounded"></div>
                <span>2回</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span>3回+</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}