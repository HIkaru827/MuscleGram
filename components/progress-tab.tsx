"use client"

import { useState } from "react"
import { Calendar, Target, TrendingUp, Award } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export default function ProgressTab() {
  const [monthlyGoal, setMonthlyGoal] = useState(20)
  const [currentProgress, setCurrentProgress] = useState(12)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Mock data for calendar
  const workoutDays = [
    new Date(2024, 0, 5),
    new Date(2024, 0, 8),
    new Date(2024, 0, 12),
    new Date(2024, 0, 15),
    new Date(2024, 0, 18),
    new Date(2024, 0, 22),
    new Date(2024, 0, 25),
    new Date(2024, 0, 28),
  ]

  const today = new Date()
  const progressPercentage = (currentProgress / monthlyGoal) * 100

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)

    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const isWorkoutDay = (date: Date) => {
    return workoutDays.some((workoutDay) => workoutDay.toDateString() === date.toDateString())
  }

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === selectedDate.getMonth()
  }

  const calendarDays = generateCalendarDays()

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Monthly Goal Progress */}
      <Card className="bg-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Target className="w-5 h-5 mr-2" />
            今月の目標
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">ワークアウト日数</span>
              <Badge variant="secondary">
                {currentProgress} / {monthlyGoal}日
              </Badge>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{Math.round(progressPercentage)}%</div>
              <div className="text-sm text-gray-600">達成率</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goal Setting */}
      <Card className="bg-gray-100">
        <CardHeader>
          <CardTitle className="text-lg">
            <Target className="w-5 h-5 mr-2" />
            目標設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label>月間ワークアウト目標日数</Label>
              <div className="flex space-x-2 mt-1">
                <Input
                  type="number"
                  value={monthlyGoal}
                  onChange={(e) => setMonthlyGoal(Number(e.target.value))}
                  className="flex-1"
                />
                <Button size="sm" className="bg-gray-600 hover:bg-gray-700 text-white">
                  更新
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card className="bg-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Calendar className="w-5 h-5 mr-2" />
            {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 p-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              const isWorkout = isWorkoutDay(date)
              const isTodayDate = isToday(date)
              const isCurrentMonthDate = isCurrentMonth(date)

              return (
                <div
                  key={index}
                  className={`
                    aspect-square flex items-center justify-center text-sm rounded-lg transition-colors
                    ${!isCurrentMonthDate ? "text-gray-300" : ""}
                    ${isTodayDate ? "bg-gray-600 text-white font-bold" : ""}
                    ${isWorkout && !isTodayDate ? "bg-green-500 text-white" : ""}
                    ${!isWorkout && !isTodayDate && isCurrentMonthDate ? "hover:bg-gray-200" : ""}
                  `}
                >
                  {date.getDate()}
                </div>
              )
            })}
          </div>
          <div className="flex justify-center space-x-4 mt-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-600 rounded mr-1"></div>
              <span>今日</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
              <span>ワークアウト実施日</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Stats */}
      <Card className="bg-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <TrendingUp className="w-5 h-5 mr-2" />
            週間統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-600">3</div>
              <div className="text-sm text-gray-600">今週のワークアウト</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">85%</div>
              <div className="text-sm text-gray-600">目標達成率</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="bg-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Award className="w-5 h-5 mr-2" />
            達成バッジ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="text-xs">7日連続</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Target className="w-6 h-6 text-red-600" />
              </div>
              <div className="text-xs">月間目標達成</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-xs">記録更新</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
