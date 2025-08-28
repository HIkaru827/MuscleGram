import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { trackPageView, trackNavigationEvent } from '@/lib/analytics'

export function useAnalytics() {
  const router = useRouter()

  // ページビューを追跡
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      trackPageView(url)
    }

    // 初回ページロード
    trackPageView(window.location.pathname + window.location.search)

    // ルート変更を監視（Next.js 13+ App Router用）
    const originalPush = router.push
    const originalReplace = router.replace

    router.push = (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : args[0].pathname
      handleRouteChange(url)
      return originalPush.apply(router, args)
    }

    router.replace = (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : args[0].pathname
      handleRouteChange(url)
      return originalReplace.apply(router, args)
    }

    return () => {
      router.push = originalPush
      router.replace = originalReplace
    }
  }, [router])

  // タブスイッチを追跡
  const trackTabSwitch = useCallback((fromTab: string, toTab: string) => {
    trackNavigationEvent.tabSwitch(fromTab, toTab)
  }, [])

  return {
    trackTabSwitch
  }
}

// ページごとの analytics hook
export function usePageAnalytics(pageName: string) {
  useEffect(() => {
    const startTime = performance.now()

    return () => {
      const loadTime = performance.now() - startTime
      // ページ離脱時にロード時間を記録
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'page_load_time', {
          event_category: 'performance',
          event_label: pageName,
          value: Math.round(loadTime)
        })
      }
    }
  }, [pageName])
}