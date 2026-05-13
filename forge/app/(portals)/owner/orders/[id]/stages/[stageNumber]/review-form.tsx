"use client";

import { useFormState } from "react-dom";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialActionState } from "@/lib/actions";
import { approveStageAction, reworkStageAction } from "./actions";

export function ApproveForm({
  orderId,
  stageNumber,
}: {
  orderId: string;
  stageNumber: number;
}) {
  const [state, action] = useFormState(approveStageAction, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="stage_number" value={stageNumber} />
      <div className="space-y-2">
        <Label htmlFor="owner_notes">Notes (optional)</Label>
        <Textarea id="owner_notes" name="owner_notes" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <SubmitButton pendingLabel="Approving…">Approve stage</SubmitButton>
    </form>
  );
}

export function ReworkForm({
  orderId,
  stageNumber,
}: {
  orderId: string;
  stageNumber: number;
}) {
  const [state, action] = useFormState(reworkStageAction, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="stage_number" value={stageNumber} />
      <div className="space-y-2">
        <Label htmlFor="rework_reason">Reason *</Label>
        <Textarea
          id="rework_reason"
          name="rework_reason"
          required
          placeholder="Explain what needs to be redone."
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <SubmitButton variant="destructive" pendingLabel="Sending…">
        Request rework
      </SubmitButton>
    </form>
  );
}
