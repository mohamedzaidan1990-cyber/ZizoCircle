"use client";

import { useTransition, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { allocateStageGold } from "./actions";
import type { ActionState } from "@/lib/actions";

export function AllocateGoldForm({
  stageId,
  karat,
}: {
  stageId: string;
  karat: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [grams, setGrams] = useState("");
  const [state, setState] = useState<ActionState>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const gramsNum = Number(grams);
    if (!gramsNum || gramsNum <= 0) {
      setState({ error: "Enter a valid gram amount." });
      return;
    }
    startTransition(async () => {
      const result = await allocateStageGold(stageId, karat, gramsNum);
      setState(result);
      if (result?.success) setGrams("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Allocate gold from the factory inventory ({karat} lot) for this stage.
      </p>
      <div className="flex items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="alloc_grams">Grams *</Label>
          <Input
            id="alloc_grams"
            type="number"
            min="0.001"
            step="0.001"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            placeholder="e.g. 10.000"
            className="w-36"
            required
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Allocating…" : "Allocate from inventory"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
    </form>
  );
}
