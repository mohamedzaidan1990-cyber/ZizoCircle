import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

type NotificationType =
  | "stage_submitted"
  | "stage_approved"
  | "stage_rework"
  | "scope_ready"
  | "scope_signed"
  | "invoice_sent"
  | "invoice_overdue"
  | "payment_received"
  | "gold_loss_alert"
  | "stone_discrepancy"
  | "order_completed"
  | "message_received";

type NotificationChannel = "push" | "email" | "whatsapp" | "sms";

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM ?? "Forge <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

export interface NotifyParams {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  orderId?: string | null;
  stageId?: string | null;
  cta?: { label: string; href: string };
  data?: Record<string, unknown>;
}

/**
 * Persist notification rows for portal users and (best-effort) email them.
 *
 * Strategy: send the email FIRST, then insert the row with sent_at set if
 * the email succeeded. This avoids an UPDATE on rows owned by other users
 * (which is blocked by the per-user RLS policy on notifications).
 *
 * Failures are logged; the calling action never throws on email errors.
 */
export async function notify(params: NotifyParams): Promise<void> {
  const userIds = Array.from(new Set(params.userIds.filter(Boolean)));
  if (userIds.length === 0) return;

  const supabase = createClient();
  const { data: users, error: usersErr } = await supabase
    .from("users")
    .select("id, email, full_name")
    .in("id", userIds)
    .eq("is_active", true);

  if (usersErr) {
    console.error("[notify] failed to load users", usersErr);
    return;
  }

  const recipients =
    (users as { id: string; email: string | null; full_name: string }[]) ?? [];
  if (recipients.length === 0) return;

  const rows = await Promise.all(
    recipients.map(async (u) => {
      let sentAt: string | null = null;
      let channel: NotificationChannel = "push";

      if (u.email) {
        channel = "email";
        if (resend) {
          try {
            await resend.emails.send({
              from: FROM,
              to: u.email,
              subject: params.title,
              html: renderEmail({
                recipientName: u.full_name,
                title: params.title,
                body: params.body,
                cta: params.cta,
              }),
            });
            sentAt = new Date().toISOString();
          } catch (err) {
            console.error("[notify] email send failed", { to: u.email, err });
          }
        } else if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[notify] RESEND_API_KEY not set — skipping email to",
            u.email
          );
        }
      }

      return {
        user_id: u.id,
        order_id: params.orderId ?? null,
        stage_id: params.stageId ?? null,
        type: params.type,
        channel,
        title: params.title,
        body: params.body,
        data: (params.data ?? {}) as Record<string, unknown>,
        sent_at: sentAt,
      };
    })
  );

  const { error: insertErr } = await supabase.from("notifications").insert(rows);
  if (insertErr) {
    console.error("[notify] insert failed", insertErr);
  }
}

/**
 * One-shot email to an address that may not correspond to a portal user
 * (e.g. a client we've added but who hasn't signed up yet).
 * Does NOT create a notification row.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  cta?: { label: string; href: string };
  recipientName?: string;
}): Promise<void> {
  if (!resend) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[notify] RESEND_API_KEY not set — skipping sendEmail");
    }
    return;
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: renderEmail({
        recipientName: params.recipientName ?? "",
        title: params.subject,
        body: params.body,
        cta: params.cta,
      }),
    });
  } catch (err) {
    console.error("[notify] sendEmail failed", { to: params.to, err });
  }
}

export function buildAppUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${APP_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function renderEmail(p: {
  recipientName: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
}): string {
  const ctaHtml = p.cta
    ? `<p style="margin:24px 0 8px"><a href="${escapeAttr(
        buildAppUrl(p.cta.href)
      )}" style="display:inline-block;padding:10px 18px;border-radius:6px;background:#7a5a2c;color:#fff;text-decoration:none;font-weight:600">${escapeHtml(
        p.cta.label
      )}</a></p>`
    : "";
  const greeting = p.recipientName
    ? `<p style="margin:0 0 12px">Hi ${escapeHtml(p.recipientName)},</p>`
    : "";
  return `<!doctype html>
<html><body style="margin:0;background:#f7f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e7e3dc;padding:32px">
        <tr><td>
          <h1 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#7a5a2c">Forge</h1>
          ${greeting}
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:600">${escapeHtml(p.title)}</h2>
          <p style="margin:0 0 8px;line-height:1.55;white-space:pre-wrap">${escapeHtml(p.body)}</p>
          ${ctaHtml}
          <p style="margin:24px 0 0;font-size:12px;color:#888">You're receiving this because you have a Forge portal account.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
