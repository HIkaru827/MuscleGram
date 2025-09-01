'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { pushNotificationManager } from '@/lib/push-notifications'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NotificationTestButton } from './notification-test-button'
import { NotificationSystemInfo } from './notification-system-info'
import { NotificationEnvironmentInfo } from './notification-environment-info'
// import { NotificationSettingsChecker } from './notification-settings-checker'

export function NotificationDebug() {
  const { user } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkNotificationStatus()
  }, [user])

  const checkNotificationStatus = async () => {
    const info: any = {}
    
    // 基本サポート確認
    info.notificationSupported = 'Notification' in window
    info.serviceWorkerSupported = 'serviceWorker' in navigator
    info.pushManagerSupported = 'PushManager' in window
    
    // 通知許可状況
    if ('Notification' in window) {
      info.notificationPermission = Notification.permission
    }

    // サービスワーカー登録状況
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        info.serviceWorkerRegistrations = registrations.length
        info.serviceWorkerControlled = !!navigator.serviceWorker.controller
        info.serviceWorkerDetails = registrations.map(reg => ({
          scope: reg.scope,
          active: !!reg.active
        }))
      } catch (error) {
        info.serviceWorkerError = error?.toString()
      }
    }

    // Firebase設定確認（サーバーから取得）
    try {
      const response = await fetch('/api/firebase-config')
      const firebaseConfig = await response.json()
      info.firebaseConfig = firebaseConfig
    } catch (error) {
      info.firebaseConfigError = error?.toString()
    }

    // クライアント側のFirebase設定確認
    info.clientFirebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 10) + '...' : 'Not set'
    info.clientFirebaseVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ? 
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY.substring(0, 10) + '...' : 'Not set'
    info.clientFirebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not set'

    // PushNotificationManager の状態
    info.pushManagerInstance = !!pushNotificationManager
    info.pushManagerSupported = pushNotificationManager.isSupported()
    info.pushManagerPermission = pushNotificationManager.getPermissionStatus()
    info.fcmToken = pushNotificationManager.getFCMToken() ? 'Generated' : 'Not generated'

    setDebugInfo(info)
  }

  const testNotification = async () => {
    setLoading(true)
    try {
      await pushNotificationManager.showNotification({
        title: 'テスト通知',
        body: 'これはテスト通知です',
        icon: '/icon-192.png',
        tag: 'test-notification'
      })
    } catch (error) {
      console.error('テスト通知エラー:', error)
    }
    setLoading(false)
  }

  const requestPermission = async () => {
    setLoading(true)
    try {
      const permission = await pushNotificationManager.requestPermission()
      await checkNotificationStatus()
      console.log('通知許可結果:', permission)
    } catch (error) {
      console.error('通知許可エラー:', error)
    }
    setLoading(false)
  }

  const initializePushManager = async () => {
    setLoading(true)
    try {
      await pushNotificationManager.initialize()
      await checkNotificationStatus()
    } catch (error) {
      console.error('初期化エラー:', error)
    }
    setLoading(false)
  }

  if (!user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>通知デバッグ</CardTitle>
        </CardHeader>
        <CardContent>
          <p>ログインしてください</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <NotificationEnvironmentInfo />
      <NotificationSystemInfo />
      {/* <NotificationSettingsChecker /> */}
      
      <Card>
        <CardHeader>
          <CardTitle>詳細デバッグ情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">ブラウザサポート</h3>
            <ul className="text-sm space-y-1">
              <li>Notification API: {debugInfo.notificationSupported ? '✅' : '❌'}</li>
              <li>Service Worker: {debugInfo.serviceWorkerSupported ? '✅' : '❌'}</li>
              <li>Push Manager: {debugInfo.pushManagerSupported ? '✅' : '❌'}</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">通知許可状況</h3>
            <ul className="text-sm space-y-1">
              <li>許可状況: {debugInfo.notificationPermission || 'Unknown'}</li>
              <li>Push Manager許可: {debugInfo.pushManagerPermission || 'Unknown'}</li>
              <li>Push Managerサポート: {debugInfo.pushManagerSupported ? '✅' : '❌'}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Service Worker状況</h3>
            <ul className="text-sm space-y-1">
              <li>登録数: {debugInfo.serviceWorkerRegistrations || 0}</li>
              <li>制御中: {debugInfo.serviceWorkerControlled ? '✅' : '❌'}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Firebase設定</h3>
            <ul className="text-sm space-y-1">
              <li>API Key: {debugInfo.firebaseApiKey}</li>
              <li>VAPID Key: {debugInfo.firebaseVapidKey}</li>
              <li>Project ID: {debugInfo.firebaseProjectId}</li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">簡単テスト</h3>
          <NotificationTestButton />
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">詳細アクション</h3>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={requestPermission} 
              disabled={loading}
              variant="outline"
            >
              通知許可を要求
            </Button>
            <Button 
              onClick={initializePushManager} 
              disabled={loading}
              variant="outline"
            >
              Push Manager初期化
            </Button>
            <Button 
              onClick={testNotification} 
              disabled={loading}
              variant="outline"
            >
              基本通知テスト
            </Button>
            <Button 
              onClick={checkNotificationStatus} 
              disabled={loading}
              variant="secondary"
            >
              状況を再確認
            </Button>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">詳細情報</h3>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}