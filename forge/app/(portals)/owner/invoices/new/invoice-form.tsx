"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialActionState } from "@/lib/actions";
import { createInvoiceAction } from "./actions";
import type { Order, Client } from "@/lib/types";

export function InvoiceForm({
  orders,
}: {
  orders: (Pick<Order, "id" | "order_number" | "piece_type" | "karat"> & {
    clients: Pick<Client, "full_name"> | null;
  })[];
}) {
  const [state, action] = useFormState(createInvoiceAction, initialActionState);
  const [lines, setLines] = useState([{ id: 1 }]);
  const addLine = () => setLines((ls) => [...ls, { id: Date.now() }]);
  const removeLine = (id: number) =>
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : ls));

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="order_id">Order</Label>
          <Select id="order_id" name="order_id" required defaultValue="">
            <option value="" disabled>
              Pick an order…
            </option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number} · {o.clients?.full_name ?? "—"} · {o.piece_type}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="due_date">Due date</Label>
          <Input id="due_date" name="due_date" type="date" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Line items</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addLine}>
            + Add line
          </Button>
        </div>
        <div className="space-y-2">
          {lines.map((l, idx) => (
            <div
              key={l.id}
              className="grid grid-cols-12 items-end gap-2 rounded-md border p-2"
            >
              <div className="col-span-6 space-y-1">
                <Label className="text-xs">Label</Label>
                <Input name="line_label" required placeholder="e.g. 18k gold 9.78g" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input
                  name="line_qty"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue="1"
                  required
                />
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">Unit price (QAR)</Label>
                <Input
                  name="line_unit_price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="col-span-1 flex justify-end">
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(l.id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                    aria-label={`Remove line ${idx + 1}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tax_pct">Tax %</Label>
          <Input id="tax_pct" name="tax_pct" type="number" min="0" step="0.01" defaultValue="0" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deposit_pct">Deposit %</Label>
          <Input
            id="deposit_pct"
            name="deposit_pct"
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue="50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Create invoice</SubmitButton>
      </div>
    </form>
  );
}
