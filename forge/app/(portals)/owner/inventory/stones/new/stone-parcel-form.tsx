"use client";

import { useFormState } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialActionState } from "@/lib/actions";
import type { StoneSupplier } from "@/lib/types";
import { addStoneParcelAction } from "./actions";

const STONE_TYPES = [
  "diamond",
  "ruby",
  "emerald",
  "sapphire",
  "pearl",
  "amethyst",
  "topaz",
  "opal",
  "other",
] as const;

const STONE_SHAPES = [
  "round",
  "oval",
  "pear",
  "princess",
  "marquise",
  "cushion",
  "emerald_cut",
  "asscher",
  "radiant",
  "heart",
  "other",
] as const;

interface Props {
  suppliers: StoneSupplier[];
}

export function StoneParcelForm({ suppliers }: Props) {
  const [state, formAction] = useFormState(
    addStoneParcelAction,
    initialActionState
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Parcel details</CardTitle>
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
          </div>

          {/* Parcel name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Parcel name *{" "}
              <span className="text-muted-foreground font-normal">
                e.g. Round 1.5mm VS diamonds
              </span>
            </Label>
            <Input id="name" name="name" required />
          </div>

          {/* Stone type */}
          <div className="space-y-2">
            <Label htmlFor="stone_type">Stone type *</Label>
            <select
              id="stone_type"
              name="stone_type"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select type…</option>
              {STONE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Stone shape */}
          <div className="space-y-2">
            <Label htmlFor="stone_shape">Stone shape</Label>
            <select
              id="stone_shape"
              name="stone_shape"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select shape…</option>
              {STONE_SHAPES.map((sh) => (
                <option key={sh} value={sh}>
                  {sh.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Unit and stock qty */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" name="unit" defaultValue="piece" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_qty">Stock qty *</Label>
              <Input
                id="stock_qty"
                name="stock_qty"
                type="number"
                step="1"
                min="1"
                required
              />
            </div>
          </div>

          {/* Cost and size */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cost_per_unit_qar">Cost per unit (QAR)</Label>
              <Input
                id="cost_per_unit_qar"
                name="cost_per_unit_qar"
                type="number"
                step="0.01"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size_mm">Size (mm)</Label>
              <Input
                id="size_mm"
                name="size_mm"
                type="number"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Grade fields */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="colour_grade">Colour grade</Label>
              <Input id="colour_grade" name="colour_grade" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clarity_grade">Clarity grade</Label>
              <Input id="clarity_grade" name="clarity_grade" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cut_grade">Cut grade</Label>
              <Input id="cut_grade" name="cut_grade" />
            </div>
          </div>

          {/* Cert fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cert_lab">Cert lab</Label>
              <Input id="cert_lab" name="cert_lab" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert_number">Cert number</Label>
              <Input id="cert_number" name="cert_number" />
            </div>
          </div>

          {/* Carats total and reorder */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="carats_total">Total carats (parcel)</Label>
              <Input
                id="carats_total"
                name="carats_total"
                type="number"
                step="0.001"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorder_threshold">Reorder threshold</Label>
              <Input
                id="reorder_threshold"
                name="reorder_threshold"
                type="number"
                step="1"
                min="0"
              />
            </div>
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
            <SubmitButton pendingLabel="Saving…">Add parcel</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
