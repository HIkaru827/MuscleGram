const CACHE_NAME = 'musclegram-v6'
const STATIC_CACHE = 'static-v6'
const DYNAMIC_CACHE = 'dynamic-v6'

// Critical resources that should be cached immediately
const urlsToCache = [
  '/',
  '/icon-192x192.png',
  '/icon-512x512.png', 
  '/app_logo.png',
  '/manifest.json'
]

// Resources that should be cached dynamically
const dynamicCacheUrls = [
  '/_next/static/css/',
  '/_next/static/chunks/',
  '/_next/static/media/',
  '/api/',
  '/images/'
]

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('SW: Installing static cache', STATIC_CACHE)
          return cache.addAll(urlsToCache)
        }),
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          console.log('SW: Creating dynamic cache', DYNAMIC_CACHE)
        })
    ])
    .catch((error) => {
      console.error('SW: Cache installation failed:', error)
    })
  )
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE]
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('SW: Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event with improved error handling
self.addEventListener('fetch', (event) => {
  // Skip service worker for external APIs and development requests
  if (event.request.url.includes('cloudfunctions.net') || 
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('gstatic.com') ||
      event.request.url.includes('accounts.google.com') ||
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('google.com') ||
      event.request.url.includes('google-analytics.com') ||
      event.request.url.includes('googletagmanager.com') ||
      event.request.url.includes('/api/') ||
      event.request.url.includes('_next/webpack-hmr') ||
      event.request.url.includes('_next/static/chunks/webpack.js') ||
      (event.request.url.includes('localhost') && event.request.url.includes('?v='))) {
    return
  }

  // Improved caching strategy
  event.respondWith(
    getCachedResponse(event.request)
      .catch((error) => {
        console.error('Service Worker fetch error:', error)
        return getOfflineResponse(event.request)
      })
  )
})

// Smart caching strategy
async function getCachedResponse(request) {
  // Check static cache first for critical resources
  const staticResponse = await caches.match(request, { cacheName: STATIC_CACHE })
  if (staticResponse) {
    return staticResponse
  }

  // Check dynamic cache
  const dynamicResponse = await caches.match(request, { cacheName: DYNAMIC_CACHE })
  if (dynamicResponse) {
    // Update cache in background if it's old
    updateCacheInBackground(request)
    return dynamicResponse
  }

  // Fetch from network and cache if appropriate
  return fetchAndCache(request)
}

async function fetchAndCache(request) {
  try {
    const response = await fetchWithTimeout(request, 5000)
    
    if (response.ok && shouldCache(request)) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    throw error
  }
}

function shouldCache(request) {
  const url = request.url
  return dynamicCacheUrls.some(pattern => url.includes(pattern)) ||
         request.destination === 'image' ||
         request.destination === 'style' ||
         request.destination === 'script'
}

function fetchWithTimeout(request, timeout = 5000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Fetch timeout')), timeout)
    )
  ])
}

async function updateCacheInBackground(request) {
  try {
    const response = await fetchWithTimeout(request, 3000)
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      await cache.put(request, response)
    }
  } catch (error) {
    // Silent failure for background updates
  }
}

function getOfflineResponse(request) {
  if (request.destination === 'document') {
    return new Response(
      '<!DOCTYPE html><html><head><title>オフライン</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;text-align:center;padding:2rem;}</style></head><body><h1>🔄 読み込み中...</h1><p>アプリを読み込んでいます。</p><button onclick="location.reload()">再試行</button></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
  return new Response('Offline', { status: 503 })
}

// Background sync for workout timer
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'WORKOUT_START') {
    // Store workout start time in IndexedDB or Cache API
    const startTime = event.data.startTime
    
    // Set up background timer
    setInterval(() => {
      // Send current time to all clients
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'TIMER_UPDATE',
            currentTime: Date.now()
          })
        })
      })
    }, 1000)
  }
  
  if (event.data && event.data.type === 'TIMER_SET') {
    const { duration, startTime } = event.data
    
    // Set timer notification
    setTimeout(() => {
      self.registration.showNotification('MuscleGram タイマー', {
        body: 'タイマーが終了しました！',
        icon: '/icon-192.svg',
        badge: '/icon-192.svg',
        vibrate: [200, 100, 200],
        tag: 'timer-complete',
        actions: [
          {
            action: 'view',
            title: 'アプリを開く'
          }
        ]
      })
    }, duration * 1000)
  }

  if (event.data && event.data.type === 'CACHE_REFRESH') {
    // Clear all caches and reload
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Deleting cache:', cacheName)
          return caches.delete(cacheName)
        })
      )
    }).then(() => {
      console.log('All caches cleared, reloading clients')
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'CACHE_CLEARED' })
        })
      })
    })
  }
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})