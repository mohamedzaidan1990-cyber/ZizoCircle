import { env } from "../lib/env";
import { Errors } from "../lib/errors";

export interface WhatsAppSendResult {
  ok: true;
  messageId: string;
  /** True when sent through Meta Cloud API; false when stubbed in dev. */
  delivered: boolean;
}

export function whatsappConfigured(): boolean {
  return Boolean(env.WHATSAPP_API_URL && env.WHATSAPP_PHONE_ID && env.WHATSAPP_TOKEN);
}

export async function sendWhatsAppText(opts: {
  to: string;
  body: string;
}): Promise<WhatsAppSendResult> {
  // Dev fallback — pretend we sent so the UI flow works without Meta credentials.
  if (!whatsappConfigured()) {
    return {
      ok: true,
      messageId: `dev-${Date.now()}`,
      delivered: false,
    };
  }

  const phoneNumber = opts.to.replace(/\D/g, "");
  if (phoneNumber.length < 6) {
    throw Errors.validation("Invalid recipient phone number");
  }

  const url = `${env.WHATSAPP_API_URL}/${env.WHATSAPP_PHONE_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "text",
      text: { body: opts.body },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw Errors.ai(
      `WhatsApp send failed (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as { messages?: Array<{ id: string }> };
  return {
    ok: true,
    messageId: data.messages?.[0]?.id ?? `wa-${Date.now()}`,
    delivered: true,
  };
}
