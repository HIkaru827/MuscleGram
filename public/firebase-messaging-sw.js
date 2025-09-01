// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: These values should be replaced with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "demo-api-key", // Replace with your actual API key
  authDomain: "demo.firebaseapp.com", // Replace with your actual auth domain
  projectId: "demo-project", // Replace with your actual project ID
  storageBucket: "demo-project.appspot.com", // Replace with your actual storage bucket
  messagingSenderId: "123456789", // Replace with your actual messaging sender ID
  appId: "1:123456789:web:demo", // Replace with your actual app ID
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