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
