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
