"use client";

import { useFormState } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialActionState } from "@/lib/actions";
import { createClientAction } from "./actions";

export default function NewClientPage() {
  const [state, formAction] = useFormState(createClientAction, initialActionState);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New client</h1>
        <p className="text-sm text-muted-foreground">
          Add a customer. If you provide an email, they get a portal login when they
          sign up with that address.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Client details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name *</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Company</Label>
              <Input id="company_name" name="company_name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <div className="flex justify-end">
              <SubmitButton pendingLabel="Saving…">Create client</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
