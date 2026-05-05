import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../lib/env";

let cached: Transporter | null = null;

export function emailTransport(): Transporter {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    // MailHog runs without auth on localhost; production swaps in real creds via env.
  });
  return cached;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}): Promise<{ messageId: string }> {
  const transport = emailTransport();
  const info = await transport.sendMail({
    from: opts.from ?? env.EMAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? (opts.html ? undefined : opts.subject),
    replyTo: opts.replyTo,
  });
  return { messageId: info.messageId };
}

/** Replaces {firstName}, {lastName}, etc. tokens in a template body. */
export function renderTemplate(
  body: string,
  vars: Record<string, string | null | undefined>,
): string {
  return body.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}
