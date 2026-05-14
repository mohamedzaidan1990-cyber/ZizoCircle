import { getAdminMessaging } from "@/lib/firebase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service";

const PRUNE_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

export type DispatchResult = {
  processed: number;
  successful: number;
  tokens_pruned: number;
};

/**
 * Dispatch pending push-channel notifications to FCM.
 *
 * - Without opts: drains up to 100 unsent push rows (use case: manual / external cron).
 * - With opts.ids: dispatches only the specified notification ids (use case:
 *   inline call from `lib/notify.ts` right after a batch of rows was inserted).
 *
 * Uses the service-role Supabase client to bypass RLS — notifications and
 * push_subscriptions live across users, and the dispatcher legitimately
 * needs to read both.
 */
export async function dispatchPushNotifications(
  opts: { ids?: string[] } = {},
): Promise<DispatchResult> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("notifications")
    .select("id, user_id, type, title, body, data, order_id")
    .eq("channel", "push")
    .is("sent_at", null);

  if (opts.ids && opts.ids.length > 0) {
    query = query.in("id", opts.ids);
  } else {
    query = query.order("created_at", { ascending: true }).limit(100);
  }

  const { data: pending, error: fetchError } = await query;
  if (fetchError) {
    console.error("[push/dispatch] fetch pending failed:", fetchError);
    return { processed: 0, successful: 0, tokens_pruned: 0 };
  }

  if (!pending || pending.length === 0) {
    return { processed: 0, successful: 0, tokens_pruned: 0 };
  }

  let messaging: Awaited<ReturnType<typeof getAdminMessaging>>;
  try {
    messaging = getAdminMessaging();
  } catch (err) {
    console.error("[push/dispatch] admin SDK init failed:", err);
    return { processed: pending.length, successful: 0, tokens_pruned: 0 };
  }

  let successful = 0;
  let tokensPruned = 0;

  for (const notification of pending) {
    const { id, user_id, title, body, data } = notification;

    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id, fcm_token")
      .eq("user_id", user_id);

    if (subError) {
      console.error(`[push/dispatch] fetch subs failed for user ${user_id}:`, subError);
      continue;
    }

    // No subscriptions for this user — mark sent so we don't retry forever.
    if (!subscriptions || subscriptions.length === 0) {
      await supabase
        .from("notifications")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", id);
      successful++;
      continue;
    }

    const stringData: Record<string, string> = {};
    if (data && typeof data === "object") {
      for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
        if (v !== null && v !== undefined) {
          stringData[k] = typeof v === "string" ? v : JSON.stringify(v);
        }
      }
    }
    if (!stringData.click_action) {
      stringData.click_action = "/";
    }

    const tokens = subscriptions.map((s) => s.fcm_token as string);

    let atLeastOneSuccess = false;
    const idsToPrune: string[] = [];

    try {
      const res = await messaging.sendEachForMulticast({
        tokens,
        notification: { title: title ?? undefined, body: body ?? undefined },
        data: stringData,
      });

      res.responses.forEach((response, idx) => {
        if (response.success) {
          atLeastOneSuccess = true;
        } else {
          const code = response.error?.code;
          if (code && PRUNE_CODES.has(code)) {
            idsToPrune.push(subscriptions[idx].id as string);
          }
        }
      });
    } catch (err) {
      console.error(`[push/dispatch] sendEachForMulticast failed for ${id}:`, err);
      continue;
    }

    if (idsToPrune.length > 0) {
      const { error: pruneError } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", idsToPrune);
      if (pruneError) {
        console.error("[push/dispatch] prune failed:", pruneError);
      } else {
        tokensPruned += idsToPrune.length;
      }
    }

    if (atLeastOneSuccess || tokens.length > 0) {
      await supabase
        .from("notifications")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", id);
      successful++;
    }
  }

  return {
    processed: pending.length,
    successful,
    tokens_pruned: tokensPruned,
  };
}
