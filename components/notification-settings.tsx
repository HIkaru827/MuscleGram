"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Bell, Clock, Settings } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { NotificationManager } from "@/lib/notification-manager"
import { toast } from "sonner"

interface NotificationSettings {
  enabled: boolean
  time: string
  timezone: string
  userId: string
}

export default function NotificationSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default')

  const notificationManager = NotificationManager.getInstance()

  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

  useEffect(() => {
    // 通知許可状況をチェック
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission)
    } else {
      setPermissionStatus('denied')
    }
  }, [])

  const loadSettings = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const savedSettings = await notificationManager.loadSettings(user.uid)
      setSettings(savedSettings)
      
      if (savedSettings) {
        toast.success('通知設定を読み込みました')
      }
    } catch (error) {
      console.error('設定の読み込みに失敗:', error)
      // エラーが発生してもデフォルト設定で続行
      const defaultSettings = {
        enabled: false,
        time: '09:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userId: user.uid
      }
      setSettings(defaultSettings)
      toast.warning('デフォルト設定を使用します')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (newSettings: NotificationSettings) => {
    if (!user) return
    
    setSaving(true)
    try {
      await notificationManager.saveSettings(newSettings)
      setSettings(newSettings)
      
      if (newSettings.enabled) {
        // 設定が有効な場合、今日の推奨日をチェック
        notificationManager.checkTodaysRecommendations(user.uid)
        toast.success(`通知設定を保存しました（${newSettings.time}に通知）`)
      } else {
        // 設定が無効な場合、全通知をキャンセル
        notificationManager.cancelAllNotifications()
        toast.success('通知設定を無効にしました')
      }
    } catch (error) {
      console.error('設定の保存に失敗:', error)
      toast.error('設定の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handlePermissionRequest = async () => {
    console.log('通知許可をリクエスト中...')
    
    // ブラウザサポートチェック
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('このブラウザは通知をサポートしていません')
      return
    }

    try {
      const granted = await notificationManager.requestPermission()
      const newPermission = granted ? 'granted' : 'denied'
      
      console.log('通知許可結果:', newPermission)
      setPermissionStatus(newPermission)
      
      if (granted) {
        toast.success('通知が許可されました！テスト通知を確認してください')
        
        // 成功時にテスト通知を送信
        setTimeout(() => {
          try {
            const testNotification = new Notification('MuscleGram - 通知許可完了', {
              body: '通知設定が正常に動作しています！',
              icon: '/icon-192x192.png',
              tag: 'test-notification'
            })
            
            // 安全にクローズ
            setTimeout(() => {
              try {
                testNotification.close()
              } catch (e) {
                console.warn('テスト通知のクローズに失敗:', e)
              }
            }, 3000)
          } catch (notificationError) {
            console.warn('テスト通知の作成に失敗:', notificationError)
          }
        }, 1000)
      } else {
        toast.error('通知が拒否されました。ブラウザの設定で許可してください')
      }
    } catch (error) {
      console.error('通知許可リクエストでエラー:', error)
      toast.error('通知許可の処理中にエラーが発生しました')
    }
  }

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!settings || !user) return
    
    if (enabled && permissionStatus !== 'granted') {
      const granted = await notificationManager.requestPermission()
      if (!granted) {
        toast.error('通知を有効にするには、通知許可が必要です')
        return
      }
      setPermissionStatus('granted')
    }
    
    const newSettings = { ...settings, enabled }
    await saveSettings(newSettings)
  }

  const handleTimeChange = async (time: string) => {
    if (!settings) return
    
    const newSettings = { ...settings, time }
    await saveSettings(newSettings)
  }

  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of [0, 30]) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayTime = new Date()
        displayTime.setHours(hour, minute)
        const displayString = displayTime.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit'
        })
        options.push({ value: timeString, label: displayString })
      }
    }
    return options
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Settings className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600">設定の読み込み中にエラーが発生しました</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          トレーニング通知設定
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* デバッグ情報 */}
        <div className="text-xs text-gray-500">
          通知許可状態: {permissionStatus} | ブラウザサポート: {typeof window !== 'undefined' && 'Notification' in window ? 'あり' : 'なし'}
        </div>
        
        {/* 通知許可状況 */}
        {(permissionStatus !== 'granted' || permissionStatus === 'default') && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-yellow-800">通知許可が必要です</p>
                <p className="text-sm text-yellow-600">プッシュ通知を受け取るには許可が必要です</p>
                {permissionStatus === 'denied' && (
                  <p className="text-xs text-yellow-500 mt-1">
                    ※ 拒否されています。ブラウザ設定で許可してください
                  </p>
                )}
              </div>
              <div className="ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePermissionRequest}
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 shrink-0"
                  disabled={false}
                >
                  {permissionStatus === 'denied' ? '再許可する' : '許可する'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 通知のON/OFF */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="notification-enabled" className="text-base font-medium">
              トレーニング推奨日通知
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              AI算出の最適な日に通知を送信します
            </p>
          </div>
          <Switch
            id="notification-enabled"
            checked={settings.enabled}
            onCheckedChange={handleToggleEnabled}
            disabled={saving || permissionStatus === 'denied'}
          />
        </div>

        {/* 通知時刻設定 */}
        {settings.enabled && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Clock className="w-4 h-4" />
              通知時刻
            </Label>
            <Select
              value={settings.time}
              onValueChange={handleTimeChange}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="時刻を選択" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {generateTimeOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600">
              推奨日に指定した時刻で通知が送られます
            </p>
          </div>
        )}

        {/* 通知プレビュー */}
        {settings.enabled && permissionStatus === 'granted' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">通知プレビュー</h4>
            <div className="bg-white p-3 rounded border text-sm">
              <div className="font-medium text-gray-900">MuscleGram - 今日はトレーニングの日！</div>
              <div className="text-gray-600">今日はベンチプレスの日です！AIが算出した最適な日に筋トレしましょう！</div>
            </div>
          </div>
        )}

        {/* テスト通知ボタン */}
        {settings.enabled && permissionStatus === 'granted' && (
          <Button
            variant="outline"
            onClick={() => {
              try {
                console.log('テスト通知を送信中...')
                const notification = new Notification('MuscleGram - テスト通知', {
                  body: '通知設定が正常に動作しています！',
                  icon: '/icon-192x192.png',
                  tag: 'manual-test-notification',
                  requireInteraction: false
                })
                
                notification.onshow = () => {
                  console.log('テスト通知が表示されました')
                  toast.success('テスト通知を送信しました')
                }
                
                notification.onerror = (error) => {
                  console.error('テスト通知エラー:', error)
                  toast.error('テスト通知の送信に失敗しました')
                }
                
                // 安全にクローズ
                setTimeout(() => {
                  try {
                    notification.close()
                  } catch (closeError) {
                    console.warn('テスト通知のクローズに失敗:', closeError)
                  }
                }, 5000)
              } catch (error) {
                console.error('テスト通知の作成に失敗:', error)
                toast.error('テスト通知を作成できませんでした')
              }
            }}
            className="w-full"
          >
            テスト通知を送信
          </Button>
        )}
      </CardContent>
    </Card>
  )
}