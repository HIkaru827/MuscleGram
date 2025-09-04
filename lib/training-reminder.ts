import { checkInactiveUsers, getUser } from './firestore'
import { PushNotificationManager } from './push-notifications'

export interface TrainingReminderOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: any
}

export class TrainingReminderManager {
  private static instance: TrainingReminderManager
  private checkInterval: NodeJS.Timeout | null = null
  private isRunning = false

  private constructor() {}

  static getInstance(): TrainingReminderManager {
    if (!TrainingReminderManager.instance) {
      TrainingReminderManager.instance = new TrainingReminderManager()
    }
    return TrainingReminderManager.instance
  }

  /**
   * 週次リマインダーサービスを開始
   */
  start(): void {
    if (this.isRunning) {
      console.log('Training reminder service is already running')
      return
    }

    this.isRunning = true
    console.log('Starting training reminder service...')

    // 1日に1回チェック (24時間 = 24 * 60 * 60 * 1000ms)
    this.checkInterval = setInterval(() => {
      this.checkAndSendReminders()
    }, 24 * 60 * 60 * 1000)

    // 初回実行
    this.checkAndSendReminders()
  }

  /**
   * 週次リマインダーサービスを停止
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.isRunning = false
    console.log('Training reminder service stopped')
  }

  /**
   * 非アクティブなユーザーをチェックしてリマインダーを送信
   */
  private async checkAndSendReminders(): Promise<void> {
    try {
      console.log('Checking for inactive users...')
      
      const inactiveUserIds = await checkInactiveUsers()
      console.log(`Found ${inactiveUserIds.length} inactive users`)

      for (const userId of inactiveUserIds) {
        await this.sendTrainingReminder(userId)
      }
    } catch (error) {
      console.error('Error in checkAndSendReminders:', error)
    }
  }

  /**
   * 個別のユーザーにトレーニングリマインダーを送信
   */
  private async sendTrainingReminder(userId: string): Promise<void> {
    try {
      const user = await getUser(userId)
      if (!user) {
        console.error(`User not found: ${userId}`)
        return
      }

      const userName = user.displayName || 'ユーザー'
      
      const reminderOptions: TrainingReminderOptions = {
        title: 'MuscleGram - トレーニングリマインダー',
        body: `おつかれさまです！${userName}さん、今日のトレーニングを少しだけ記録してみましょう`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: {
          type: 'training_reminder',
          userId: userId,
          url: '/#record' // Record screen directly
        }
      }

      // PWAプッシュ通知を送信
      const pushManager = PushNotificationManager.getInstance()
      
      await pushManager.showNotification(reminderOptions)
      
      console.log(`Training reminder sent to user: ${userName} (${userId})`)
      
      // ローカルストレージに最後のリマインダー送信日時を記録
      this.recordReminderSent(userId)
      
    } catch (error) {
      console.error(`Error sending training reminder to ${userId}:`, error)
    }
  }

  /**
   * リマインダー送信日時を記録
   */
  private recordReminderSent(userId: string): void {
    try {
      if (typeof window !== 'undefined') {
        const reminderHistory = JSON.parse(
          localStorage.getItem('trainingReminderHistory') || '{}'
        )
        reminderHistory[userId] = new Date().toISOString()
        localStorage.setItem('trainingReminderHistory', JSON.stringify(reminderHistory))
      }
    } catch (error) {
      console.error('Error recording reminder sent:', error)
    }
  }

  /**
   * 最後のリマインダー送信日時を取得
   */
  private getLastReminderSent(userId: string): Date | null {
    try {
      if (typeof window !== 'undefined') {
        const reminderHistory = JSON.parse(
          localStorage.getItem('trainingReminderHistory') || '{}'
        )
        const lastSent = reminderHistory[userId]
        return lastSent ? new Date(lastSent) : null
      }
    } catch (error) {
      console.error('Error getting last reminder sent:', error)
    }
    return null
  }

  /**
   * 特定のユーザーが今日既にリマインダーを受け取ったかチェック
   */
  private hasReceivedReminderToday(userId: string): boolean {
    const lastSent = this.getLastReminderSent(userId)
    if (!lastSent) return false

    const today = new Date()
    const lastSentDate = new Date(lastSent)
    
    return today.toDateString() === lastSentDate.toDateString()
  }

  /**
   * 手動でリマインダーをテスト送信
   */
  async testReminder(userId: string): Promise<void> {
    console.log(`Sending test training reminder to user: ${userId}`)
    await this.sendTrainingReminder(userId)
  }

  /**
   * サービス状態を取得
   */
  getStatus(): { isRunning: boolean; nextCheck: Date | null } {
    return {
      isRunning: this.isRunning,
      nextCheck: this.checkInterval ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null
    }
  }
}

// シングルトンインスタンスをエクスポート
export const trainingReminderManager = TrainingReminderManager.getInstance()

// 通知作成ヘルパー関数
export const createTrainingReminderNotification = (userName: string, userId: string) => {
  return {
    type: 'reminder' as const,
    title: 'トレーニングリマインダー',
    message: `おつかれさまです！${userName}さん、今日のトレーニングを少しだけ記録してみましょう`,
    recipientId: userId,
    fromUserId: 'system',
    data: {
      type: 'training_reminder',
      url: '/#record'
    }
  }
}