import type { NextFunction, Request, Response } from "express";
import { Errors } from "../lib/errors";
import { tenantSchemaName } from "../db/tenant";

export function requireTenant(req: Request, _res: Response, next: NextFunction) {
  const slug = req.user?.agencySlug;
  if (!slug) return next(Errors.unauthorized("No agency context"));
  try {
    req.tenantSchema = tenantSchemaName(slug);
    next();
  } catch (err) {
    next(Errors.forbidden((err as Error).message));
  }
}
