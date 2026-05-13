# Forge new tables Implementation Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply six new Supabase migrations (0005–0010) per the v2 spec at `forge/docs/superpowers/specs/2026-05-13-forge-new-tables-design.md` — extending existing tables (`gold_purchases`, `inventory_items`, `worker_profiles`, `order_messages`) and adding side-car tables (`gold_suppliers`, `stone_suppliers`, `gold_consumption`, `push_subscriptions`, `message_attachments`).

**Architecture:** Mostly ALTER TABLE plus four new tables. The live `calc_gold_loss` trigger already reads from `worker_profiles.gold_loss_tolerance_pct` with a 5.0 fallback, so Task 3 has no trigger work. Task 2 adds a missing `inventory_transactions → inventory_items.stock_qty` sync trigger.

**Tech Stack:** Postgres 17 (Supabase project `qbmxwaxezifsnysxyyez` — "ForgeJewelery", eu-west-1). Migrations applied via `mcp__claude_ai_Supabase__apply_migration`; tests run via `mcp__claude_ai_Supabase__execute_sql`. TypeScript types appended to `forge/lib/types.ts`. No new dependencies.

> **Manual application:** the SQL in each migration file also runs cleanly via `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f forge/supabase/migrations/NNNN.sql`. The MCP-based steps in this plan are how the implementing agent applies them; a human can apply the same files via psql.

---

## File structure

**New files (created by tasks):**

```
forge/supabase/migrations/0005_gold_inventory.sql
forge/supabase/migrations/0006_stone_inventory.sql
forge/supabase/migrations/0007_worker_profile_extend.sql
forge/supabase/migrations/0008_push_subscriptions.sql
forge/supabase/migrations/0009_order_messages_threads.sql
forge/supabase/migrations/0010_message_storage_rls.sql

forge/supabase/tests/0005_gold_inventory.test.sql
forge/supabase/tests/0006_stone_inventory.test.sql
forge/supabase/tests/0007_worker_profile_extend.test.sql
forge/supabase/tests/0008_push_subscriptions.test.sql
forge/supabase/tests/0009_order_messages_threads.test.sql
forge/supabase/tests/0010_message_storage_rls.test.sql
forge/supabase/tests/README.md
```

**Modified file (one block per task):**

```
forge/lib/types.ts
```

## Testing approach

Each migration `NNNN_xxx.sql` has a sibling `NNNN_xxx.test.sql` that wraps assertions in `BEGIN; ... ROLLBACK;` so it leaves no data behind. Assertions use `DO $$ ... RAISE EXCEPTION ... $$` — psql / MCP `execute_sql` exits non-zero on a raised exception.

**Apply** with MCP: `mcp__claude_ai_Supabase__apply_migration(project_id='qbmxwaxezifsnysxyyez', name='<migration-name>', query='<SQL contents>')`. This records the migration in Supabase's migration history.

**Run a test** with MCP: `mcp__claude_ai_Supabase__execute_sql(project_id='qbmxwaxezifsnysxyyez', query='<test SQL contents>')`. The test is fully self-contained inside one transaction.

Tests assume the public schema already in production: `users`, `clients`, `orders`, `order_stages`, `order_gemstones`, plus `gold_purchases`, `inventory_items`, `worker_profiles`, `order_messages` (extended by these migrations), and the enums `stone_type`, `stone_shape`, `gold_loss_flag`, `user_role`. All confirmed present via `list_tables`.

RLS *policies* are asserted as existing rows in `pg_policies`, not behaviourally — behavioural RLS testing is manual via the portals.

**Project ID is fixed throughout this plan: `qbmxwaxezifsnysxyyez`.**

---

### Task 1: Migration 0005 — gold inventory

Extends `gold_purchases` into lot-tracked stock. Adds `gold_suppliers`, `gold_consumption`, and an `allocate_gold` FIFO function.

**Files:**
- Create: `forge/supabase/migrations/0005_gold_inventory.sql`
- Create: `forge/supabase/tests/0005_gold_inventory.test.sql`
- Create: `forge/supabase/tests/README.md`
- Modify: `forge/lib/types.ts` (append)

- [ ] **Step 1: Write the failing test**

Create `forge/supabase/tests/README.md`:

```markdown
# Forge SQL tests

Each migration `NNNN_xxx.sql` has a sibling `NNNN_xxx.test.sql` here.
Tests wrap assertions in `BEGIN; ... ROLLBACK;` so they leave no data
behind. Assertions use `DO $$ ... RAISE EXCEPTION ... $$`.

Run one test (manual / psql):

```
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f forge/supabase/tests/0005_gold_inventory.test.sql
```

Run via Supabase MCP (from Claude Code):

```
mcp__claude_ai_Supabase__execute_sql(
  project_id='qbmxwaxezifsnysxyyez',
  query='<contents of the .test.sql file>',
)
```

Tests assume the live ForgeJewelery schema is in place.
```

Create `forge/supabase/tests/0005_gold_inventory.test.sql`:

