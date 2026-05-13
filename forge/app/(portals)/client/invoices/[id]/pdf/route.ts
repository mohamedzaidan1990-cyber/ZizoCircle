import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { getClientForCurrentUser } from "@/lib/db/client";
import { InvoicePDF } from "@/lib/pdf/invoice";
import type { Client, Invoice, Order, User } from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const clientRow = await getClientForCurrentUser();
  if (!clientRow) return new NextResponse("Unauthorized", { status: 401 });
  const supabase = createClient();

  const { data: invRow } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .eq("client_id", clientRow.id)
    .neq("status", "draft")
    .maybeSingle();
  if (!invRow) return new NextResponse("Not found", { status: 404 });
  const inv = invRow as Invoice;

  const [{ data: order }, { data: client }, { data: workshop }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("order_number, piece_type, karat")
        .eq("id", inv.order_id)
        .maybeSingle(),
      supabase
        .from("clients")
        .select("full_name, company_name, email, phone, address")
        .eq("id", inv.client_id)
        .maybeSingle(),
      supabase
        .from("users")
        .select("full_name, email, phone")
        .eq("role", "owner")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
    ]);

  const buffer = await renderToBuffer(
    createElement(InvoicePDF, {
      invoice: inv,
      order: order as Pick<Order, "order_number" | "piece_type" | "karat"> | null,
      client: client as Pick<Client, "full_name" | "company_name" | "email" | "phone" | "address"> | null,
      workshop: workshop as Pick<User, "full_name" | "email" | "phone"> | null,
    })
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${inv.invoice_number}.pdf"`,
    },
  });
}
