// web/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBEjIVNc9fp7UrvTzodN7hzOR1dVKx0JZA",
  authDomain: "cserve-4fdaa.firebaseapp.com",
  projectId: "cserve-4fdaa",
  messagingSenderId: "379854362881",
  appId: "1:379854362881:web:b95d154780c0f2ee162300"
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icons/Icon-192.png'
  });
});