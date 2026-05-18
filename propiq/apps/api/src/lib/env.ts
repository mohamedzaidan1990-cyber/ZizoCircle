import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),
  ANTHROPIC_API_KEY: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  STORAGE_TYPE: z.enum(["local", "azure"]).default("local"),
  LOCAL_STORAGE_PATH: z.string().default("./uploads"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v === "true" : v))
    .default(false),
  EMAIL_FROM: z.string().default("noreply@propiq.local"),
  WHATSAPP_API_URL: z.string().optional(),
  WHATSAPP_PHONE_ID: z.string().optional(),
  WHATSAPP_TOKEN: z.string().optional(),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  BACKEND_URL: z.string().url().default("http://localhost:3001"),
  PROPIFY_WEBHOOK_SECRET: z.string().min(16).optional(),
  ADDITIONAL_CORS_ORIGINS: z.string().optional(),
  DIALOG360_API_KEY: z.string().optional(),
  DIALOG360_BASE_URL: z.string().url().default("https://waba.360dialog.io"),
  CAMPAIGN_SEND_DELAY_MS: z.coerce.number().int().positive().default(1000),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
