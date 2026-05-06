"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function assignWorkerAction(formData: FormData) {
  await requireRole("owner");
  const supabase = createClient();
  const orderId = String(formData.get("order_id") ?? "");
  const workerId = String(formData.get("assigned_worker_id") ?? "");

  if (!orderId) redirect("/owner/orders");

  const newWorkerId = workerId || null;

  await supabase
    .from("orders")
    .update({ assigned_worker_id: newWorkerId })
    .eq("id", orderId);

  // Reassign open (non-approved) stages to the same worker.
  await supabase
    .from("order_stages")
    .update({ assigned_worker_id: newWorkerId })
    .eq("order_id", orderId)
    .neq("status", "approved");

  revalidatePath(`/owner/orders/${orderId}`);
  redirect(`/owner/orders/${orderId}`);
}
