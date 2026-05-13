"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { initialActionState } from "@/lib/actions";
import { sendOrderMessageAction } from "@/lib/messages/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import type { ThreadType } from "@/lib/types";

interface ComposerProps {
  orderId: string;
  threadType: ThreadType;
}

export function Composer({ orderId, threadType }: ComposerProps) {
  const [state, formAction] = useFormState(sendOrderMessageAction, initialActionState);
  const formRef = React.useRef<HTMLFormElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [body, setBody] = React.useState("");
  const [fileName, setFileName] = React.useState<string | null>(null);

  // Clear on success
  React.useEffect(() => {
    if (state?.success) {
      setBody("");
      setFileName(null);
      formRef.current?.reset();
    }
  }, [state]);

  const hasContent = body.trim().length > 0 || fileName !== null;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border-t bg-background p-3 flex flex-col gap-2"
    >
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="thread_type" value={threadType} />

      <textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Type a message…"
        rows={3}
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (hasContent) formRef.current?.requestSubmit();
          }
        }}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <label className="cursor-pointer rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors whitespace-nowrap">
            Attach file
            <input
              ref={fileInputRef}
              type="file"
              name="attachment"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFileName(f?.name ?? null);
              }}
            />
          </label>
          {fileName && (
            <span className="truncate text-xs text-muted-foreground" title={fileName}>
              {fileName}
            </span>
          )}
        </div>

        <SubmitButton
          disabled={!hasContent}
          pendingLabel="Sending…"
          className="shrink-0"
        >
          Send
        </SubmitButton>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}
