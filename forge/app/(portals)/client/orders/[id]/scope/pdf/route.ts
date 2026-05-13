import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { getClientForCurrentUser } from "@/lib/db/client";
import { ScopePDF } from "@/lib/pdf/scope";
import type { Client, Order, ScopeItem, User } from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const clientRow = await getClientForCurrentUser();
  if (!clientRow) return new NextResponse("Unauthorized", { status: 401 });
  const supabase = createClient();

  const { data: orderRow } = await supabase
    .from("orders")
    .select(
      "order_number, piece_type, piece_description, karat, target_weight_grams, estimated_delivery, scope_signed_at, scope_client_ip"
    )
    .eq("id", params.id)
    .eq("client_id", clientRow.id)
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
  >;

  const [{ data: items }, { data: workshop }] = await Promise.all([
    supabase
      .from("scope_items")
      .select("*")
      .eq("order_id", params.id)
      .order("sort_order", { ascending: true }),
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
      client: {
        full_name: clientRow.full_name,
        company_name: clientRow.company_name,
        email: clientRow.email,
        phone: clientRow.phone,
        address: clientRow.address,
      } as Pick<Client, "full_name" | "company_name" | "email" | "phone" | "address">,
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
