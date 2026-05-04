import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { Errors } from "../lib/errors";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(Errors.unauthorized("Missing bearer token"));
  }
  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(Errors.unauthorized("Invalid or expired token"));
  }
}

export function requireRole(...allowed: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Errors.unauthorized());
    if (!allowed.includes(req.user.role)) return next(Errors.forbidden());
    next();
  };
}
