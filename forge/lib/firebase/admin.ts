import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

let app: App | null = null;
let messaging: Messaging | null = null;

export function getAdminMessaging(): Messaging {
  if (messaging) return messaging;
  if (!app) {
    if (getApps().length > 0) {
      app = getApps()[0];
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
          "Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY env vars",
        );
      }
      app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    }
  }
  messaging = getMessaging(app);
  return messaging;
}
