/**
 * Performance monitoring and optimization utilities
 */

interface PerformanceMetrics {
  loadTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  firstInputDelay: number
  cumulativeLayoutShift: number
  bundleSize: number
  cacheHitRatio: number
}

interface RoutePerformance {
  route: string
  loadTime: number
  renderTime: number
  timestamp: number
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {}
  private routeMetrics: RoutePerformance[] = []
  private observers: PerformanceObserver[] = []

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers()
      this.collectInitialMetrics()
    }
  }

  private initializeObservers() {
    // Observe Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          this.metrics.largestContentfulPaint = lastEntry.startTime
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.push(lcpObserver)

        // Observe First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            this.metrics.firstInputDelay = entry.processingStart - entry.startTime
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
        this.observers.push(fidObserver)

        // Observe Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let cls = 0
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              cls += entry.value
            }
          })
          this.metrics.cumulativeLayoutShift = cls
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
        this.observers.push(clsObserver)

      } catch (error) {
        console.warn('Performance Observer not fully supported:', error)
      }
    }
  }

  private collectInitialMetrics() {
    // Wait for page to be fully loaded
    if (document.readyState === 'complete') {
      this.calculateMetrics()
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.calculateMetrics(), 0)
      })
    }
  }

  private calculateMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const paint = performance.getEntriesByType('paint')

    if (navigation) {
      this.metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart
    }

    const fcp = paint.find(entry => entry.name === 'first-contentful-paint')
    if (fcp) {
      this.metrics.firstContentfulPaint = fcp.startTime
    }

    // Estimate bundle size from resource timings
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const jsResources = resources.filter(r => r.name.includes('.js'))
    this.metrics.bundleSize = jsResources.reduce((total, resource) => {
      return total + (resource.transferSize || 0)
    }, 0)

    // Calculate cache hit ratio
    const cachedResources = resources.filter(r => r.transferSize === 0 && r.decodedBodySize > 0)
    this.metrics.cacheHitRatio = cachedResources.length / resources.length
  }

  trackRouteChange(route: string, startTime: number = performance.now()) {
    const endTime = performance.now()
    const loadTime = endTime - startTime

    // Measure render time
    requestIdleCallback(() => {
      const renderTime = performance.now() - endTime
      
      this.routeMetrics.push({
        route,
        loadTime,
        renderTime,
        timestamp: Date.now()
      })

      // Keep only last 50 route changes
      if (this.routeMetrics.length > 50) {
        this.routeMetrics = this.routeMetrics.slice(-50)
      }
    })
  }

  getMetrics(): PerformanceMetrics {
    return this.metrics as PerformanceMetrics
  }

  getRouteMetrics(): RoutePerformance[] {
    return [...this.routeMetrics]
  }

  getPerformanceScore(): number {
    const metrics = this.metrics
    let score = 100

    // Penalize slow load times
    if (metrics.loadTime && metrics.loadTime > 3000) {
      score -= Math.min(30, (metrics.loadTime - 3000) / 100)
    }

    // Penalize slow LCP
    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) {
      score -= Math.min(25, (metrics.largestContentfulPaint - 2500) / 100)
    }

    // Penalize high FID
    if (metrics.firstInputDelay && metrics.firstInputDelay > 100) {
      score -= Math.min(25, (metrics.firstInputDelay - 100) / 10)
    }

    // Penalize high CLS
    if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) {
      score -= Math.min(20, metrics.cumulativeLayoutShift * 100)
    }

    return Math.max(0, Math.round(score))
  }

  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = []
    const metrics = this.metrics

    if (metrics.loadTime && metrics.loadTime > 3000) {
      suggestions.push('ページの読み込み時間が長いです。画像の最適化やコード分割を検討してください。')
    }

    if (metrics.bundleSize && metrics.bundleSize > 500000) {
      suggestions.push('バンドルサイズが大きいです。不要なライブラリの削除や遅延読み込みを検討してください。')
    }

    if (metrics.cacheHitRatio && metrics.cacheHitRatio < 0.7) {
      suggestions.push('キャッシュ効率が低いです。Service Workerの設定を見直してください。')
    }

    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) {
      suggestions.push('最大コンテントフルペイントが遅いです。重要なコンテンツの優先読み込みを検討してください。')
    }

    if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) {
      suggestions.push('レイアウトシフトが発生しています。画像やフォントのサイズ指定を明確にしてください。')
    }

    return suggestions
  }

  exportReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      routeMetrics: this.routeMetrics,
      performanceScore: this.getPerformanceScore(),
      suggestions: this.getOptimizationSuggestions(),
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt
      } : null
    }

    return JSON.stringify(report, null, 2)
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Hook for React components
export const usePerformanceMonitor = () => {
  return {
    trackRouteChange: performanceMonitor.trackRouteChange.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getScore: performanceMonitor.getPerformanceScore.bind(performanceMonitor),
    getSuggestions: performanceMonitor.getOptimizationSuggestions.bind(performanceMonitor),
    exportReport: performanceMonitor.exportReport.bind(performanceMonitor)
  }
}

// Utility functions for performance optimization
export const optimizeImages = (images: NodeListOf<HTMLImageElement>) => {
  images.forEach(img => {
    if (!img.loading) {
      img.loading = 'lazy'
    }
    
    if (!img.decoding) {
      img.decoding = 'async'
    }
  })
}

export const preloadCriticalResources = (resources: string[]) => {
  resources.forEach(resource => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = resource
    
    if (resource.endsWith('.js')) {
      link.as = 'script'
    } else if (resource.endsWith('.css')) {
      link.as = 'style'
    } else if (resource.match(/\.(jpg|jpeg|png|webp|avif)$/)) {
      link.as = 'image'
    }
    
    document.head.appendChild(link)
  })
}