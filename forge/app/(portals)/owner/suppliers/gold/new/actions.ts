"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { failure, type ActionState } from "@/lib/actions";

export async function addGoldSupplierAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("owner");
  const supabase = createClient();

  const name = String(formData.get("name") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) return failure("Name is required.");

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return failure("Please enter a valid email address.");
  }

  const { error } = await supabase.from("gold_suppliers").insert({
    name,
    contact_name: contactName,
    phone,
    email,
    address,
    notes,
  });

  if (error) return failure(error.message);

  revalidatePath("/owner/suppliers/gold");
  redirect("/owner/suppliers/gold");
}
