import { mkdirSync } from "node:fs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./lib/env";
import { authRouter } from "./routes/auth";
import { contactsRouter } from "./routes/contacts";
import { propertiesRouter } from "./routes/properties";
import { activitiesRouter } from "./routes/activities";
import { dealsRouter } from "./routes/deals";
import { statsRouter } from "./routes/stats";
import { aiRouter } from "./routes/ai";
import { templatesRouter } from "./routes/templates";
import { sequencesRouter } from "./routes/sequences";
import { whatsappRouter } from "./routes/whatsapp";
import { feedsRouter } from "./routes/feeds";
import { reportsRouter } from "./routes/reports";
import { settingsRouter } from "./routes/settings";
import { propifyRouter } from "./routes/propify";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { ok } from "./lib/response";
import { localUploadsRoot } from "./services/storage";
import { startEmailSequenceWorker } from "./jobs/emailSequence.job";
import { shutdownQueues } from "./services/queue";
import { migrateAllTenants } from "./db/tenant";

const app = express();

// Trust the platform proxy (Railway / Vercel rewrite) so rate-limit + client
// IPs are correct in production.
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS: PropIQ web (Vercel) plus a configurable comma-separated list for the
// Propify static demo if it is ever served from a different origin.
const allowedOrigins = new Set<string>([
  env.FRONTEND_URL,
  ...(process.env.ADDITIONAL_CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
]);
app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin / non-browser requests (no Origin header).
      if (!origin) return cb(null, true);
      cb(null, allowedOrigins.has(origin));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/health", (_req, res) => ok(res, { status: "ok", time: new Date().toISOString() }));

// Serve uploaded files when running with local storage. In Azure, the storage
// service uploads directly to blob and these routes are unused.
if (env.STORAGE_TYPE === "local") {
  const uploadsRoot = localUploadsRoot();
  try {
    mkdirSync(uploadsRoot, { recursive: true });
  } catch {
    // ignore: directory already exists
  }
  app.use("/uploads", express.static(uploadsRoot, { fallthrough: false }));
}

// Public XML feeds — no auth, listed before the auth-gated routes so portal crawlers can fetch them.
app.use("/api/feeds", feedsRouter);

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/properties", propertiesRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/deals", dealsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/sequences", sequencesRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/propify", propifyRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[propiq-api] listening on http://localhost:${env.PORT}`);
});

// Start the BullMQ workers — one for the email-sequence queue.
const emailWorker = startEmailSequenceWorker();
// eslint-disable-next-line no-console
console.log(`[propiq-api] email-sequence worker started (${emailWorker.name})`);

// Fan out additive migrations across every existing tenant. Idempotent and
// non-blocking — the server is already listening; tenant schemas catch up to
// HEAD in the background. One bad tenant won't stop the others or crash boot.
migrateAllTenants()
  .then(({ slugs, errors }) => {
    // eslint-disable-next-line no-console
    console.log(
      `[propiq-api] migrated ${slugs.length - errors.length}/${slugs.length} tenants`,
    );
    for (const e of errors) {
      // eslint-disable-next-line no-console
      console.error(`[propiq-api] migration failed for ${e.slug}: ${e.error}`);
    }
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[propiq-api] migrateAllTenants threw:", err);
  });

const shutdown = async (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`[propiq-api] received ${signal}, shutting down`);
  await shutdownQueues().catch(() => undefined);
  server.close(() => process.exit(0));
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export { app };
