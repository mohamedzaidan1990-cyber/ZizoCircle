"use client";

import { useFormState } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialActionState } from "@/lib/actions";
import { submitStageAction } from "./actions";
import type { OrderStage } from "@/lib/types";

export function SubmitStageForm({
  stage,
  hasPhotos,
  hasDiscrepancy,
}: {
  stage: OrderStage;
  hasPhotos: boolean;
  hasDiscrepancy: boolean;
}) {
  const [state, action] = useFormState(submitStageAction, initialActionState);
  const blocked = !hasPhotos || hasDiscrepancy;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="stage_id" value={stage.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gold_in_grams">Gold issued (g)</Label>
          <Input
            id="gold_in_grams"
            name="gold_in_grams"
            type="number"
            step="0.0001"
            min="0"
            defaultValue={stage.gold_in_grams ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gold_out_grams">Gold returned (g)</Label>
          <Input
            id="gold_out_grams"
            name="gold_out_grams"
            type="number"
            step="0.0001"
            min="0"
            defaultValue={stage.gold_out_grams ?? ""}
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Loss % is calculated automatically. Leave both blank for stages where gold weighing
        does not apply.
      </p>

      <div className="space-y-2">
        <Label htmlFor="worker_notes">Notes</Label>
        <Textarea
          id="worker_notes"
          name="worker_notes"
          defaultValue={stage.worker_notes ?? ""}
          placeholder="Anything the owner should know."
        />
      </div>

      {!hasPhotos && (
        <p className="text-sm text-destructive">
          Upload at least one photo before submitting.
        </p>
      )}
      {hasDiscrepancy && (
        <p className="text-sm text-destructive">
          Stone reconciliation has a discrepancy. Fix it before submitting.
        </p>
      )}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}

      <SubmitButton disabled={blocked} pendingLabel="Submitting…">
        Submit for owner review
      </SubmitButton>
    </form>
  );
}
