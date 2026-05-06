-- ============================================================
-- Forge — order reference image
-- ============================================================
-- Adds an optional reference_image_url column to orders so the owner can
-- attach a sketch / CAD render / inspiration photo at order creation time.
--
-- Stored as a path in the existing forge-stage-photos bucket (path prefix
-- <order_id>/_ref/...) so the existing storage RLS — owner full access,
-- assigned worker read/write, client read for their own order — covers it
-- without new policies.
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS reference_image_url TEXT;
