import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { MessageAttachment, OrderMessage, UserRole } from "@/lib/types";

interface MessageItemProps {
  message: OrderMessage & { attachments: MessageAttachment[] };
  isMine: boolean;
  senderName: string;
  senderRole?: UserRole | null;
  attachmentUrls: Record<string, string>;
  readByOther: string | null;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const hhmm = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return hhmm;

  const day = date.getDate().toString().padStart(2, "0");
  const mon = date.toLocaleString("en", { month: "short" });
  return `${day} ${mon} ${hhmm}`;
}

function roleBadgeVariant(role?: UserRole | null) {
  if (role === "owner") return "default" as const;
  if (role === "worker") return "warning" as const;
  if (role === "client") return "muted" as const;
  return "outline" as const;
}

function roleLabel(role?: UserRole | null): string {
  if (!role) return "";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function MessageItem({
  message,
  isMine,
  senderName,
  senderRole,
  attachmentUrls,
  readByOther,
}: MessageItemProps) {
  // System messages — centered, muted, italic
  if (message.is_system) {
    return (
      <div className="my-2 flex justify-center">
        <p className="text-xs italic text-muted-foreground">{message.body}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col mb-3", isMine ? "items-end" : "items-start")}>
      {/* Sender info (only for others' messages) */}
      {!isMine && (
        <div className="flex items-center gap-1.5 mb-1 ml-1">
          <span className="text-xs font-medium text-foreground">{senderName}</span>
          {senderRole && (
            <Badge variant={roleBadgeVariant(senderRole)} className="text-[10px] py-0 px-1.5">
              {roleLabel(senderRole)}
            </Badge>
          )}
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm",
          isMine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {/* Body */}
        {message.body && (
          <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
        )}

        {/* Attachments */}
        {message.attachments.length > 0 && (
          <div className={cn("flex flex-col gap-2", message.body ? "mt-2" : "")}>
            {message.attachments.map((att) => {
              const url = attachmentUrls[att.storage_path];
              const isImage = att.mime_type.startsWith("image/");

              if (isImage && url) {
                return (
                  <a
                    key={att.id}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={att.file_name}
                      className="max-h-48 max-w-full rounded-lg object-cover"
                    />
                  </a>
                );
              }

              return (
                <a
                  key={att.id}
                  href={url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
                    isMine
                      ? "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                      : "border-border text-foreground hover:bg-background"
                  )}
                >
                  <span className="text-base">📎</span>
                  <span className="truncate">{att.file_name}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Timestamp + read receipt */}
      <div className={cn("flex items-center gap-2 mt-0.5", isMine ? "flex-row-reverse" : "")}>
        <span className="text-[10px] text-muted-foreground px-1">
          {formatTimestamp(message.created_at)}
        </span>
        {isMine && readByOther && (
          <span className="text-[10px] text-muted-foreground">
            Seen at {formatTimestamp(readByOther)}
          </span>
        )}
      </div>
    </div>
  );
}
