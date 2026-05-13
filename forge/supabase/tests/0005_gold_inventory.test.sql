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
