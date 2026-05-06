"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { failure, type ActionState } from "@/lib/actions";
import type { InvoiceLineItem } from "@/lib/types";

export async function createInvoiceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("owner");
  const supabase = createClient();

  const orderId = String(formData.get("order_id") ?? "");
  const depositPctRaw = String(formData.get("deposit_pct") ?? "50");
  const taxPctRaw = String(formData.get("tax_pct") ?? "0");
  const dueDate = String(formData.get("due_date") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const labels = formData.getAll("line_label").map(String);
  const qtys = formData.getAll("line_qty").map(String);
  const prices = formData.getAll("line_unit_price").map(String);

  if (!orderId) return failure("Pick an order.");
  if (labels.length === 0) return failure("Add at least one line item.");

  const lineItems: InvoiceLineItem[] = [];
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i].trim();
    const qty = Number(qtys[i] ?? 0);
    const unit = Number(prices[i] ?? 0);
    if (!label) continue;
    if (!Number.isFinite(qty) || qty <= 0) return failure(`Line ${i + 1}: invalid quantity.`);
    if (!Number.isFinite(unit) || unit < 0) return failure(`Line ${i + 1}: invalid price.`);
    lineItems.push({ label, qty, unit_price: unit, total: Number((qty * unit).toFixed(2)) });
  }
  if (lineItems.length === 0) return failure("Add at least one valid line item.");

  const subtotal = Number(lineItems.reduce((s, l) => s + l.total, 0).toFixed(2));
  const taxPct = Number(taxPctRaw);
  const depositPct = Number(depositPctRaw);
  const taxAmount = Number((subtotal * (taxPct / 100)).toFixed(2));
  const total = Number((subtotal + taxAmount).toFixed(2));
  const depositAmount = Number((total * (depositPct / 100)).toFixed(2));
  const balanceDue = Number((total - depositAmount).toFixed(2));

  const { data: order } = await supabase
    .from("orders")
    .select("client_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return failure("Order not found.");

  const { data: created, error } = await supabase
    .from("invoices")
    .insert({
      order_id: orderId,
      client_id: (order as { client_id: string }).client_id,
      status: "draft",
      line_items: lineItems,
      subtotal_qar: subtotal,
      tax_pct: taxPct,
      tax_amount_qar: taxAmount,
      total_qar: total,
      deposit_pct: depositPct,
      deposit_amount_qar: depositAmount,
      balance_due_qar: balanceDue,
      due_date: dueDate,
      notes,
    })
    .select("id")
    .single();
  if (error) return failure(error.message);

  revalidatePath("/owner/invoices");
  redirect(`/owner/invoices`);
  void created;
}
