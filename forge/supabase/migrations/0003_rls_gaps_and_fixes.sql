-- ============================================================
-- Forge — RLS gaps and trigger fixes
-- ============================================================
-- Idempotent. Re-run safe. Closes the holes the original schema
-- left behind:
--
--   * clients: RLS enabled but no policies → table was unreadable.
--   * stage_gemstone_logs: same issue.
--   * notifications: only had FOR ALL using user_id = me, so cross-
--     user inserts were silently blocked.
--   * calc_gold_loss: BEFORE INSERT, but queried order_stages WHERE
--     id = NEW.id. The row doesn't exist yet at that point, so
--     tolerance was always NULL and every fresh stage was flagged
--     'critical'. Rewritten to use NEW.assigned_worker_id directly.
-- ============================================================

-- CLIENTS ----------------------------------------------------
DROP POLICY IF EXISTS clients_owner       ON public.clients;
DROP POLICY IF EXISTS clients_self_read   ON public.clients;

CREATE POLICY clients_owner ON public.clients
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'owner')
  WITH CHECK (public.current_user_role() = 'owner');

CREATE POLICY clients_self_read ON public.clients
  FOR SELECT TO authenticated
  USING (user_id = public.current_forge_user_id());

-- STAGE GEMSTONE LOGS ----------------------------------------
DROP POLICY IF EXISTS logs_owner   ON public.stage_gemstone_logs;
DROP POLICY IF EXISTS logs_worker  ON public.stage_gemstone_logs;
DROP POLICY IF EXISTS logs_client  ON public.stage_gemstone_logs;

CREATE POLICY logs_owner ON public.stage_gemstone_logs
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'owner')
  WITH CHECK (public.current_user_role() = 'owner');

CREATE POLICY logs_worker ON public.stage_gemstone_logs
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'worker'
    AND EXISTS (
      SELECT 1 FROM public.order_stages s
      WHERE s.id = stage_id
        AND s.assigned_worker_id = public.current_forge_user_id()
    )
  )
  WITH CHECK (
    public.current_user_role() = 'worker'
    AND EXISTS (
      SELECT 1 FROM public.order_stages s
      WHERE s.id = stage_id
        AND s.assigned_worker_id = public.current_forge_user_id()
    )
  );

CREATE POLICY logs_client ON public.stage_gemstone_logs
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'client'
    AND EXISTS (
      SELECT 1
      FROM public.order_stages s
      JOIN public.orders o ON o.id = s.order_id
      WHERE s.id = stage_id
        AND s.status = 'approved'
        AND o.client_id = public.current_client_id()
    )
  );

-- NOTIFICATIONS ----------------------------------------------
-- Keep notifs_own (FOR ALL) for SELECT/UPDATE/DELETE semantics.
-- Add a permissive INSERT policy so any authenticated forge user
-- can queue notifications for other users (the server-side dispatcher
-- is the only caller).
DROP POLICY IF EXISTS notifs_insert_any ON public.notifications;
CREATE POLICY notifs_insert_any ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.supabase_auth_id = auth.uid()
        AND u.is_active
    )
  );

-- GOLD LOSS TRIGGER FIX --------------------------------------
CREATE OR REPLACE FUNCTION public.calc_gold_loss()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  loss_pct NUMERIC;
  flag     gold_loss_flag;
  tolerance NUMERIC;
BEGIN
  IF NEW.gold_in_grams IS NOT NULL AND NEW.gold_in_grams > 0
     AND NEW.gold_out_grams IS NOT NULL THEN
    loss_pct := ((NEW.gold_in_grams - NEW.gold_out_grams) / NEW.gold_in_grams) * 100;
    NEW.gold_loss_pct := ROUND(loss_pct, 3);

    -- Use NEW.assigned_worker_id directly. The original version queried
    -- order_stages WHERE id = NEW.id, but on BEFORE INSERT that row
    -- isn't in the table yet → tolerance was always NULL → flag was
    -- always 'critical'.
    SELECT wp.gold_loss_tolerance_pct INTO tolerance
    FROM public.worker_profiles wp
    WHERE wp.user_id = NEW.assigned_worker_id;

    IF tolerance IS NULL THEN
      tolerance := 5.0;
    END IF;

    flag := CASE
      WHEN loss_pct < 0                THEN 'critical'  -- weight increased
      WHEN loss_pct <= tolerance       THEN 'normal'
      WHEN loss_pct <= tolerance * 1.5 THEN 'monitor'
      WHEN loss_pct <= tolerance * 2   THEN 'high'
      ELSE 'critical'
    END;
    NEW.gold_loss_flag := flag;
  END IF;
  RETURN NEW;
END;
$$;
