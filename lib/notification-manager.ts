interface NotificationSettings {
  enabled: boolean
  time: string // HH:MM format (24-hour)
  timezone: string
  userId: string
}

interface TrainingNotification {
  exerciseName: string
  scheduledDate: string
  notificationId: string
}

export class NotificationManager {
  private static instance: NotificationManager
  private settings: NotificationSettings | null = null
  private scheduledNotifications: Map<string, number> = new Map()

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  /**
   * 通知許可をリクエスト
   */
  async requestPermission(): Promise<boolean> {
    // ブラウザサポートチェック
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('このブラウザは通知をサポートしていません')
      return false
    }

    try {
      // 既に許可されている場合
      if (Notification.permission === 'granted') {
        console.log('通知は既に許可されています')
        return true
      }

      // 明示的に拒否されている場合も再試行
      console.log(`現在の通知許可状態: ${Notification.permission}`)

      // Promiseベースとコールバックベースの両方をサポート
      let permission: NotificationPermission
      
      if ('requestPermission' in Notification && typeof Notification.requestPermission === 'function') {
        const result = Notification.requestPermission()
        
        // Promise を返す場合
        if (result && typeof result.then === 'function') {
          permission = await result
        } 
        // コールバック形式の場合
        else {
          permission = result as NotificationPermission
        }
      } else {
        console.error('Notification.requestPermission が利用できません')
        return false
      }

      console.log(`通知許可リクエスト結果: ${permission}`)
      return permission === 'granted'
      
    } catch (error) {
      console.error('通知許可リクエスト中にエラーが発生:', error)
      
      // フォールバック: 現在の状態をチェック
      if (Notification.permission === 'granted') {
        console.log('エラー後に許可状態を確認: 許可されています')
        return true
      }
      
      return false
    }
  }

  /**
   * 通知設定を保存
   */
  async saveSettings(settings: NotificationSettings): Promise<void> {
    this.settings = settings
    
    // LocalStorageに保存（最優先）
    if (typeof window !== 'undefined') {
      localStorage.setItem('musclegram-notification-settings', JSON.stringify(settings))
    }

    // Firestoreにも保存を試行（失敗しても問題なし）
    try {
      const { doc, setDoc } = await import('firebase/firestore')
      const { db } = await import('./firebase')
      
      await setDoc(doc(db, `users/${settings.userId}/settings/notifications`), settings, { merge: true })
      console.log('通知設定をFirestoreに保存しました')
    } catch (error) {
      console.warn('Firestoreへの保存は失敗しましたが、ローカルストレージに保存されています:', error)
      // Firestoreの失敗はエラーとして扱わない
    }
  }

  /**
   * 通知設定を読み込み
   */
  async loadSettings(userId: string): Promise<NotificationSettings | null> {
    if (this.settings && this.settings.userId === userId) {
      return this.settings
    }

    // まずLocalStorageから読み込み（最も確実）
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('musclegram-notification-settings')
      if (saved) {
        try {
          const settings = JSON.parse(saved) as NotificationSettings
          if (settings.userId === userId) {
            this.settings = settings
            console.log('通知設定をローカルストレージから読み込みました')
            return settings
          }
        } catch (error) {
          console.warn('ローカルストレージの設定が破損しています:', error)
          localStorage.removeItem('musclegram-notification-settings')
        }
      }
    }

    // Firestoreから読み込みを試行（失敗しても継続）
    try {
      const { doc, getDoc } = await import('firebase/firestore')
      const { db } = await import('./firebase')
      
      const settingsDoc = await getDoc(doc(db, `users/${userId}/settings/notifications`))
      
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data() as NotificationSettings
        this.settings = settings
        
        // ローカルストレージにも保存
        if (typeof window !== 'undefined') {
          localStorage.setItem('musclegram-notification-settings', JSON.stringify(settings))
        }
        
        console.log('通知設定をFirestoreから読み込みました')
        return settings
      }
    } catch (error) {
      console.warn('Firestoreからの読み込みに失敗しました。デフォルト設定を使用します:', error)
    }

    // デフォルト設定を返す
    const defaultSettings: NotificationSettings = {
      enabled: false,
      time: '09:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      userId
    }

    this.settings = defaultSettings
    
    // デフォルト設定をローカルストレージに保存
    if (typeof window !== 'undefined') {
      localStorage.setItem('musclegram-notification-settings', JSON.stringify(defaultSettings))
    }
    
    console.log('デフォルトの通知設定を作成しました')
    return defaultSettings
  }

  /**
   * トレーニング推奨日の通知をスケジュール
   */
  scheduleTrainingNotification(exerciseName: string, recommendedDate: Date): void {
    if (!this.settings || !this.settings.enabled) {
      return
    }

    const notificationId = `training-${exerciseName}-${recommendedDate.toISOString().split('T')[0]}`
    
    // 既存の通知があればキャンセル
    if (this.scheduledNotifications.has(notificationId)) {
      clearTimeout(this.scheduledNotifications.get(notificationId)!)
    }

    // 通知時刻を計算
    const [hours, minutes] = this.settings.time.split(':').map(Number)
    const notificationDate = new Date(recommendedDate)
    notificationDate.setHours(hours, minutes, 0, 0)

    // 過去の日付の場合はスケジュールしない
    if (notificationDate < new Date()) {
      return
    }

    const delay = notificationDate.getTime() - new Date().getTime()

    const timeoutId = setTimeout(() => {
      this.showTrainingNotification(exerciseName)
      this.scheduledNotifications.delete(notificationId)
    }, delay)

    this.scheduledNotifications.set(notificationId, timeoutId)
    
    console.log(`通知をスケジュール: ${exerciseName} - ${notificationDate.toLocaleString()}`)
  }

  /**
   * トレーニング通知を表示
   */
  private showTrainingNotification(exerciseName: string): void {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      console.warn('通知を表示できません:', { 
        hasWindow: typeof window !== 'undefined',
        hasNotification: typeof window !== 'undefined' && 'Notification' in window,
        permission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unknown'
      })
      return
    }

    try {
      const notification = new Notification('MuscleGram - 今日はトレーニングの日！', {
        body: `今日は${exerciseName}の日です！AIが算出した最適な日に筋トレしましょう！`,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `training-${exerciseName}`,
        requireInteraction: false, // requireInteraction を false に変更
        silent: false
      })

      // イベントリスナーをtry-catchで囲む
      try {
        notification.onclick = (event) => {
          event.preventDefault()
          console.log('通知がクリックされました')
          
          // アプリを開いて記録画面に遷移
          if (typeof window !== 'undefined') {
            window.focus()
            window.location.href = '/record'
          }
          notification.close()
        }

        notification.onerror = (error) => {
          console.error('通知表示エラー:', error)
        }

        notification.onshow = () => {
          console.log('通知が表示されました:', exerciseName)
        }

        notification.onclose = () => {
          console.log('通知が閉じられました:', exerciseName)
        }
      } catch (listenerError) {
        console.warn('通知リスナー設定エラー:', listenerError)
      }

      // 15秒後に自動で閉じる
      setTimeout(() => {
        try {
          notification.close()
        } catch (closeError) {
          console.warn('通知クローズエラー:', closeError)
        }
      }, 15000)

      console.log('トレーニング通知を表示しました:', exerciseName)
      
    } catch (error) {
      console.error('通知作成エラー:', error)
    }
  }

  /**
   * 全ての通知をキャンセル
   */
  cancelAllNotifications(): void {
    this.scheduledNotifications.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    this.scheduledNotifications.clear()
  }

  /**
   * 特定の運動の通知をキャンセル
   */
  cancelNotificationForExercise(exerciseName: string): void {
    const keysToRemove: string[] = []
    
    this.scheduledNotifications.forEach((timeoutId, notificationId) => {
      if (notificationId.includes(`training-${exerciseName}`)) {
        clearTimeout(timeoutId)
        keysToRemove.push(notificationId)
      }
    })
    
    keysToRemove.forEach(key => {
      this.scheduledNotifications.delete(key)
    })
  }

  /**
   * 今日が推奨日の運動をチェックして通知
   */
  async checkTodaysRecommendations(userId: string): Promise<void> {
    if (!this.settings || !this.settings.enabled) {
      return
    }

    try {
      // デモモードの場合は、サンプル推奨日をテスト
      const isDemoMode = process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo-api-key'
      
      if (isDemoMode) {
        // デモ用の仮想推奨日（テスト用）
        console.log('デモモード: 仮想トレーニング推奨日をチェック中...')
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        this.scheduleTrainingNotification('ベンチプレス', tomorrow)
        return
      }

      const { getAllTrainingRecommendations } = await import('./training-analytics')
      const recommendations = await getAllTrainingRecommendations(userId)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      let scheduledCount = 0
      recommendations.forEach(rec => {
        const recDate = new Date(rec.nextRecommendedDate)
        recDate.setHours(0, 0, 0, 0)
        
        if (recDate.getTime() === today.getTime() && 
            (rec.status === 'due_soon' || rec.status === 'overdue')) {
          // 今日推奨日の運動があれば通知をスケジュール
          this.scheduleTrainingNotification(rec.exerciseName, rec.nextRecommendedDate)
          scheduledCount++
        }
      })
      
      console.log(`${scheduledCount}件のトレーニング通知をスケジュールしました`)
    } catch (error) {
      console.error('推奨日チェック中にエラー:', error)
    }
  }

  /**
   * 定期的に推奨日をチェック（アプリ起動時に呼ぶ）
   */
  startDailyCheck(userId: string): void {
    // 起動時に一度チェック
    this.checkTodaysRecommendations(userId)
    
    // 1時間ごとにチェック
    const intervalId = setInterval(() => {
      this.checkTodaysRecommendations(userId)
    }, 60 * 60 * 1000) // 1時間

    // アプリが閉じられる時にクリーンアップ
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        clearInterval(intervalId)
      })
    }
  }
}