"use client"

import { useState, useEffect } from "react"
import { Bell, Heart, MessageCircle, UserPlus, Trophy, Calendar, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { debugLog } from "@/lib/debug"
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification, 
  getUnreadNotificationCount, 
  subscribeToUserNotifications,
  NotificationData 
} from "@/lib/firestore"
import { pushNotificationManager } from "@/lib/push-notifications"

export default function NotificationButton() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Update app badge when unread count changes
  useEffect(() => {
    if (typeof window !== 'undefined' && pushNotificationManager) {
      if (unreadCount > 0) {
        pushNotificationManager.setBadgeCount(unreadCount)
      } else {
        pushNotificationManager.clearBadge()
      }
    }
  }, [unreadCount])

  // Load notifications from Firestore
  useEffect(() => {
    if (!user) return

    // デモモードの場合は、デモ通知を表示
    const isDemoMode = process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo-api-key'
    
    if (isDemoMode) {
      // デモ通知データ
      const demoNotifications: NotificationData[] = [
        {
          id: '1',
          type: 'like',
          title: 'いいねされました',
          message: '田中太郎さんがあなたの投稿にいいねしました',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          read: false,
          recipientId: user.uid,
          fromUserId: 'demo1',
          fromUser: {
            uid: 'demo1',
            email: 'demo1@example.com',
            displayName: '田中太郎',
            photoURL: '/placeholder.svg'
          },
          actionUrl: '/home'
        },
        {
          id: '2',
          type: 'follow',
          title: '新しいフォロワー',
          message: '佐藤花子さんがあなたをフォローしました',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          read: false,
          recipientId: user.uid,
          fromUserId: 'demo2',
          fromUser: {
            uid: 'demo2',
            email: 'demo2@example.com',
            displayName: '佐藤花子',
            photoURL: '/placeholder.svg'
          },
          actionUrl: '/profile'
        }
      ]
      
      setNotifications(demoNotifications)
      setUnreadCount(demoNotifications.filter(n => !n.read).length)
      setLoading(false)
      return
    }

    try {
      const unsubscribe = subscribeToUserNotifications(user.uid, (firestoreNotifications) => {
        try {
          const previousUnreadCount = unreadCount
          const newUnreadCount = firestoreNotifications.filter(n => !n.read).length
          
          setNotifications(firestoreNotifications)
          setUnreadCount(newUnreadCount)
          setLoading(false)
          
          // 新しい未読通知がある場合、プッシュ通知とバッジを表示
          if (newUnreadCount > previousUnreadCount && newUnreadCount > 0) {
            const latestNotification = firestoreNotifications
              .filter(n => !n.read)
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
            
            if (latestNotification) {
              debugLog.log('🔔 New notification received, showing push notification')
              
              // プッシュ通知を表示
              pushNotificationManager.showNotification({
                title: latestNotification.title,
                body: latestNotification.message,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `${latestNotification.type}-notification`,
                data: { type: latestNotification.type, url: latestNotification.actionUrl || '/home' }
              }).catch(error => {
                console.error('Failed to show push notification:', error)
              })
            }
          }
        } catch (callbackError) {
          console.error('Error processing notifications:', callbackError)
          // フォールバック: エラー時は空の状態で表示
          setNotifications([])
          setUnreadCount(0)
          setLoading(false)
        }
      })

      return () => {
        try {
          unsubscribe()
        } catch (unsubscribeError) {
          console.error('Error unsubscribing from notifications:', unsubscribeError)
        }
      }
    } catch (error) {
      console.error('Error subscribing to notifications:', error)
      // フォールバック: エラー時は空の状態で表示
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
    }
  }, [user])

  const getNotificationIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />
      case 'follow':
        return <UserPlus className="w-4 h-4 text-green-500" />
      case 'achievement':
        return <Trophy className="w-4 h-4 text-yellow-500" />
      case 'reminder':
        return <Calendar className="w-4 h-4 text-purple-500" />
      default:
        return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId)
      // リアルタイム更新により自動的にUIが更新される
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      if (user) {
        await markAllNotificationsAsRead(user.uid)
        // リアルタイム更新により自動的にUIが更新される
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId)
      // リアルタイム更新により自動的にUIが更新される
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  if (!user) return null

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0 bg-white border border-gray-200 shadow-lg" align="end" sideOffset={5}>
        <div className="border-b border-gray-100 p-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">通知</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-700 p-0 h-auto"
            >
              全て既読にする
            </Button>
          )}
        </div>

        <ScrollArea className="h-96 bg-white">
          {loading ? (
            <div className="p-4 text-center text-gray-500 bg-white">
              読み込み中...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-white">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>新しい通知はありません</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 bg-white">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer relative group bg-white ${
                    !notification.read ? 'bg-blue-50' : 'bg-white'
                  }`}
                  onClick={() => {
                    if (!notification.read) {
                      handleMarkAsRead(notification.id)
                    }
                    if (notification.actionUrl) {
                      // ここで適切なナビゲーション処理を実装
                      console.log('Navigate to:', notification.actionUrl)
                    }
                    setIsOpen(false)
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {notification.fromUser ? (
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={notification.fromUser.photoURL} alt={notification.fromUser.displayName} />
                          <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                            {notification.fromUser.displayName?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {format(notification.timestamp, 'MM/dd HH:mm', { locale: ja })}
                          </p>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 p-1 h-auto ml-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteNotification(notification.id)
                          }}
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </Button>
                      </div>
                      
                      {!notification.read && (
                        <div className="absolute right-3 top-4">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="border-t border-gray-100 p-3 bg-white">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-center text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => {
                // 通知一覧ページへの遷移（実装予定）
                console.log('Navigate to all notifications')
                setIsOpen(false)
              }}
            >
              すべての通知を見る
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}