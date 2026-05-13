-- ============================================================
-- Forge — Storage buckets + RLS policies
-- ============================================================
-- Idempotent. Re-run safe. Path conventions used by the app:
--
--   forge-stage-photos   {order_id}/{stage_id}/{ts-filename}
--   forge-issue-photos   {order_id}/{ts-filename}
--   forge-scope-pdfs     {order_id}/{ts-filename}
--   forge-invoice-pdfs   {invoice_id}/{ts-filename}
--   forge-avatars        {forge_user_id}/{ts-filename}   (public bucket)
--
-- All checks key off (storage.foldername(name))[1] = the first folder.
-- Helpers: public.current_user_role(), public.current_forge_user_id(),
--          public.current_client_id() (defined in main schema).
-- ============================================================

-- Create / upsert buckets ------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES
  ('forge-stage-photos',  'forge-stage-photos',  FALSE),
  ('forge-issue-photos',  'forge-issue-photos',  FALSE),
  ('forge-scope-pdfs',    'forge-scope-pdfs',    FALSE),
  ('forge-invoice-pdfs',  'forge-invoice-pdfs',  FALSE),
  ('forge-avatars',       'forge-avatars',       TRUE)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Drop any prior versions of our policies before recreating ---
DROP POLICY IF EXISTS forge_stage_photos_owner          ON storage.objects;
DROP POLICY IF EXISTS forge_stage_photos_worker_rw      ON storage.objects;
DROP POLICY IF EXISTS forge_stage_photos_client_read    ON storage.objects;
DROP POLICY IF EXISTS forge_issue_photos_owner          ON storage.objects;
DROP POLICY IF EXISTS forge_issue_photos_worker_read    ON storage.objects;
DROP POLICY IF EXISTS forge_scope_pdfs_owner            ON storage.objects;
DROP POLICY IF EXISTS forge_scope_pdfs_client_read      ON storage.objects;
DROP POLICY IF EXISTS forge_invoice_pdfs_owner          ON storage.objects;
DROP POLICY IF EXISTS forge_invoice_pdfs_client_read    ON storage.objects;
DROP POLICY IF EXISTS forge_avatars_self_rw             ON storage.objects;
DROP POLICY IF EXISTS forge_avatars_public_read         ON storage.objects;

-- Stage photos -----------------------------------------------
CREATE POLICY forge_stage_photos_owner ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'forge-stage-photos'
    AND public.current_user_role() = 'owner'
  )
  WITH CHECK (
    bucket_id = 'forge-stage-photos'
    AND public.current_user_role() = 'owner'
  );

-- Worker may read + write photos for stages on orders assigned to them.
CREATE POLICY forge_stage_photos_worker_rw ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'forge-stage-photos'
    AND public.current_user_role() = 'worker'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.assigned_worker_id = public.current_forge_user_id()
    )
  )
  WITH CHECK (
    bucket_id = 'forge-stage-photos'
    AND public.current_user_role() = 'worker'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.assigned_worker_id = public.current_forge_user_id()
    )
  );

-- Client may read photos on their own orders (signed URLs are generated
-- server-side, so SELECT is what matters).
CREATE POLICY forge_stage_photos_client_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'forge-stage-photos'
    AND public.current_user_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.client_id = public.current_client_id()
    )
  );

-- Issue (handover) photos ------------------------------------
CREATE POLICY forge_issue_photos_owner ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'forge-issue-photos'
    AND public.current_user_role() = 'owner'
  )
  WITH CHECK (
    bucket_id = 'forge-issue-photos'
    AND public.current_user_role() = 'owner'
  );

CREATE POLICY forge_issue_photos_worker_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'forge-issue-photos'
    AND public.current_user_role() = 'worker'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.assigned_worker_id = public.current_forge_user_id()
    )
  );

-- Scope PDFs (path: {order_id}/...) --------------------------
CREATE POLICY forge_scope_pdfs_owner ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'forge-scope-pdfs'
    AND public.current_user_role() = 'owner'
  )
  WITH CHECK (
    bucket_id = 'forge-scope-pdfs'
    AND public.current_user_role() = 'owner'
  );

CREATE POLICY forge_scope_pdfs_client_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'forge-scope-pdfs'
    AND public.current_user_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.client_id = public.current_client_id()
    )
  );

-- Invoice PDFs (path: {invoice_id}/...) ----------------------
CREATE POLICY forge_invoice_pdfs_owner ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'forge-invoice-pdfs'
    AND public.current_user_role() = 'owner'
  )
  WITH CHECK (
    bucket_id = 'forge-invoice-pdfs'
    AND public.current_user_role() = 'owner'
  );

CREATE POLICY forge_invoice_pdfs_client_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'forge-invoice-pdfs'
    AND public.current_user_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id::text = (storage.foldername(name))[1]
        AND i.client_id = public.current_client_id()
    )
  );

-- Avatars: anyone authenticated manages their own; bucket is public for reads.
CREATE POLICY forge_avatars_self_rw ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'forge-avatars'
    AND (storage.foldername(name))[1] = public.current_forge_user_id()::text
  )
  WITH CHECK (
    bucket_id = 'forge-avatars'
    AND (storage.foldername(name))[1] = public.current_forge_user_id()::text
  );
