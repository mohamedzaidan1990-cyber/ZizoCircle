"use client";

import { useFormState } from "react-dom";
import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialActionState } from "@/lib/actions";
import { addScopeItemAction } from "./actions";

const CATEGORIES = ["design", "gold", "stones", "price", "delivery", "terms"];

export function AddScopeItemForm({ orderId }: { orderId: string }) {
  const [state, formAction] = useFormState(addScopeItemAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select id="category" name="category" defaultValue="design" required>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="label">Label</Label>
          <Input id="label" name="label" placeholder="e.g. 18k yellow gold" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="detail">Detail</Label>
        <Textarea id="detail" name="detail" placeholder="Describe the agreement detail" required />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Adding…">Add to scope</SubmitButton>
      </div>
    </form>
  );
}
