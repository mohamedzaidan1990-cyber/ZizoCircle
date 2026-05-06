"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { failure, type ActionState } from "@/lib/actions";
import { notify } from "@/lib/notify";

async function ownClientOrder(orderId: string, userId: string) {
  const supabase = createClient();
  const { data: clientRow } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  const clientId = (clientRow as { id: string } | null)?.id;
  if (!clientId) return null;

  const { data: orderRow } = await supabase
    .from("orders")
    .select("id, scope_locked, status")
    .eq("id", orderId)
    .eq("client_id", clientId)
    .maybeSingle();
  return (orderRow as { id: string; scope_locked: boolean; status: string } | null) ?? null;
}

export async function toggleAckAction(formData: FormData) {
  const me = await requireRole("client");
  const supabase = createClient();
  const orderId = String(formData.get("order_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const ack = String(formData.get("ack") ?? "") === "true";
  if (!orderId || !itemId) redirect("/client");

  const order = await ownClientOrder(orderId, me.id);
  if (!order || order.scope_locked) redirect(`/client/orders/${orderId}/scope`);

  await supabase
    .from("scope_items")
    .update({ client_ack: ack })
    .eq("id", itemId)
    .eq("order_id", orderId);

  revalidatePath(`/client/orders/${orderId}/scope`);
  redirect(`/client/orders/${orderId}/scope`);
}

export async function signScopeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const me = await requireRole("client");
  const supabase = createClient();
  const orderId = String(formData.get("order_id") ?? "");
  const typedName = String(formData.get("typed_name") ?? "").trim();

  if (!orderId) return failure("Missing order.");
  if (!typedName) return failure("Type your full name to sign.");
  if (typedName.toLowerCase() !== me.full_name.toLowerCase()) {
    return failure("Typed name must match the name on your account.");
  }

  const order = await ownClientOrder(orderId, me.id);
  if (!order) return failure("Order not found.");
  if (order.scope_locked) return failure("Scope is already signed.");

  // All items must be acked before signing.
  const { data: items } = await supabase
    .from("scope_items")
    .select("id, client_ack")
    .eq("order_id", orderId);
  const rows = (items ?? []) as { id: string; client_ack: boolean }[];
  if (rows.length === 0) return failure("Scope is empty.");
  if (rows.some((r) => !r.client_ack)) {
    return failure("Tick every scope item before signing.");
  }

  const h = headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;
  const ua = h.get("user-agent") ?? null;

  const { error } = await supabase
    .from("orders")
    .update({
      scope_locked: true,
      scope_signed_at: new Date().toISOString(),
      scope_client_ip: ip,
      scope_device_fp: ua,
      status: "scope_signed",
    })
    .eq("id", orderId);
  if (error) return failure(error.message);

  const { data: owners } = await supabase
    .from("users")
    .select("id")
    .eq("role", "owner")
    .eq("is_active", true);
  const ownerIds = (owners ?? []).map((u) => (u as { id: string }).id);
  const { data: orderRow } = await supabase
    .from("orders")
    .select("order_number")
    .eq("id", orderId)
    .maybeSingle();
  const orderNumber =
    (orderRow as { order_number: string } | null)?.order_number ?? "";
  if (ownerIds.length) {
    await notify({
      userIds: ownerIds,
      type: "scope_signed",
      title: `Scope signed on ${orderNumber}`,
      body: `${me.full_name} signed the scope from ${ip ?? "an unknown IP"}.`,
      orderId,
      cta: { label: "Open order", href: `/owner/orders/${orderId}` },
    });
  }

  revalidatePath(`/client/orders/${orderId}`);
  revalidatePath(`/client/orders/${orderId}/scope`);
  redirect(`/client/orders/${orderId}`);
}