```sql
-- Test: 0005 gold inventory
-- Exercises gold_suppliers, ALTERed gold_purchases, gold_consumption,
-- decrement trigger, and allocate_gold() FIFO function.

BEGIN;

-- Fixture: minimal client/order/stage chain so gold_consumption.stage_id
-- has a target that satisfies the FK.
INSERT INTO users (id, full_name, email, role)
  VALUES ('11111111-1111-1111-1111-111111111111',
          'Test Owner', 'test-owner-0005@example.com', 'owner');

INSERT INTO clients (id, full_name)
  VALUES ('22222222-2222-2222-2222-222222222222', 'Test Client 0005');

INSERT INTO orders (id, order_number, client_id, piece_type, karat)
  VALUES ('33333333-3333-3333-3333-333333333333',
          'ORD-2026-99001',
          '22222222-2222-2222-2222-222222222222',
          'ring', '22K');

INSERT INTO order_stages (id, order_id, stage_number, stage_name)
  VALUES ('44444444-4444-4444-4444-444444444444',
          '33333333-3333-3333-3333-333333333333',
          1, 'Casting');

-- Supplier.
INSERT INTO gold_suppliers (id, name)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Supplier');

-- Two lots, oldest first.
INSERT INTO gold_purchases (id, supplier_id, supplier_name, karat,
                            weight_grams, price_per_gram, remaining_grams,
                            purchase_date)
  VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Supplier',
     '22K', 30.000, 250.00, 30.000, '2026-04-01'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Supplier',
     '22K', 50.000, 260.00, 50.000, '2026-05-01');

-- Allocate 40g — should drain the older lot (30g) and take 10g from
-- the newer one.
SELECT public.allocate_gold(
  '44444444-4444-4444-4444-444444444444'::uuid, '22K', 40.000
);

DO $$
DECLARE old_rem numeric; new_rem numeric; rows_n int;
BEGIN
  SELECT remaining_grams INTO old_rem
    FROM gold_purchases WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  SELECT remaining_grams INTO new_rem
    FROM gold_purchases WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  SELECT count(*) INTO rows_n FROM gold_consumption
    WHERE stage_id = '44444444-4444-4444-4444-444444444444'::uuid;

  IF old_rem <> 0 THEN
    RAISE EXCEPTION 'FIFO: older lot should be drained, got %', old_rem;
  END IF;
  IF new_rem <> 40 THEN
    RAISE EXCEPTION 'FIFO: newer lot should be 40g, got %', new_rem;
  END IF;
  IF rows_n <> 2 THEN
    RAISE EXCEPTION 'FIFO: expected 2 consumption rows, got %', rows_n;
  END IF;
END $$;

-- Negative-grams insert must be rejected.
DO $$
BEGIN
  BEGIN
    INSERT INTO gold_consumption (stage_id, purchase_id, grams)
      VALUES ('44444444-4444-4444-4444-444444444444'::uuid,
              'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, -1);
    RAISE EXCEPTION 'check constraint did not reject negative grams';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

-- Over-allocation must raise.
DO $$
BEGIN
  BEGIN
    PERFORM public.allocate_gold(
      '44444444-4444-4444-4444-444444444444'::uuid, '22K', 9999.000);
    RAISE EXCEPTION 'allocate_gold did not raise on insufficient stock';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
END $$;

-- gold_purchases.remaining_grams range check.
DO $$
BEGIN
  BEGIN
    UPDATE gold_purchases SET remaining_grams = -1
     WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    RAISE EXCEPTION 'range check did not reject negative remaining_grams';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

ROLLBACK;
```

- [ ] **Step 2: Run test to verify it fails**

Invoke: `mcp__claude_ai_Supabase__execute_sql` with `project_id='qbmxwaxezifsnysxyyez'` and the test SQL as `query`.

