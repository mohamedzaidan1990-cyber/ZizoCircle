-- ============================================================
-- Forge — 0005 — gold inventory
-- ============================================================
-- Extend gold_purchases into lot-tracked stock. Add gold_suppliers,
-- gold_consumption, and an allocate_gold() FIFO function.
-- ============================================================

CREATE TABLE public.gold_suppliers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  contact_name  text,
  phone         text,
  email         text,
  address       text,
  notes         text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_updated_at_gold_suppliers
  BEFORE UPDATE ON public.gold_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ALTER existing gold_purchases.
ALTER TABLE public.gold_purchases
  ADD COLUMN supplier_id     uuid REFERENCES public.gold_suppliers(id),
  ADD COLUMN remaining_grams numeric(10,3),
  ADD COLUMN updated_at      timestamptz NOT NULL DEFAULT now();

-- Backfill remaining_grams for any existing rows.
UPDATE public.gold_purchases
   SET remaining_grams = weight_grams
 WHERE remaining_grams IS NULL;

ALTER TABLE public.gold_purchases
  ALTER COLUMN remaining_grams SET NOT NULL,
  ADD CONSTRAINT gold_purchases_remaining_in_range
    CHECK (remaining_grams >= 0 AND remaining_grams <= weight_grams);

CREATE INDEX gold_purchases_fifo_idx
  ON public.gold_purchases (karat, purchase_date)
  WHERE remaining_grams > 0;

CREATE TRIGGER trg_updated_at_gold_purchases
  BEFORE UPDATE ON public.gold_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- gold_consumption side-car.
CREATE TABLE public.gold_consumption (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id      uuid NOT NULL REFERENCES public.order_stages(id)
                                       ON DELETE RESTRICT,
  purchase_id   uuid NOT NULL REFERENCES public.gold_purchases(id)
                                       ON DELETE RESTRICT,
  grams         numeric(10,3) NOT NULL CHECK (grams > 0),
  consumed_at   timestamptz NOT NULL DEFAULT now(),
  recorded_by   uuid REFERENCES public.users(id),
  notes         text
);

CREATE INDEX gold_consumption_stage_idx    ON public.gold_consumption (stage_id);
CREATE INDEX gold_consumption_purchase_idx ON public.gold_consumption (purchase_id);

-- Trigger: decrement purchase.remaining_grams; reject on overdraw.
CREATE OR REPLACE FUNCTION public.gold_consumption_decrement_lot()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.gold_purchases
     SET remaining_grams = remaining_grams - NEW.grams,
         updated_at      = now()
   WHERE id = NEW.purchase_id
     AND remaining_grams >= NEW.grams;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'gold_consumption: purchase % has insufficient remaining_grams for %',
      NEW.purchase_id, NEW.grams;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER gold_consumption_decrement_tr
  AFTER INSERT ON public.gold_consumption
  FOR EACH ROW EXECUTE FUNCTION public.gold_consumption_decrement_lot();

-- FIFO allocator.
CREATE OR REPLACE FUNCTION public.allocate_gold(
  p_stage_id uuid,
  p_karat    text,
  p_grams    numeric
)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_remaining numeric := p_grams;
  v_purchase  record;
  v_take      numeric;
BEGIN
  IF p_grams <= 0 THEN
    RAISE EXCEPTION 'allocate_gold: p_grams must be positive (got %)', p_grams;
  END IF;

  FOR v_purchase IN
    SELECT id, remaining_grams
      FROM public.gold_purchases
     WHERE karat = p_karat
       AND remaining_grams > 0
     ORDER BY purchase_date ASC, id ASC
     FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(v_purchase.remaining_grams, v_remaining);
    INSERT INTO public.gold_consumption (stage_id, purchase_id, grams)
      VALUES (p_stage_id, v_purchase.id, v_take);
    v_remaining := v_remaining - v_take;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION
      'allocate_gold: insufficient %s stock — short by % grams',
      p_karat, v_remaining;
  END IF;
END;
$$;

ALTER TABLE public.gold_suppliers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gold_consumption ENABLE ROW LEVEL SECURITY;

CREATE POLICY gold_suppliers_owner_all ON public.gold_suppliers
  FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM public.users u
                      WHERE u.supabase_auth_id = auth.uid()
                        AND u.role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u
                      WHERE u.supabase_auth_id = auth.uid()
                        AND u.role = 'owner'));

CREATE POLICY gold_consumption_owner_all ON public.gold_consumption
  FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM public.users u
                      WHERE u.supabase_auth_id = auth.uid()
                        AND u.role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u
                      WHERE u.supabase_auth_id = auth.uid()
                        AND u.role = 'owner'));
