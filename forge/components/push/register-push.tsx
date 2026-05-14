"use client";

import { useEffect, useState } from "react";
import { getMessagingInstance } from "@/lib/firebase/client";
import { registerPushSubscription, unregisterPushSubscription } from "@/lib/push/actions";

type Status =
  | "idle" | "unsupported" | "denied" | "default"
  | "requesting" | "registering" | "active" | "error";

export function RegisterPush() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // On mount: check support + current permission; if 'granted', try silent re-register.
    (async () => {
      if (typeof window === "undefined") return;
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setStatus("unsupported");
        return;
      }
      const m = await getMessagingInstance();
      if (!m) {
        setStatus("unsupported");
        return;
      }
      const perm = Notification.permission;
      if (perm === "denied") setStatus("denied");
      else if (perm === "default") setStatus("default");
      else if (perm === "granted") {
        // try silent re-register so last_seen_at advances on every visit
        await registerToken(m);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enableNotifications() {
    try {
      setError(null);
      setStatus("requesting");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "default");
        return;
      }
      setStatus("registering");
      const m = await getMessagingInstance();
      if (!m) {
        setStatus("unsupported");
        return;
      }
      await registerToken(m);
    } catch (e) {
      setStatus("error");
      setError((e as Error).message);
    }
  }

  async function registerToken(messaging: NonNullable<Awaited<ReturnType<typeof getMessagingInstance>>>) {
    const { getToken, onMessage } = await import("firebase/messaging");
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      setStatus("error");
      setError("NEXT_PUBLIC_FIREBASE_VAPID_KEY is not configured");
      return;
    }
    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const fcmToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });
    if (!fcmToken) {
      setStatus("error");
      setError("Failed to acquire FCM token");
      return;
    }
    setToken(fcmToken);
    const result = await registerPushSubscription({
      fcmToken,
      platform: "web",
      deviceLabel: navigator.platform || null,
      userAgent: navigator.userAgent || null,
      appVersion: null,
    });
    if (result?.error) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setStatus("active");

    // Foreground messages: native Notification API since SW only handles background.
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || "New message";
      const body = payload.notification?.body || "";
      if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/icon-192.png" });
      }
    });
  }

  async function disable() {
    if (!token) return;
    await unregisterPushSubscription(token);
    setToken(null);
    setStatus("default");
  }

  // Render: small inline UI. Hide entirely on 'active' (no banner once enabled)
  // except on a small "active" pill in a corner is fine.
  if (status === "active") {
    return (
      <div className="text-xs text-muted-foreground">
        Push notifications enabled ·{" "}
        <button onClick={disable} className="underline hover:text-foreground">
          disable
        </button>
      </div>
    );
  }
  if (status === "unsupported") return null; // silent
  if (status === "denied") {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Notifications are blocked. Enable them in your browser settings to receive push.
      </div>
    );
  }
  if (status === "default" || status === "idle") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-xs">
        <span>Enable push notifications to hear from Sougha while away from the page.</span>
        <button
          onClick={enableNotifications}
          className="rounded-md bg-primary px-2 py-1 text-primary-foreground"
        >
          Enable
        </button>
      </div>
    );
  }
  if (status === "requesting" || status === "registering") {
    return <div className="text-xs text-muted-foreground">Registering for push…</div>;
  }
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
      Push setup failed: {error}
    </div>
  );
}