Expected: error — `relation "gold_suppliers" does not exist`, or `function allocate_gold(uuid, text, numeric) does not exist`. (Migration hasn't been applied yet.)

- [ ] **Step 3: Write the migration**

Create `forge/supabase/migrations/0005_gold_inventory.sql`:

```sql
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
```

Apply via MCP: `mcp__claude_ai_Supabase__apply_migration(project_id='qbmxwaxezifsnysxyyez', name='0005_gold_inventory', query=<contents above>)`.

- [ ] **Step 4: Run test to verify it passes**

Invoke `mcp__claude_ai_Supabase__execute_sql` with the test SQL.

Expected: result returns successfully (rollback at the end leaves no data). No `RAISE EXCEPTION` errors surfaced.

- [ ] **Step 5: Append TypeScript types**

Append to `forge/lib/types.ts`:

```ts
// --- 0005 gold inventory ---

export interface GoldSupplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoldPurchase {
  id: string;
  purchase_date: string;
  supplier_id: string | null;
  supplier_name: string | null;
  karat: string;
  weight_grams: number;
  price_per_gram: number;
  total_cost_qar: number;
  remaining_grams: number;
  invoice_ref: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoldConsumption {
  id: string;
  stage_id: string;
  purchase_id: string;
  grams: number;
  consumed_at: string;
  recorded_by: string | null;
  notes: string | null;
}
```

- [ ] **Step 6: Type-check**

Run from `forge/`: `npx tsc --noEmit`. Expected exit 0.

- [ ] **Step 7: Commit**

```bash
git add forge/supabase/migrations/0005_gold_inventory.sql \
        forge/supabase/tests/0005_gold_inventory.test.sql \
        forge/supabase/tests/README.md \
        forge/lib/types.ts

git commit -m "feat(forge): 0005 gold inventory with FIFO allocation

- gold_suppliers table
- ALTER gold_purchases: supplier_id, remaining_grams, updated_at
  + range check + FIFO index + updated_at trigger
- gold_consumption side-car with decrement trigger
- allocate_gold() function walks lots oldest-first
- owner-only RLS on new tables
- types in lib/types.ts"
```

---

### Task 2: Migration 0006 — stones inventory

Extends generic `inventory_items` for stones (no dedicated stone_lots). Adds `stone_suppliers`, a stock-sync trigger that's currently missing, and a convenience view.

**Files:**
- Create: `forge/supabase/migrations/0006_stone_inventory.sql`
- Create: `forge/supabase/tests/0006_stone_inventory.test.sql`
- Modify: `forge/lib/types.ts` (append)

- [ ] **Step 1: Write the failing test**

Create `forge/supabase/tests/0006_stone_inventory.test.sql`:

```sql
-- Test: 0006 stone inventory
-- Exercises stone_suppliers, ALTERed inventory_items (stone_attrs +
-- supplier_id), and the new stock_qty sync trigger on
-- inventory_transactions.

BEGIN;

INSERT INTO users (id, full_name, email, role)
  VALUES ('11111111-1111-1111-1111-111111111112',
          'Test Owner', 'test-owner-0006@example.com', 'owner');

INSERT INTO clients (id, full_name)
  VALUES ('22222222-2222-2222-2222-222222222223', 'Test Client 0006');

INSERT INTO orders (id, order_number, client_id, piece_type, karat)
  VALUES ('33333333-3333-3333-3333-333333333334',
          'ORD-2026-99002',
          '22222222-2222-2222-2222-222222222223',
          'ring', '22K');

INSERT INTO stone_suppliers (id, name)
  VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Stone Supplier A');

INSERT INTO inventory_items (id, name, category, unit, stock_qty,
                             cost_per_unit_qar, supplier_id, stone_attrs)
  VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          'Round 1.5mm VS diamonds — parcel A',
          'stone', 'piece', 100, 500.00,
          'dddddddd-dddd-dddd-dddd-dddddddddddd',
          '{"stone_type":"diamond","stone_shape":"round","size_mm":1.50,
            "colour_grade":"G","clarity_grade":"VS2","carats_total":10.000}'::jsonb);

-- Allocate 4 stones to the order. Trigger should decrement stock_qty to 96.
INSERT INTO inventory_transactions (item_id, order_id, qty_change, reason)
  VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          '33333333-3333-3333-3333-333333333334',
          -4, 'order_alloc');

DO $$
DECLARE v_qty numeric;
BEGIN
  SELECT stock_qty INTO v_qty FROM inventory_items
   WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  IF v_qty <> 96 THEN
    RAISE EXCEPTION 'stock_qty sync: expected 96 after -4 alloc, got %', v_qty;
  END IF;
END $$;

-- Restock back to 100.
INSERT INTO inventory_transactions (item_id, qty_change, reason)
  VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 4, 'restock');

DO $$
DECLARE v_qty numeric;
BEGIN
  SELECT stock_qty INTO v_qty FROM inventory_items
   WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  IF v_qty <> 100 THEN
    RAISE EXCEPTION 'stock_qty sync: expected 100 after restock, got %', v_qty;
  END IF;
END $$;

-- Overdraw must raise.
DO $$
BEGIN
  BEGIN
    INSERT INTO inventory_transactions (item_id, order_id, qty_change, reason)
      VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
              '33333333-3333-3333-3333-333333333334',
              -999, 'order_alloc');
    RAISE EXCEPTION 'overdraw was not rejected';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
END $$;

-- Stone-attrs CHECK: category='stone' rows must have stone_type key.
DO $$
BEGIN
  BEGIN
    INSERT INTO inventory_items (name, category, unit, stock_qty, stone_attrs)
      VALUES ('Bad stone row', 'stone', 'piece', 1,
              '{"clarity_grade":"VS2"}'::jsonb);
    RAISE EXCEPTION 'check did not reject stone row missing stone_type';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

-- Non-stone rows can have null stone_attrs.
INSERT INTO inventory_items (name, category, unit, stock_qty, stone_attrs)
  VALUES ('Polishing wheel', 'tool', 'piece', 5, NULL);

ROLLBACK;
```

- [ ] **Step 2: Run test to verify it fails**

Invoke `mcp__claude_ai_Supabase__execute_sql` with the test SQL.

Expected: error — `relation "stone_suppliers" does not exist` (column `stone_attrs` and trigger absent too).

- [ ] **Step 3: Write the migration**

Create `forge/supabase/migrations/0006_stone_inventory.sql`:

```sql
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
```

Apply via MCP: `apply_migration(name='0006_stone_inventory', query=<contents>)`.

- [ ] **Step 4: Run test to verify it passes**

Invoke `execute_sql` with the test SQL. Expected: success.

- [ ] **Step 5: Append TypeScript types**

Append to `forge/lib/types.ts`:

```ts
// --- 0006 stone inventory ---

export interface StoneSupplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoneAttrs {
  stone_type: StoneType;
  stone_shape?: StoneShape;
  size_mm?: number;
  colour_grade?: string;
  clarity_grade?: string;
  cut_grade?: string;
  cert_lab?: string;
  cert_number?: string;
  carats_total?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  unit: string;
  stock_qty: number;
  reorder_threshold: number | null;
  cost_per_unit_qar: number | null;
  supplier_id: string | null;
  supplier_name: string | null;
  stone_attrs: StoneAttrs | null;
  notes: string | null;
  last_restocked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  order_id: string | null;
  qty_change: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}
```

- [ ] **Step 6: Type-check**

Run from `forge/`: `npx tsc --noEmit`. Expected exit 0.

- [ ] **Step 7: Commit**

```bash
git add forge/supabase/migrations/0006_stone_inventory.sql \
        forge/supabase/tests/0006_stone_inventory.test.sql \
        forge/lib/types.ts

git commit -m "feat(forge): 0006 stone inventory + stock sync

- stone_suppliers table
- ALTER inventory_items: supplier_id, stone_attrs jsonb,
  stone-keys CHECK, partial match index
- inventory_transactions stock_qty sync trigger (was missing)
- v_order_stone_allocations view
- owner-only RLS on stone_suppliers
- types in lib/types.ts"
```

---

### Task 3: Migration 0007 — worker profiles extend

The live `calc_gold_loss` trigger **already** reads from `worker_profiles.gold_loss_tolerance_pct` (verified via `pg_get_functiondef`). This task is a pure additive ALTER — no trigger changes.

**Files:**
- Create: `forge/supabase/migrations/0007_worker_profile_extend.sql`
- Create: `forge/supabase/tests/0007_worker_profile_extend.test.sql`
- Modify: `forge/lib/types.ts` (append)

- [ ] **Step 1: Write the failing test**

Create `forge/supabase/tests/0007_worker_profile_extend.test.sql`:

```sql
-- Test: 0007 worker profile extend
-- New columns exist; unique constraint on user_id holds; existing
-- calc_gold_loss trigger still reads from worker_profiles tolerance.

BEGIN;

-- New columns are addressable.
INSERT INTO users (id, full_name, email, role)
  VALUES ('77777777-7777-7777-7777-777777777777',
          'Worker A', 'worker-0007@example.com', 'worker');

INSERT INTO worker_profiles (user_id, gold_loss_tolerance_pct,
                             working_hours, hire_date)
  VALUES ('77777777-7777-7777-7777-777777777777',
          1.50, 'Sun-Thu 8-5', '2026-01-15');

-- updated_at is set on UPDATE.
DO $$
DECLARE old_ts timestamptz; new_ts timestamptz;
BEGIN
  SELECT updated_at INTO old_ts FROM worker_profiles
   WHERE user_id = '77777777-7777-7777-7777-777777777777';
  PERFORM pg_sleep(0.01);
  UPDATE worker_profiles SET notes = 'edited'
   WHERE user_id = '77777777-7777-7777-7777-777777777777';
  SELECT updated_at INTO new_ts FROM worker_profiles
   WHERE user_id = '77777777-7777-7777-7777-777777777777';
  IF NOT (new_ts > old_ts) THEN
    RAISE EXCEPTION 'updated_at did not advance';
  END IF;
END $$;

-- Unique user_id.
DO $$
BEGIN
  BEGIN
    INSERT INTO worker_profiles (user_id, gold_loss_tolerance_pct)
      VALUES ('77777777-7777-7777-7777-777777777777', 2.00);
    RAISE EXCEPTION 'unique(user_id) did not reject duplicate';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;

-- Existing calc_gold_loss trigger reads from this profile.
INSERT INTO clients (id, full_name)
  VALUES ('88888888-8888-8888-8888-888888888888', 'GL Client');
INSERT INTO orders (id, order_number, client_id, piece_type, karat)
  VALUES ('99999999-9999-9999-9999-999999999999',
          'ORD-2026-99007',
          '88888888-8888-8888-8888-888888888888',
          'ring', '22K');

INSERT INTO order_stages (id, order_id, stage_number, stage_name,
                          assigned_worker_id, gold_in_grams, gold_out_grams)
  VALUES ('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
          '99999999-9999-9999-9999-999999999999', 1, 'Casting',
          '77777777-7777-7777-7777-777777777777',
          100.000, 99.000);  -- 1% loss vs 1.5% tolerance -> 'normal'

DO $$
DECLARE v_flag text;
BEGIN
  SELECT gold_loss_flag::text INTO v_flag FROM order_stages
   WHERE id = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa';
  IF v_flag <> 'normal' THEN
    RAISE EXCEPTION
      'gold-loss flag at 1%% with 1.5%% tolerance should be normal, got %',
      v_flag;
  END IF;
END $$;

-- Worker with no profile uses 5.0 fallback (the trigger's default).
INSERT INTO users (id, full_name, email, role)
  VALUES ('77777777-7777-7777-7777-77777777777a',
          'Worker B', 'worker-0007b@example.com', 'worker');
INSERT INTO order_stages (id, order_id, stage_number, stage_name,
                          assigned_worker_id, gold_in_grams, gold_out_grams)
  VALUES ('aaaaaaaa-2222-2222-2222-aaaaaaaaaaaa',
          '99999999-9999-9999-9999-999999999999', 2, 'Polishing',
          '77777777-7777-7777-7777-77777777777a',
          100.000, 96.000);  -- 4% loss vs 5% fallback -> 'normal'

DO $$
DECLARE v_flag text;
BEGIN
  SELECT gold_loss_flag::text INTO v_flag FROM order_stages
   WHERE id = 'aaaaaaaa-2222-2222-2222-aaaaaaaaaaaa';
  IF v_flag <> 'normal' THEN
    RAISE EXCEPTION
      'fallback 5%% tolerance with 4%% loss should be normal, got %',
      v_flag;
  END IF;
END $$;

ROLLBACK;
```

- [ ] **Step 2: Run test to verify it fails**

Invoke `execute_sql` with the test SQL.

Expected: error — `column "working_hours" of relation "worker_profiles" does not exist`.

- [ ] **Step 3: Write the migration**

Create `forge/supabase/migrations/0007_worker_profile_extend.sql`:

```sql
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
```

Apply via MCP: `apply_migration(name='0007_worker_profile_extend', query=<contents>)`.

- [ ] **Step 4: Run test to verify it passes**

Invoke `execute_sql` with the test SQL. Expected: success.

- [ ] **Step 5: Append TypeScript types**

Append to `forge/lib/types.ts`:

```ts
// --- 0007 worker_profiles extend ---

export interface WorkerProfile {
  id: string;
  user_id: string | null;
  specialisation: string[] | null;
  gold_loss_tolerance_pct: number;
  hourly_rate_qar: number | null;
  working_hours: string | null;
  hire_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

(Existing `WorkerProfile` interface in `lib/types.ts` doesn't include all live columns — search-and-replace the block, don't duplicate.)

- [ ] **Step 6: Type-check**

Run from `forge/`: `npx tsc --noEmit`. Expected exit 0. If a duplicate `WorkerProfile` is reported, remove the older incomplete definition.

- [ ] **Step 7: Commit**

```bash
git add forge/supabase/migrations/0007_worker_profile_extend.sql \
        forge/supabase/tests/0007_worker_profile_extend.test.sql \
        forge/lib/types.ts

git commit -m "feat(forge): 0007 worker_profiles extend

- ALTER worker_profiles: working_hours, hire_date, updated_at
- unique (user_id) for 1:1 with users
- updated_at trigger
- calc_gold_loss trigger already reads worker_profiles tolerance;
  no trigger work needed (verified via pg_get_functiondef)
- types in lib/types.ts reconciled with live columns"
```

---

### Task 4: Migration 0008 — push subscriptions

New table for multi-device FCM. `users.push_token` retained for the transition.

**Files:**
- Create: `forge/supabase/migrations/0008_push_subscriptions.sql`
- Create: `forge/supabase/tests/0008_push_subscriptions.test.sql`
- Modify: `forge/lib/types.ts` (append)

- [ ] **Step 1: Write the failing test**

Create `forge/supabase/tests/0008_push_subscriptions.test.sql`:

```sql
-- Test: 0008 push_subscriptions
BEGIN;

INSERT INTO users (id, full_name, email, role)
  VALUES ('bbbbbbbb-0008-0008-0008-bbbbbbbbbbbb',
          'Push User', 'push-0008@example.com', 'client');

INSERT INTO push_subscriptions (user_id, fcm_token, platform, device_label)
  VALUES ('bbbbbbbb-0008-0008-0008-bbbbbbbbbbbb',
          'tok_abc_001', 'web', 'Chrome on Mac');

-- platform check rejects bogus values.
DO $$
BEGIN
  BEGIN
    INSERT INTO push_subscriptions (user_id, fcm_token, platform)
      VALUES ('bbbbbbbb-0008-0008-0008-bbbbbbbbbbbb', 'tok_x', 'symbian');
    RAISE EXCEPTION 'platform check did not reject "symbian"';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

-- Unique (user_id, fcm_token).
DO $$
BEGIN
  BEGIN
    INSERT INTO push_subscriptions (user_id, fcm_token, platform)
      VALUES ('bbbbbbbb-0008-0008-0008-bbbbbbbbbbbb',
              'tok_abc_001', 'web');
    RAISE EXCEPTION 'unique constraint did not reject duplicate';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;

-- Cascade delete from users.
DELETE FROM users WHERE id = 'bbbbbbbb-0008-0008-0008-bbbbbbbbbbbb';
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM push_subscriptions
   WHERE user_id = 'bbbbbbbb-0008-0008-0008-bbbbbbbbbbbb';
  IF n <> 0 THEN
    RAISE EXCEPTION 'expected cascade delete, % left', n;
  END IF;
END $$;

ROLLBACK;
```

- [ ] **Step 2: Run test to verify it fails**

Invoke `execute_sql`. Expected: `relation "push_subscriptions" does not exist`.

- [ ] **Step 3: Write the migration**

Create `forge/supabase/migrations/0008_push_subscriptions.sql`:

```sql
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
```

Apply via MCP: `apply_migration(name='0008_push_subscriptions', query=<contents>)`.

- [ ] **Step 4: Run test to verify it passes**

Invoke `execute_sql`. Expected: success.

- [ ] **Step 5: Append TypeScript types**

Append to `forge/lib/types.ts`:

```ts
// --- 0008 push_subscriptions ---

export type PushPlatform = "web" | "ios" | "android";

export interface PushSubscription {
  id: string;
  user_id: string;
  fcm_token: string;
  platform: PushPlatform;
  device_label: string | null;
  user_agent: string | null;
  app_version: string | null;
  last_seen_at: string;
  created_at: string;
}
```

- [ ] **Step 6: Type-check**

Run from `forge/`: `npx tsc --noEmit`. Expected exit 0.

- [ ] **Step 7: Commit**

```bash
git add forge/supabase/migrations/0008_push_subscriptions.sql \
        forge/supabase/tests/0008_push_subscriptions.test.sql \
        forge/lib/types.ts

git commit -m "feat(forge): 0008 push_subscriptions (FCM)

- push_subscriptions with platform check + unique (user, token)
- cascade delete from users
- self-manage RLS; owners can read all for debugging
- users.push_token retained for transition
- types in lib/types.ts"
```

---

### Task 5: Migration 0009 — order_messages threads + attachments

Extends `order_messages` (currently single-thread, single attachment, single reader). Adds `thread_type`, `read_by jsonb`, `is_system`, `edited_at`; preserves `attachment_url` and `read_at` columns for backcompat. Adds `message_attachments` table and `is_order_participant()` helper.

**Files:**
- Create: `forge/supabase/migrations/0009_order_messages_threads.sql`
- Create: `forge/supabase/tests/0009_order_messages_threads.test.sql`
- Modify: `forge/lib/types.ts` (append + replace existing `OrderMessage`)

- [ ] **Step 1: Write the failing test**

Create `forge/supabase/tests/0009_order_messages_threads.test.sql`:

```sql
-- Test: 0009 order messages threads + attachments
BEGIN;

INSERT INTO users (id, full_name, email, role)
  VALUES ('cccccccc-0009-0009-0009-cccccccccccc',
          'Msg Owner', 'msg-owner-0009@example.com', 'owner');

INSERT INTO clients (id, full_name)
  VALUES ('dddddddd-0009-0009-0009-dddddddddddd', 'Msg Client 0009');

INSERT INTO orders (id, order_number, client_id, piece_type, karat)
  VALUES ('eeeeeeee-0009-0009-0009-eeeeeeeeeeee',
          'ORD-2026-99009',
          'dddddddd-0009-0009-0009-dddddddddddd',
          'ring', '22K');

-- thread_type defaults to 'client' and check rejects bogus values.
INSERT INTO order_messages (id, order_id, sender_id, body)
  VALUES ('ffffffff-0009-0009-0009-ffffffffffff',
          'eeeeeeee-0009-0009-0009-eeeeeeeeeeee',
          'cccccccc-0009-0009-0009-cccccccccccc',
          'Hi, scope ready.');

DO $$
DECLARE v_tt text; v_read jsonb; v_sys bool;
BEGIN
  SELECT thread_type, read_by, is_system
    INTO v_tt, v_read, v_sys
    FROM order_messages
   WHERE id = 'ffffffff-0009-0009-0009-ffffffffffff';
  IF v_tt <> 'client' THEN
    RAISE EXCEPTION 'thread_type default should be client, got %', v_tt;
  END IF;
  IF v_read <> '{}'::jsonb THEN
    RAISE EXCEPTION 'read_by default should be {}, got %', v_read;
  END IF;
  IF v_sys <> false THEN
    RAISE EXCEPTION 'is_system default should be false, got %', v_sys;
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO order_messages (order_id, thread_type, sender_id, body)
      VALUES ('eeeeeeee-0009-0009-0009-eeeeeeeeeeee', 'admin',
              'cccccccc-0009-0009-0009-cccccccccccc', 'hi');
    RAISE EXCEPTION 'thread_type check did not reject "admin"';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

-- read_by JSONB merge.
UPDATE order_messages
   SET read_by = read_by ||
       jsonb_build_object('dddddddd-0009-0009-0009-dddddddddddd',
                          to_jsonb(now()::text))
 WHERE id = 'ffffffff-0009-0009-0009-ffffffffffff';

DO $$
DECLARE v_keys text[];
BEGIN
  SELECT array(SELECT jsonb_object_keys(read_by)) INTO v_keys
    FROM order_messages WHERE id = 'ffffffff-0009-0009-0009-ffffffffffff';
  IF NOT 'dddddddd-0009-0009-0009-dddddddddddd' = ANY (v_keys) THEN
    RAISE EXCEPTION 'read_by did not record the read';
  END IF;
END $$;

-- Attachments cascade-delete.
INSERT INTO message_attachments (message_id, storage_path, file_name,
                                 mime_type, size_bytes)
  VALUES ('ffffffff-0009-0009-0009-ffffffffffff',
          'eeeeeeee-0009-0009-0009-eeeeeeeeeeee/client/photo.jpg',
          'photo.jpg', 'image/jpeg', 123456);

DELETE FROM order_messages WHERE id = 'ffffffff-0009-0009-0009-ffffffffffff';

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM message_attachments
   WHERE message_id = 'ffffffff-0009-0009-0009-ffffffffffff';
  IF n <> 0 THEN
    RAISE EXCEPTION 'expected cascade, % left', n;
  END IF;
END $$;

-- RLS policies exist.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'order_messages';
  IF n < 2 THEN
    RAISE EXCEPTION 'expected >=2 policies on order_messages, got %', n;
  END IF;
END $$;

-- is_order_participant() function exists.
DO $$
BEGIN
  PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'is_order_participant';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'is_order_participant() not created';
  END IF;
END $$;

ROLLBACK;
```

- [ ] **Step 2: Run test to verify it fails**

Invoke `execute_sql`. Expected: `column "thread_type" of relation "order_messages" does not exist`.

- [ ] **Step 3: Write the migration**

Create `forge/supabase/migrations/0009_order_messages_threads.sql`:

```sql
-- ============================================================
-- Forge — 0009 — order_messages threads + attachments
-- ============================================================

ALTER TABLE public.order_messages
  ADD COLUMN thread_type text NOT NULL DEFAULT 'client'
    CHECK (thread_type IN ('client','internal')),
  ADD COLUMN read_by    jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN is_system  boolean NOT NULL DEFAULT false,
  ADD COLUMN edited_at  timestamptz;

CREATE INDEX order_messages_thread_idx
  ON public.order_messages (order_id, thread_type, created_at DESC);
CREATE INDEX order_messages_sender_idx
  ON public.order_messages (sender_id, created_at DESC);

CREATE TABLE public.message_attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   uuid NOT NULL REFERENCES public.order_messages(id)
                                     ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name    text NOT NULL,
  mime_type    text NOT NULL,
  size_bytes   int  NOT NULL CHECK (size_bytes >= 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX message_attachments_message_idx
  ON public.message_attachments (message_id);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a participant in this order's thread?
CREATE OR REPLACE FUNCTION public.is_order_participant(
  p_order_id uuid,
  p_thread   text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.users me
     WHERE me.supabase_auth_id = auth.uid()
       AND (
         me.role = 'owner'
         OR (me.role = 'worker'
             AND EXISTS (SELECT 1 FROM public.orders o
                          WHERE o.id = p_order_id
                            AND o.assigned_worker_id = me.id))
         OR (me.role = 'client'
             AND p_thread = 'client'
             AND EXISTS (SELECT 1 FROM public.orders o
                         JOIN public.clients c ON c.id = o.client_id
                          WHERE o.id = p_order_id
                            AND c.user_id = me.id))
       )
  );
$$;

-- Drop any prior RLS policies on order_messages from earlier work, then
-- redeclare with the thread-aware rules. (Idempotent for re-applies.)
DROP POLICY IF EXISTS order_messages_select         ON public.order_messages;
DROP POLICY IF EXISTS order_messages_insert         ON public.order_messages;
DROP POLICY IF EXISTS order_messages_update_sender  ON public.order_messages;
DROP POLICY IF EXISTS order_messages_update_read_by ON public.order_messages;

CREATE POLICY order_messages_select ON public.order_messages
  FOR SELECT TO authenticated
  USING (public.is_order_participant(order_id, thread_type));

CREATE POLICY order_messages_insert ON public.order_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users me
       WHERE me.supabase_auth_id = auth.uid()
         AND me.id = order_messages.sender_id
         AND (
           (order_messages.thread_type = 'client'
             AND (me.role = 'owner'
                  OR (me.role = 'client'
                      AND EXISTS (SELECT 1 FROM public.orders o
                                  JOIN public.clients c ON c.id = o.client_id
                                   WHERE o.id = order_messages.order_id
                                     AND c.user_id = me.id))))
           OR
           (order_messages.thread_type = 'internal'
             AND (me.role = 'owner'
                  OR (me.role = 'worker'
                      AND EXISTS (SELECT 1 FROM public.orders o
                                   WHERE o.id = order_messages.order_id
                                     AND o.assigned_worker_id = me.id))))
         )
    )
  );

