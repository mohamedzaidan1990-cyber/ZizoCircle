import { createServiceRoleClient } from "@/lib/supabase/service";
import { getTwilioClient, getWhatsAppFrom } from "@/lib/whatsapp/client";
import { resolveTemplate } from "@/lib/whatsapp/templates";
import { buildAppUrl } from "@/lib/notify";

export type WhatsAppDispatchResult = {
  processed: number;
  successful: number;
  errors: number;
};

/**
 * Dispatch pending whatsapp-channel notifications via Twilio.
 *
 * - Without opts: drains up to 100 unsent whatsapp rows (use case: manual / external trigger).
 * - With opts.ids: dispatches only the specified notification ids (use case:
 *   inline call from `lib/notify.ts` right after a batch of rows was inserted).
 *
 * Uses the service-role Supabase client to bypass RLS.
 * Gracefully handles missing Twilio env vars — returns zero instead of throwing.
 */
export async function dispatchWhatsAppNotifications(
  opts: { ids?: string[] } = {},
): Promise<WhatsAppDispatchResult> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("notifications")
    .select("id, user_id, type, title, body, data, order_id")
    .eq("channel", "whatsapp")
    .is("sent_at", null);

  if (opts.ids && opts.ids.length > 0) {
    query = query.in("id", opts.ids);
  } else {
    query = query.order("created_at", { ascending: true }).limit(100);
  }

  const { data: pending, error: fetchError } = await query;
  if (fetchError) {
    console.error("[whatsapp/dispatch] fetch pending failed:", fetchError);
    return { processed: 0, successful: 0, errors: 0 };
  }

  if (!pending || pending.length === 0) {
    return { processed: 0, successful: 0, errors: 0 };
  }

  // Init Twilio client — bail gracefully if env vars are missing.
  let twilioFrom: string;
  try {
    getTwilioClient(); // validates env vars
    twilioFrom = getWhatsAppFrom();
  } catch (err) {
    console.error("[whatsapp/dispatch] Twilio init failed:", err);
    return { processed: pending.length, successful: 0, errors: 0 };
  }

  let successful = 0;
  let errors = 0;

  for (const notification of pending) {
    const { id, user_id, type, title, body, data } = notification;

    // Look up the user's phone number.
    const { data: userRow, error: userErr } = await supabase
      .from("users")
      .select("phone, full_name")
      .eq("id", user_id)
      .single();

    if (userErr) {
      console.error(`[whatsapp/dispatch] fetch user failed for ${user_id}:`, userErr);
      continue;
    }

    // No phone — mark sent to avoid infinite retry.
    if (!userRow?.phone) {
      await supabase
        .from("notifications")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", id);
      successful++;
      continue;
    }

    // Normalize phone to E.164 format.
    let phone = userRow.phone as string;
    if (!phone.startsWith("+")) {
      const normalized = "+974" + phone.replace(/^0+/, "");
      console.warn(
        `[whatsapp/dispatch] phone "${phone}" missing country code — normalizing to "${normalized}"`,
      );
      phone = normalized;
    }

    const notifData = (data ?? {}) as Record<string, unknown>;
    const ctaHref = typeof notifData.cta_href === "string" ? notifData.cta_href : "/";
    const appUrl = buildAppUrl(ctaHref);

    // Resolve template; fall back to plain-text body for sandbox/demo use.
    const template = resolveTemplate(type as string, {
      title: title ?? "",
      body: body ?? "",
      data: notifData,
      appUrl,
    });

    if (!template) {
      console.warn(
        `[whatsapp/dispatch] No Twilio template for type "${type}" — sending plain-text fallback`,
      );
    }

    try {
      const twilio = getTwilioClient();
      const msgParams: Parameters<typeof twilio.messages.create>[0] = {
        from: twilioFrom,
        to: `whatsapp:${phone}`,
      };

      if (template) {
        msgParams.contentSid = template.contentSid;
        msgParams.contentVariables = JSON.stringify(template.contentVariables);
      } else {
        msgParams.body = body ?? "";
      }

      await twilio.messages.create(msgParams);

      await supabase
        .from("notifications")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", id);
      successful++;
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status && status >= 400 && status < 500) {
        // 4xx — retrying won't help; abandon by marking sent_at.
        console.error(
          `[whatsapp/dispatch] Twilio 4xx error for notification ${id} (status=${status}) — abandoning:`,
          err,
        );
        await supabase
          .from("notifications")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", id);
        errors++;
      } else {
        // 5xx / network error — leave sent_at null so it retries.
        console.error(
          `[whatsapp/dispatch] Twilio send failed for notification ${id}:`,
          err,
        );
        errors++;
      }
    }
  }

  return {
    processed: pending.length,
    successful,
    errors,
  };
}
