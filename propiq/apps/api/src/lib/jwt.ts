import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "node:crypto";
import type { JwtPayload } from "@propiq/shared";
import { env } from "./env";

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const DURATION_RE = /^(\d+)([smhdw])$/;
export function parseDurationMs(value: string): number {
  const match = DURATION_RE.exec(value);
  if (!match) throw new Error(`Invalid duration: ${value}`);
  const n = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case "s":
      return n * 1000;
    case "m":
      return n * 60_000;
    case "h":
      return n * 3_600_000;
    case "d":
      return n * 86_400_000;
    case "w":
      return n * 604_800_000;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}
