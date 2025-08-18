/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js");

// Your Firebase config (same as in firebase.js)
firebase.initializeApp({
  apiKey: "AIzaSyA8KUZh2lP408UeLQ3jymMlVDiUk_KDr3I",
  authDomain: "grocery-store-app-dd66e.firebaseapp.com",
  projectId: "grocery-store-app-dd66e",
  storageBucket: "grocery-store-app-dd66e.firebasestorage.app",
  messagingSenderId: "970095661126",
  appId: "1:970095661126:web:9392c1a2f63675ec01ba47",
  measurementId: "G-FJEZXCSC4X"
});

// Retrieve firebase messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("Background message received: ", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/logo192.png" // replace with your app icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
