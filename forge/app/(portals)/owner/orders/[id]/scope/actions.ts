"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { failure, type ActionState } from "@/lib/actions";

const CATEGORIES = [
  "design",
  "gold",
  "stones",
  "price",
  "delivery",
  "terms",
] as const;

async function ensureUnlocked(orderId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("orders")
    .select("scope_locked")
    .eq("id", orderId)
    .maybeSingle();
  if (!data || (data as { scope_locked: boolean }).scope_locked) {
    return false;
  }
  return true;
}

export async function addScopeItemAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("owner");
  const supabase = createClient();

  const orderId = String(formData.get("order_id") ?? "");
  const category = String(formData.get("category") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();

  if (!orderId) return failure("Missing order.");
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return failure("Pick a category.");
  }
  if (!label) return failure("Label is required.");
  if (!detail) return failure("Detail is required.");

  if (!(await ensureUnlocked(orderId))) {
    return failure("Scope is locked. No further edits allowed.");
  }

  const { count } = await supabase
    .from("scope_items")
    .select("*", { count: "exact", head: true })
    .eq("order_id", orderId);

  const { error } = await supabase.from("scope_items").insert({
    order_id: orderId,
    category,
    label,
    detail,
    sort_order: count ?? 0,
  });

  if (error) return failure(error.message);

  revalidatePath(`/owner/orders/${orderId}/scope`);
  return { success: "Item added." };
}

export async function deleteScopeItemAction(formData: FormData) {
  await requireRole("owner");
  const supabase = createClient();
  const orderId = String(formData.get("order_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");

  if (!orderId || !itemId) redirect("/owner/orders");
  if (!(await ensureUnlocked(orderId))) redirect(`/owner/orders/${orderId}/scope`);

  await supabase.from("scope_items").delete().eq("id", itemId).eq("order_id", orderId);
  revalidatePath(`/owner/orders/${orderId}/scope`);
  redirect(`/owner/orders/${orderId}/scope`);
}

export async function sendScopeAction(formData: FormData) {
  await requireRole("owner");
  const supabase = createClient();
  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) redirect("/owner/orders");

  const { count } = await supabase
    .from("scope_items")
    .select("*", { count: "exact", head: true })
    .eq("order_id", orderId);

  if (!count || count === 0) {
    redirect(`/owner/orders/${orderId}/scope?error=empty`);
  }

  await supabase
    .from("orders")
    .update({ status: "scope_pending" })
    .eq("id", orderId);

  revalidatePath(`/owner/orders/${orderId}`);
  revalidatePath(`/owner/orders/${orderId}/scope`);
  redirect(`/owner/orders/${orderId}`);
}
