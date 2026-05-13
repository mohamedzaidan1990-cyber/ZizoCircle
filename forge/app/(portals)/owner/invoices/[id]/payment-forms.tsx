"use client";

import { useFormState } from "react-dom";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialActionState } from "@/lib/actions";
import {
  recordBalanceAction,
  recordDepositAction,
  sendInvoiceAction,
} from "./actions";

export function SendInvoiceForm({ invoiceId }: { invoiceId: string }) {
  const [state, action] = useFormState(sendInvoiceAction, initialActionState);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <SubmitButton pendingLabel="Sending…">Send to client</SubmitButton>
    </form>
  );
}

export function DepositForm({ invoiceId }: { invoiceId: string }) {
  const [state, action] = useFormState(recordDepositAction, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <div className="space-y-2">
        <Label htmlFor={`dep-notes-${invoiceId}`}>Notes (e.g. payment method, reference)</Label>
        <Textarea
          id={`dep-notes-${invoiceId}`}
          name="notes"
          placeholder="Cash / Bank transfer / Card · ref…"
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <SubmitButton pendingLabel="Saving…">Record deposit</SubmitButton>
    </form>
  );
}

export function BalanceForm({ invoiceId }: { invoiceId: string }) {
  const [state, action] = useFormState(recordBalanceAction, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <div className="space-y-2">
        <Label htmlFor={`bal-notes-${invoiceId}`}>Notes</Label>
        <Textarea
          id={`bal-notes-${invoiceId}`}
          name="notes"
          placeholder="Payment method / reference…"
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <SubmitButton pendingLabel="Saving…">Record balance payment</SubmitButton>
    </form>
  );
}
