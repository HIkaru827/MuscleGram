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
        
        // Wait a bit for FCM token to be generated, then store it directly in Firestore
        setTimeout(async () => {
          const fcmToken = pushNotificationManager.getFCMToken()
          if (fcmToken && user?.uid) {
            try {
              console.log('Attempting to store FCM token for user:', user.uid)
              
              // Import Firestore functions dynamically
              const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore')
              const { db } = await import('@/lib/firebase')
              
              const userRef = doc(db, 'users', user.uid)
              await updateDoc(userRef, {
                fcmToken: fcmToken,
                fcmTokenUpdatedAt: serverTimestamp()
              })
              
              console.log('FCM token stored successfully in Firestore')
            } catch (error) {
              console.error('Failed to store FCM token in Firestore:', error)
            }
          } else {
            console.log('No FCM token available to store. FCM token:', fcmToken, 'User ID:', user?.uid)
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