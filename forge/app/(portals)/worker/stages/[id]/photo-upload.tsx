"use client";

import { useFormState } from "react-dom";
import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/forms/submit-button";
import { initialActionState } from "@/lib/actions";
import { uploadStagePhotoAction } from "./actions";

export function PhotoUpload({ stageId }: { stageId: string }) {
  const [state, action] = useFormState(uploadStagePhotoAction, initialActionState);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);

  return (
    <form
      ref={ref}
      action={action}
      className="space-y-3"
      encType="multipart/form-data"
    >
      <input type="hidden" name="stage_id" value={stageId} />
      <div className="space-y-2">
        <Label htmlFor="photo">Add photo</Label>
        <Input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          capture="environment"
          required
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <SubmitButton size="sm" pendingLabel="Uploading…">
        Upload
      </SubmitButton>
    </form>
  );
}