CREATE POLICY order_messages_update_sender ON public.order_messages
  FOR UPDATE TO authenticated
  USING     (EXISTS (SELECT 1 FROM public.users me
                      WHERE me.supabase_auth_id = auth.uid()
                        AND me.id = order_messages.sender_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users me
                      WHERE me.supabase_auth_id = auth.uid()
                        AND me.id = order_messages.sender_id));

CREATE POLICY order_messages_update_read_by ON public.order_messages
  FOR UPDATE TO authenticated
  USING     (public.is_order_participant(order_id, thread_type))
  WITH CHECK (public.is_order_participant(order_id, thread_type));

CREATE POLICY message_attachments_select ON public.message_attachments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.order_messages m
                  WHERE m.id = message_attachments.message_id
                    AND public.is_order_participant(m.order_id, m.thread_type)));

CREATE POLICY message_attachments_insert ON public.message_attachments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.order_messages m
     WHERE m.id = message_attachments.message_id
       AND EXISTS (SELECT 1 FROM public.users me
                    WHERE me.supabase_auth_id = auth.uid()
                      AND me.id = m.sender_id)
  ));
```

Apply via MCP: `apply_migration(name='0009_order_messages_threads', query=<contents>)`.

- [ ] **Step 4: Run test to verify it passes**

Invoke `execute_sql`. Expected: success.

- [ ] **Step 5: Append/replace TypeScript types**

In `forge/lib/types.ts`, locate the existing `OrderMessage` interface (lines 86-145 area — search for `export interface OrderMessage`) and **replace** it with the version below. Then append `ThreadType` and `MessageAttachment`:

```ts
// --- 0009 order_messages threads + attachments ---

