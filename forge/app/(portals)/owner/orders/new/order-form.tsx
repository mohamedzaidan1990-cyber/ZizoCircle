"use client";

import { useFormState } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialActionState } from "@/lib/actions";
import { createOrderAction } from "./actions";
import type { Client, StageTemplate, User } from "@/lib/types";

export function OrderForm({
  clients,
  workers,
  templates,
}: {
  clients: Pick<Client, "id" | "full_name" | "company_name">[];
  workers: Pick<User, "id" | "full_name">[];
  templates: Pick<StageTemplate, "id" | "name" | "is_default">[];
}) {
  const [state, formAction] = useFormState(createOrderAction, initialActionState);
  const defaultTemplate = templates.find((t) => t.is_default)?.id ?? "";

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="client_id">Client</Label>
          <Select id="client_id" name="client_id" required defaultValue="">
            <option value="" disabled>
              Pick a client…
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
                {c.company_name ? ` (${c.company_name})` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assigned_worker_id">Assigned worker</Label>
          <Select id="assigned_worker_id" name="assigned_worker_id" defaultValue="">
            <option value="">Unassigned</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.full_name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="piece_type">Piece type</Label>
          <Input id="piece_type" name="piece_type" placeholder="Ring" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="karat">Karat</Label>
          <Select id="karat" name="karat" required defaultValue="18k">
            <option value="14k">14k</option>
            <option value="18k">18k</option>
            <option value="21k">21k</option>
            <option value="22k">22k</option>
            <option value="24k">24k</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="target_weight_grams">Target weight (g)</Label>
          <Input
            id="target_weight_grams"
            name="target_weight_grams"
            type="number"
            step="0.001"
            min="0"
            placeholder="9.500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="piece_description">Description</Label>
        <Textarea
          id="piece_description"
          name="piece_description"
          placeholder="Brief description of the piece, design notes, references…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="estimated_delivery">Estimated delivery</Label>
          <Input id="estimated_delivery" name="estimated_delivery" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stage_template_id">Stage template</Label>
          <Select id="stage_template_id" name="stage_template_id" defaultValue={defaultTemplate}>
            <option value="">No template (add stages manually)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.is_default ? " (default)" : ""}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Creating…">Create order</SubmitButton>
      </div>
    </form>
  );
}
