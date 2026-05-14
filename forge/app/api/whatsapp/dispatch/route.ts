import { NextRequest, NextResponse } from "next/server";
import { dispatchWhatsAppNotifications } from "@/lib/whatsapp/dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Auth check — manual callers must supply Authorization: Bearer ${CRON_SECRET}.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchWhatsAppNotifications();
  return NextResponse.json(result);
}
