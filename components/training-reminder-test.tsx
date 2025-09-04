"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Bell, Play, Square, TestTube } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

export default function TrainingReminderTest() {
  const { user } = useAuth()
  const [isServiceRunning, setIsServiceRunning] = useState(false)
  const [testUserId, setTestUserId] = useState("")
  const [loading, setLoading] = useState(false)

  const handleStartService = async () => {
    try {
      const { trainingReminderManager } = await import('@/lib/training-reminder')
      trainingReminderManager.start(user?.uid)
      setIsServiceRunning(true)
      toast.success("トレーニングリマインダーサービスを開始しました（現在のユーザーのみ）")
    } catch (error) {
      console.error('Error starting service:', error)
      toast.error("サービスの開始に失敗しました")
    }
  }

  const handleStopService = async () => {
    try {
      const { trainingReminderManager } = await import('@/lib/training-reminder')
      trainingReminderManager.stop()
      setIsServiceRunning(false)
      toast.success("トレーニングリマインダーサービスを停止しました")
    } catch (error) {
      console.error('Error stopping service:', error)
      toast.error("サービスの停止に失敗しました")
    }
  }

  const handleTestReminder = async () => {
    if (!testUserId.trim()) {
      toast.error("ユーザーIDを入力してください")
      return
    }

    setLoading(true)
    try {
      const { trainingReminderManager } = await import('@/lib/training-reminder')
      await trainingReminderManager.testReminder(testUserId.trim())
      toast.success("テストリマインダーを送信しました")
    } catch (error) {
      console.error('Error sending test reminder:', error)
      toast.error("テストリマインダーの送信に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const handleTestCurrentUser = async () => {
    if (!user) {
      toast.error("ユーザーがログインしていません")
      return
    }

    setLoading(true)
    try {
      const { trainingReminderManager } = await import('@/lib/training-reminder')
      await trainingReminderManager.testReminder(user.uid)
      toast.success("現在のユーザーにテストリマインダーを送信しました")
    } catch (error) {
      console.error('Error sending test reminder:', error)
      toast.error("テストリマインダーの送信に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">ログインしてください</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>トレーニングリマインダー設定</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">サービス状態</p>
              <p className="text-sm text-gray-600">現在のユーザーが1週間非アクティブな場合に通知を送信</p>
            </div>
            <Badge variant={isServiceRunning ? "default" : "secondary"}>
              {isServiceRunning ? "稼働中" : "停止中"}
            </Badge>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={handleStartService}
              disabled={isServiceRunning}
              variant="default"
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              開始
            </Button>
            <Button 
              onClick={handleStopService}
              disabled={!isServiceRunning}
              variant="outline"
              size="sm"
            >
              <Square className="w-4 h-4 mr-2" />
              停止
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TestTube className="w-5 h-5" />
            <span>テストリマインダー</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-user-id">ユーザーID</Label>
            <Input
              id="test-user-id"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              placeholder="テストするユーザーのIDを入力"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={handleTestReminder}
              disabled={loading || !testUserId.trim()}
              size="sm"
            >
              {loading ? "送信中..." : "テスト送信"}
            </Button>
            <Button 
              onClick={handleTestCurrentUser}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? "送信中..." : "自分にテスト送信"}
            </Button>
          </div>
          
          <div className="text-xs text-gray-500">
            <p>現在のユーザーID: {user.uid}</p>
            <p>メッセージ: "おつかれさまです！今日のトレーニングを少しだけ記録してみましょう"</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}