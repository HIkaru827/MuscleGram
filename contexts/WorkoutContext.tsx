"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface WorkoutSet {
  weight: number
  reps: number
  isOriginalExisting?: boolean
}

interface WorkoutEntry {
  exerciseId: string
  exerciseName: string
  sets: WorkoutSet[]
}

interface WorkoutContextType {
  isWorkoutActive: boolean
  workoutStartTime: Date | null
  currentWorkout: WorkoutEntry[]
  workoutDuration: string
  startWorkout: () => void
  finishWorkout: () => void
  addExerciseToWorkout: (exerciseId: string, exerciseName: string) => void
  updateSet: (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: number) => void
  addSet: (exerciseId: string) => void
  removeSet: (exerciseId: string, setIndex: number) => void
  setCurrentWorkout: (workout: WorkoutEntry[]) => void
  setWorkoutStartTime: (time: number | Date) => void
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined)

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [isWorkoutActive, setIsWorkoutActive] = useState(false)
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null)
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutEntry[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())

  // Load saved workout state from localStorage on mount
  useEffect(() => {
    // Only access localStorage in the browser
    if (typeof window !== 'undefined') {
      const savedWorkoutState = localStorage.getItem('workoutState')
      if (savedWorkoutState) {
        try {
          const state = JSON.parse(savedWorkoutState)
          setIsWorkoutActive(state.isWorkoutActive)
          setWorkoutStartTime(state.workoutStartTime ? new Date(state.workoutStartTime) : null)
          setCurrentWorkout(state.currentWorkout || [])
        } catch (error) {
          console.error('Error loading workout state:', error)
          localStorage.removeItem('workoutState')
        }
      }
    }
  }, [])

  // Save workout state to localStorage whenever it changes
  useEffect(() => {
    // Only save to localStorage in the browser
    if (typeof window !== 'undefined') {
      const state = {
        isWorkoutActive,
        workoutStartTime: workoutStartTime?.getTime() || null,
        currentWorkout
      }
      localStorage.setItem('workoutState', JSON.stringify(state))
    }
  }, [isWorkoutActive, workoutStartTime, currentWorkout])

  // Update current time every second when workout is active
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isWorkoutActive) {
      interval = setInterval(() => {
        setCurrentTime(new Date())
      }, 1000)
    }
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isWorkoutActive])

  // Calculate workout duration
  const workoutDuration = (() => {
    if (!isWorkoutActive || !workoutStartTime) return "00:00"
    
    const workoutDurationMs = currentTime.getTime() - workoutStartTime.getTime()
    const workoutMinutes = Math.floor(workoutDurationMs / 60000)
    const workoutSeconds = Math.floor((workoutDurationMs % 60000) / 1000)
    
    return `${workoutMinutes.toString().padStart(2, '0')}:${workoutSeconds.toString().padStart(2, '0')}`
  })()

  const startWorkout = () => {
    const now = new Date()
    setIsWorkoutActive(true)
    setWorkoutStartTime(now)
    setCurrentWorkout([])
  }

  const finishWorkout = () => {
    setIsWorkoutActive(false)
    setWorkoutStartTime(null)
    setCurrentWorkout([])
    // Only remove from localStorage in the browser
    if (typeof window !== 'undefined') {
      localStorage.removeItem('workoutState')
    }
  }

  const addExerciseToWorkout = (exerciseId: string, exerciseName: string, lastPerformed?: { weight: number; reps: number }) => {
    const existingEntry = currentWorkout.find(entry => entry.exerciseId === exerciseId)
    
    if (!existingEntry) {
      const newEntry: WorkoutEntry = {
        exerciseId,
        exerciseName,
        sets: [{ weight: lastPerformed?.weight || 0, reps: lastPerformed?.reps || 0, isOriginalExisting: false }]
      }
      setCurrentWorkout(prev => [...prev, newEntry])
    }
  }

  const updateSet = (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: number) => {
    setCurrentWorkout(prev =>
      prev.map(entry =>
        entry.exerciseId === exerciseId
          ? {
              ...entry,
              sets: entry.sets.map((set, index) =>
                index === setIndex ? { ...set, [field]: value } : set
              )
            }
          : entry
      )
    )
  }

  const addSet = (exerciseId: string) => {
    setCurrentWorkout(prev =>
      prev.map(entry =>
        entry.exerciseId === exerciseId
          ? {
              ...entry,
              sets: [...entry.sets, { weight: entry.sets[entry.sets.length - 1]?.weight || 0, reps: entry.sets[entry.sets.length - 1]?.reps || 0, isOriginalExisting: false }]
            }
          : entry
      )
    )
  }

  const removeSet = (exerciseId: string, setIndex: number) => {
    setCurrentWorkout(prev =>
      prev.map(entry =>
        entry.exerciseId === exerciseId
          ? {
              ...entry,
              sets: entry.sets.filter((_, index) => index !== setIndex)
            }
          : entry
      ).filter(entry => entry.sets.length > 0)
    )
  }

  const handleSetWorkoutStartTime = (time: number | Date) => {
    const startTime = time instanceof Date ? time : new Date(time)
    setWorkoutStartTime(startTime)
  }

  return (
    <WorkoutContext.Provider value={{
      isWorkoutActive,
      workoutStartTime,
      currentWorkout,
      workoutDuration,
      startWorkout,
      finishWorkout,
      addExerciseToWorkout,
      updateSet,
      addSet,
      removeSet,
      setCurrentWorkout: setCurrentWorkout,
      setWorkoutStartTime: handleSetWorkoutStartTime
    }}>
      {children}
    </WorkoutContext.Provider>
  )
}

export function useWorkout() {
  const context = useContext(WorkoutContext)
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider')
  }
  return context
}