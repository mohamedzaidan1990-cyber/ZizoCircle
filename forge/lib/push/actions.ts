"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { failure, ok, type ActionState } from "@/lib/actions";

const ALLOWED_PLATFORMS = ["web", "ios", "android"] as const;
type Platform = (typeof ALLOWED_PLATFORMS)[number];

function isAllowedPlatform(p: string): p is Platform {
  return (ALLOWED_PLATFORMS as readonly string[]).includes(p);
}

/**
 * Upsert a push subscription for the current authenticated user.
 * On conflict (user_id, fcm_token), bumps last_seen_at.
 */
export async function registerPushSubscription(input: {
  fcmToken: string;
  platform: "web" | "ios" | "android";
  deviceLabel?: string | null;
  userAgent?: string | null;
  appVersion?: string | null;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return failure("Not authenticated.");

  const token = input.fcmToken.trim();
  if (!token) return failure("fcmToken must be non-empty.");
  if (!isAllowedPlatform(input.platform)) {
    return failure(`platform must be one of: ${ALLOWED_PLATFORMS.join(", ")}.`);
  }

  const supabase = createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      fcm_token: token,
      platform: input.platform,
      device_label: input.deviceLabel ?? null,
      user_agent: input.userAgent ?? null,
      app_version: input.appVersion ?? null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,fcm_token" }
  );

  if (error) return failure(error.message);
  return ok("Push subscription registered.");
}

/**
 * Remove a push subscription for the current authenticated user.
 * Silent no-op if no matching row exists.
 */
export async function unregisterPushSubscription(
  fcmToken: string
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return failure("Not authenticated.");

  const token = fcmToken.trim();
  if (!token) return failure("fcmToken must be non-empty.");

  const supabase = createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("fcm_token", token);

  if (error) return failure(error.message);
  return ok("Push subscription removed.");
}
