-- ============================================================
-- Forge — 0009b — drop legacy order_messages RLS policies
-- ============================================================
-- 0009 added thread-aware policies (order_messages_select / _insert /
-- _update_sender / _update_read_by) but didn't drop the two pre-existing
-- policies on order_messages: messages_client and messages_owner.
--
-- Those legacy policies are FOR ALL with no thread_type filter. Postgres
-- combines permissive policies with OR, so the legacy messages_client
-- policy lets a client read INTERNAL-thread messages on their own order
-- — defeating the new thread split. Drop them; the new policies cover
-- the same access patterns correctly (client SELECT/INSERT only on
-- thread_type='client', owner ALL via is_order_participant).
-- ============================================================

DROP POLICY IF EXISTS messages_client ON public.order_messages;
DROP POLICY IF EXISTS messages_owner  ON public.order_messages;
