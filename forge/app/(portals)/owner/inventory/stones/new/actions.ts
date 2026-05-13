"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { failure, type ActionState } from "@/lib/actions";
import type { StoneType, StoneShape } from "@/lib/types";

const ALLOWED_STONE_TYPES = new Set<string>([
  "diamond",
  "ruby",
  "emerald",
  "sapphire",
  "pearl",
  "amethyst",
  "topaz",
  "opal",
  "other",
]);

const ALLOWED_STONE_SHAPES = new Set<string>([
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
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseOptionalPositiveFloat(raw: string): number | undefined {
  if (!raw) return undefined;
  const n = parseFloat(raw);
  return isNaN(n) || n <= 0 ? undefined : n;
}

function parseOptionalNonNegativeFloat(raw: string): number | undefined {
  if (!raw) return undefined;
  const n = parseFloat(raw);
  return isNaN(n) || n < 0 ? undefined : n;
}

export async function addStoneParcelAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("owner");
  const supabase = createClient();

  const supplierId = String(formData.get("supplier_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim() || "piece";
  const stockQtyRaw = String(formData.get("stock_qty") ?? "").trim();
  const costRaw = String(formData.get("cost_per_unit_qar") ?? "").trim();
  const stoneType = String(formData.get("stone_type") ?? "").trim();
  const stoneShape = String(formData.get("stone_shape") ?? "").trim() || null;
  const sizeMmRaw = String(formData.get("size_mm") ?? "").trim();
  const colourGrade =
    String(formData.get("colour_grade") ?? "").trim() || null;
  const clarityGrade =
    String(formData.get("clarity_grade") ?? "").trim() || null;
  const cutGrade = String(formData.get("cut_grade") ?? "").trim() || null;
  const certLab = String(formData.get("cert_lab") ?? "").trim() || null;
  const certNumber =
    String(formData.get("cert_number") ?? "").trim() || null;
  const caratsRaw = String(formData.get("carats_total") ?? "").trim();
  const reorderRaw =
    String(formData.get("reorder_threshold") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // Validate supplier_id
  if (!supplierId || !UUID_RE.test(supplierId)) {
    return failure("A valid supplier is required.");
  }
  const { data: supplierRow, error: supplierErr } = await supabase
    .from("stone_suppliers")
    .select("id, name")
    .eq("id", supplierId)
    .maybeSingle();
  if (supplierErr || !supplierRow) {
    return failure("Supplier not found.");
  }
  const supplierName = (supplierRow as { id: string; name: string }).name;

  // Validate name
  if (!name) return failure("Parcel name is required.");

  // Validate stock qty
  const stockQty = parseInt(stockQtyRaw, 10);
  if (!stockQtyRaw || isNaN(stockQty) || stockQty < 1) {
    return failure("Stock qty must be at least 1.");
  }

  // Validate stone type
  if (!stoneType || !ALLOWED_STONE_TYPES.has(stoneType)) {
    return failure("A valid stone type is required.");
  }

  // Optional fields
  const costPerUnitQar = parseOptionalNonNegativeFloat(costRaw) ?? null;
  const sizeMm = parseOptionalPositiveFloat(sizeMmRaw) ?? null;
  const caratsTotal = parseOptionalPositiveFloat(caratsRaw) ?? null;

  const reorderInt =
    reorderRaw ? parseInt(reorderRaw, 10) : null;
  const reorderThreshold =
    reorderInt !== null && !isNaN(reorderInt) && reorderInt >= 0
      ? reorderInt
      : null;

  // Validate stone shape if provided
  if (stoneShape && !ALLOWED_STONE_SHAPES.has(stoneShape)) {
    return failure("Invalid stone shape.");
  }

  // Assemble stone_attrs JSONB
  const stone_attrs: Record<string, unknown> = {
    stone_type: stoneType as StoneType,
  };
  if (stoneShape) stone_attrs.stone_shape = stoneShape as StoneShape;
  if (sizeMm !== null) stone_attrs.size_mm = sizeMm;
  if (colourGrade) stone_attrs.colour_grade = colourGrade;
  if (clarityGrade) stone_attrs.clarity_grade = clarityGrade;
  if (cutGrade) stone_attrs.cut_grade = cutGrade;
  if (certLab) stone_attrs.cert_lab = certLab;
  if (certNumber) stone_attrs.cert_number = certNumber;
  if (caratsTotal !== null) stone_attrs.carats_total = caratsTotal;

  const { error } = await supabase.from("inventory_items").insert({
    name,
    category: "stone",
    unit,
    stock_qty: stockQty,
    cost_per_unit_qar: costPerUnitQar,
    supplier_id: supplierId,
    supplier_name: supplierName,
    stone_attrs,
    reorder_threshold: reorderThreshold,
    notes,
  });

  if (error) return failure(error.message);

  revalidatePath("/owner/inventory/stones");
  revalidatePath("/owner/inventory");
  redirect("/owner/inventory/stones");
}
