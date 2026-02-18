-- Migration: Allow super_admin to insert profiles (manual teacher creation)
-- This enables the admin panel's "Create Teacher" feature.

-- Allow super_admin to insert new profiles
CREATE POLICY "super_admin_insert_profiles" ON public.profiles
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Allow super_admin to update any profile
-- (may already exist — use IF NOT EXISTS pattern via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'super_admin_update_profiles'
  ) THEN
    CREATE POLICY "super_admin_update_profiles" ON public.profiles
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );
  END IF;
END
$$;

-- Allow super_admin to delete any profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'super_admin_delete_profiles'
  ) THEN
    CREATE POLICY "super_admin_delete_profiles" ON public.profiles
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );
  END IF;
END
$$;
