'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react'

export function NotificationSystemInfo() {
  const [systemInfo, setSystemInfo] = useState<any>({})

  useEffect(() => {
    checkSystemNotificationSettings()
  }, [])

  const checkSystemNotificationSettings = async () => {
    const info: any = {}

    // Basic browser support
    info.browserSupport = {
      notification: 'Notification' in window,
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window
    }

    // Current permission
    if ('Notification' in window) {
      info.permission = Notification.permission
    }

    // Check if we're on HTTPS or localhost
    info.secureContext = location.protocol === 'https:' || location.hostname === 'localhost'

    // Browser information
    info.userAgent = navigator.userAgent
    info.platform = navigator.platform
    info.language = navigator.language

    // Check if notifications might be system-level disabled
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        // Try to create a test notification silently
        const testNotification = new Notification('Test', {
          silent: true,
          tag: 'system-test'
        })
        testNotification.close()
        info.canCreateNotifications = true
      } catch (error) {
        info.canCreateNotifications = false
        info.creationError = error.message
      }
    }

    // Service Worker registration status
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        info.serviceWorkerCount = registrations.length
        info.serviceWorkers = registrations.map(reg => ({
          scope: reg.scope,
          state: reg.active?.state,
          scriptURL: reg.active?.scriptURL
        }))
      } catch (error) {
        info.serviceWorkerError = error.message
      }
    }

    setSystemInfo(info)
  }

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    )
  }

  const getPermissionBadge = (permission: string) => {
    const variants = {
      'granted': 'bg-green-100 text-green-800',
      'denied': 'bg-red-100 text-red-800',
      'default': 'bg-yellow-100 text-yellow-800'
    }
    return (
      <Badge className={variants[permission as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {permission || 'unknown'}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Info className="w-5 h-5" />
          <span>システム通知情報</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">ブラウザサポート</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Notification API</span>
              {getStatusIcon(systemInfo.browserSupport?.notification)}
            </div>
            <div className="flex items-center justify-between">
              <span>Service Worker</span>
              {getStatusIcon(systemInfo.browserSupport?.serviceWorker)}
            </div>
            <div className="flex items-center justify-between">
              <span>Push Manager</span>
              {getStatusIcon(systemInfo.browserSupport?.pushManager)}
            </div>
            <div className="flex items-center justify-between">
              <span>Secure Context (HTTPS/localhost)</span>
              {getStatusIcon(systemInfo.secureContext)}
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">通知許可状況</h4>
          <div className="flex items-center justify-between">
            <span>現在の許可状態</span>
            {getPermissionBadge(systemInfo.permission)}
          </div>
          {systemInfo.permission === 'granted' && (
            <div className="flex items-center justify-between mt-2">
              <span>通知作成可能</span>
              {getStatusIcon(systemInfo.canCreateNotifications)}
            </div>
          )}
          {systemInfo.creationError && (
            <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-600">
              エラー: {systemInfo.creationError}
            </div>
          )}
        </div>

        {systemInfo.serviceWorkers && (
          <div>
            <h4 className="font-semibold mb-2">Service Worker状況</h4>
            <p className="text-sm text-gray-600 mb-2">
              登録数: {systemInfo.serviceWorkerCount}
            </p>
            {systemInfo.serviceWorkers.map((sw: any, index: number) => (
              <div key={index} className="text-xs bg-gray-50 p-2 rounded mb-2">
                <div><strong>Scope:</strong> {sw.scope}</div>
                <div><strong>State:</strong> {sw.state || 'unknown'}</div>
                <div><strong>Script:</strong> {sw.scriptURL || 'unknown'}</div>
              </div>
            ))}
          </div>
        )}

        <div>
          <h4 className="font-semibold mb-2">環境情報</h4>
          <div className="text-xs space-y-1">
            <div><strong>Platform:</strong> {systemInfo.platform}</div>
            <div><strong>Language:</strong> {systemInfo.language}</div>
            <div><strong>User Agent:</strong> {systemInfo.userAgent?.substring(0, 50)}...</div>
          </div>
        </div>

        <div className="border-t pt-4">
          <Button 
            onClick={checkSystemNotificationSettings}
            variant="outline"
            size="sm"
          >
            情報を更新
          </Button>
        </div>

        {systemInfo.permission !== 'granted' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">通知が無効になっています</p>
                <p className="text-yellow-700">
                  ブラウザのアドレスバー左のアイコンをクリックして、通知を「許可」に設定してください。
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}