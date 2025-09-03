// Server-side FCM notification sender
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    // For development, we'll use a simplified approach
    // In production, you should use proper service account credentials
    initializeApp({
      projectId: 'musclegram-d5b32',
    })
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
  }
}

const messaging = getMessaging()

export interface FCMNotificationPayload {
  token: string
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, string>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

export const sendFCMNotification = async (payload: FCMNotificationPayload) => {
  try {
    console.log('📤 Sending FCM notification to token:', payload.token?.substring(0, 20) + '...')
    
    const message = {
      token: payload.token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.icon || '/icon-192.png',
      },
      data: {
        ...payload.data,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/icon-192.png',
        actions: JSON.stringify(payload.actions || [])
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icon-192.png',
          badge: payload.badge || '/icon-192.png',
          tag: 'musclegram-notification',
          requireInteraction: false,
          actions: payload.actions || []
        }
      }
    }

    const response = await messaging.send(message)
    console.log('✅ FCM notification sent successfully:', response)
    return response
  } catch (error) {
    console.error('❌ Error sending FCM notification:', error)
    throw error
  }
}

export const sendLikeNotificationViaFCM = async (userToken: string, likerName: string) => {
  return sendFCMNotification({
    token: userToken,
    title: '新しいいいね',
    body: `${likerName}さんがあなたの投稿にいいねしました`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      type: 'like',
      url: '/home'
    },
    actions: [
      { action: 'view', title: '見る', icon: '/icon-192.png' },
      { action: 'close', title: '閉じる' }
    ]
  })
}