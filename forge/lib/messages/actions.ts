"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  STORAGE,
  buildMessageAttachmentPath,
  uploadFile,
} from "@/lib/storage";
import { failure, ok, type ActionState } from "@/lib/actions";
import type { ThreadType } from "@/lib/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function sendOrderMessageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return failure("Not authenticated.");

  const orderId = String(formData.get("order_id") ?? "").trim();
  const threadTypeRaw = String(formData.get("thread_type") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const file = formData.get("attachment") as File | null;

  // Validate
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(orderId)) return failure("Invalid order ID.");

  if (threadTypeRaw !== "client" && threadTypeRaw !== "internal") {
    return failure("Invalid thread type.");
  }
  const threadType = threadTypeRaw as ThreadType;

  if (body.length > 4000) return failure("Message too long (max 4000 chars).");

  const hasFile = file && file.size > 0;

  if (!body && !hasFile) return failure("Message body or attachment is required.");

  if (hasFile && file.size > MAX_FILE_SIZE) {
    return failure("File too large (max 10 MB).");
  }

  const supabase = createClient();

  // Insert message
  const messageBody = body || "(attachment)";
  const { data: msgData, error: msgError } = await supabase
    .from("order_messages")
    .insert({
      order_id: orderId,
      thread_type: threadType,
      sender_id: user.id,
      body: messageBody,
      is_system: false,
      read_by: {},
    })
    .select("id")
    .single();

  if (msgError || !msgData) {
    return failure(msgError?.message ?? "Failed to send message.");
  }

  // Upload file and insert attachment if present
  if (hasFile) {
    const path = buildMessageAttachmentPath(orderId, threadType, file.name);
    try {
      await uploadFile(STORAGE.messageAttachments, path, file);
    } catch (e) {
      return failure(e instanceof Error ? e.message : "File upload failed.");
    }

    const { error: attError } = await supabase
      .from("message_attachments")
      .insert({
        message_id: msgData.id,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });

    if (attError) {
      return failure(`Message sent but attachment record failed: ${attError.message}`);
    }
  }

  // Revalidate relevant paths
  revalidatePath(`/owner/orders/${orderId}`);
  revalidatePath(`/client/orders/${orderId}`);
  // worker paths use stage ids, so revalidate the order-level worker page if it exists
  revalidatePath(`/worker/orders/${orderId}`);

  return ok("Message sent.");
}

export async function markThreadReadAction(
  orderId: string,
  threadType: ThreadType
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = createClient();

  // Call the SQL function to merge the current user's read timestamp into read_by for all
  // messages in the thread that were not sent by the current user.
  const { error } = await supabase.rpc("mark_thread_read", {
    p_order_id: orderId,
    p_thread_type: threadType,
    p_user_id: user.id,
  });

  // Silently ignore errors — read receipts are best-effort
  if (error) {
    console.warn("markThreadReadAction failed:", error.message);
  }
}
