-- ============================================================
-- Forge — 0009 — order_messages threads + attachments
-- ============================================================

ALTER TABLE public.order_messages
  ADD COLUMN thread_type text NOT NULL DEFAULT 'client'
    CHECK (thread_type IN ('client','internal')),
  ADD COLUMN read_by    jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN is_system  boolean NOT NULL DEFAULT false,
  ADD COLUMN edited_at  timestamptz;

CREATE INDEX order_messages_thread_idx
  ON public.order_messages (order_id, thread_type, created_at DESC);
CREATE INDEX order_messages_sender_idx
  ON public.order_messages (sender_id, created_at DESC);

CREATE TABLE public.message_attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   uuid NOT NULL REFERENCES public.order_messages(id)
                                     ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name    text NOT NULL,
  mime_type    text NOT NULL,
  size_bytes   int  NOT NULL CHECK (size_bytes >= 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX message_attachments_message_idx
  ON public.message_attachments (message_id);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a participant in this order's thread?
CREATE OR REPLACE FUNCTION public.is_order_participant(
  p_order_id uuid,
  p_thread   text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.users me
     WHERE me.supabase_auth_id = auth.uid()
       AND (
         me.role = 'owner'
         OR (me.role = 'worker'
             AND EXISTS (SELECT 1 FROM public.orders o
                          WHERE o.id = p_order_id
                            AND o.assigned_worker_id = me.id))
         OR (me.role = 'client'
             AND p_thread = 'client'
             AND EXISTS (SELECT 1 FROM public.orders o
                         JOIN public.clients c ON c.id = o.client_id
                          WHERE o.id = p_order_id
                            AND c.user_id = me.id))
       )
  );
$$;

-- Drop any prior RLS policies on order_messages from earlier work, then
-- redeclare with the thread-aware rules. (Idempotent for re-applies.)
DROP POLICY IF EXISTS order_messages_select         ON public.order_messages;
DROP POLICY IF EXISTS order_messages_insert         ON public.order_messages;
DROP POLICY IF EXISTS order_messages_update_sender  ON public.order_messages;
DROP POLICY IF EXISTS order_messages_update_read_by ON public.order_messages;

CREATE POLICY order_messages_select ON public.order_messages
  FOR SELECT TO authenticated
  USING (public.is_order_participant(order_id, thread_type));

CREATE POLICY order_messages_insert ON public.order_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users me
       WHERE me.supabase_auth_id = auth.uid()
         AND me.id = order_messages.sender_id
         AND (
           (order_messages.thread_type = 'client'
             AND (me.role = 'owner'
                  OR (me.role = 'client'
                      AND EXISTS (SELECT 1 FROM public.orders o
                                  JOIN public.clients c ON c.id = o.client_id
                                   WHERE o.id = order_messages.order_id
                                     AND c.user_id = me.id))))
           OR
           (order_messages.thread_type = 'internal'
             AND (me.role = 'owner'
                  OR (me.role = 'worker'
                      AND EXISTS (SELECT 1 FROM public.orders o
                                   WHERE o.id = order_messages.order_id
                                     AND o.assigned_worker_id = me.id))))
         )
    )
  );

CREATE POLICY order_messages_update_sender ON public.order_messages
  FOR UPDATE TO authenticated
  USING     (EXISTS (SELECT 1 FROM public.users me
                      WHERE me.supabase_auth_id = auth.uid()
                        AND me.id = order_messages.sender_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users me
                      WHERE me.supabase_auth_id = auth.uid()
                        AND me.id = order_messages.sender_id));

CREATE POLICY order_messages_update_read_by ON public.order_messages
  FOR UPDATE TO authenticated
  USING     (public.is_order_participant(order_id, thread_type))
  WITH CHECK (public.is_order_participant(order_id, thread_type));

CREATE POLICY message_attachments_select ON public.message_attachments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.order_messages m
                  WHERE m.id = message_attachments.message_id
                    AND public.is_order_participant(m.order_id, m.thread_type)));

CREATE POLICY message_attachments_insert ON public.message_attachments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.order_messages m
     WHERE m.id = message_attachments.message_id
       AND EXISTS (SELECT 1 FROM public.users me
                    WHERE me.supabase_auth_id = auth.uid()
                      AND me.id = m.sender_id)
  ));
