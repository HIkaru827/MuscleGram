"use client"

import { useEffect } from 'react'

export default function PerformanceOptimizer() {
  useEffect(() => {
    // Preload critical resources
    const preloadCriticalResources = () => {
      const criticalResources = [
        '/icon-192x192.png',
        '/app_logo.png'
      ]
      
      criticalResources.forEach(resource => {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.href = resource
        
        if (resource.endsWith('.css')) {
          link.as = 'style'
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
    
    // Optimize images
    const optimizeImages = () => {
      const images = document.querySelectorAll('img')
      images.forEach(img => {
        if (!img.loading) {
          img.loading = 'lazy'
        }
        if (!img.decoding) {
          img.decoding = 'async'
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
    
    // Cleanup
    return () => {
      clearTimeout(imageOptimizationTimer)
    }
  }, [])

  return null // This component doesn't render anything
}