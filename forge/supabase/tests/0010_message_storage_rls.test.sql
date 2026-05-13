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
