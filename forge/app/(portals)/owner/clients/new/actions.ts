"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { failure, type ActionState } from "@/lib/actions";

export async function createClientAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("owner");
  const supabase = createClient();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const company = String(formData.get("company_name") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!fullName) return failure("Full name is required.");

  // Pre-create a users row by email so the client gets role='client' on signup
  // (the auth bootstrap trigger will link by email).
  let userId: string | null = null;
  if (email) {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      userId = (existing as { id: string }).id;
    } else {
      const { data: created, error: userErr } = await supabase
        .from("users")
        .insert({
          full_name: fullName,
          email,
          phone,
          role: "client",
        })
        .select("id")
        .single();
      if (userErr) return failure(`Could not create user record: ${userErr.message}`);
      userId = (created as { id: string }).id;
    }
  }

  const { error: clientErr } = await supabase.from("clients").insert({
    user_id: userId,
    full_name: fullName,
    email,
    phone,
    company_name: company,
    address,
    notes,
  });

  if (clientErr) return failure(clientErr.message);

  revalidatePath("/owner/clients");
  redirect("/owner/clients");
}
