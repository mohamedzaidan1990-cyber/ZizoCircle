import { NextRequest, NextResponse } from "next/server";
import { dispatchPushNotifications } from "@/lib/push/dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Auth check — Vercel injects Authorization: Bearer ${CRON_SECRET} on cron
  // requests automatically; manual callers must supply the same header.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchPushNotifications();
  return NextResponse.json(result);
}
