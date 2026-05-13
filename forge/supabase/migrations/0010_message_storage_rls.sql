-- ============================================================
-- Forge — 0010 — message attachments bucket + storage RLS
-- ============================================================
-- Path convention: {order_id}/{thread_type}/{filename}
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
  VALUES ('forge-message-attachments', 'forge-message-attachments', false)
  ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.parse_message_attachment_path(p_name text)
RETURNS TABLE (order_id uuid, thread_type text)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE parts text[];
BEGIN
  parts := string_to_array(p_name, '/');
  IF array_length(parts, 1) >= 2
     AND parts[1] ~ '^[0-9a-fA-F-]{36}$'
     AND parts[2] IN ('client','internal') THEN
    order_id    := parts[1]::uuid;
    thread_type := parts[2];
    RETURN NEXT;
  ELSE
    order_id    := NULL;
    thread_type := NULL;
    RETURN NEXT;
  END IF;
END;
$$;

DROP POLICY IF EXISTS forge_message_attachments_select ON storage.objects;
DROP POLICY IF EXISTS forge_message_attachments_insert ON storage.objects;
DROP POLICY IF EXISTS forge_message_attachments_delete ON storage.objects;

CREATE POLICY forge_message_attachments_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'forge-message-attachments'
    AND EXISTS (
      SELECT 1
        FROM public.parse_message_attachment_path(name) p
       WHERE p.order_id IS NOT NULL
         AND public.is_order_participant(p.order_id, p.thread_type)
    )
  );

CREATE POLICY forge_message_attachments_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'forge-message-attachments'
    AND EXISTS (
      SELECT 1
        FROM public.parse_message_attachment_path(name) p
        JOIN public.users me ON me.supabase_auth_id = auth.uid()
       WHERE p.order_id IS NOT NULL
         AND (
           (p.thread_type = 'client'
             AND (me.role = 'owner'
                  OR (me.role = 'client'
                      AND EXISTS (SELECT 1 FROM public.orders o
                                  JOIN public.clients c ON c.id = o.client_id
                                   WHERE o.id = p.order_id
                                     AND c.user_id = me.id))))
           OR
           (p.thread_type = 'internal'
             AND (me.role = 'owner'
                  OR (me.role = 'worker'
                      AND EXISTS (SELECT 1 FROM public.orders o
                                   WHERE o.id = p.order_id
                                     AND o.assigned_worker_id = me.id))))
         )
    )
  );

CREATE POLICY forge_message_attachments_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'forge-message-attachments'
    AND EXISTS (SELECT 1 FROM public.users u
                 WHERE u.supabase_auth_id = auth.uid()
                   AND u.role = 'owner')
  );
