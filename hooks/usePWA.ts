"use client"

import { useEffect, useRef } from 'react'

export const usePWA = () => {
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js')
          swRegistrationRef.current = registration
          console.log('Service Worker registered successfully')

          // Request notification permission
          if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission()
          }
        } catch (error) {
          console.error('Service Worker registration failed:', error)
        }
      }
    }

    registerServiceWorker()
  }, [])

  const sendMessageToServiceWorker = (message: any) => {
    if (swRegistrationRef.current && swRegistrationRef.current.active) {
      swRegistrationRef.current.active.postMessage(message)
    }
  }

  const startWorkoutTimer = (startTime: number) => {
    sendMessageToServiceWorker({
      type: 'WORKOUT_START',
      startTime
    })
  }

  const setTimer = (duration: number) => {
    sendMessageToServiceWorker({
      type: 'TIMER_SET',
      duration,
      startTime: Date.now()
    })
  }

  return {
    startWorkoutTimer,
    setTimer,
    isServiceWorkerSupported: 'serviceWorker' in navigator
  }
}