"use client"

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Clock, Play, Pause, RotateCcw } from 'lucide-react'
import { usePWA } from '@/hooks/usePWA'

interface TimerDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export default function TimerDialog({ isOpen, onOpenChange }: TimerDialogProps) {
  const { setTimer: setPWATimer } = usePWA()
  const [minutes, setMinutes] = useState(3)
  const [seconds, setSeconds] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null)

  // Only cleanup intervals when dialog closes, but preserve timer state
  useEffect(() => {
    if (!isOpen && timerId) {
      clearInterval(timerId)
      setTimerId(null)
    }
  }, [isOpen, timerId])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startTimer = () => {
    const total = minutes * 60 + seconds
    setTotalSeconds(total)
    setRemainingSeconds(total)
    setIsRunning(true)
    
    // Start background timer in service worker
    setPWATimer(total)
    
    // Start local countdown
    const id = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          setIsRunning(false)
          clearInterval(id)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    setTimerId(id)
  }

  const pauseTimer = () => {
    if (timerId) {
      clearInterval(timerId)
      setTimerId(null)
    }
    setIsRunning(false)
  }

  const resetTimer = () => {
    if (timerId) {
      clearInterval(timerId)
      setTimerId(null)
    }
    setIsRunning(false)
    setRemainingSeconds(0)
    setTotalSeconds(0)
  }

  const resumeTimer = () => {
    setIsRunning(true)
    const id = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          setIsRunning(false)
          clearInterval(id)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    setTimerId(id)
  }

  useEffect(() => {
    return () => {
      if (timerId) {
        clearInterval(timerId)
      }
    }
  }, [timerId])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-80">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            休憩タイマー
          </DialogTitle>
          <DialogDescription>
            セット間の休憩時間を管理するためのタイマーです。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {!isRunning && remainingSeconds === 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minutes">分</Label>
                  <Input
                    id="minutes"
                    type="number"
                    min="0"
                    max="60"
                    value={minutes}
                    onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="seconds">秒</Label>
                  <Input
                    id="seconds"
                    type="number"
                    min="0"
                    max="59"
                    value={seconds}
                    onChange={(e) => setSeconds(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setMinutes(1); setSeconds(0) }}
                >
                  1分
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setMinutes(3); setSeconds(0) }}
                >
                  3分
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setMinutes(5); setSeconds(0) }}
                >
                  5分
                </Button>
              </div>
              
              <Button
                onClick={startTimer}
                className="w-full"
                disabled={minutes === 0 && seconds === 0}
              >
                <Play className="w-4 h-4 mr-2" />
                開始
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-mono font-bold text-red-600">
                  {formatTime(remainingSeconds)}
                </div>
                <div className="text-sm text-gray-500">
                  {formatTime(totalSeconds - remainingSeconds)} / {formatTime(totalSeconds)}
                </div>
              </div>
              
              <div className="flex gap-2">
                {isRunning ? (
                  <Button onClick={pauseTimer} variant="outline" className="flex-1">
                    <Pause className="w-4 h-4 mr-2" />
                    一時停止
                  </Button>
                ) : (
                  <Button onClick={resumeTimer} className="flex-1">
                    <Play className="w-4 h-4 mr-2" />
                    再開
                  </Button>
                )}
                
                <Button onClick={resetTimer} variant="outline" className="flex-1">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  リセット
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}