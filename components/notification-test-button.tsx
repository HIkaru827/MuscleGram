'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, TestTube } from 'lucide-react'
import { pushNotificationManager } from '@/lib/push-notifications'

export function NotificationTestButton() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('')

  const handleDirectBrowserTest = async () => {
    setLoading(true)
    setStatus('')
    
    try {
      console.log('=== 直接ブラウザ通知テスト ===')
      
      if (!('Notification' in window)) {
        setStatus('❌ このブラウザは通知をサポートしていません')
        return
      }

      if (Notification.permission !== 'granted') {
        setStatus('🔔 通知許可を要求中...')
        const permission = await Notification.requestPermission()
        
        if (permission !== 'granted') {
          setStatus('❌ 通知許可が得られませんでした')
          return
        }
      }

      setStatus('📱 直接ブラウザ通知を送信中...')
      
      // Create direct browser notification
      const notification = new Notification('🔥 直接ブラウザ通知テスト', {
        body: 'これは直接ブラウザAPIを使用した通知です！',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'direct-browser-test',
        requireInteraction: true,  // 通知を強制的に表示
        timestamp: Date.now()
      })
      
      console.log('Direct notification created:', notification)
      
      // Add event handlers
      notification.onclick = () => {
        console.log('Direct notification clicked!')
        setStatus('✅ 直接通知がクリックされました！')
        window.focus()
        notification.close()
      }
      
      notification.onshow = () => {
        console.log('Direct notification shown!')
        setStatus('✅ 直接ブラウザ通知が表示されました！')
      }
      
      notification.onerror = (error) => {
        console.error('Direct notification error:', error)
        setStatus('❌ 直接通知でエラーが発生しました')
      }
      
      notification.onclose = () => {
        console.log('Direct notification closed')
      }
      
      // Auto-close after 5 seconds for testing
      setTimeout(() => {
        if (notification) {
          notification.close()
          setStatus(prev => prev + ' (5秒後に自動閉鎖)')
        }
      }, 5000)
      
    } catch (error) {
      console.error('Direct browser test failed:', error)
      setStatus(`❌ 直接通知エラー: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTestNotification = async () => {
    setLoading(true)
    setStatus('')
    
    try {
      // Check if notifications are supported
      if (!pushNotificationManager.isSupported()) {
        setStatus('❌ このブラウザは通知をサポートしていません')
        return
      }

      // Check current permission
      const currentPermission = pushNotificationManager.getPermissionStatus()
      console.log('Current permission:', currentPermission)

      if (currentPermission === 'denied') {
        setStatus('❌ 通知が拒否されています。ブラウザの設定で許可してください。')
        return
      }

      // Request permission if not granted
      if (currentPermission !== 'granted') {
        setStatus('🔔 通知許可を要求中...')
        const permission = await pushNotificationManager.requestPermission()
        
        if (permission !== 'granted') {
          setStatus('❌ 通知許可が得られませんでした')
          return
        }
      }

      // Show test notification
      setStatus('📱 テスト通知を送信中...')
      
      // Try multiple notification methods
      console.log('=== 通知テスト開始 ===')
      console.log('Notification permission:', Notification.permission)
      console.log('Service Worker available:', 'serviceWorker' in navigator)
      
      try {
        // Method 1: Service Worker通知
        await pushNotificationManager.showNotification({
          title: '🎉 MuscleGram テスト通知',
          body: 'おめでとうございます！通知が正常に動作しています💪',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'test-notification',
          data: { type: 'test' }
        })
        console.log('Service Worker notification sent')
        setStatus('✅ Service Worker通知が送信されました！')
        
      } catch (swError) {
        console.error('Service Worker notification failed:', swError)
        
        // Method 2: Direct browser notification fallback
        try {
          console.log('Trying direct browser notification...')
          const notification = new Notification('🎉 MuscleGram テスト通知', {
            body: 'おめでとうございます！通知が正常に動作しています💪',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'test-notification-direct'
          })
          
          notification.onclick = () => {
            console.log('Direct notification clicked')
            window.focus()
            notification.close()
          }
          
          console.log('Direct browser notification sent')
          setStatus('✅ ブラウザ直接通知が送信されました！')
          
        } catch (directError) {
          console.error('Direct notification failed:', directError)
          setStatus(`❌ 両方の通知方法が失敗: SW(${swError.message}), Direct(${directError.message})`)
        }
      }
      
      // Update badge for testing
      await pushNotificationManager.setBadgeCount(1)
      setTimeout(() => {
        pushNotificationManager.clearBadge()
      }, 3000)

    } catch (error) {
      console.error('Notification test failed:', error)
      setStatus(`❌ エラー: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2">
        <Button
          onClick={handleTestNotification}
          disabled={loading}
          className="w-full"
          variant="default"
        >
          <Bell className="w-4 h-4 mr-2" />
          {loading ? '処理中...' : '🔔 Service Worker通知'}
        </Button>
        
        <Button
          onClick={handleDirectBrowserTest}
          disabled={loading}
          className="w-full"
          variant="outline"
        >
          <TestTube className="w-4 h-4 mr-2" />
          {loading ? '処理中...' : '🔥 直接ブラウザ通知'}
        </Button>
      </div>
      
      {status && (
        <div className="p-3 rounded-lg bg-gray-50 text-sm">
          {status}
        </div>
      )}
    </div>
  )
}