"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { failure, type ActionState } from "@/lib/actions";
import { notify, sendEmail } from "@/lib/notify";

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

  // Notify the client (or email if no portal account yet).
  const { data: orderRow } = await supabase
    .from("orders")
    .select("client_id, order_number")
    .eq("id", orderId)
    .maybeSingle();
  const o = orderRow as
    | { client_id: string; order_number: string }
    | null;
  if (o) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("user_id, email, full_name")
      .eq("id", o.client_id)
      .maybeSingle();
    const cl = clientRow as
      | { user_id: string | null; email: string | null; full_name: string }
      | null;
    const title = `Scope ready to sign on ${o.order_number}`;
    const body =
      "Your workshop has prepared the scope of work for your piece. Review every line and sign in your portal to start production.";
    if (cl?.user_id) {
      await notify({
        userIds: [cl.user_id],
        type: "scope_ready",
        title,
        body,
        orderId,
        cta: { label: "Open scope", href: `/client/orders/${orderId}/scope` },
      });
    } else if (cl?.email) {
      await sendEmail({
        to: cl.email,
        recipientName: cl.full_name,
        subject: title,
        body,
      });
    }
  }

  revalidatePath(`/owner/orders/${orderId}`);
  revalidatePath(`/owner/orders/${orderId}/scope`);
  redirect(`/owner/orders/${orderId}`);
}
