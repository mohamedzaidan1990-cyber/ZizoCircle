"use client";

import { useFormState } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { initialActionState } from "@/lib/actions";
import { saveStoneLogAction } from "./actions";
import type { OrderGemstone, StageGemstoneLog } from "@/lib/types";

export function StoneLogForm({
  stageId,
  gem,
  existing,
}: {
  stageId: string;
  gem: Pick<OrderGemstone, "id" | "stone_type" | "qty_pieces" | "stone_shape">;
  existing: StageGemstoneLog | null;
}) {
  const [state, action] = useFormState(saveStoneLogAction, initialActionState);
  const total =
    (existing?.qty_in_piece ?? 0) +
    (existing?.qty_remaining_loose ?? 0) +
    (existing?.qty_returned ?? 0) +
    (existing?.qty_damaged ?? 0);
  const off = gem.qty_pieces - total;

  return (
    <form action={action} className="space-y-3 rounded-md border p-3">
      <input type="hidden" name="stage_id" value={stageId} />
      <input type="hidden" name="gem_id" value={gem.id} />

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium capitalize">
          {gem.qty_pieces}× {gem.stone_type}
          {gem.stone_shape ? ` · ${gem.stone_shape.replace("_", " ")}` : ""}
        </p>
        {existing &&
          (existing.discrepancy_flag ? (
            <Badge variant="danger">Off by {off}</Badge>
          ) : (
            <Badge variant="success">Reconciled</Badge>
          ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Counter
          name="qty_in_piece"
          label="In piece"
          defaultValue={existing?.qty_in_piece ?? 0}
        />
        <Counter
          name="qty_remaining_loose"
          label="Loose"
          defaultValue={existing?.qty_remaining_loose ?? 0}
        />
        <Counter
          name="qty_returned"
          label="Returned"
          defaultValue={existing?.qty_returned ?? 0}
        />
        <Counter
          name="qty_damaged"
          label="Damaged"
          defaultValue={existing?.qty_damaged ?? 0}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`disc-${gem.id}`}>Notes</Label>
        <Textarea
          id={`disc-${gem.id}`}
          name="discrepancy_notes"
          defaultValue={existing?.discrepancy_notes ?? ""}
          placeholder="Explain any discrepancy"
        />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}

      <div className="flex justify-end">
        <SubmitButton size="sm" pendingLabel="Saving…">
          Save reconciliation
        </SubmitButton>
      </div>
    </form>
  );
}

function Counter({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        name={name}
        type="number"
        min={0}
        step={1}
        defaultValue={defaultValue}
      />
    </div>
  );
}
