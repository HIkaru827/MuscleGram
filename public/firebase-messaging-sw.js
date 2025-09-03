// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker with actual configuration
const firebaseConfig = {
  apiKey: "AIzaSyBG6naSYYWQGzduHSMmI6yCTM_g6H4Qtio",
  authDomain: "musclegram-d5b32.firebaseapp.com",
  projectId: "musclegram-d5b32",
  storageBucket: "musclegram-d5b32.firebasestorage.app",
  messagingSenderId: "111971918599",
  appId: "1:111971918599:web:7340e8d15b470ff581dba2"
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