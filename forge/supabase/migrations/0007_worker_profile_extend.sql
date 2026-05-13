-- ============================================================
-- Forge — 0007 — worker_profiles extend
-- ============================================================
-- Additive only. The existing calc_gold_loss trigger already reads
-- worker_profiles.gold_loss_tolerance_pct with a 5.0 fallback — no
-- trigger surgery required.
-- ============================================================

ALTER TABLE public.worker_profiles
  ADD COLUMN working_hours text,
  ADD COLUMN hire_date     date,
  ADD COLUMN updated_at    timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.worker_profiles
  ADD CONSTRAINT worker_profiles_user_id_unique UNIQUE (user_id);

CREATE TRIGGER trg_updated_at_worker_profiles
  BEFORE UPDATE ON public.worker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
