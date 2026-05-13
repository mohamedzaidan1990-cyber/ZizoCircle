-- ============================================================
-- Forge — 0006 — stone inventory
-- ============================================================
-- Reuse inventory_items + inventory_transactions for stones.
-- Add stone_suppliers; ALTER inventory_items with stone_attrs + supplier_id;
-- add the missing stock_qty sync trigger on inventory_transactions.
-- ============================================================

CREATE TABLE public.stone_suppliers (
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

CREATE TRIGGER trg_updated_at_stone_suppliers
  BEFORE UPDATE ON public.stone_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.inventory_items
  ADD COLUMN supplier_id uuid REFERENCES public.stone_suppliers(id),
  ADD COLUMN stone_attrs jsonb;

-- Required-keys check for stone rows.
ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_stone_attrs_required
    CHECK (
      category <> 'stone'
      OR (stone_attrs IS NOT NULL AND stone_attrs ? 'stone_type')
    );

-- Partial index for stone-matching at order time.
CREATE INDEX inventory_items_stone_match_idx
  ON public.inventory_items (
    (stone_attrs->>'stone_type'),
    (stone_attrs->>'stone_shape'),
    ((stone_attrs->>'size_mm')::numeric)
  )
  WHERE category = 'stone' AND stock_qty > 0;

-- Stock sync trigger (missing in live DB).
CREATE OR REPLACE FUNCTION public.inventory_transactions_sync_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.inventory_items
     SET stock_qty  = stock_qty + NEW.qty_change,
         updated_at = now()
   WHERE id = NEW.item_id
     AND stock_qty + NEW.qty_change >= 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'inventory_transactions: item % qty_change=% would drive stock negative',
      NEW.item_id, NEW.qty_change;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_transactions_sync_stock_tr
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.inventory_transactions_sync_stock();

-- Convenience view: which orders consumed which stone items.
CREATE OR REPLACE VIEW public.v_order_stone_allocations AS
  SELECT it.order_id,
         it.item_id,
         (-SUM(it.qty_change))                 AS qty_pieces,
         MAX(ii.stone_attrs->>'stone_type')    AS stone_type,
         MAX(ii.stone_attrs->>'stone_shape')   AS stone_shape,
         MAX((ii.stone_attrs->>'size_mm')::numeric) AS size_mm,
         MIN(it.created_at)                    AS first_allocated_at
    FROM public.inventory_transactions it
    JOIN public.inventory_items ii ON ii.id = it.item_id
   WHERE it.order_id IS NOT NULL
     AND it.qty_change < 0
     AND ii.category = 'stone'
   GROUP BY it.order_id, it.item_id;

ALTER TABLE public.stone_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY stone_suppliers_owner_all ON public.stone_suppliers
  FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM public.users u
                      WHERE u.supabase_auth_id = auth.uid()
                        AND u.role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u
                      WHERE u.supabase_auth_id = auth.uid()
                        AND u.role = 'owner'));
