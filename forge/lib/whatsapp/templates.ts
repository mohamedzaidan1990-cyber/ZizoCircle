/**
 * Twilio Content Templates for WhatsApp.
 *
 * Each template is a pre-approved message stored in Twilio with a
 * stable Content SID (HX...). The variables map keys to the
 * {{1}}, {{2}}, ... placeholders in the template body.
 *
 * If TWILIO_TEMPLATE_<TYPE> env var is unset, the dispatcher skips
 * WhatsApp for that type and the row is treated as unhandled.
 */

type NotificationData = Record<string, unknown>;

export interface WhatsAppTemplate {
  contentSid: string;
  contentVariables: Record<string, string>;
}

type Builder = (params: {
  title: string;
  body: string;
  data: NotificationData;
  orderNumber?: string;
  appUrl: string; // already resolved via buildAppUrl
}) => Record<string, string>;

const TEMPLATE_ENV_VARS: Record<string, string> = {
  scope_ready: "TWILIO_TEMPLATE_SCOPE_READY",
  stage_approved: "TWILIO_TEMPLATE_STAGE_APPROVED",
  invoice_sent: "TWILIO_TEMPLATE_INVOICE_SENT",
  payment_received: "TWILIO_TEMPLATE_PAYMENT_RECEIVED",
  order_completed: "TWILIO_TEMPLATE_ORDER_COMPLETED",
};

const BUILDERS: Record<string, Builder> = {
  // forge_scope_ready: "Hi {{1}}, the scope for your order {{2}} is ready to review and sign: {{3}}"
  scope_ready: ({ data, appUrl }) => ({
    "1": String(data.recipient_name ?? ""),
    "2": String(data.order_number ?? ""),
    "3": appUrl,
  }),
  // forge_stage_approved: "Stage {{1}} ({{2}}) of your order {{3}} has been approved. View progress: {{4}}"
  stage_approved: ({ data, appUrl }) => ({
    "1": String(data.stage_number ?? ""),
    "2": String(data.stage_name ?? ""),
    "3": String(data.order_number ?? ""),
    "4": appUrl,
  }),
  // forge_invoice_sent: "Your invoice {{1}} for order {{2}} is ready. Total: {{3}}. View and pay: {{4}}"
  invoice_sent: ({ data, appUrl }) => ({
    "1": String(data.invoice_number ?? ""),
    "2": String(data.order_number ?? ""),
    "3": String(data.total_qar ?? ""),
    "4": appUrl,
  }),
  // forge_payment_received: "We've received your payment of {{1}} for order {{2}}. Thank you!"
  payment_received: ({ data }) => ({
    "1": String(data.amount_qar ?? ""),
    "2": String(data.order_number ?? ""),
  }),
  // forge_order_completed: "Great news! Your order {{1}} is complete and ready for pickup. {{2}}"
  order_completed: ({ data, appUrl }) => ({
    "1": String(data.order_number ?? ""),
    "2": appUrl,
  }),
};

/**
 * Resolve the Twilio template for a notification type. Returns null
 * if no template SID env var is set OR there's no builder — caller
 * should fall back to plain text or skip.
 */
export function resolveTemplate(
  notificationType: string,
  params: Parameters<Builder>[0],
): WhatsAppTemplate | null {
  const envVar = TEMPLATE_ENV_VARS[notificationType];
  if (!envVar) return null;
  const contentSid = process.env[envVar];
  if (!contentSid) return null;
  const builder = BUILDERS[notificationType];
  if (!builder) return null;
  return {
    contentSid,
    contentVariables: builder(params),
  };
}
