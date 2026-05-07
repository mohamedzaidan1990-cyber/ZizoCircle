import axios, { AxiosError, type AxiosInstance } from "axios";
import type { ApiResponse } from "@propiq/shared";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let accessTokenInMemory: string | null = null;

export function setAccessToken(token: string | null) {
  accessTokenInMemory = token;
}

export function getAccessToken(): string | null {
  return accessTokenInMemory;
}

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

function readAccessTokenFromDocumentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )propiq_access=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use((config) => {
  const token = accessTokenInMemory ?? readAccessTokenFromDocumentCookie();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function unwrap<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) {
    throw new Error(response.data.error);
  }
  return response.data.data;
}

export function getErrorMessage(err: unknown, fallback = "Request failed"): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiResponse<unknown> | undefined;
    if (data && data.success === false) return data.error;
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
