"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { failure, type ActionState } from "@/lib/actions";
import {
  STORAGE,
  buildOrderRefPath,
  uploadFile,
} from "@/lib/storage";
import type { StageTemplateStep } from "@/lib/types";

export async function createOrderAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("owner");
  const supabase = createClient();

  const clientId = String(formData.get("client_id") ?? "");
  const workerId = String(formData.get("assigned_worker_id") ?? "");
  const pieceType = String(formData.get("piece_type") ?? "").trim();
  const pieceDescription = String(formData.get("piece_description") ?? "").trim();
  const karat = String(formData.get("karat") ?? "").trim();
  const targetWeightRaw = String(formData.get("target_weight_grams") ?? "").trim();
  const estimatedDelivery = String(formData.get("estimated_delivery") ?? "").trim();
  const templateId = String(formData.get("stage_template_id") ?? "").trim();

  if (!clientId) return failure("Pick a client.");
  if (!pieceType) return failure("Piece type is required.");
  if (!karat) return failure("Karat is required.");

  const targetWeight = targetWeightRaw ? Number(targetWeightRaw) : null;
  if (targetWeight !== null && (Number.isNaN(targetWeight) || targetWeight <= 0)) {
    return failure("Target weight must be a positive number.");
  }

  const refImage = formData.get("reference_image") as File | null;
  const hasRefImage =
    refImage instanceof File && refImage.size > 0;
  if (hasRefImage && !refImage.type.startsWith("image/")) {
    return failure("Reference must be an image.");
  }

  const { data: order, error: insertErr } = await supabase
    .from("orders")
    .insert({
      client_id: clientId,
      assigned_worker_id: workerId || null,
      stage_template_id: templateId || null,
      piece_type: pieceType,
      piece_description: pieceDescription || null,
      karat,
      target_weight_grams: targetWeight,
      estimated_delivery: estimatedDelivery || null,
      status: "draft",
    })
    .select("id, stage_template_id")
    .single();

  if (insertErr || !order) {
    return failure(insertErr?.message ?? "Failed to create order.");
  }

  if (hasRefImage) {
    const refPath = buildOrderRefPath(
      order.id,
      refImage.name || "reference.jpg"
    );
    try {
      await uploadFile(STORAGE.stagePhotos, refPath, refImage);
      await supabase
        .from("orders")
        .update({ reference_image_url: refPath })
        .eq("id", order.id);
    } catch (e) {
      // Don't block order creation on a failed image upload — log and move on.
      console.error("[orders.new] reference image upload failed", e);
    }
  }

  // Materialise stages from the template so workers + clients can see them immediately.
  if (order.stage_template_id) {
    const { data: steps } = await supabase
      .from("stage_template_steps")
      .select("step_number, step_name")
      .eq("template_id", order.stage_template_id)
      .order("step_number", { ascending: true });

    const stepsTyped = (steps ?? []) as Pick<StageTemplateStep, "step_number" | "step_name">[];
    if (stepsTyped.length) {
      await supabase.from("order_stages").insert(
        stepsTyped.map((s) => ({
          order_id: order.id,
          stage_number: s.step_number,
          stage_name: s.step_name,
          assigned_worker_id: workerId || null,
          status: "not_started" as const,
        }))
      );
    }
  }

  revalidatePath("/owner");
  redirect(`/owner/orders/${order.id}`);
}