export type ThreadType = "client" | "internal";

// Replace existing OrderMessage with this version (adds thread_type,
// read_by, is_system, edited_at; keeps legacy attachment_url and read_at).
export interface OrderMessage {
  id: string;
  order_id: string;
  thread_type: ThreadType;
  sender_id: string;
  body: string;
  is_system: boolean;
  read_by: Record<string, string>;
  attachment_url: string | null;
  read_at: string | null;
  edited_at: string | null;
  created_at: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}
```

- [ ] **Step 6: Type-check**

Run from `forge/`: `npx tsc --noEmit`. Expected exit 0.

- [ ] **Step 7: Commit**

```bash
git add forge/supabase/migrations/0009_order_messages_threads.sql \
        forge/supabase/tests/0009_order_messages_threads.test.sql \
        forge/lib/types.ts

git commit -m "feat(forge): 0009 order_messages threads + attachments

- ALTER order_messages: thread_type (client|internal),
  read_by jsonb, is_system, edited_at + indexes
- legacy attachment_url and read_at preserved for backcompat
- new message_attachments table (multi-attach, cascade from message)
- is_order_participant() helper for RLS
- select/insert/update policies per thread visibility
- types in lib/types.ts"
```

---

### Task 6: Migration 0010 — message attachments storage bucket + RLS

**Files:**
- Create: `forge/supabase/migrations/0010_message_storage_rls.sql`
- Create: `forge/supabase/tests/0010_message_storage_rls.test.sql`

- [ ] **Step 1: Write the failing test**

Create `forge/supabase/tests/0010_message_storage_rls.test.sql`:

```sql
-- Test: 0010 message attachments bucket + RLS
-- Schema-existence only; behavioural RLS is manual via portals.

BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM storage.buckets
   WHERE id = 'forge-message-attachments';
  IF n <> 1 THEN
    RAISE EXCEPTION 'bucket forge-message-attachments missing (count=%)', n;
  END IF;
END $$;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'storage'
     AND tablename  = 'objects'
     AND policyname ILIKE 'forge_message_attachments_%';
  IF n < 3 THEN
    RAISE EXCEPTION
      'expected >=3 storage policies for forge_message_attachments_*, got %', n;
  END IF;
END $$;

DO $$
BEGIN
  PERFORM 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'parse_message_attachment_path';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'parse_message_attachment_path() not created';
  END IF;
END $$;

ROLLBACK;
```

- [ ] **Step 2: Run test to verify it fails**

Invoke `execute_sql`. Expected: `ERROR: bucket forge-message-attachments missing (count=0)`.

- [ ] **Step 3: Write the migration**

Create `forge/supabase/migrations/0010_message_storage_rls.sql`:

```sql
-- ============================================================
-- Forge — 0010 — message attachments bucket + storage RLS
-- ============================================================
-- Path convention: {order_id}/{thread_type}/{filename}
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
  VALUES ('forge-message-attachments', 'forge-message-attachments', false)
  ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.parse_message_attachment_path(p_name text)
RETURNS TABLE (order_id uuid, thread_type text)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE parts text[];
BEGIN
  parts := string_to_array(p_name, '/');
  IF array_length(parts, 1) >= 2
     AND parts[1] ~ '^[0-9a-fA-F-]{36}$'
     AND parts[2] IN ('client','internal') THEN
    order_id    := parts[1]::uuid;
    thread_type := parts[2];
    RETURN NEXT;
  ELSE
    order_id    := NULL;
    thread_type := NULL;
    RETURN NEXT;
  END IF;
