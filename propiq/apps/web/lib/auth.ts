"use server";

import { cookies } from "next/headers";
import type { AuthResponse, PublicAgency, PublicUser } from "@propiq/shared";

const ACCESS_COOKIE = "propiq_access";
const REFRESH_COOKIE = "propiq_refresh";
const USER_COOKIE = "propiq_user";
const AGENCY_COOKIE = "propiq_agency";

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

export async function persistAuth(payload: AuthResponse) {
  const store = cookies();
  const secure = process.env.NODE_ENV === "production";

  store.set(ACCESS_COOKIE, payload.accessToken, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });
  store.set(REFRESH_COOKIE, payload.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TTL_SECONDS,
  });
  store.set(USER_COOKIE, JSON.stringify(payload.user), {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TTL_SECONDS,
  });
  store.set(AGENCY_COOKIE, JSON.stringify(payload.agency), {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TTL_SECONDS,
  });
}

export async function clearAuth() {
  const store = cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(USER_COOKIE);
  store.delete(AGENCY_COOKIE);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const raw = cookies().get(USER_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

export async function getCurrentAgency(): Promise<PublicAgency | null> {
  const raw = cookies().get(AGENCY_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicAgency;
  } catch {
    return null;
  }
}

export async function getAccessTokenFromCookies(): Promise<string | null> {
  return cookies().get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshTokenFromCookies(): Promise<string | null> {
  return cookies().get(REFRESH_COOKIE)?.value ?? null;
}
