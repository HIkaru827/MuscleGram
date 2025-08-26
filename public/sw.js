const CACHE_NAME = 'musclegram-v3'
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

// Fetch event
self.addEventListener('fetch', (event) => {
  // Skip service worker for API requests to avoid CORS issues
  if (event.request.url.includes('cloudfunctions.net') || 
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('gstatic.com') ||
      event.request.url.includes('accounts.google.com') ||
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('/api/')) {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response
        }
        return fetch(event.request)
      })
      .catch((error) => {
        console.error('Service Worker fetch error:', error)
        // Fallback to network request if cache fails
        return fetch(event.request).catch(() => {
          // If both cache and network fail, return offline page or error response
          if (event.request.destination === 'document') {
            return new Response(
              '<!DOCTYPE html><html><head><title>オフライン</title></head><body><h1>オフラインです</h1><p>インターネット接続を確認してください。</p></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            )
          }
          return new Response('Network Error', { status: 408 })
        })
      })
  )
})

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