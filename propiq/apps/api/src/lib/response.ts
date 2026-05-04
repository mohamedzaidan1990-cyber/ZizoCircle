import type { Response } from "express";
import type { ApiSuccess } from "@propiq/shared";

export function ok<T>(
  res: Response,
  data: T,
  meta?: ApiSuccess<T>["meta"],
  status = 200,
) {
  const body: ApiSuccess<T> = meta
    ? { success: true, data, meta }
    : { success: true, data };
  return res.status(status).json(body);
}

export function created<T>(res: Response, data: T) {
  return ok(res, data, undefined, 201);
}
