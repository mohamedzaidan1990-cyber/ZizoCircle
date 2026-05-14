"use client";

import { useFormState } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialActionState } from "@/lib/actions";
import { saveWorkerProfileAction } from "./actions";
import type { WorkerProfile } from "@/lib/types";

const STANDARD_SPECIALISATIONS = [
  { code: "casting", label: "Casting" },
  { code: "setting", label: "Stone setting" },
  { code: "polishing", label: "Polishing" },
  { code: "engraving", label: "Engraving" },
  { code: "assembly", label: "Assembly" },
  { code: "qc", label: "Quality control" },
] as const;

export function ProfileForm({
  workerId,
  profile,
}: {
  workerId: string;
  profile: WorkerProfile | null;
}) {
  const [state, formAction] = useFormState(
    saveWorkerProfileAction,
    initialActionState,
  );

  const existing = profile?.specialisation ?? [];
  const existingCodes = new Set(
    existing.filter((s) =>
      STANDARD_SPECIALISATIONS.some((std) => std.code === s),
    ),
  );
  const customSpecialisations = existing
    .filter((s) => !STANDARD_SPECIALISATIONS.some((std) => std.code === s))
    .join(", ");

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="worker_id" value={workerId} />

      <fieldset className="space-y-2">
        <Label>Specialisations</Label>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {STANDARD_SPECIALISATIONS.map((std) => (
            <label
              key={std.code}
              className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/40"
            >
              <input
                type="checkbox"
                name="specialisation_std"
                value={std.code}
                defaultChecked={existingCodes.has(std.code)}
                className="size-4"
              />
              {std.label}
            </label>
          ))}
        </div>
        <div className="space-y-1 pt-1">
          <Label htmlFor="specialisation_custom" className="text-xs text-muted-foreground">
            Other (comma-separated)
          </Label>
          <Input
            id="specialisation_custom"
            name="specialisation_custom"
            placeholder="e.g. electroforming, wax-carving"
            defaultValue={customSpecialisations}
          />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gold_loss_tolerance_pct">
            Gold-loss tolerance (%)
          </Label>
          <Input
            id="gold_loss_tolerance_pct"
            name="gold_loss_tolerance_pct"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={profile?.gold_loss_tolerance_pct ?? 5}
            required
          />
          <p className="text-xs text-muted-foreground">
            Loss % below this is flagged <strong>normal</strong>; up to 1.5× is{" "}
            <strong>monitor</strong>; up to 2× is <strong>high</strong>;
            above is <strong>critical</strong>.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hourly_rate_qar">Hourly rate (QAR/hr)</Label>
          <Input
            id="hourly_rate_qar"
            name="hourly_rate_qar"
            type="number"
            step="0.01"
            min="0"
            defaultValue={profile?.hourly_rate_qar ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="working_hours">Working hours</Label>
          <Input
            id="working_hours"
            name="working_hours"
            placeholder="Sun–Thu 8am–5pm"
            defaultValue={profile?.working_hours ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hire_date">Hire date</Label>
          <Input
            id="hire_date"
            name="hire_date"
            type="date"
            defaultValue={profile?.hire_date ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={profile?.notes ?? ""}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700">{state.success}</p>
      )}

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
      </div>
    </form>
  );
}
