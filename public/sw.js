const CACHE_NAME = 'musclegram-v1'
const urlsToCache = [
  '/',
  '/icon-192.svg',
  '/icon-512.svg',
  '/manifest.json'
]

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
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
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response
        }
        return fetch(event.request)
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