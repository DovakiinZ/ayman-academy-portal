-- ============================================================================
-- 047_reconcile_plans_schema.sql
-- Reconcile public.plans table with frontend expectations
-- ============================================================================

-- Fix: Add missing columns and migrate data safely
DO $$ BEGIN
    -- name_ar (rename from title_ar if exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'title_ar') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'name_ar') THEN
        ALTER TABLE public.plans RENAME COLUMN title_ar TO name_ar;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'name_ar') THEN
        ALTER TABLE public.plans ADD COLUMN name_ar text NOT NULL DEFAULT '';
    END IF;

    -- name_en (rename from title_en if exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'title_en') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'name_en') THEN
        ALTER TABLE public.plans RENAME COLUMN title_en TO name_en;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'name_en') THEN
        ALTER TABLE public.plans ADD COLUMN name_en text;
    END IF;

    -- billing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'billing') THEN
        ALTER TABLE public.plans ADD COLUMN billing text NOT NULL DEFAULT 'monthly' CHECK (billing IN ('monthly','yearly','lifetime'));
    END IF;

    -- price_cents (rename from price_amount or migrate)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'price_amount') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'price_cents') THEN
        ALTER TABLE public.plans ADD COLUMN price_cents integer NOT NULL DEFAULT 0;
        UPDATE public.plans SET price_cents = (price_amount * 100)::integer;
        ALTER TABLE public.plans DROP COLUMN price_amount;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'price_cents') THEN
        ALTER TABLE public.plans ADD COLUMN price_cents integer NOT NULL DEFAULT 0;
    END IF;

    -- currency (rename from price_currency if exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'price_currency') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'currency') THEN
        ALTER TABLE public.plans RENAME COLUMN price_currency TO currency;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'currency') THEN
        ALTER TABLE public.plans ADD COLUMN currency text NOT NULL DEFAULT 'SAR';
    END IF;

    -- stage_id (rename from level_id if exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'level_id') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'stage_id') THEN
        ALTER TABLE public.plans RENAME COLUMN level_id TO stage_id;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'stage_id') THEN
        ALTER TABLE public.plans ADD COLUMN stage_id uuid REFERENCES public.stages(id) ON DELETE SET NULL;
    END IF;

    -- is_family
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'is_family') THEN
        ALTER TABLE public.plans ADD COLUMN is_family boolean NOT NULL DEFAULT false;
    END IF;

    -- max_members
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'max_members') THEN
        ALTER TABLE public.plans ADD COLUMN max_members integer;
    END IF;

    -- is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'is_active') THEN
        ALTER TABLE public.plans ADD COLUMN is_active boolean NOT NULL DEFAULT true;
    END IF;

    -- sort_order
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'sort_order') THEN
        ALTER TABLE public.plans ADD COLUMN sort_order integer DEFAULT 0;
    END IF;

    -- updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'updated_at') THEN
        ALTER TABLE public.plans ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;

    -- Cleanup unused old columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'code') THEN
        ALTER TABLE public.plans DROP COLUMN code;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'scope') THEN
        ALTER TABLE public.plans DROP COLUMN scope;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'course_id') THEN
        ALTER TABLE public.plans DROP COLUMN course_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'subject_id') THEN
        ALTER TABLE public.plans DROP COLUMN subject_id;
    END IF;

END $$;

-- Ensure is_super_admin function exists (idempotent)
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

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Anyone reads active plans" ON public.plans;
DROP POLICY IF EXISTS "Admins manage plans" ON public.plans;
DROP POLICY IF EXISTS "plans_select" ON public.plans;
DROP POLICY IF EXISTS "plans_admin" ON public.plans;

-- Create reconciled policies using is_super_admin() for robustness
-- 1. Everyone can read active plans, admins can read all
CREATE POLICY "Anyone reads active plans"
    ON public.plans FOR SELECT
    USING (is_active = true OR public.is_super_admin());

-- 2. Admins manage plans (ALL operations)
CREATE POLICY "Admins manage plans"
    ON public.plans FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Ensure trigger exists for updated_at
DROP TRIGGER IF EXISTS update_plans_ts ON public.plans;
CREATE TRIGGER update_plans_ts BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Grant permissions (Crucial for 403 errors)
GRANT ALL ON public.plans TO authenticated;
GRANT SELECT ON public.plans TO anon;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
