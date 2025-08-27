"use client"

import { useEffect } from 'react'

export default function PerformanceOptimizer() {
  useEffect(() => {
    // Skip preloading images that aren't immediately visible
    // PWA icons and logos are already cached by service worker
    const preloadCriticalResources = () => {
      // Only preload resources that are immediately visible and critical
      const criticalResources = [
        // Remove image preloading to avoid warnings
        // These will be loaded when actually needed
      ]
      
      criticalResources.forEach(resource => {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.href = resource
        
        if (resource.endsWith('.css')) {
          link.as = 'style'
        } else if (resource.endsWith('.js')) {
          link.as = 'script'
        } else if (resource.match(/\.(jpg|jpeg|png|webp|avif)$/)) {
          link.as = 'image'
        }
        
        // Check if link already exists
        const existingLink = document.querySelector(`link[href="${resource}"]`)
        if (!existingLink) {
          document.head.appendChild(link)
        }
      })
    }
    
    // Preconnect to external domains
    const preconnectToExternalDomains = () => {
      const domains = [
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://firestore.googleapis.com',
        'https://firebase.googleapis.com'
      ]
      
      domains.forEach(domain => {
        const existingLink = document.querySelector(`link[href="${domain}"]`)
        if (!existingLink) {
          const link = document.createElement('link')
          link.rel = 'preconnect'
          link.href = domain
          link.crossOrigin = 'anonymous'
          document.head.appendChild(link)
        }
      })
    }
    
    // Optimize images - apply lazy loading to all images except logos
    const optimizeImages = () => {
      const images = document.querySelectorAll('img')
      images.forEach(img => {
        // Skip lazy loading for immediately visible logos/icons
        const isLogo = img.src.includes('app_logo.png') || 
                      img.src.includes('icon-192x192.png') ||
                      img.alt?.includes('logo') ||
                      img.className?.includes('logo')
        
        if (!isLogo && !img.loading) {
          img.loading = 'lazy'
        }
        if (!img.decoding) {
          img.decoding = 'async'
        }
        
        // Add intersection observer for better lazy loading
        if (!isLogo && 'IntersectionObserver' in window) {
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                const img = entry.target as HTMLImageElement
                if (img.dataset.src) {
                  img.src = img.dataset.src
                  img.removeAttribute('data-src')
                  observer.unobserve(img)
                }
              }
            })
          }, { threshold: 0.1 })
          
          observer.observe(img)
        }
      })
    }
    
    // Run optimizations
    preloadCriticalResources()
    preconnectToExternalDomains()
    
    // Run image optimization after a short delay
    const imageOptimizationTimer = setTimeout(() => {
      optimizeImages()
    }, 100)
    
    // Clear problematic caches on app load
    const clearProblematicCaches = async () => {
      if ('serviceWorker' in navigator && 'caches' in window) {
        try {
          const cacheNames = await caches.keys()
          
          // Delete any old cache versions
          const oldCaches = cacheNames.filter(name => 
            name.includes('musclegram') && !name.includes('v8')
          )
          
          await Promise.all(
            oldCaches.map(cacheName => {
              console.log('Clearing old cache:', cacheName)
              return caches.delete(cacheName)
            })
          )
          
          // Send cache refresh message to service worker
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'CACHE_REFRESH'
            })
          }
          
        } catch (error) {
          console.warn('Cache clearing failed:', error)
        }
      }
    }
    
    // Clear problematic caches after a short delay
    const cacheCleanupTimer = setTimeout(() => {
      clearProblematicCaches()
    }, 1000)
    
    // Cleanup
    return () => {
      clearTimeout(imageOptimizationTimer)
      clearTimeout(cacheCleanupTimer)
    }
  }, [])

  return null // This component doesn't render anything
}