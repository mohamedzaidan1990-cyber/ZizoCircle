-- ============================================================
-- Forge — 0013 — drop users.push_token
-- ============================================================
-- Multi-device FCM tokens now live in push_subscriptions
-- (migration 0008). users.push_token had 0 rows populated at the
-- time of this drop. Anything still referencing users.push_token
-- has been migrated to read from push_subscriptions.
-- ============================================================

ALTER TABLE public.users DROP COLUMN IF EXISTS push_token;
