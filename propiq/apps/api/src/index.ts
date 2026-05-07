import "./types/express";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./lib/env";
import { authRouter } from "./routes/auth";
import { propifyRouter } from "./routes/propify";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { ok } from "./lib/response";

const app = express();

// Trust the platform proxy (Railway / Vercel rewrite) so rate-limit + IPs are correct.
app.set("trust proxy", 1);

app.use(helmet());

// CORS: PropIQ web (Vercel) + a configurable comma-separated list for the
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

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/propify", propifyRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[propiq-api] listening on http://localhost:${env.PORT}`);
});

const shutdown = (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`[propiq-api] received ${signal}, shutting down`);
  server.close(() => process.exit(0));
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export { app };
