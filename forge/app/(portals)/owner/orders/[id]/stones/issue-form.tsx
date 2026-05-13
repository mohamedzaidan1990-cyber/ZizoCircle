"use client";

import { useFormState } from "react-dom";
import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialActionState } from "@/lib/actions";
import { issueStonesAction } from "./actions";
import type { User } from "@/lib/types";

export function IssueStonesForm({
  orderId,
  workers,
}: {
  orderId: string;
  workers: Pick<User, "id" | "full_name">[];
}) {
  const [state, formAction] = useFormState(issueStonesAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4" encType="multipart/form-data">
      <input type="hidden" name="order_id" value={orderId} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="stone_type">Stone *</Label>
          <Select id="stone_type" name="stone_type" defaultValue="diamond" required>
            {[
              "diamond",
              "ruby",
              "emerald",
              "sapphire",
              "pearl",
              "amethyst",
              "topaz",
              "opal",
              "other",
            ].map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="stone_shape">Shape</Label>
          <Select id="stone_shape" name="stone_shape" defaultValue="">
            <option value="">—</option>
            {[
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
            ].map((s) => (
              <option key={s} value={s} className="capitalize">
                {s.replace("_", " ")}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">Source *</Label>
          <Select id="source" name="source" defaultValue="client_supplied" required>
            <option value="client_supplied">Client supplied</option>
            <option value="factory_supplied">Factory supplied</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="qty_pieces">Pieces *</Label>
          <Input id="qty_pieces" name="qty_pieces" type="number" min="1" step="1" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="total_carats">Total carats *</Label>
          <Input
            id="total_carats"
            name="total_carats"
            type="number"
            min="0.0001"
            step="0.0001"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimated_value_qar">Estimated value (QAR)</Label>
          <Input
            id="estimated_value_qar"
            name="estimated_value_qar"
            type="number"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="colour_grade">Colour</Label>
          <Input id="colour_grade" name="colour_grade" placeholder="D / E / F…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clarity_grade">Clarity</Label>
          <Input id="clarity_grade" name="clarity_grade" placeholder="VS1, VVS2…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cut_grade">Cut</Label>
          <Input id="cut_grade" name="cut_grade" placeholder="Excellent…" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="cert_lab">Cert lab</Label>
          <Input id="cert_lab" name="cert_lab" placeholder="GIA / IGI / HRD" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="cert_number">Cert number</Label>
          <Input id="cert_number" name="cert_number" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="issued_to_worker_id">Hand over to worker</Label>
          <Select id="issued_to_worker_id" name="issued_to_worker_id" defaultValue="">
            <option value="">Not yet (just record stones)</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="issue_photo">Issue photo *</Label>
          <Input
            id="issue_photo"
            name="issue_photo"
            type="file"
            accept="image/*"
            capture="environment"
            required
          />
          <p className="text-[11px] text-muted-foreground">
            Required: a photo of the stones at handover.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="issue_notes">Notes</Label>
        <Textarea id="issue_notes" name="issue_notes" />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Issue stones</SubmitButton>
      </div>
    </form>
  );
}
