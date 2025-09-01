import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle firebase-messaging-sw.js dynamically
  if (request.nextUrl.pathname === '/firebase-messaging-sw.js') {
    const serviceWorkerContent = `
// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
const firebaseConfig = {
  apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key'}",
  authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com'}",
  projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project'}",
  storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com'}",
  messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789'}",
  appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:demo'}",
};

firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'MuscleGram';
  const notificationOptions = {
    body: payload.notification?.body || '新しい通知があります',
    icon: payload.notification?.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'musclegram-notification',
    data: payload.data,
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: '開く',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: '閉じる'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        return clients.openWindow(self.location.origin);
      })
  );
});
`

    return new NextResponse(serviceWorkerContent, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/firebase-messaging-sw.js'
}