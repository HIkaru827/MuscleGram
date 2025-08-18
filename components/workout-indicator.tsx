"use client"

import { Clock } from "lucide-react"
import { useWorkout } from "@/contexts/WorkoutContext"
import { Button } from "./ui/button"
import { Card } from "./ui/card"

export default function WorkoutIndicator() {
  const { isWorkoutActive, workoutDuration, currentWorkout } = useWorkout()

  if (!isWorkoutActive) {
    return null
  }

  return (
    <Card className="mx-4 mb-4 border-red-200 bg-red-50">
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-red-600">
              <Clock className="w-4 h-4" />
              <span className="font-medium font-mono text-sm">{workoutDuration}</span>
            </div>
            <span className="text-sm text-gray-600">
              ワークアウト中 ({currentWorkout.length}種目)
            </span>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-100"
            onClick={() => {
              // Navigate to record tab - this would need to be handled by parent component
              window.dispatchEvent(new CustomEvent('navigateToRecord'))
            }}
          >
            記録画面へ
          </Button>
        </div>
      </div>
    </Card>
  )
}