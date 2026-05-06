"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { failure, type ActionState } from "@/lib/actions";

export async function createWorkerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("owner");
  const supabase = createClient();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!fullName) return failure("Full name is required.");
  if (!email) return failure("Email is required so the worker can sign up.");

  const { data: existing } = await supabase
    .from("users")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    const ex = existing as { id: string; role: string };
    if (ex.role !== "worker") {
      const { error } = await supabase
        .from("users")
        .update({ role: "worker", full_name: fullName, phone })
        .eq("id", ex.id);
      if (error) return failure(error.message);
    }
  } else {
    const { error } = await supabase.from("users").insert({
      full_name: fullName,
      email,
      phone,
      role: "worker",
    });
    if (error) return failure(error.message);
  }

  revalidatePath("/owner/workers");
  redirect("/owner/workers");
}
