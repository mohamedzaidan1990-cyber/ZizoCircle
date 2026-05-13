"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { failure, ok, type ActionState } from "@/lib/actions";
import {
  STORAGE,
  buildStagePhotoPath,
  uploadFile,
} from "@/lib/storage";
import { notify } from "@/lib/notify";
import type { OrderStage } from "@/lib/types";

async function ownStage(stageId: string, workerId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("order_stages")
    .select("*")
    .eq("id", stageId)
    .eq("assigned_worker_id", workerId)
    .maybeSingle();
  return (data as OrderStage | null) ?? null;
}

export async function startStageAction(formData: FormData) {
  const me = await requireRole("worker");
  const stageId = String(formData.get("stage_id") ?? "");
  if (!stageId) redirect("/worker");
  const stage = await ownStage(stageId, me.id);
  if (!stage) redirect("/worker");

  if (stage.status === "not_started") {
    const supabase = createClient();
    const nowIso = new Date().toISOString();
    await supabase
      .from("order_stages")
      .update({ status: "in_progress", started_at: nowIso })
      .eq("id", stage.id);

    // Advance the parent order so the dashboard reflects production state
    // immediately, not only after the first approval.
    await supabase
      .from("orders")
      .update({
        status: "in_production",
        current_stage_number: stage.stage_number,
      })
      .eq("id", stage.order_id)
      .in("status", ["scope_signed", "draft"]);
  }
  revalidatePath(`/worker/stages/${stageId}`);
  redirect(`/worker/stages/${stageId}`);
}

export async function uploadStagePhotoAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const me = await requireRole("worker");
  const supabase = createClient();
  const stageId = String(formData.get("stage_id") ?? "");
  const photo = formData.get("photo") as File | null;

  if (!stageId) return failure("Missing stage.");
  if (!photo || !(photo instanceof File) || photo.size === 0) {
    return failure("Photo is required.");
  }
  if (!photo.type.startsWith("image/")) return failure("Must be an image.");

  const stage = await ownStage(stageId, me.id);
  if (!stage) return failure("Not your stage.");
  if (stage.status === "approved") return failure("Stage already approved.");

  const path = buildStagePhotoPath(
    stage.order_id,
    stage.id,
    photo.name || "photo.jpg"
  );
  try {
    await uploadFile(STORAGE.stagePhotos, path, photo);
  } catch (e) {
    return failure(e instanceof Error ? e.message : "Upload failed.");
  }

  const newPhotos = [...(stage.photo_urls ?? []), path];
  const { error } = await supabase
    .from("order_stages")
    .update({ photo_urls: newPhotos })
    .eq("id", stage.id);
  if (error) return failure(error.message);

  revalidatePath(`/worker/stages/${stageId}`);
  return ok("Photo uploaded.");
}

export async function saveStoneLogAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const me = await requireRole("worker");
  const supabase = createClient();
  const stageId = String(formData.get("stage_id") ?? "");
  const gemId = String(formData.get("gem_id") ?? "");
  const inPiece = Number(formData.get("qty_in_piece") ?? 0);
  const loose = Number(formData.get("qty_remaining_loose") ?? 0);
  const returned = Number(formData.get("qty_returned") ?? 0);
  const damaged = Number(formData.get("qty_damaged") ?? 0);
  const notes = String(formData.get("discrepancy_notes") ?? "").trim() || null;

  if (!stageId || !gemId) return failure("Missing stage or batch.");
  for (const v of [inPiece, loose, returned, damaged]) {
    if (!Number.isInteger(v) || v < 0) return failure("Counts must be non-negative integers.");
  }

  const stage = await ownStage(stageId, me.id);
  if (!stage) return failure("Not your stage.");

  // The DB trigger sets discrepancy_flag, but report it back to the worker.
  const { data: gem } = await supabase
    .from("order_gemstones")
    .select("qty_pieces, order_id")
    .eq("id", gemId)
    .maybeSingle();
  if (!gem) return failure("Batch not found.");
  const g = gem as { qty_pieces: number; order_id: string };
  if (g.order_id !== stage.order_id) return failure("Batch does not belong to this order.");

  const total = inPiece + loose + returned + damaged;
  const discrepancy = total !== g.qty_pieces;

  const { error } = await supabase
    .from("stage_gemstone_logs")
    .upsert(
      {
        stage_id: stage.id,
        gem_id: gemId,
        qty_in_piece: inPiece,
        qty_remaining_loose: loose,
        qty_returned: returned,
        qty_damaged: damaged,
        discrepancy_notes: notes,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "stage_id,gem_id" }
    );
  if (error) return failure(error.message);

  revalidatePath(`/worker/stages/${stageId}`);
  if (discrepancy) {
    return failure(
      `Reconciliation off by ${g.qty_pieces - total}. Saved with discrepancy flag — fix before submitting.`
    );
  }
  return ok("Reconciliation saved.");
}

