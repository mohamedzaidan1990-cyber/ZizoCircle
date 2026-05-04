export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "DUPLICATE"
  | "AI_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL";

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: { total: number; page: number; limit: number };
}

export interface ApiError {
  success: false;
  error: string;
  code: ApiErrorCode;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface AuthResponse {
  agency: import("./user").PublicAgency;
  user: import("./user").PublicUser;
  accessToken: string;
  refreshToken: string;
}
