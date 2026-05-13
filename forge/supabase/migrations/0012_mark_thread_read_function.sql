-- 0012_mark_thread_read_function
-- Merges the calling user's read timestamp into the read_by JSONB for all
-- messages in a thread that were sent by other participants.
-- SECURITY INVOKER (default) — RLS on order_messages enforces access.

CREATE OR REPLACE FUNCTION public.mark_thread_read(
  p_order_id    uuid,
  p_thread_type text,
  p_user_id     uuid
) RETURNS void
LANGUAGE sql AS $$
  UPDATE public.order_messages
     SET read_by = read_by || jsonb_build_object(p_user_id::text, to_jsonb(now()::text))
   WHERE order_id = p_order_id
     AND thread_type = p_thread_type
     AND sender_id <> p_user_id;
$$;
