// Cloud Functions の warm-up 用ユーティリティ

const FUNCTIONS_BASE_URL = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL || 'https://us-central1-musclegram-d5b32.cloudfunctions.net'

const FUNCTIONS_TO_WARM = [
  'getTrainingRecommendations',
  'calculateWorkoutFrequency',
  'getWorkoutAnalytics'
]

/**
 * Cloud Functions を予熱して、コールドスタートを防ぐ
 */
export async function warmUpFunctions() {
  if (typeof window === 'undefined') return // サーバーサイドでは実行しない
  
  const warmupPromises = FUNCTIONS_TO_WARM.map(async (functionName) => {
    try {
      // 軽量なpingリクエストを送信
      const response = await fetch(`${FUNCTIONS_BASE_URL}/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ warmup: true, userId: 'warmup-ping' })
      })
      
      if (response.ok) {
        console.log(`✓ Function ${functionName} warmed up`)
      }
    } catch (error) {
      console.warn(`Failed to warm up ${functionName}:`, error)
    }
  })
  
  await Promise.all(warmupPromises)
}

/**
 * アプリ起動時に関数を予熱
 */
export function initializeFunctionWarmup() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // 本番環境でのみ予熱を実行（CORS問題回避）
    setTimeout(() => {
      warmUpFunctions()
    }, 5000)
    
    setInterval(() => {
      warmUpFunctions()
    }, 5 * 60 * 1000)
  }
}