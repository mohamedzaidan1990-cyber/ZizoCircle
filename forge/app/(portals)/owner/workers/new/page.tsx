"use client";

import { useFormState } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialActionState } from "@/lib/actions";
import { createWorkerAction } from "./actions";

export default function NewWorkerPage() {
  const [state, formAction] = useFormState(createWorkerAction, initialActionState);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add worker</h1>
        <p className="text-sm text-muted-foreground">
          Pre-create a worker. They get portal access by signing up at{" "}
          <code>/login</code> with this email.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Worker details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name *</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" />
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <div className="flex justify-end">
              <SubmitButton pendingLabel="Saving…">Add worker</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
