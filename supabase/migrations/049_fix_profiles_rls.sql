-- ============================================================================
-- 049_fix_profiles_rls.sql
-- Emergency fix: Restore profiles RLS policies for login
-- ============================================================================
-- ROOT CAUSE: The admin policy on profiles was doing
--   EXISTS (SELECT 1 FROM profiles WHERE ...) 
-- which triggers INFINITE RLS RECURSION on the same table.
-- FIX: Use is_super_admin() which is SECURITY DEFINER and bypasses RLS.
-- ============================================================================

-- Ensure is_super_admin exists (SECURITY DEFINER = bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean slate: drop ALL existing profiles policies
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    ) LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles'; 
    END LOOP; 
END $$;

-- 1. Everyone can read profiles
CREATE POLICY "profiles_select_all" ON public.profiles
    FOR SELECT USING (true);

-- 2. Users can insert their own profile (critical for first login/signup)
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. Super admin can do everything (uses SECURITY DEFINER to avoid recursion!)
CREATE POLICY "profiles_admin_all" ON public.profiles
    FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Ensure grants
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Reload schema
NOTIFY pgrst, 'reload schema';
