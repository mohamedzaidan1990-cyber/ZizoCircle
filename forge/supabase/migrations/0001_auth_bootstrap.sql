-- ============================================================
-- Forge — auth bootstrap
-- ============================================================
-- Run this AFTER the main schema. It does two things:
--
--   1. On every new auth.users insert, link an existing public.users
--      row by email (if pre-created by an owner) or create one with
--      role='client' as a fallback.
--   2. Allows authenticated users to UPDATE their own users row's
--      last_login_at (used by the login flow).
--
-- After running, promote the first owner manually:
--   UPDATE public.users SET role = 'owner' WHERE email = 'you@x.com';
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If a users row was pre-created by an owner (no auth link yet), claim it.
  UPDATE public.users
     SET supabase_auth_id = NEW.id,
         last_login_at    = NOW()
   WHERE email = NEW.email
     AND supabase_auth_id IS NULL;

  IF NOT FOUND THEN
    INSERT INTO public.users (supabase_auth_id, full_name, email, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      'client'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Allow a user to update their own users row (e.g. last_login_at, language_pref).
DROP POLICY IF EXISTS users_self_update ON public.users;
CREATE POLICY users_self_update ON public.users
  FOR UPDATE TO authenticated
  USING (supabase_auth_id = auth.uid())
  WITH CHECK (supabase_auth_id = auth.uid());
