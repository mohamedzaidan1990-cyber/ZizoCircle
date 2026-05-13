-- Test suite for allocate_stone_from_inventory()
-- Run via: supabase db execute or Supabase MCP execute_sql
-- Wrapped in a transaction that is rolled back so fixtures don't persist.
--
-- auth.uid() returns NULL in this admin/direct SQL context, which means the
-- owner-only permission guard is bypassed (by design — see migration comments).
--
-- Note: inventory_transactions_sync_stock_tr triggers on inventory_transactions
-- INSERT and automatically decrements inventory_items.stock_qty — the function
-- does NOT do a separate UPDATE on inventory_items.

BEGIN;

-- ── Fixtures ────────────────────────────────────────────────────────────────

-- Owner user (no supabase_auth_id so auth.uid() stays NULL during tests)
INSERT INTO users (id, full_name, role, language_pref, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Test Owner',
  'owner',
  'en',
  true
);

-- Client
INSERT INTO clients (id, full_name)
VALUES (
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'Test Client'
);

-- Order (order_number must match '^ORD-\d{4}-\d{3,6}$')
INSERT INTO orders (id, order_number, client_id, piece_type, karat)
VALUES (
  'c0000000-0000-0000-0000-000000000001'::uuid,
  'ORD-2026-001',
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'ring',
  '18k'
);

-- Stone supplier
INSERT INTO stone_suppliers (id, name)
VALUES (
  'd0000000-0000-0000-0000-000000000001'::uuid,
  'Test Stone Supplier'
);

-- Stone inventory item (stock_qty = 10 pieces)
INSERT INTO inventory_items (
  id, name, category, unit, stock_qty, cost_per_unit_qar,
  supplier_id,
  stone_attrs
) VALUES (
  'e0000000-0000-0000-0000-000000000001'::uuid,
  'Round Diamond 0.5ct',
  'stone',
  'pieces',
  10,
  500.00,
  'd0000000-0000-0000-0000-000000000001'::uuid,
  '{"stone_type":"diamond","stone_shape":"round","colour_grade":"G","clarity_grade":"VS1","cut_grade":"excellent","cert_lab":"GIA","cert_number":"TEST123"}'::jsonb
);

-- ── Test 1: Happy path ───────────────────────────────────────────────────────
DO $$
DECLARE
  v_gem_id       uuid;
  v_gem          record;
  v_stock_after  numeric;
BEGIN
  -- Call the function: allocate 3 pieces (1.5 carats) from the stone parcel
  v_gem_id := public.allocate_stone_from_inventory(
    'c0000000-0000-0000-0000-000000000001'::uuid,  -- p_order_id
    'e0000000-0000-0000-0000-000000000001'::uuid,  -- p_item_id
    3,                                              -- p_qty_pieces
    1.5                                             -- p_carats
  );

  -- Assert order_gemstones row was created
  SELECT * INTO v_gem FROM order_gemstones WHERE id = v_gem_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TEST 1 FAIL: order_gemstones row not found for gem_id %', v_gem_id;
  END IF;

  -- Assert correct attrs from stone_attrs JSONB
  IF v_gem.stone_type <> 'diamond'::stone_type THEN
    RAISE EXCEPTION 'TEST 1 FAIL: expected stone_type=diamond, got %', v_gem.stone_type;
  END IF;
  IF v_gem.stone_shape <> 'round'::stone_shape THEN
    RAISE EXCEPTION 'TEST 1 FAIL: expected stone_shape=round, got %', v_gem.stone_shape;
  END IF;
  IF v_gem.qty_pieces <> 3 THEN
    RAISE EXCEPTION 'TEST 1 FAIL: expected qty_pieces=3, got %', v_gem.qty_pieces;
  END IF;
  IF v_gem.total_carats <> 1.5 THEN
    RAISE EXCEPTION 'TEST 1 FAIL: expected total_carats=1.5, got %', v_gem.total_carats;
  END IF;
  IF v_gem.source <> 'factory_supplied'::stone_source THEN
    RAISE EXCEPTION 'TEST 1 FAIL: expected source=factory_supplied, got %', v_gem.source;
  END IF;
  -- estimated_value_qar = qty_pieces * cost_per_unit_qar = 3 * 500 = 1500
  IF v_gem.estimated_value_qar <> 1500.00 THEN
    RAISE EXCEPTION 'TEST 1 FAIL: expected estimated_value_qar=1500, got %', v_gem.estimated_value_qar;
  END IF;
  IF v_gem.colour_grade <> 'G' THEN
    RAISE EXCEPTION 'TEST 1 FAIL: expected colour_grade=G, got %', v_gem.colour_grade;
  END IF;

  -- Assert stock_qty was decremented via trigger (10 - 3 = 7)
  SELECT stock_qty INTO v_stock_after
    FROM inventory_items
   WHERE id = 'e0000000-0000-0000-0000-000000000001'::uuid;
  IF v_stock_after <> 7 THEN
    RAISE EXCEPTION 'TEST 1 FAIL: expected stock_qty=7 after alloc, got %', v_stock_after;
  END IF;

  RAISE NOTICE 'TEST 1 PASS: happy path — gem_id=%, stock_qty_after=%', v_gem_id, v_stock_after;
END;
$$;

-- ── Test 2: Overdraw ─────────────────────────────────────────────────────────
-- Stock is now 7 (after test 1 alloc of 3). Requesting 99 pieces should RAISE.
DO $$
DECLARE
  v_raised boolean := false;
BEGIN
  BEGIN
    PERFORM public.allocate_stone_from_inventory(
      'c0000000-0000-0000-0000-000000000001'::uuid,
      'e0000000-0000-0000-0000-000000000001'::uuid,
      99,   -- p_qty_pieces (far more than available stock of 7)
      49.5  -- p_carats
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%insufficient stock%' THEN
      v_raised := true;
      RAISE NOTICE 'TEST 2 PASS: overdraw correctly raised: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'TEST 2 FAIL: unexpected exception: %', SQLERRM;
    END IF;
  END;

  IF NOT v_raised THEN
    RAISE EXCEPTION 'TEST 2 FAIL: expected insufficient stock exception but none was raised';
  END IF;
END;
$$;

-- ── Test 3: Wrong item category ──────────────────────────────────────────────
-- Insert a 'tool' category item and try to allocate from it — should RAISE.
DO $$
DECLARE
  v_tool_id uuid := 'f0000000-0000-0000-0000-000000000001'::uuid;
  v_raised  boolean := false;
BEGIN
  INSERT INTO inventory_items (id, name, category, unit, stock_qty)
  VALUES (v_tool_id, 'Polishing Tool', 'tool', 'pieces', 5);

  BEGIN
    PERFORM public.allocate_stone_from_inventory(
      'c0000000-0000-0000-0000-000000000001'::uuid,
      v_tool_id,
      1,
      0.5
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%is not a stone parcel%' THEN
      v_raised := true;
      RAISE NOTICE 'TEST 3 PASS: wrong category correctly raised: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'TEST 3 FAIL: unexpected exception: %', SQLERRM;
    END IF;
  END;

  IF NOT v_raised THEN
    RAISE EXCEPTION 'TEST 3 FAIL: expected "not a stone parcel" exception but none was raised';
  END IF;
END;
$$;

-- ── Cleanup ──────────────────────────────────────────────────────────────────
ROLLBACK;
