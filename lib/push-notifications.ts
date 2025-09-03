'use client'

import { getMessagingInstance } from './firebase'
import { getToken, onMessage } from 'firebase/messaging'

export interface PushNotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  tag?: string
  data?: any
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

export class PushNotificationManager {
  private static instance: PushNotificationManager
  private registration: ServiceWorkerRegistration | null = null
  private subscription: PushSubscription | null = null
  private fcmToken: string | null = null

  private constructor() {}

  static getInstance(): PushNotificationManager {
    if (!PushNotificationManager.instance) {
      PushNotificationManager.instance = new PushNotificationManager()
    }
    return PushNotificationManager.instance
  }

  /**
   * 通知許可を要求する
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('このブラウザは通知をサポートしていません')
      return 'denied'
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission === 'denied') {
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    console.log('Notification permission:', permission)
    return permission
  }

  /**
   * サービスワーカーを登録する
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('このブラウザはService Workerをサポートしていません')
      return null
    }

    try {
      // Register both service workers
      const [mainSW, messagingSW] = await Promise.allSettled([
        navigator.serviceWorker.register('/sw.js', { scope: '/' }),
        navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/firebase-messaging-sw.js' })
      ])

      if (mainSW.status === 'fulfilled') {
        this.registration = mainSW.value
        console.log('Main Service Worker registered:', this.registration)
      } else {
        console.error('Main Service Worker registration failed:', mainSW.reason)
      }

      if (messagingSW.status === 'fulfilled') {
        console.log('Firebase Messaging Service Worker registered:', messagingSW.value)
      } else {
        console.warn('Firebase Messaging Service Worker registration failed:', messagingSW.reason)
      }

      return this.registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return null
    }
  }

  /**
   * プッシュ購読を設定する（Firebase Cloud Messagingで使用）
   */
  async setupPushSubscription(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.error('Service Worker not registered')
      return null
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      })

      this.subscription = subscription
      console.log('Push subscription:', subscription)
      return subscription
    } catch (error) {
      console.error('Push subscription failed:', error)
      return null
    }
  }

  /**
   * ローカル通知を表示する
   */
  async showNotification(options: PushNotificationOptions): Promise<void> {
    console.log('🔔 showNotification called with options:', options)
    
    // Check if notifications are supported
    if (!this.isSupported()) {
      console.error('❌ Push notifications are not supported on this device/browser')
      throw new Error('Push notifications not supported')
    }
    
    const permission = await this.requestPermission()
    console.log('🔒 Permission check result:', permission)
    
    if (permission !== 'granted') {
      console.warn('⚠️ 通知許可が得られていません - Permission:', permission)
      throw new Error('Notification permission not granted')
    }
    
    console.log('✅ Notification permission granted, proceeding with notification')

    try {
      // Force direct browser notification for testing on localhost
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      
      if (isLocalhost) {
        console.log('🔧 Development mode: Using direct browser notification (localhost bypass)')
        this.createDirectNotification(options)
        return
      }
      
      if (this.registration && this.registration.active) {
        console.log('Using Service Worker notification, registration:', this.registration)
        console.log('Service Worker state:', this.registration.active.state)
        
        // Service Worker経由で通知を表示
        const notificationOptions = {
          body: options.body,
          icon: options.icon || '/icon-192.png',
          badge: options.badge || '/icon-192.png',
          image: options.image,
          tag: options.tag || 'musclegram-notification',
          data: options.data,
          actions: options.actions || [],
          requireInteraction: false,
          silent: false,
          timestamp: Date.now(),
          vibrate: [200, 100, 200]  // バイブレーション追加
        }
        
        console.log('Showing SW notification with options:', notificationOptions)
        await this.registration.showNotification(options.title, notificationOptions)
        console.log('Service Worker notification API called successfully')
        
        // Service Worker通知が実際に表示されたか検証
        const notifications = await this.registration.getNotifications()
        console.log('Active notifications after showNotification:', notifications.length)
        
        if (notifications.length === 0) {
          console.warn('Service Worker notification was not created, falling back to direct notification')
          throw new Error('Service Worker notification failed silently')
        }
        
      } else {
        console.log('Service Worker not available or not active, using direct browser notification')
        this.createDirectNotification(options)
      }
    } catch (error) {
      console.error('Service Worker通知の表示に失敗しました:', error)
      
      // Service Worker通知が失敗した場合、直接ブラウザ通知にフォールバック
      try {
        console.log('Falling back to direct browser notification')
        this.createDirectNotification(options)
      } catch (fallbackError) {
        console.error('直接通知のフォールバックも失敗しました:', fallbackError)
        throw fallbackError
      }
    }
  }

  /**
   * 直接ブラウザ通知を作成する（フォールバック用）
   */
  private createDirectNotification(options: PushNotificationOptions): void {
    console.log('🔔 Creating direct browser notification')
    
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/icon-192.png',
      badge: options.badge || '/icon-192.png',
      tag: options.tag || 'musclegram-notification',
      data: options.data,
      timestamp: Date.now(),
      requireInteraction: false
    })
    
    console.log('✅ Direct browser notification created:', notification)
    
    // Force badge update for direct notifications
    this.setBadgeCount(1).catch(err => console.error('Badge update failed:', err))
    
    // Add click handler
    notification.onclick = () => {
      console.log('Direct notification clicked')
      window.focus()
      notification.close()
    }
    
    // Add show handler
    notification.onshow = () => {
      console.log('Direct notification shown successfully')
    }
    
    // Add error handler
    notification.onerror = (error) => {
      console.error('Direct notification error:', error)
    }
  }

  /**
   * アプリバッジの数を設定する（PWA）
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      if ('setAppBadge' in navigator) {
        // @ts-ignore - setAppBadge is experimental
        await navigator.setAppBadge(count)
        console.log('App badge set to:', count)
      } else if ('setClientBadge' in navigator) {
        // @ts-ignore - Alternative API
        await navigator.setClientBadge(count)
      } else {
        console.warn('Badge API not supported')
      }
    } catch (error) {
      console.error('Failed to set app badge:', error)
    }
  }

  /**
   * アプリバッジをクリアする
   */
  async clearBadge(): Promise<void> {
    try {
      if ('clearAppBadge' in navigator) {
        // @ts-ignore
        await navigator.clearAppBadge()
        console.log('App badge cleared')
      } else if ('setAppBadge' in navigator) {
        // @ts-ignore
        await navigator.setAppBadge(0)
      }
    } catch (error) {
      console.error('Failed to clear app badge:', error)
    }
  }

  /**
   * 通知をクリックした時の処理を設定する
   */
  setupNotificationClickHandler(): void {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'notification-click') {
        const { action, data } = event.data
        console.log('Notification clicked:', { action, data })

        // 通知データに基づいてページを開く
        if (data.url) {
          window.location.href = data.url
        }
      }
    })
  }

  /**
   * Firebase Cloud Messagingをセットアップする
   */
  async setupFCM(): Promise<string | null> {
    try {
      const messaging = await getMessagingInstance()
      if (!messaging) {
        console.warn('Firebase Messaging not available - using local notifications only')
        return null
      }

      // Get FCM token
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      if (!vapidKey || vapidKey === 'your_vapid_key_for_push_notifications') {
        console.warn('VAPID key not configured. Using local notifications only.')
        console.info('To enable FCM push notifications, set NEXT_PUBLIC_FIREBASE_VAPID_KEY in your environment variables.')
        return null
      }

      const token = await getToken(messaging, {
        vapidKey: vapidKey
      })

      if (token) {
        this.fcmToken = token
        console.log('FCM token generated:', token)

        // Listen for foreground messages
        onMessage(messaging, (payload) => {
          console.log('Foreground message received:', payload)
          
          // Show notification if app is in foreground
          if (payload.notification) {
            this.showNotification({
              title: payload.notification.title || 'MuscleGram',
              body: payload.notification.body || '新しい通知があります',
              icon: payload.notification.icon || '/icon-192.png',
              data: payload.data
            })
          }
        })

        return token
      } else {
        console.warn('No FCM token available - using local notifications only')
        return null
      }
    } catch (error) {
      console.warn('FCM setup failed, falling back to local notifications:', error)
      return null
    }
  }

  /**
   * FCMトークンを取得する
   */
  getFCMToken(): string | null {
    return this.fcmToken
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    console.log('Initializing Push Notification Manager...')
    
    try {
      // サービスワーカー登録
      await this.registerServiceWorker()
      
      // Firebase Cloud Messaging セットアップ（失敗してもOK）
      await this.setupFCM()
      
      // 通知クリックハンドラー設定
      this.setupNotificationClickHandler()
      
      console.log('Push Notification Manager initialized successfully')
      
      // FCMが利用できない場合の案内
      if (!this.fcmToken) {
        console.info('🔔 Local notifications are ready! FCM push notifications require VAPID key configuration.')
      }
      
    } catch (error) {
      console.error('Push Notification Manager initialization failed:', error)
      // エラーが発生しても基本的な通知機能は使えるようにする
    }
  }

  /**
   * VAPID公開鍵をUint8Arrayに変換する
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  /**
   * 通知許可の状態を取得
   */
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied'
    }
    return Notification.permission
  }

  /**
   * デバイスがプッシュ通知をサポートしているかチェック
   */
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  }
}

