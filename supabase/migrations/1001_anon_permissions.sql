-- ============================================================================
-- 1001_anon_permissions.sql
-- Grant SELECT permissions to anon role on public tables to allow visitors to 
-- view published/active content based on existing RLS policies
-- ============================================================================

BEGIN;

-- 1. Grant usage on schema public
GRANT USAGE ON SCHEMA public TO anon;

-- 2. Grant SELECT on all tables in schema public
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 3. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
