"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { failure, type ActionState } from "@/lib/actions";

const ALLOWED_KARATS = new Set(["18K", "21K", "22K", "24K"]);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function addGoldPurchaseAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole("owner");
  const supabase = createClient();

  const supplierId = String(formData.get("supplier_id") ?? "").trim();
  const karat = String(formData.get("karat") ?? "").trim();
  const weightRaw = String(formData.get("weight_grams") ?? "").trim();
  const priceRaw = String(formData.get("price_per_gram") ?? "").trim();
  const purchaseDate = String(formData.get("purchase_date") ?? "").trim();
  const invoiceRef =
    String(formData.get("invoice_ref") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // Validate supplier_id
  if (!supplierId || !UUID_RE.test(supplierId)) {
    return failure("A valid supplier is required.");
  }
  const { data: supplierRow, error: supplierErr } = await supabase
    .from("gold_suppliers")
    .select("id, name")
    .eq("id", supplierId)
    .maybeSingle();
  if (supplierErr || !supplierRow) {
    return failure("Supplier not found.");
  }
  const supplierName = (supplierRow as { id: string; name: string }).name;

  // Validate karat
  if (!ALLOWED_KARATS.has(karat)) {
    return failure("Karat must be one of 18K, 21K, 22K, 24K.");
  }

  // Validate weight
  const weightGrams = parseFloat(weightRaw);
  if (!weightRaw || isNaN(weightGrams) || weightGrams <= 0) {
    return failure("Weight must be a positive number.");
  }

  // Validate price
  const pricePerGram = parseFloat(priceRaw);
  if (!priceRaw || isNaN(pricePerGram) || pricePerGram < 0) {
    return failure("Price per gram must be zero or a positive number.");
  }

  // Validate purchase date
  if (!purchaseDate || isNaN(Date.parse(purchaseDate))) {
    return failure("A valid purchase date is required.");
  }

  const totalCost = weightGrams * pricePerGram;

  const { error } = await supabase.from("gold_purchases").insert({
    supplier_id: supplierId,
    supplier_name: supplierName,
    karat,
    weight_grams: weightGrams,
    price_per_gram: pricePerGram,
    total_cost_qar: totalCost,
    remaining_grams: weightGrams,
    purchase_date: purchaseDate,
    invoice_ref: invoiceRef,
    notes,
    created_by: user.id,
  });

  if (error) return failure(error.message);

  revalidatePath("/owner/inventory/gold");
  revalidatePath("/owner/inventory");
  redirect("/owner/inventory/gold");
}
