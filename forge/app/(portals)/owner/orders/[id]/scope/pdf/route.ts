import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ScopePDF } from "@/lib/pdf/scope";
import type { Client, Order, ScopeItem, User } from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await requireRole("owner");
  const supabase = createClient();

  const { data: orderRow } = await supabase
    .from("orders")
    .select(
      "order_number, piece_type, piece_description, karat, target_weight_grams, estimated_delivery, scope_signed_at, scope_client_ip, client_id"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!orderRow) return new NextResponse("Not found", { status: 404 });
  const order = orderRow as Pick<
    Order,
    | "order_number"
    | "piece_type"
    | "piece_description"
    | "karat"
    | "target_weight_grams"
    | "estimated_delivery"
    | "scope_signed_at"
    | "scope_client_ip"
  > & { client_id: string };

  const [{ data: items }, { data: client }, { data: workshop }] =
    await Promise.all([
      supabase
        .from("scope_items")
        .select("*")
        .eq("order_id", params.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("clients")
        .select("full_name, company_name, email, phone, address")
        .eq("id", order.client_id)
        .maybeSingle(),
      supabase
        .from("users")
        .select("full_name, email, phone")
        .eq("role", "owner")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
    ]);

  // @ts-ignore – @react-pdf/renderer type mismatch with React component wrapper
  const buffer = await renderToBuffer(
    createElement(ScopePDF, {
      order,
      items: (items ?? []) as ScopeItem[],
      client: client as Pick<Client, "full_name" | "company_name" | "email" | "phone" | "address"> | null,
      workshop: workshop as Pick<User, "full_name" | "email" | "phone"> | null,
    }) as any
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="scope-${order.order_number}.pdf"`,
    },
  });
}
