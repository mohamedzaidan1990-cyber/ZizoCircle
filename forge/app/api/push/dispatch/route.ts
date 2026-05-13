import { NextRequest, NextResponse } from "next/server";
import { getAdminMessaging } from "@/lib/firebase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRUNE_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

export async function GET(request: NextRequest) {
  // Auth check — Vercel injects Authorization: Bearer ${CRON_SECRET} automatically.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const messaging = getAdminMessaging();

  // Fetch up to 100 pending push notifications.
  const { data: pending, error: fetchError } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, body, data, order_id")
    .eq("channel", "push")
    .is("sent_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  if (fetchError) {
    console.error("[push/dispatch] Failed to fetch pending notifications:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0, successful: 0, tokens_pruned: 0 });
  }

  let successful = 0;
  let tokensPruned = 0;

  for (const notification of pending) {
    const { id, user_id, title, body, data } = notification;

    // Fetch all FCM subscriptions for this user.
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id, fcm_token")
      .eq("user_id", user_id);

    if (subError) {
      console.error(`[push/dispatch] Failed to fetch subscriptions for user ${user_id}:`, subError);
      continue;
    }

    // No subscriptions — mark sent anyway so we don't retry forever.
    if (!subscriptions || subscriptions.length === 0) {
      await supabase
        .from("notifications")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", id);
      successful++;
      continue;
    }

    // Coerce data values to strings (FCM requires string map).
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
    const tokensToPrune: string[] = [];

    try {
      const multicastResult = await messaging.sendEachForMulticast({
        tokens,
        notification: { title: title ?? undefined, body: body ?? undefined },
        data: stringData,
      });

      multicastResult.responses.forEach((response, idx) => {
        if (response.success) {
          atLeastOneSuccess = true;
        } else {
          const code = response.error?.code;
          if (code && PRUNE_CODES.has(code)) {
            tokensToPrune.push(subscriptions[idx].id as string);
          }
        }
      });
    } catch (err) {
      console.error(`[push/dispatch] sendEachForMulticast failed for notification ${id}:`, err);
      // Don't mark sent — let it retry next run.
      continue;
    }

    // Prune stale tokens.
    if (tokensToPrune.length > 0) {
      const { error: pruneError } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", tokensToPrune);
      if (pruneError) {
        console.error("[push/dispatch] Failed to prune tokens:", pruneError);
      } else {
        tokensPruned += tokensToPrune.length;
      }
    }

    // Mark sent if at least one token succeeded (or all tokens were pruned but we still attempted).
    if (atLeastOneSuccess || tokens.length > 0) {
      await supabase
        .from("notifications")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", id);
      successful++;
    }
  }

  return NextResponse.json({
    processed: pending.length,
    successful,
    tokens_pruned: tokensPruned,
  });
}
