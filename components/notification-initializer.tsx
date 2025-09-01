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
      // Initialize push notification manager (without requesting permission yet)
      await pushNotificationManager.initialize()
      
      // Check current permission status without requesting
      const currentPermission = pushNotificationManager.getPermissionStatus()
      console.log('Current notification permission:', currentPermission)
      
      // Only proceed if permission was previously granted
      const permission = currentPermission
      
      if (permission === 'granted') {
        console.log('Notifications enabled for user:', user?.uid)
        
        // Wait a bit for FCM token to be generated, then store it
        setTimeout(async () => {
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
          } else {
            console.log('No FCM token available to store')
          }
        }, 1000)
        
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