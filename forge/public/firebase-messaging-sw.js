// ============================================================
// Forge — Firebase Cloud Messaging service worker
// ============================================================
// These config values are PUBLIC by design — Firebase web SDK
// configs are intended to be exposed in client code. Project
// access is gated by Firebase Security Rules + our Supabase RLS.
// The same values also go into NEXT_PUBLIC_FIREBASE_* env vars.
// ============================================================

importScripts(
  "https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyAFgcGnxwWJG1vOegSwiW3Pi_zH8t_nODI",
  authDomain: "forge-d586a.firebaseapp.com",
  projectId: "forge-d586a",
  storageBucket: "forge-d586a.firebasestorage.app",
  messagingSenderId: "622632399958",
  appId: "1:622632399958:web:bc316b43d77509b313b7f7",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "Sougha";
  const options = {
    body: (payload.notification && payload.notification.body) || "",
    icon: "/icon-192.png",
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.click_action) || "/";
  event.waitUntil(self.clients.openWindow(url));
});
