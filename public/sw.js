const CACHE_NAME = 'musclegram-v8'
const STATIC_CACHE = 'static-v8'
const DYNAMIC_CACHE = 'dynamic-v8'

// Critical resources that should be cached immediately
const urlsToCache = [
  '/',
  '/manifest.json'
  // Remove icon preloading - they'll be cached when actually requested
]

// Resources that should be cached dynamically
const dynamicCacheUrls = [
  '/_next/static/css/',
  '/_next/static/chunks/',
  '/_next/static/media/',
  '/api/',
  '/images/'
]

// Install event with mobile error handling
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('SW: Installing static cache', STATIC_CACHE)
          return cache.addAll(urlsToCache).catch((error) => {
            console.warn('SW: Failed to cache some resources:', error)
            // Don't fail the entire installation if some resources fail
            return Promise.resolve()
          })
        }),
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          console.log('SW: Creating dynamic cache', DYNAMIC_CACHE)
        })
    ])
    .catch((error) => {
      console.error('SW: Cache installation failed:', error)
      // Don't prevent installation on mobile devices
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
      event.request.url.includes('googleusercontent.com') ||
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
      // Fix MIME type issues
      const contentType = response.headers.get('content-type')
      const url = request.url
      
      // Skip caching if MIME type doesn't match expected file type
      if (url.endsWith('.js') && contentType && !contentType.includes('javascript') && !contentType.includes('text/javascript')) {
        console.warn('MIME type mismatch for JS file:', url, contentType)
        return response
      }
      
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
  
  // Skip caching for problematic URLs
  if (url.includes('bundle-optimizer') || 
      url.includes('lib/bundle-optimizer') ||
      url.includes('chunk') && url.includes('failed')) {
    return false
  }
  
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

// プッシュ通知の受信処理
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received')
  
  let notificationData = {
    title: 'MuscleGram',
    body: '新しい通知があります',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'musclegram-notification',
    data: { url: '/' },
    actions: [
      { action: 'open', title: '開く', icon: '/icon-192.png' },
      { action: 'close', title: '閉じる' }
    ]
  }

  // プッシュデータがある場合は使用する
  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        ...notificationData,
        ...data
      }
    } catch (error) {
      console.error('Failed to parse push data:', error)
      // テキストデータの場合
      notificationData.body = event.data.text() || notificationData.body
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: notificationData.actions,
      requireInteraction: false,
      silent: false,
      renotify: true,
      vibrate: [200, 100, 200] // バイブレーション
    })
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event)
  
  event.notification.close()

  const action = event.action
  const data = event.notification.data || {}
  
  if (action === 'close') {
    return
  }

  // 通知クリック時にアプリを開く
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 既にアプリが開いている場合はフォーカスする
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            if (data.url) {
              // 特定のページに移動
              client.postMessage({
                type: 'notification-click',
                action: action,
                data: data
              })
            }
            return client.focus()
          }
        }
        
        // アプリが開いていない場合は新しいウィンドウを開く
        const urlToOpen = data.url ? `${self.location.origin}${data.url}` : self.location.origin
        return clients.openWindow(urlToOpen)
      })
  )
})

// プッシュ購読変更の処理
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Service Worker: Push subscription changed')
  
  event.waitUntil(
    // 新しい購読を取得して再登録
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription ? event.oldSubscription.options.applicationServerKey : null
    }).then((subscription) => {
      console.log('Service Worker: Push subscription renewed')
      // サーバーに新しい購読情報を送信
      return fetch('/api/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      })
    }).catch((error) => {
      console.error('Failed to renew push subscription:', error)
    })
  )
})