import type { NextFunction, Request, Response } from "express";
import type { ApiError } from "@propiq/shared";
import { ApiException } from "../lib/errors";

export function notFoundHandler(_req: Request, res: Response) {
  const body: ApiError = {
    success: false,
    error: "Route not found",
    code: "NOT_FOUND",
  };
  res.status(404).json(body);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof ApiException) {
    const body: ApiError = {
      success: false,
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    };
    return res.status(err.status).json(body);
  }

  if (err instanceof Error) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[unhandled error]", err);
    }
    const body: ApiError = {
      success: false,
      error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
      code: "INTERNAL",
    };
    return res.status(500).json(body);
  }

  res.status(500).json({
    success: false,
    error: "Internal server error",
    code: "INTERNAL",
  } satisfies ApiError);
}