// シングルトンインスタンスをエクスポート
export const pushNotificationManager = PushNotificationManager.getInstance()

// 通知タイプ別のヘルパー関数
export const createLikeNotification = async (userName: string, postPreview?: string) => {
  console.log('📱 createLikeNotification called for user:', userName)
  
  try {
    // Update app badge count first
    console.log('🔔 Updating app badge...')
    await pushNotificationManager.setBadgeCount(1)
    
    // Show the notification
    console.log('🔔 Showing like notification...')
    await pushNotificationManager.showNotification({
      title: '新しいいいね',
      body: `${userName}さんがあなたの投稿にいいねしました`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'like-notification',
      data: { type: 'like', url: '/home' },
      actions: [
        { action: 'view', title: '見る', icon: '/icon-192.png' },
        { action: 'close', title: '閉じる' }
      ]
    })
    
    console.log('✅ Like notification and badge updated successfully')
  } catch (error) {
    console.error('❌ Error in createLikeNotification:', error)
    throw error
  }
}

export const createCommentNotification = (userName: string, comment: string) => {
  return pushNotificationManager.showNotification({
    title: '新しいコメント',
    body: `${userName}さん: ${comment.slice(0, 50)}${comment.length > 50 ? '...' : ''}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'comment-notification',
    data: { type: 'comment', url: '/home' },
    actions: [
      { action: 'view', title: '見る', icon: '/icon-192.png' },
      { action: 'reply', title: '返信', icon: '/icon-192.png' }
    ]
  })
}

export const createFollowNotification = (userName: string) => {
  return pushNotificationManager.showNotification({
    title: '新しいフォロワー',
    body: `${userName}さんがあなたをフォローしました`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'follow-notification',
    data: { type: 'follow', url: '/profile' },
    actions: [
      { action: 'view', title: 'プロフィールを見る', icon: '/icon-192.png' }
    ]
  })
}