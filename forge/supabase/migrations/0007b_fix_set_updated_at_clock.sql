-- ============================================================
-- Forge — 0007b — set_updated_at clock_timestamp fix
-- ============================================================
-- Replace public.set_updated_at() so it uses clock_timestamp() instead
-- of now(). now() is transaction-stable (= transaction_timestamp), so
-- within a single transaction every set_updated_at fire returns the
-- same value as the row's initial INSERT, defeating the point of an
-- audit timestamp. clock_timestamp() advances even within a
-- transaction.
--
-- Affects every table whose updated_at is maintained by
-- set_updated_at(): users, inventory_items, gold_suppliers,
-- gold_purchases, stone_suppliers, worker_profiles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
