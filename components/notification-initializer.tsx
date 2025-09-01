'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { pushNotificationManager } from '@/lib/push-notifications'

export function NotificationInitializer() {
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      initializeNotifications()
    }
  }, [user])

  const initializeNotifications = async () => {
    try {
      // Initialize push notification manager
      await pushNotificationManager.initialize()
      
      // Request notification permission if not already granted
      const permission = await pushNotificationManager.requestPermission()
      
      if (permission === 'granted') {
        console.log('Notifications enabled for user:', user?.uid)
        
        // Get FCM token and store it
        const fcmToken = pushNotificationManager.getFCMToken()
        if (fcmToken && user?.uid) {
          try {
            await fetch('/api/fcm-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.uid,
                token: fcmToken
              })
            })
            console.log('FCM token stored successfully')
          } catch (error) {
            console.error('Failed to store FCM token:', error)
          }
        }
        
        // Show a welcome notification after a brief delay
        setTimeout(() => {
          pushNotificationManager.showNotification({
            title: 'MuscleGram通知',
            body: '通知が有効になりました！',
            icon: '/icon-192.png',
            tag: 'welcome-notification',
            data: { type: 'welcome', url: '/home' }
          })
        }, 2000)
      } else {
        console.log('Notification permission denied')
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error)
    }
  }

  // Component doesn't render anything visible
  return null
}