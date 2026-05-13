"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { failure, type ActionState } from "@/lib/actions";
import {
  STORAGE,
  buildIssuePhotoPath,
  uploadFile,
} from "@/lib/storage";

const STONE_TYPES = [
  "diamond",
  "ruby",
  "emerald",
  "sapphire",
  "pearl",
  "amethyst",
  "topaz",
  "opal",
  "other",
] as const;

const STONE_SHAPES = [
  "round",
  "oval",
  "pear",
  "princess",
  "marquise",
  "cushion",
  "emerald_cut",
  "asscher",
  "radiant",
  "heart",
  "other",
] as const;

const SOURCES = ["client_supplied", "factory_supplied"] as const;

export async function issueStonesAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("owner");
  const supabase = createClient();

  const orderId = String(formData.get("order_id") ?? "");
  const stoneType = String(formData.get("stone_type") ?? "");
  const stoneShape = String(formData.get("stone_shape") ?? "");
  const qtyPiecesRaw = String(formData.get("qty_pieces") ?? "");
  const totalCaratsRaw = String(formData.get("total_carats") ?? "");
  const colour = String(formData.get("colour_grade") ?? "").trim() || null;
  const clarity = String(formData.get("clarity_grade") ?? "").trim() || null;
  const cut = String(formData.get("cut_grade") ?? "").trim() || null;
  const certNumber = String(formData.get("cert_number") ?? "").trim() || null;
  const certLab = String(formData.get("cert_lab") ?? "").trim() || null;
  const source = String(formData.get("source") ?? "client_supplied");
  const valueRaw = String(formData.get("estimated_value_qar") ?? "").trim();
  const workerId = String(formData.get("issued_to_worker_id") ?? "") || null;
  const notes = String(formData.get("issue_notes") ?? "").trim() || null;
  const photo = formData.get("issue_photo") as File | null;

  if (!orderId) return failure("Missing order.");
  if (!STONE_TYPES.includes(stoneType as (typeof STONE_TYPES)[number])) {
    return failure("Invalid stone type.");
  }
  const shapeValue = stoneShape && STONE_SHAPES.includes(stoneShape as (typeof STONE_SHAPES)[number])
    ? stoneShape
    : null;
  if (!SOURCES.includes(source as (typeof SOURCES)[number])) {
    return failure("Invalid source.");
  }

  const qty = Number(qtyPiecesRaw);
  const carats = Number(totalCaratsRaw);
  if (!Number.isInteger(qty) || qty <= 0) return failure("Quantity must be a positive integer.");
  if (Number.isNaN(carats) || carats <= 0) return failure("Total carats must be > 0.");

  if (!photo || !(photo instanceof File) || photo.size === 0) {
    return failure("Issue photo is required before stones can be handed over.");
  }
  if (!photo.type.startsWith("image/")) {
    return failure("Photo must be an image.");
  }

  const path = buildIssuePhotoPath(orderId, photo.name || "issue.jpg");
  try {
    await uploadFile(STORAGE.issuePhotos, path, photo);
  } catch (e) {
    return failure(e instanceof Error ? e.message : "Photo upload failed.");
  }

  const value = valueRaw ? Number(valueRaw) : null;
  if (value !== null && Number.isNaN(value)) return failure("Invalid estimated value.");

  const { error } = await supabase.from("order_gemstones").insert({
    order_id: orderId,
    stone_type: stoneType,
    stone_shape: shapeValue,
    qty_pieces: qty,
    total_carats: carats,
    colour_grade: colour,
    clarity_grade: clarity,
    cut_grade: cut,
    cert_number: certNumber,
    cert_lab: certLab,
    source,
    estimated_value_qar: value,
    issued_to_worker_id: workerId,
    issued_at: workerId ? new Date().toISOString() : null,
    issue_photo_url: path,
    issue_notes: notes,
  });

  if (error) return failure(error.message);

  revalidatePath(`/owner/orders/${orderId}`);
  revalidatePath(`/owner/orders/${orderId}/stones`);
  redirect(`/owner/orders/${orderId}/stones`);
}
