/**
 * Component caching utility for better performance
 */

import { ComponentType } from 'react'

interface CacheEntry {
  component: ComponentType<any>
  timestamp: number
  accessCount: number
}

class ComponentCache {
  private cache: Map<string, CacheEntry> = new Map()
  private maxCacheSize = 10
  private maxAge = 5 * 60 * 1000 // 5 minutes

  set(key: string, component: ComponentType<any>) {
    // Clean old entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanup()
    }

    this.cache.set(key, {
      component,
      timestamp: Date.now(),
      accessCount: 0
    })
  }

  get(key: string): ComponentType<any> | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      return null
    }

    // Update access count and timestamp
    entry.accessCount++
    entry.timestamp = Date.now()
    
    return entry.component
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  private cleanup() {
    const entries = Array.from(this.cache.entries())
    
    // Remove expired entries
    const now = Date.now()
    const validEntries = entries.filter(([_, entry]) => 
      now - entry.timestamp < this.maxAge
    )

    if (validEntries.length >= this.maxCacheSize) {
      // Sort by access count and timestamp, remove least used
      validEntries.sort((a, b) => {
        const [, entryA] = a
        const [, entryB] = b
        
        // Prioritize by access count, then by timestamp
        if (entryA.accessCount !== entryB.accessCount) {
          return entryA.accessCount - entryB.accessCount
        }
        return entryA.timestamp - entryB.timestamp
      })
      
      // Remove oldest/least accessed entries
      const toRemove = validEntries.slice(0, validEntries.length - this.maxCacheSize + 1)
      toRemove.forEach(([key]) => this.cache.delete(key))
    }

    // Rebuild cache with valid entries
    this.cache.clear()
    validEntries.slice(-this.maxCacheSize).forEach(([key, entry]) => {
      this.cache.set(key, entry)
    })
  }

  clear() {
    this.cache.clear()
  }

  size() {
    return this.cache.size
  }

  getStats() {
    const entries = Array.from(this.cache.values())
    return {
      size: this.cache.size,
      totalAccess: entries.reduce((sum, entry) => sum + entry.accessCount, 0),
      averageAccess: entries.length > 0 
        ? entries.reduce((sum, entry) => sum + entry.accessCount, 0) / entries.length 
        : 0,
      oldestEntry: entries.length > 0 
        ? Math.min(...entries.map(entry => entry.timestamp))
        : null
    }
  }
}

// Global cache instance
export const componentCache = new ComponentCache()

// Hook for using component cache
export const useComponentCache = () => {
  return {
    get: componentCache.get.bind(componentCache),
    set: componentCache.set.bind(componentCache),
    has: componentCache.has.bind(componentCache),
    clear: componentCache.clear.bind(componentCache),
    getStats: componentCache.getStats.bind(componentCache)
  }
}