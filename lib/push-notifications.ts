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
      this.registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', this.registration)
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
    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      console.warn('通知許可が得られていません')
      return
    }

    try {
      if (this.registration) {
        // Service Worker経由で通知を表示
        await this.registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/icon-192.png',
          badge: options.badge || '/icon-192.png',
          image: options.image,
          tag: options.tag || 'musclegram-notification',
          data: options.data,
          actions: options.actions,
          requireInteraction: false,
          silent: false
        })
      } else {
        // フォールバック: ブラウザの通知API
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/icon-192.png',
          badge: options.badge || '/icon-192.png',
          tag: options.tag || 'musclegram-notification',
          data: options.data
        })
      }
    } catch (error) {
      console.error('通知の表示に失敗しました:', error)
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
        console.warn('Firebase Messaging not available')
        return null
      }

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
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
        console.warn('No FCM token available')
        return null
      }
    } catch (error) {
      console.error('FCM setup failed:', error)
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
    
    // サービスワーカー登録
    await this.registerServiceWorker()
    
    // Firebase Cloud Messaging セットアップ
    await this.setupFCM()
    
    // 通知クリックハンドラー設定
    this.setupNotificationClickHandler()
    
    console.log('Push Notification Manager initialized')
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
export const createLikeNotification = (userName: string, postPreview?: string) => {
  return pushNotificationManager.showNotification({
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