END;
$$;

DROP POLICY IF EXISTS forge_message_attachments_select ON storage.objects;
DROP POLICY IF EXISTS forge_message_attachments_insert ON storage.objects;
DROP POLICY IF EXISTS forge_message_attachments_delete ON storage.objects;

CREATE POLICY forge_message_attachments_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'forge-message-attachments'
    AND EXISTS (
      SELECT 1
        FROM public.parse_message_attachment_path(name) p
       WHERE p.order_id IS NOT NULL
         AND public.is_order_participant(p.order_id, p.thread_type)
    )
  );

CREATE POLICY forge_message_attachments_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'forge-message-attachments'
    AND EXISTS (
      SELECT 1
        FROM public.parse_message_attachment_path(name) p
        JOIN public.users me ON me.supabase_auth_id = auth.uid()
       WHERE p.order_id IS NOT NULL
         AND (
           (p.thread_type = 'client'
             AND (me.role = 'owner'
                  OR (me.role = 'client'
                      AND EXISTS (SELECT 1 FROM public.orders o
                                  JOIN public.clients c ON c.id = o.client_id
                                   WHERE o.id = p.order_id
                                     AND c.user_id = me.id))))
           OR
           (p.thread_type = 'internal'
             AND (me.role = 'owner'
                  OR (me.role = 'worker'
                      AND EXISTS (SELECT 1 FROM public.orders o
                                   WHERE o.id = p.order_id
                                     AND o.assigned_worker_id = me.id))))
         )
    )
  );

