"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { failure, type ActionState } from "@/lib/actions";
import { notify } from "@/lib/notify";

async function loadStage(orderId: string, stageNumber: number) {
  const supabase = createClient();
  const { data } = await supabase
    .from("order_stages")
    .select("id, status, order_id")
    .eq("order_id", orderId)
    .eq("stage_number", stageNumber)
    .maybeSingle();
  return data as { id: string; status: string; order_id: string } | null;
}

export async function approveStageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const me = await requireRole("owner");
  const supabase = createClient();

  const orderId = String(formData.get("order_id") ?? "");
  const stageNumber = Number(formData.get("stage_number") ?? 0);
  const ownerNotes = String(formData.get("owner_notes") ?? "").trim() || null;
  if (!orderId || !stageNumber) return failure("Missing stage.");

  const stage = await loadStage(orderId, stageNumber);
  if (!stage) return failure("Stage not found.");
  if (stage.status !== "submitted" && stage.status !== "rework_submitted") {
    return failure("Only submitted stages can be approved.");
  }

  // Verify all gemstone logs (if any) have no discrepancies before approving.
  const { data: gemLogs } = await supabase
    .from("stage_gemstone_logs")
    .select("discrepancy_flag")
    .eq("stage_id", stage.id);
  const flagged = (gemLogs ?? []).some(
    (l) => (l as { discrepancy_flag: boolean }).discrepancy_flag
  );
  if (flagged) {
    return failure(
      "Stone reconciliation has a discrepancy on this stage. Resolve it before approving."
    );
  }

  const nowIso = new Date().toISOString();
  const { error: stageErr } = await supabase
    .from("order_stages")
    .update({
      status: "approved",
      approved_at: nowIso,
      approved_by: me.id,
      owner_notes: ownerNotes,
      client_notified_at: nowIso,
    })
    .eq("id", stage.id);
  if (stageErr) return failure(stageErr.message);

  // Verify any gem logs as part of approval.
  await supabase
    .from("stage_gemstone_logs")
    .update({ verified_by_owner: true, verified_at: nowIso })
    .eq("stage_id", stage.id);

  // Advance the order: set current_stage_number to next un-approved stage number,
  // mark in_production / quality_check / completed as appropriate.
  const { data: stages } = await supabase
    .from("order_stages")
    .select("stage_number, status")
    .eq("order_id", orderId)
    .order("stage_number", { ascending: true });
  const all = (stages ?? []) as { stage_number: number; status: string }[];
  const nextOpen = all.find((s) => s.status !== "approved");

  let nextOrderStatus: string | null = "in_production";
  let currentStage = stageNumber;
  let completedAt: string | null = null;

  if (!nextOpen) {
    nextOrderStatus = "completed";
    completedAt = nowIso;
    currentStage = stageNumber;
  } else {
    currentStage = nextOpen.stage_number;
    if (nextOpen === all[all.length - 1]) nextOrderStatus = "quality_check";
  }

  await supabase
    .from("orders")
    .update({
      status: nextOrderStatus,
      current_stage_number: currentStage,
      completed_at: completedAt,
    })
    .eq("id", orderId);

  const { data: orderRow } = await supabase
    .from("orders")
    .select("client_id, order_number")
    .eq("id", orderId)
    .maybeSingle();
  const orderInfo = orderRow as
    | { client_id: string; order_number: string }
    | null;
  if (orderInfo) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("user_id")
      .eq("id", orderInfo.client_id)
      .maybeSingle();
    const clientUserId = (clientRow as { user_id: string | null } | null)?.user_id;
    if (clientUserId) {
      await notify({
        userIds: [clientUserId],
        type: nextOrderStatus === "completed" ? "order_completed" : "stage_approved",
        title:
          nextOrderStatus === "completed"
            ? `Your order ${orderInfo.order_number} is complete`
            : `Stage ${stageNumber} approved on ${orderInfo.order_number}`,
        body:
          nextOrderStatus === "completed"
            ? "All stages are approved. We'll be in touch with delivery details."
            : `Stage ${stageNumber} has been approved. New photos are available in your portal.`,
        orderId,
        stageId: stage.id,
        cta: { label: "View order", href: `/client/orders/${orderId}` },
      });
    }
  }

  revalidatePath(`/owner/orders/${orderId}`);
  revalidatePath(`/owner/orders/${orderId}/stages/${stageNumber}`);
  return { success: "Stage approved." };
}

export async function reworkStageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("owner");
  const supabase = createClient();

  const orderId = String(formData.get("order_id") ?? "");
  const stageNumber = Number(formData.get("stage_number") ?? 0);
  const reason = String(formData.get("rework_reason") ?? "").trim();
  if (!orderId || !stageNumber) return failure("Missing stage.");
  if (!reason) return failure("Rework reason is required.");

  const stage = await loadStage(orderId, stageNumber);
  if (!stage) return failure("Stage not found.");
  if (stage.status !== "submitted" && stage.status !== "rework_submitted") {
    return failure("Only submitted stages can be sent back for rework.");
  }

  const { error } = await supabase
    .from("order_stages")
    .update({
      status: "rework_requested",
      rework_reason: reason,
      submitted_at: null,
    })
    .eq("id", stage.id);
  if (error) return failure(error.message);

  const { data: stageRow } = await supabase
    .from("order_stages")
    .select("assigned_worker_id, stage_name")
    .eq("id", stage.id)
    .maybeSingle();
  const sr = stageRow as
    | { assigned_worker_id: string | null; stage_name: string }
    | null;
  const workerId = sr?.assigned_worker_id;
  if (workerId) {
    await notify({
      userIds: [workerId],
      type: "stage_rework",
      title: `Rework requested on ${sr?.stage_name ?? "stage"}`,
      body: reason,
      orderId,
      stageId: stage.id,
      cta: { label: "Open stage", href: `/worker/stages/${stage.id}` },
    });
  }

  revalidatePath(`/owner/orders/${orderId}`);
  revalidatePath(`/owner/orders/${orderId}/stages/${stageNumber}`);
  return { success: "Rework requested." };
}

export async function backToOrderAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "");
  redirect(`/owner/orders/${orderId}`);
}

export async function allocateStageGold(
  stageId: string,
  karat: string,
  grams: number
): Promise<ActionState> {
  await requireRole("owner");

  if (!stageId) return failure("Missing stage ID.");
  if (!karat) return failure("Missing karat.");
  if (!Number.isFinite(grams) || grams <= 0) return failure("Grams must be a positive number.");

  const supabase = createClient();
  const { error } = await supabase.rpc("allocate_gold", {
    p_stage_id: stageId,
    p_karat: karat,
    p_grams: grams,
  });

  if (error) return failure(error.message);

  // Resolve stage to get order_id so we can revalidate the right path.
  const { data: stageRow } = await supabase
    .from("order_stages")
    .select("order_id, stage_number")
    .eq("id", stageId)
    .maybeSingle();
  const sr = stageRow as { order_id: string; stage_number: number } | null;
  if (sr) {
    revalidatePath(`/owner/orders/${sr.order_id}/stages/${sr.stage_number}`);
  }

  return { success: "Gold allocated from inventory." };
}
