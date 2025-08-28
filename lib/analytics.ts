import { gtag } from 'gtag'

declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

// Google Analytics Measurement ID (環境変数から取得)
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

// Google Analyticsが有効かどうかをチェック
export const isAnalyticsEnabled = () => {
  return typeof window !== 'undefined' && GA_MEASUREMENT_ID && !isDebugMode()
}

// デバッグモードかどうかをチェック
const isDebugMode = () => {
  return process.env.NODE_ENV === 'development'
}

// Google Analytics初期化
export const initGA = () => {
  if (!isAnalyticsEnabled()) {
    console.log('Google Analytics disabled in development mode')
    return
  }

  // gtag config
  gtag('config', GA_MEASUREMENT_ID!, {
    page_title: document.title,
    page_location: window.location.href,
  })
}

// ページビュー追跡
export const trackPageView = (url: string, title?: string) => {
  if (!isAnalyticsEnabled()) {
    console.log('GA Page View (dev):', { url, title })
    return
  }

  gtag('config', GA_MEASUREMENT_ID!, {
    page_path: url,
    page_title: title || document.title,
  })
}

// カスタムイベント追跡
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (!isAnalyticsEnabled()) {
    console.log('GA Event (dev):', { action, category, label, value })
    return
  }

  gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  })
}

// ワークアウト関連のイベント追跡
export const trackWorkoutEvent = {
  start: (mode: 'live' | 'manual') => {
    trackEvent('workout_start', 'fitness', `mode_${mode}`)
  },
  
  complete: (duration: number, exerciseCount: number, totalSets: number) => {
    trackEvent('workout_complete', 'fitness', 'workout_completed')
    trackEvent('workout_duration', 'fitness', 'duration_minutes', duration)
    trackEvent('workout_exercises', 'fitness', 'exercise_count', exerciseCount)
    trackEvent('workout_sets', 'fitness', 'total_sets', totalSets)
  },
  
  exerciseAdded: (exerciseName: string) => {
    trackEvent('exercise_added', 'fitness', exerciseName)
  },
  
  prAchieved: (exerciseName: string, prType: string, improvement: number) => {
    trackEvent('pr_achieved', 'fitness', `${exerciseName}_${prType}`, Math.round(improvement))
  },
  
  post: (hasPhotos: boolean, commentLength: number) => {
    trackEvent('workout_post', 'social', hasPhotos ? 'with_photos' : 'text_only')
    trackEvent('comment_length', 'social', 'characters', commentLength)
  }
}

// ナビゲーション関連のイベント追跡
export const trackNavigationEvent = {
  tabSwitch: (fromTab: string, toTab: string) => {
    trackEvent('tab_switch', 'navigation', `${fromTab}_to_${toTab}`)
  },
  
  calendarNavigation: (action: 'month_change' | 'date_select', value?: string) => {
    trackEvent('calendar_navigation', 'navigation', action, value ? 1 : 0)
  },
  
  filterUsage: (type: 'muscle_group' | 'exercise' | 'time_range', value: string) => {
    trackEvent('filter_usage', 'analytics', `${type}_${value}`)
  }
}

// ソーシャル関連のイベント追跡
export const trackSocialEvent = {
  like: (postId: string) => {
    trackEvent('post_like', 'social', 'like_toggle')
  },
  
  comment: (postId: string, commentLength: number) => {
    trackEvent('post_comment', 'social', 'comment_added', commentLength)
  },
  
  follow: (targetUserId: string) => {
    trackEvent('user_follow', 'social', 'follow_toggle')
  }
}

// ユーザー関連のイベント追跡
export const trackUserEvent = {
  login: (method: 'email' | 'google') => {
    trackEvent('login', 'auth', method)
  },
  
  signup: (method: 'email' | 'google') => {
    trackEvent('sign_up', 'auth', method)
  },
  
  logout: () => {
    trackEvent('logout', 'auth', 'user_logout')
  },
  
  profileUpdate: (field: string) => {
    trackEvent('profile_update', 'user', field)
  }
}

// パフォーマンス関連のイベント追跡
export const trackPerformanceEvent = {
  pageLoadTime: (pageName: string, loadTime: number) => {
    trackEvent('page_load_time', 'performance', pageName, Math.round(loadTime))
  },
  
  imageUpload: (imageCount: number, totalSize: number) => {
    trackEvent('image_upload', 'media', 'upload_completed', imageCount)
    trackEvent('image_size', 'media', 'total_mb', Math.round(totalSize / 1024 / 1024))
  },
  
  cacheHit: (resourceType: string) => {
    trackEvent('cache_hit', 'performance', resourceType)
  }
}

// エラー追跡
export const trackError = (error: string, page: string, severity: 'low' | 'medium' | 'high') => {
  if (!isAnalyticsEnabled()) {
    console.log('GA Error (dev):', { error, page, severity })
    return
  }

  gtag('event', 'exception', {
    description: `${page}: ${error}`,
    fatal: severity === 'high',
    event_category: 'error',
    event_label: severity
  })
}

// コンバージョン追跡（重要なユーザーアクション）
export const trackConversion = (event: 'first_workout' | 'first_pr' | 'first_post' | 'weekly_active') => {
  if (!isAnalyticsEnabled()) {
    console.log('GA Conversion (dev):', event)
    return
  }

  gtag('event', 'conversion', {
    send_to: GA_MEASUREMENT_ID,
    event_category: 'conversion',
    event_label: event
  })
}