CREATE POLICY forge_message_attachments_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'forge-message-attachments'
    AND EXISTS (SELECT 1 FROM public.users u
                 WHERE u.supabase_auth_id = auth.uid()
                   AND u.role = 'owner')
  );
```

Apply via MCP: `apply_migration(name='0010_message_storage_rls', query=<contents>)`.

- [ ] **Step 4: Run test to verify it passes**

Invoke `execute_sql`. Expected: success.

- [ ] **Step 5: Run the full test suite**

Run each test through `execute_sql` in order 0005 → 0010. All should pass.

- [ ] **Step 6: Commit**

```bash
git add forge/supabase/migrations/0010_message_storage_rls.sql \
        forge/supabase/tests/0010_message_storage_rls.test.sql

git commit -m "feat(forge): 0010 message attachments bucket + storage RLS

- forge-message-attachments bucket (private)
- parse_message_attachment_path() helper
- select / insert / delete policies match order_messages visibility
- path convention {order_id}/{thread_type}/{filename}"
```

---

## After all tasks

- All six migrations applied to project `qbmxwaxezifsnysxyyez` and registered in Supabase's migration history.
- `forge/supabase/migrations/` rebuildable from 0001 → 0010 (assuming the implicit main schema is in place, as it is in dev).
- All six test files pass via MCP `execute_sql`.
- `forge/lib/types.ts` has the new + updated interfaces; `npx tsc --noEmit` clean.
- README.md still-TODO list: inventory, worker profile, push subscriptions, and order messages can be marked **schema-done**. UI wiring (server actions, pages, components) is downstream and would be a separate plan.
