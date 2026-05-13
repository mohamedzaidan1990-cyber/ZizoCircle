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
