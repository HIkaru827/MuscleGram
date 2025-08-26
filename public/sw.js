const CACHE_NAME = 'musclegram-v5'
const urlsToCache = [
  '/',
  '/icon-192x192.png',
  '/icon-512x512.png', 
  '/app_logo.png',
  '/manifest.json'
]

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Installing cache', CACHE_NAME)
        return cache.addAll(urlsToCache)
      })
      .catch((error) => {
        console.error('SW: Cache installation failed:', error)
      })
  )
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
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

  // Enhanced fetch strategy with timeout
  event.respondWith(
    Promise.race([
      caches.match(event.request)
        .then((response) => {
          if (response) {
            // Cache hit - return cached response but also try to update cache in background
            fetchAndUpdateCache(event.request)
            return response
          }
          // Cache miss - fetch from network with timeout
          return fetchWithTimeout(event.request, 5000)
        }),
      // Fallback timeout
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Service Worker timeout')), 10000)
      )
    ])
    .catch((error) => {
      console.error('Service Worker fetch error:', error)
      
      // Try cache one more time before giving up
      return caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          
          // Final fallback
          if (event.request.destination === 'document') {
            return new Response(
              '<!DOCTYPE html><html><head><title>オフライン</title></head><body><h1>読み込み中...</h1><p>アプリを読み込んでいます。しばらくお待ちください。</p><script>setTimeout(() => window.location.reload(), 3000)</script></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            )
          }
          return new Response('Service Unavailable', { 
            status: 503,
            statusText: 'Service Worker Error' 
          })
        })
    })
  )
})

// Helper function to fetch with timeout
function fetchWithTimeout(request, timeout = 5000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Fetch timeout')), timeout)
    )
  ])
}

// Helper function to update cache in background
function fetchAndUpdateCache(request) {
  fetchWithTimeout(request, 3000)
    .then(response => {
      if (response.ok) {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(request, response.clone())
        })
      }
    })
    .catch(error => {
      console.log('Background cache update failed:', error.message)
    })
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