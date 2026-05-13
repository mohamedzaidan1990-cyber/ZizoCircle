"use client";

import { useFormState } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialActionState } from "@/lib/actions";
import type { GoldSupplier } from "@/lib/types";
import { addGoldPurchaseAction } from "./actions";

const KARATS = ["18K", "21K", "22K", "24K"] as const;

interface Props {
  suppliers: GoldSupplier[];
}

export function GoldPurchaseForm({ suppliers }: Props) {
  const [state, formAction] = useFormState(
    addGoldPurchaseAction,
    initialActionState
  );

  const today = new Date().toISOString().split("T")[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Purchase details</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {/* Supplier */}
          <div className="space-y-2">
            <Label htmlFor="supplier_id">Supplier *</Label>
            <select
              id="supplier_id"
              name="supplier_id"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select a supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {state?.error && state.error.toLowerCase().includes("supplier") && (
              <p className="text-xs text-destructive">{state.error}</p>
            )}
          </div>

          {/* Karat */}
          <div className="space-y-2">
            <Label htmlFor="karat">Karat *</Label>
            <select
              id="karat"
              name="karat"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select karat…</option>
              {KARATS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* Weight and price */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weight_grams">Weight (g) *</Label>
              <Input
                id="weight_grams"
                name="weight_grams"
                type="number"
                step="0.001"
                min="0.001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_per_gram">Price per gram (QAR) *</Label>
              <Input
                id="price_per_gram"
                name="price_per_gram"
                type="number"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          {/* Purchase date */}
          <div className="space-y-2">
            <Label htmlFor="purchase_date">Purchase date *</Label>
            <Input
              id="purchase_date"
              name="purchase_date"
              type="date"
              defaultValue={today}
              required
            />
          </div>

          {/* Invoice ref */}
          <div className="space-y-2">
            <Label htmlFor="invoice_ref">Invoice ref</Label>
            <Input id="invoice_ref" name="invoice_ref" />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex justify-end">
            <SubmitButton pendingLabel="Saving…">Add purchase</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
