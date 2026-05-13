"use client";

import * as React from "react";
import { MessageItem } from "./message-item";
import { Composer } from "./composer";
import { markThreadReadAction } from "@/lib/messages/actions";
import type { MessageAttachment, OrderMessage, ThreadType, UserRole } from "@/lib/types";
import type { User } from "@/lib/types";

type MessageWithRelations = OrderMessage & {
  sender: Pick<User, "id" | "full_name" | "role"> | null;
  attachments: MessageAttachment[];
};

interface ThreadProps {
  orderId: string;
  threadType: ThreadType;
  currentUserId: string;
  currentUserRole: "owner" | "worker" | "client";
  messages: MessageWithRelations[];
  attachmentUrls: Record<string, string>;
}

const THREAD_LABELS: Record<ThreadType, string> = {
  client: "Client thread",
  internal: "Internal thread",
};

/**
 * For the most recent message authored by currentUserId, find the latest
 * timestamp from any OTHER user in its read_by map.
 */
function computeReadByOther(
  messages: MessageWithRelations[],
  currentUserId: string
): string | null {
  // Walk in reverse to find the latest message from the current user
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.sender_id !== currentUserId) continue;

    const readBy = msg.read_by ?? {};
    let latestTs: string | null = null;
    for (const [uid, ts] of Object.entries(readBy)) {
      if (uid === currentUserId) continue;
      if (!latestTs || ts > latestTs) latestTs = ts;
    }
    // Return the latest seen timestamp from another user (may be null)
    return latestTs;
  }
  return null;
}

export function Thread({
  orderId,
  threadType,
  currentUserId,
  currentUserRole: _currentUserRole,
  messages,
  attachmentUrls,
}: ThreadProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Mark thread as read — fire and forget on mount and whenever messages change
  React.useEffect(() => {
    markThreadReadAction(orderId, threadType).catch(() => {/* best effort */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, threadType, messages.length]);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const readByOther = computeReadByOther(messages, currentUserId);

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center px-4 py-2.5 border-b bg-muted/40">
        <h3 className="text-sm font-semibold text-foreground">
          {THREAD_LABELS[threadType]}
        </h3>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 min-h-0"
        style={{ maxHeight: "600px" }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId;
            // Only pass readByOther to the very last message authored by the current user
            const isLastMine =
              isMine &&
              messages
                .filter((m) => m.sender_id === currentUserId)
                .at(-1)?.id === msg.id;

            return (
              <MessageItem
                key={msg.id}
                message={msg}
                isMine={isMine}
                senderName={msg.sender?.full_name ?? "Unknown"}
                senderRole={msg.sender?.role as UserRole | undefined}
                attachmentUrls={attachmentUrls}
                readByOther={isLastMine ? readByOther : null}
              />
            );
          })
        )}
      </div>

      {/* Composer */}
      <Composer orderId={orderId} threadType={threadType} />
    </div>
  );
}
