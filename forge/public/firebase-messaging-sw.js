// ============================================================
// Forge — Firebase Cloud Messaging service worker
// ============================================================
// !! REPLACE THE firebaseConfig OBJECT BELOW WITH YOUR ACTUAL
// !! FIREBASE WEB CONFIG VALUES BEFORE DEPLOYING.
// Get these from Firebase Console → Project Settings → General →
// "Your apps" → Web app config. These are public values (the same
// ones that go into NEXT_PUBLIC_FIREBASE_* env vars).
// ============================================================

importScripts(
  "https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "REPLACE_ME_apiKey",
  authDomain: "REPLACE_ME_authDomain",
  projectId: "REPLACE_ME_projectId",
  storageBucket: "REPLACE_ME_storageBucket",
  messagingSenderId: "REPLACE_ME_messagingSenderId",
  appId: "REPLACE_ME_appId",
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
