"use server";

import axios from "axios";
import { redirect } from "next/navigation";
import type { ApiResponse, AuthResponse } from "@propiq/shared";
import { clearAuth, getRefreshTokenFromCookies, persistAuth } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  agencyName: string;
  agencyNameAr?: string;
  slug: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

function extractError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiResponse<unknown> | undefined;
    if (body && body.success === false) return body.error;
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function loginAction(input: LoginInput) {
  try {
    const res = await axios.post<ApiResponse<AuthResponse>>(
      `${API_URL}/api/auth/login`,
      input,
    );
    if (!res.data.success) {
      return { ok: false as const, error: res.data.error };
    }
    await persistAuth(res.data.data);
    return { ok: true as const, locale: res.data.data.user.language.toLowerCase() };
  } catch (err) {
    return { ok: false as const, error: extractError(err, "Login failed") };
  }
}

export async function registerAction(input: RegisterInput) {
  try {
    const res = await axios.post<ApiResponse<AuthResponse>>(
      `${API_URL}/api/auth/register`,
      input,
    );
    if (!res.data.success) {
      return { ok: false as const, error: res.data.error };
    }
    await persistAuth(res.data.data);
    return { ok: true as const, locale: res.data.data.user.language.toLowerCase() };
  } catch (err) {
    return { ok: false as const, error: extractError(err, "Registration failed") };
  }
}

export async function logoutAction(locale: string) {
  const refreshToken = await getRefreshTokenFromCookies();
  if (refreshToken) {
    await axios
      .post(`${API_URL}/api/auth/logout`, { refreshToken })
      .catch(() => undefined);
  }
  await clearAuth();
  redirect(`/${locale}/login`);
}
