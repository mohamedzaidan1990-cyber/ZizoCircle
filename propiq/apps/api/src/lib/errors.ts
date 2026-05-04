import type { ApiErrorCode } from "@propiq/shared";

export class ApiException extends Error {
  status: number;
  code: ApiErrorCode;
  details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  unauthorized: (msg = "Unauthorized") => new ApiException(401, "UNAUTHORIZED", msg),
  forbidden: (msg = "Forbidden") => new ApiException(403, "FORBIDDEN", msg),
  notFound: (msg = "Not found") => new ApiException(404, "NOT_FOUND", msg),
  validation: (msg: string, details?: unknown) =>
    new ApiException(400, "VALIDATION_ERROR", msg, details),
  duplicate: (msg = "Duplicate resource") => new ApiException(409, "DUPLICATE", msg),
  rateLimited: (msg = "Too many requests") =>
    new ApiException(429, "RATE_LIMITED", msg),
  ai: (msg = "AI request failed") => new ApiException(502, "AI_ERROR", msg),
  internal: (msg = "Internal server error") =>
    new ApiException(500, "INTERNAL", msg),
};
