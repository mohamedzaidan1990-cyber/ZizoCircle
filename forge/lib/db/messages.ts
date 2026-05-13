import { createClient } from "@/lib/supabase/server";
import type { MessageAttachment, OrderMessage, ThreadType, User } from "@/lib/types";

export type MessageWithRelations = OrderMessage & {
  sender: Pick<User, "id" | "full_name" | "role"> | null;
  attachments: MessageAttachment[];
};

export async function listOrderMessages(
  orderId: string,
  threadType: ThreadType
): Promise<MessageWithRelations[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("order_messages")
    .select(
      `
      *,
      sender:users!order_messages_sender_id_fkey(id, full_name, role),
      attachments:message_attachments(*)
      `
    )
    .eq("order_id", orderId)
    .eq("thread_type", threadType)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load messages: ${error.message}`);

  return (data ?? []) as MessageWithRelations[];
}
