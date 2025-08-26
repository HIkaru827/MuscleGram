/**
 * Bundle optimization utilities
 */

// Critical resource hints for faster loading
export const preloadCriticalResources = () => {
  if (typeof window === 'undefined') return

  const criticalResources = [
    // Core CSS
    '/_next/static/css/app/layout.css',
    // Critical fonts
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    // Essential icons
    '/icon-192x192.png',
    '/app_logo.png'
  ]

  criticalResources.forEach(resource => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = resource
    
    if (resource.endsWith('.css')) {
      link.as = 'style'
    } else if (resource.endsWith('.woff2')) {
      link.as = 'font'
      link.type = 'font/woff2'
      link.crossOrigin = 'anonymous'
    } else if (resource.match(/\.(jpg|jpeg|png|webp|avif)$/)) {
      link.as = 'image'
    }
    
    document.head.appendChild(link)
  })
}

// Optimize images for better performance
export const optimizeImages = () => {
  if (typeof window === 'undefined') return

  // Use Intersection Observer for lazy loading
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement
        
        // Convert to WebP if supported
        if (supportsWebP() && !img.src.includes('.webp')) {
          const webpSrc = img.src.replace(/\.(jpg|jpeg|png)$/, '.webp')
          img.src = webpSrc
        }
        
        // Add loading and decoding optimizations
        img.loading = 'lazy'
        img.decoding = 'async'
        
        imageObserver.unobserve(img)
      }
    })
  })

  // Observe all images
  document.querySelectorAll('img').forEach(img => {
    imageObserver.observe(img)
  })
}

// Check WebP support
function supportsWebP(): boolean {
  if (typeof window === 'undefined') return false
  
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
}

// Preconnect to external domains
export const preconnectToExternalDomains = () => {
  if (typeof window === 'undefined') return

  const domains = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://firestore.googleapis.com',
    'https://firebase.googleapis.com'
  ]

  domains.forEach(domain => {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = domain
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  })
}

// Code splitting helpers
export const loadComponentWhenVisible = (
  componentLoader: () => Promise<any>,
  fallback: () => JSX.Element
) => {
  return React.lazy(() => {
    return new Promise((resolve) => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            observer.disconnect()
            resolve(componentLoader())
          }
        })
      })
      
      // Create a placeholder element to observe
      const placeholder = document.createElement('div')
      placeholder.style.height = '1px'
      document.body.appendChild(placeholder)
      observer.observe(placeholder)
    })
  })
}

// Resource cleanup for better memory management
export const cleanupUnusedResources = () => {
  if (typeof window === 'undefined') return

  // Remove unused stylesheets
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"]')
  stylesheets.forEach(sheet => {
    const link = sheet as HTMLLinkElement
    if (link.sheet && link.sheet.cssRules.length === 0) {
      link.remove()
    }
  })

  // Clean up unused images in cache
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        if (cacheName.includes('image') || cacheName.includes('media')) {
          caches.open(cacheName).then(cache => {
            cache.keys().then(requests => {
              requests.forEach(request => {
                // Remove old or unused image cache entries
                const url = new URL(request.url)
                const lastUsed = localStorage.getItem(`cache_${url.pathname}`)
                const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
                
                if (!lastUsed || parseInt(lastUsed) < oneWeekAgo) {
                  cache.delete(request)
                }
              })
            })
          })
        }
      })
    })
  }
}

// Initialize all optimizations
export const initializeBundleOptimizations = () => {
  if (typeof window === 'undefined') return

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      runOptimizations()
    })
  } else {
    runOptimizations()
  }
}

function runOptimizations() {
  // Run immediately
  preloadCriticalResources()
  preconnectToExternalDomains()
  
  // Run after a short delay to not block initial render
  setTimeout(() => {
    optimizeImages()
  }, 100)
  
  // Run cleanup after page is fully loaded
  window.addEventListener('load', () => {
    setTimeout(cleanupUnusedResources, 5000)
  })
}