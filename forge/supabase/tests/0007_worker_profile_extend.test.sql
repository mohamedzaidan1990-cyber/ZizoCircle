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
