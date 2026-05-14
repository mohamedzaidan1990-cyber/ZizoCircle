"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { failure, ok, type ActionState } from "@/lib/actions";

export async function saveWorkerProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("owner");
  const supabase = createClient();

  const workerId = String(formData.get("worker_id") ?? "").trim();
  if (!workerId) return failure("Missing worker id.");

  // Confirm the target user exists and is a worker.
  const { data: worker, error: workerErr } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", workerId)
    .maybeSingle();
  if (workerErr) return failure(workerErr.message);
  if (!worker) return failure("Worker not found.");
  if ((worker as { role: string }).role !== "worker") {
    return failure("Target user is not a worker.");
  }

  // Specialisations — checkboxes (standard codes) + free-text "Other".
  const stdChecked = formData.getAll("specialisation_std").map(String);
  const customRaw = String(formData.get("specialisation_custom") ?? "");
  const customParts = customRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const specialisation = Array.from(new Set([...stdChecked, ...customParts]));

  // Tolerance — required, 0..100.
  const toleranceRaw = String(formData.get("gold_loss_tolerance_pct") ?? "").trim();
  const tolerance = Number(toleranceRaw);
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance >= 100) {
    return failure("Gold-loss tolerance must be a number between 0 and 100.");
  }

  // Hourly rate — optional, non-negative.
  const hourlyRaw = String(formData.get("hourly_rate_qar") ?? "").trim();
  let hourly: number | null = null;
  if (hourlyRaw) {
    hourly = Number(hourlyRaw);
    if (!Number.isFinite(hourly) || hourly < 0) {
      return failure("Hourly rate must be a non-negative number.");
    }
  }

  const workingHours = String(formData.get("working_hours") ?? "").trim() || null;
  const hireDateRaw = String(formData.get("hire_date") ?? "").trim();
  const hireDate = hireDateRaw || null;
  if (hireDate && Number.isNaN(Date.parse(hireDate))) {
    return failure("Hire date is not a valid date.");
  }
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // Upsert against the unique (user_id) constraint added in 0007.
  const { error } = await supabase
    .from("worker_profiles")
    .upsert(
      {
        user_id: workerId,
        specialisation,
        gold_loss_tolerance_pct: tolerance,
        hourly_rate_qar: hourly,
        working_hours: workingHours,
        hire_date: hireDate,
        notes,
      },
      { onConflict: "user_id" },
    );

  if (error) return failure(error.message);

  revalidatePath(`/owner/workers/${workerId}`);
  revalidatePath("/owner/workers");
  return ok("Profile saved.");
}
