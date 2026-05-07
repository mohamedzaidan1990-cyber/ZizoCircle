import "server-only";
import axios, { type AxiosRequestConfig } from "axios";
import { getAccessTokenFromCookies } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Server-side fetch helper. Reads the access-token cookie set by the auth
 * server actions and forwards it as a Bearer token to the Express API.
 */
export async function serverApiGet<T>(
  path: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const token = await getAccessTokenFromCookies();
  const res = await axios.get(`${API_URL}${path}`, {
    ...config,
    headers: {
      ...(config?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    validateStatus: () => true,
  });
  if (res.status >= 400) {
    const body = res.data as { error?: string } | undefined;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  const data = res.data as { success: boolean; data: T; error?: string };
  if (!data.success) throw new Error(data.error ?? "Request failed");
  return data.data;
}
