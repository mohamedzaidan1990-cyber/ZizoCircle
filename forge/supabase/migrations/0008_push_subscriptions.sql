-- ============================================================
-- Forge — 0008 — push subscriptions (FCM)
-- ============================================================
-- New table; users.push_token retained for transition. Drop in a
-- follow-up migration once all clients are writing to this table.
-- ============================================================

CREATE TABLE public.push_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fcm_token     text NOT NULL,
  platform      text NOT NULL CHECK (platform IN ('web','ios','android')),
  device_label  text,
  user_agent    text,
  app_version   text,
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fcm_token)
);

CREATE INDEX push_subscriptions_user_idx      ON public.push_subscriptions (user_id);
CREATE INDEX push_subscriptions_last_seen_idx ON public.push_subscriptions (last_seen_at);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subscriptions_self_all ON public.push_subscriptions
  FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM public.users u
                      WHERE u.supabase_auth_id = auth.uid()
                        AND u.id = push_subscriptions.user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u
                      WHERE u.supabase_auth_id = auth.uid()
                        AND u.id = push_subscriptions.user_id));

CREATE POLICY push_subscriptions_owner_read ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u
                  WHERE u.supabase_auth_id = auth.uid()
                    AND u.role = 'owner'));
