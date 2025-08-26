/**
 * Lazy loaded components with proper loading states
 */

import dynamic from 'next/dynamic'

// Create optimized loading components
const createLoadingComponent = (name: string) => () => (
  <div className="flex items-center justify-center h-32">
    <div className="flex flex-col items-center space-y-2">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
      <span className="text-sm text-gray-500">{name}を読み込んでいます...</span>
    </div>
  </div>
)

// Screen components with optimized loading
export const LazyHomeScreen = dynamic(() => import('@/components/home-screen'), {
  loading: createLoadingComponent('ホーム画面'),
  ssr: false
})

export const LazyRecordScreen = dynamic(() => import('@/components/record-screen'), {
  loading: createLoadingComponent('記録画面'),
  ssr: false
})

export const LazyAnalyticsScreen = dynamic(() => import('@/components/analytics-screen'), {
  loading: () => (
    <div className="p-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border rounded-lg p-4 skeleton-box h-24"></div>
      ))}
    </div>
  ),
  ssr: false
})

export const LazyCommunityScreen = dynamic(() => import('@/components/community-screen'), {
  loading: createLoadingComponent('コミュニティ画面'),
  ssr: false
})

export const LazyProfileScreen = dynamic(() => import('@/components/profile-screen'), {
  loading: createLoadingComponent('プロフィール画面'),
  ssr: false
})

// Heavy components that should be loaded lazily
export const LazyTimerDialog = dynamic(() => import('@/components/timer-dialog'), {
  loading: createLoadingComponent('タイマー'),
  ssr: false
})

export const LazyWorkoutCalendar = dynamic(() => import('@/components/workout-calendar'), {
  loading: createLoadingComponent('カレンダー'),
  ssr: false
})

export const LazyPRRecommendationModal = dynamic(() => import('@/components/PR/PRRecommendationModal'), {
  loading: createLoadingComponent('PR推奨'),
  ssr: false
})

// Chart components (heavy libraries)
export const LazyChart = dynamic(() => import('@/components/ui/chart'), {
  loading: createLoadingComponent('グラフ'),
  ssr: false
})

// Date picker (heavy component)
export const LazyDatePicker = dynamic(() => import('react-day-picker').then(mod => ({ default: mod.DayPicker })), {
  loading: createLoadingComponent('日付選択'),
  ssr: false
})

// Carousel (if needed)
export const LazyCarousel = dynamic(() => import('@/components/ui/carousel'), {
  loading: createLoadingComponent('カルーセル'),
  ssr: false
})