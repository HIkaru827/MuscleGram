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

  // Timer should continue running even when dialog is closed
  // Only cleanup on unmount, not when dialog closes
  useEffect(() => {
    return () => {
      if (timerId) {
        clearInterval(timerId)
      }
    }
  }, [])

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
          // Timer completed - notify user
          onTimerComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    setTimerId(id)
  }

  const onTimerComplete = () => {
    // Vibrate if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200])
    }
    
    // Show notification if permission granted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('MuscleGram タイマー', {
        body: '休憩時間が終了しました！次のセットを始めましょう！',
        icon: '/icon-192x192.png',
        tag: 'timer-complete'
      })
    }
    
    // Play sound (optional - could add audio element)
    try {
      const audio = new Audio()
      audio.volume = 0.3
      // Simple beep using data URL
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCkOByuXOSSoFJIzR8dxgHwMQ9+S8cCb3nJm2'
      audio.play().catch(() => {
        // Silent fail if audio can't play
      })
    } catch (error) {
      // Silent fail if audio is not supported
    }
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
          // Timer completed - notify user
          onTimerComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    setTimerId(id)
  }


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            休憩タイマー
          </DialogTitle>
          <DialogDescription>
            セット間の休憩時間を管理します。タイマーはダイアログを閉じても動き続けます。
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
              
              <div className="space-y-2">
                <div className="text-sm text-gray-600 font-medium">クイック設定</div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setMinutes(1); setSeconds(0) }}
                    className="text-xs"
                  >
                    1分
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setMinutes(2); setSeconds(0) }}
                    className="text-xs"
                  >
                    2分
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setMinutes(3); setSeconds(0) }}
                    className="text-xs"
                  >
                    3分
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setMinutes(0); setSeconds(30) }}
                    className="text-xs"
                  >
                    30秒
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setMinutes(1); setSeconds(30) }}
                    className="text-xs"
                  >
                    1分半
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setMinutes(5); setSeconds(0) }}
                    className="text-xs"
                  >
                    5分
                  </Button>
                </div>
              </div>
              
              <Button
                onClick={startTimer}
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                disabled={minutes === 0 && seconds === 0}
              >
                <Play className="w-4 h-4 mr-2" />
                開始
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className={`text-4xl font-mono font-bold transition-all duration-500 ${
                  remainingSeconds === 0 
                    ? 'text-green-600 animate-pulse' 
                    : remainingSeconds <= 10 
                      ? 'text-orange-600' 
                      : 'text-red-600'
                }`}>
                  {remainingSeconds === 0 ? '完了！' : formatTime(remainingSeconds)}
                </div>
                <div className="text-sm text-gray-500">
                  {formatTime(totalSeconds - remainingSeconds)} / {formatTime(totalSeconds)}
                </div>
                {remainingSeconds === 0 && (
                  <div className="text-sm text-green-600 font-medium animate-bounce">
                    次のセットを開始しましょう！
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                {isRunning ? (
                  <Button onClick={pauseTimer} variant="outline" className="flex-1">
                    <Pause className="w-4 h-4 mr-2" />
                    一時停止
                  </Button>
                ) : (
                  <Button 
                    onClick={resumeTimer} 
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  >
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