export async function submitStageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const me = await requireRole("worker");
  const supabase = createClient();
  const stageId = String(formData.get("stage_id") ?? "");
  const goldInRaw = String(formData.get("gold_in_grams") ?? "").trim();
  const goldOutRaw = String(formData.get("gold_out_grams") ?? "").trim();
  const notes = String(formData.get("worker_notes") ?? "").trim() || null;

  if (!stageId) return failure("Missing stage.");
  const stage = await ownStage(stageId, me.id);
  if (!stage) return failure("Not your stage.");

  if (stage.status === "approved") return failure("Stage already approved.");

  // Photo required.
  const photoCount = (stage.photo_urls ?? []).length;
  if (photoCount === 0) {
    return failure("Upload at least one photo before submitting.");
  }

  // Gold values: required if either is set (to avoid half-data); allow both null
  // for stages like Design Approval where gold doesn't apply.
  let goldIn: number | null = null;
  let goldOut: number | null = null;
  if (goldInRaw || goldOutRaw) {
    goldIn = Number(goldInRaw);
    goldOut = Number(goldOutRaw);
    if (Number.isNaN(goldIn) || Number.isNaN(goldOut)) {
      return failure("Gold weights must be numbers.");
    }
    if (goldIn <= 0 || goldOut < 0) {
      return failure("Gold in must be > 0 and gold out >= 0.");
    }
  }

  // Stone reconciliation hard block: any discrepancy_flag = true blocks submit.
  const { data: logs } = await supabase
    .from("stage_gemstone_logs")
    .select("discrepancy_flag")
    .eq("stage_id", stage.id);
  const flagged = (logs ?? []).some(
    (l) => (l as { discrepancy_flag: boolean }).discrepancy_flag
  );
  if (flagged) {
    return failure(
      "Stone count does not reconcile. Fix the discrepancy before submitting."
    );
  }

  const isRework = stage.status === "rework_requested";
  const nowIso = new Date().toISOString();

  const update: Record<string, unknown> = {
    gold_in_grams: goldIn,
    gold_out_grams: goldOut,
    worker_notes: notes,
    status: isRework ? "rework_submitted" : "submitted",
    submitted_at: nowIso,
  };
  // Defensive: backfill started_at if the worker submitted without
  // explicitly clicking "start stage".
  if (!stage.started_at) update.started_at = nowIso;

  const { error } = await supabase
    .from("order_stages")
    .update(update)
    .eq("id", stage.id);
  if (error) return failure(error.message);

  // Same dashboard freshness as startStage: ensure the order is in_production.
  if (!isRework) {
    await supabase
      .from("orders")
      .update({
        status: "in_production",
        current_stage_number: stage.stage_number,
      })
      .eq("id", stage.order_id)
      .in("status", ["scope_signed", "draft"]);
  }

  const { data: owners } = await supabase
    .from("users")
    .select("id")
    .eq("role", "owner")
    .eq("is_active", true);
  const ownerIds = (owners ?? []).map((u) => (u as { id: string }).id);
  const { data: orderRow } = await supabase
    .from("orders")
    .select("order_number")
    .eq("id", stage.order_id)
    .maybeSingle();
  const orderNumber =
    (orderRow as { order_number: string } | null)?.order_number ?? "";
  if (ownerIds.length) {
    await notify({
      userIds: ownerIds,
      type: "stage_submitted",
      title: `${stage.stage_name} submitted on ${orderNumber}`,
      body: `${me.full_name} submitted ${stage.stage_name}${
        isRework ? " (rework)" : ""
      } for review.`,
      orderId: stage.order_id,
      stageId: stage.id,
      cta: {
        label: "Review stage",
        href: `/owner/orders/${stage.order_id}/stages/${stage.stage_number}`,
      },
    });
  }

  revalidatePath(`/worker`);
  revalidatePath(`/worker/stages/${stageId}`);
  return ok("Submitted for review.");
}
