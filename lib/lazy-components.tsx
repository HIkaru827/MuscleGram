/**
 * Lazy loaded components with proper loading states
 */

import dynamic from 'next/dynamic'

// Fast loading component
const FastLoading = () => (
  <div className="flex items-center justify-center h-32">
    <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent" />
  </div>
)

// Screen components with minimal loading delay
export const LazyHomeScreen = dynamic(() => import('@/components/home-screen'), {
  loading: FastLoading
})

export const LazyRecordScreen = dynamic(() => import('@/components/record-screen'), {
  loading: FastLoading
})

export const LazyAnalyticsScreen = dynamic(() => import('@/components/analytics-screen'), {
  loading: () => (
    <div className="p-4 space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-100 rounded-lg h-16 animate-pulse"></div>
      ))}
    </div>
  )
})

export const LazyCommunityScreen = dynamic(() => import('@/components/community-screen'), {
  loading: FastLoading
})

export const LazyProfileScreen = dynamic(() => import('@/components/profile-screen'), {
  loading: FastLoading
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