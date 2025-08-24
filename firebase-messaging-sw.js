// public/firebase-messaging-sw.js
/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// 🔑 Your same firebase config
firebase.initializeApp({
  apiKey: "AIzaSyA8KUZh2lP408UeLQ3jymMlVDiUk_KDr3I",
  authDomain: "grocery-store-app-dd66e.firebaseapp.com",
  projectId: "grocery-store-app-dd66e",
  storageBucket: "grocery-store-app-dd66e.firebasestorage.app",
  messagingSenderId: "970095661126",
  appId: "1:970095661126:web:9392c1a2f63675ec01ba47",
  measurementId: "G-FJEZXCSC4X"
});

const messaging = firebase.messaging();

// Background notification handler
messaging.onBackgroundMessage((payload) => {
  console.log("📩 Background push received:", payload);

  const { title, body } = payload.notification;

  self.registration.showNotification(title, {
    body,
    icon: "/logo192.png" // change to your store logo if available
  });
});
