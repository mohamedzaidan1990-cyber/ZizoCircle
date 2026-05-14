import Twilio, { type Twilio as TwilioClient } from "twilio";

let client: TwilioClient | null = null;

export function getTwilioClient(): TwilioClient {
  if (client) return client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error(
      "Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN env vars",
    );
  }
  client = Twilio(sid, token);
  return client;
}

export function getWhatsAppFrom(): string {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) {
    throw new Error("Missing TWILIO_WHATSAPP_FROM env var");
  }
  return from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
}
