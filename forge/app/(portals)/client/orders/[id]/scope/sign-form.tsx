"use client";

import { useFormState } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialActionState } from "@/lib/actions";
import { signScopeAction } from "./actions";

export function SignForm({
  orderId,
  expectedName,
  allAcked,
}: {
  orderId: string;
  expectedName: string;
  allAcked: boolean;
}) {
  const [state, action] = useFormState(signScopeAction, initialActionState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="order_id" value={orderId} />
      <div className="space-y-2">
        <Label htmlFor="typed_name">Type your full name</Label>
        <Input
          id="typed_name"
          name="typed_name"
          placeholder={expectedName}
          required
          autoComplete="off"
        />
        <p className="text-[11px] text-muted-foreground">
          By typing your name and clicking sign, you agree to the scope as listed. We record
          the timestamp, your IP, and your device for audit.
        </p>
      </div>
      {!allAcked && (
        <p className="text-sm text-destructive">
          Tick every scope item before you can sign.
        </p>
      )}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton disabled={!allAcked} pendingLabel="Signing…">
        Sign &amp; lock scope
      </SubmitButton>
    </form>
  );
}
