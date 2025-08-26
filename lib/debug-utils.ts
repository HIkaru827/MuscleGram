/**
 * Production debugging utilities for MuscleGram
 * Provides safe logging and diagnostic tools that work in production
 */

interface DebugInfo {
  timestamp: string
  userAgent: string
  url: string
  user: string | null
  authState: string
  serviceWorkerStatus: string
  cacheStatus: string
}

interface PerformanceMetrics {
  loadStart: number
  domContentLoaded: number
  loadComplete: number
  authResolution: number
  firstRender: number
}

class ProductionDebugger {
  private metrics: Partial<PerformanceMetrics> = {}
  private logs: string[] = []
  private maxLogs = 100

  constructor() {
    this.metrics.loadStart = performance.now()
    
    if (typeof window !== 'undefined') {
      // Track key performance events
      document.addEventListener('DOMContentLoaded', () => {
        this.metrics.domContentLoaded = performance.now()
        this.log('DOM content loaded')
      })
      
      window.addEventListener('load', () => {
        this.metrics.loadComplete = performance.now()
        this.log('Window load complete')
      })
    }
  }

  log(message: string, data?: any) {
    const timestamp = new Date().toISOString()
    const logEntry = data 
      ? `[${timestamp}] ${message}: ${JSON.stringify(data)}`
      : `[${timestamp}] ${message}`
    
    this.logs.push(logEntry)
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
    
    // Always log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(message, data || '')
    }
  }

  markAuthResolution() {
    this.metrics.authResolution = performance.now()
    this.log('Auth state resolved', {
      timeTaken: `${this.metrics.authResolution - this.metrics.loadStart}ms`
    })
  }

  markFirstRender() {
    this.metrics.firstRender = performance.now()
    this.log('First render complete', {
      timeTaken: `${this.metrics.firstRender - this.metrics.loadStart}ms`
    })
  }

  async getDebugInfo(): Promise<DebugInfo> {
    const serviceWorkerStatus = await this.getServiceWorkerStatus()
    const cacheStatus = await this.getCacheStatus()
    
    return {
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      user: this.getCurrentUser(),
      authState: this.getAuthState(),
      serviceWorkerStatus,
      cacheStatus
    }
  }

  private getCurrentUser(): string | null {
    try {
      // Try to get user from localStorage or other storage
      if (typeof window !== 'undefined') {
        const user = localStorage.getItem('musclegram-user')
        return user ? JSON.parse(user).uid : null
      }
    } catch {
      return null
    }
    return null
  }

  private getAuthState(): string {
    // This would be called from components that have access to auth context
    return 'unknown'
  }

  private async getServiceWorkerStatus(): Promise<string> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return 'not-supported'
    }
    
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) return 'not-registered'
      
      if (registration.active) return 'active'
      if (registration.installing) return 'installing'
      if (registration.waiting) return 'waiting'
      
      return 'unknown'
    } catch {
      return 'error'
    }
  }

  private async getCacheStatus(): Promise<string> {
    if (typeof window === 'undefined' || !('caches' in window)) {
      return 'not-supported'
    }
    
    try {
      const cacheNames = await caches.keys()
      return `${cacheNames.length} caches: ${cacheNames.join(', ')}`
    } catch {
      return 'error'
    }
  }

  getMetrics(): PerformanceMetrics & { logs: string[] } {
    return {
      ...this.metrics,
      logs: [...this.logs]
    } as PerformanceMetrics & { logs: string[] }
  }

  // Export debug data for support
  exportDebugData(): string {
    return JSON.stringify({
      metrics: this.metrics,
      logs: this.logs,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    }, null, 2)
  }

  // Clear old data
  clear() {
    this.logs = []
    this.metrics = { loadStart: performance.now() }
  }
}

// Global instance
export const debugger = new ProductionDebugger()

// Helper functions for components
export const logAuthEvent = (event: string, data?: any) => {
  debugger.log(`AUTH: ${event}`, data)
}

export const logAppEvent = (event: string, data?: any) => {
  debugger.log(`APP: ${event}`, data)
}

export const logError = (error: string, details?: any) => {
  debugger.log(`ERROR: ${error}`, details)
  
  // In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to error tracking service
    // errorTrackingService.captureError(error, details)
  }
}

// Component hook for debugging
export const useDebugger = () => {
  return {
    log: debugger.log.bind(debugger),
    logAuth: logAuthEvent,
    logApp: logAppEvent,
    logError,
    getDebugInfo: debugger.getDebugInfo.bind(debugger),
    exportData: debugger.exportDebugData.bind(debugger),
    markAuthResolution: debugger.markAuthResolution.bind(debugger),
    markFirstRender: debugger.markFirstRender.bind(debugger)
  }
}