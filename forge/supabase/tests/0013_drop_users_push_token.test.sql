DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='users' AND column_name='push_token';
  IF n <> 0 THEN
    RAISE EXCEPTION 'push_token column still exists';
  END IF;
END $$;
