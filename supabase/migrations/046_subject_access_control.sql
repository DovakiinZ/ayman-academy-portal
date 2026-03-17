-- ============================================================================
-- 046_subject_access_control.sql
-- Subject Access Control System — Udemy/Coursera-style entitlements
-- ============================================================================
-- Creates: access_type on subjects, student_subjects, plans, plan_subjects,
--          subscriptions, family_members, subject_invites, organizations,
--          org_members, org_subjects, coupons, coupon_redemptions
-- RPC:     get_student_subjects, get_discover_subjects, check_subject_access
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. MODIFY SUBJECTS TABLE
-- ══════════════════════════════════════════════════════════════════════════════

-- Add access_type column (default 'stage' preserves current behavior)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'access_type'
    ) THEN
        ALTER TABLE public.subjects
        ADD COLUMN access_type text NOT NULL DEFAULT 'stage'
        CHECK (access_type IN ('public','stage','subscription','invite_only','org_only'));
    END IF;
END $$;

-- Make stage_id nullable (for non-stage subjects like public/subscription/invite_only/org_only)
ALTER TABLE public.subjects ALTER COLUMN stage_id DROP NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. STUDENT_SUBJECTS (direct assignment)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.student_subjects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    assigned_by text NOT NULL DEFAULT 'system' CHECK (assigned_by IN ('admin','teacher','system')),
    assigned_reason text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(student_id, subject_id)
);

ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;

-- Students can read their own assignments
DROP POLICY IF EXISTS "Students read own subject assignments" ON public.student_subjects;
CREATE POLICY "Students read own subject assignments"
    ON public.student_subjects FOR SELECT
    USING (student_id = auth.uid());

-- Admins can manage all
DROP POLICY IF EXISTS "Admins manage student_subjects" ON public.student_subjects;
CREATE POLICY "Admins manage student_subjects"
    ON public.student_subjects FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Teachers can read (for their subjects)
DROP POLICY IF EXISTS "Teachers read student_subjects" ON public.student_subjects;
CREATE POLICY "Teachers read student_subjects"
    ON public.student_subjects FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher','super_admin'))
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. PLANS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name_ar text NOT NULL,
    name_en text,
    description_ar text,
    description_en text,
    billing text NOT NULL DEFAULT 'monthly' CHECK (billing IN ('monthly','yearly','lifetime')),
    price_cents integer NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'SAR',
    stage_id uuid REFERENCES public.stages(id) ON DELETE SET NULL,
    is_family boolean NOT NULL DEFAULT false,
    max_members integer,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read active plans
DROP POLICY IF EXISTS "Anyone reads active plans" ON public.plans;
CREATE POLICY "Anyone reads active plans"
    ON public.plans FOR SELECT
    USING (is_active = true);

-- Admins manage plans
DROP POLICY IF EXISTS "Admins manage plans" ON public.plans;
CREATE POLICY "Admins manage plans"
    ON public.plans FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. PLAN_SUBJECTS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.plan_subjects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    UNIQUE(plan_id, subject_id)
);

ALTER TABLE public.plan_subjects ENABLE ROW LEVEL SECURITY;

-- Everyone can read plan_subjects
DROP POLICY IF EXISTS "Anyone reads plan_subjects" ON public.plan_subjects;
CREATE POLICY "Anyone reads plan_subjects"
    ON public.plan_subjects FOR SELECT
    USING (true);

-- Admins manage
DROP POLICY IF EXISTS "Admins manage plan_subjects" ON public.plan_subjects;
CREATE POLICY "Admins manage plan_subjects"
    ON public.plan_subjects FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. SUBSCRIPTIONS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'trialing'
        CHECK (status IN ('trialing','active','past_due','expired','cancelled')),
    starts_at timestamptz NOT NULL DEFAULT now(),
    ends_at timestamptz,
    trial_ends_at timestamptz,
    provider text NOT NULL DEFAULT 'manual'
        CHECK (provider IN ('manual','stripe','tap','hyperpay')),
    provider_ref text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users read their own subscriptions
DROP POLICY IF EXISTS "Users read own subscriptions" ON public.subscriptions;
CREATE POLICY "Users read own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (owner_user_id = auth.uid() OR student_id = auth.uid());

-- Admins manage
DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admins manage subscriptions"
    ON public.subscriptions FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. FAMILY_MEMBERS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.family_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(subscription_id, student_id)
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Users read their own family memberships
DROP POLICY IF EXISTS "Users read own family_members" ON public.family_members;
CREATE POLICY "Users read own family_members"
    ON public.family_members FOR SELECT
    USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.subscriptions s
            WHERE s.id = subscription_id AND s.owner_user_id = auth.uid()
        )
    );

-- Admins manage
DROP POLICY IF EXISTS "Admins manage family_members" ON public.family_members;
CREATE POLICY "Admins manage family_members"
    ON public.family_members FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. SUBJECT_INVITES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.subject_invites (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
    invited_by_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    UNIQUE(student_id, subject_id)
);

ALTER TABLE public.subject_invites ENABLE ROW LEVEL SECURITY;

-- Students read own invites
DROP POLICY IF EXISTS "Students read own invites" ON public.subject_invites;
CREATE POLICY "Students read own invites"
    ON public.subject_invites FOR SELECT
    USING (student_id = auth.uid());

-- Admins manage
DROP POLICY IF EXISTS "Admins manage subject_invites" ON public.subject_invites;
CREATE POLICY "Admins manage subject_invites"
    ON public.subject_invites FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. ORGANIZATIONS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name_ar text NOT NULL,
    name_en text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Everyone can read active orgs
DROP POLICY IF EXISTS "Anyone reads active orgs" ON public.organizations;
CREATE POLICY "Anyone reads active orgs"
    ON public.organizations FOR SELECT
    USING (is_active = true);

-- Admins manage
DROP POLICY IF EXISTS "Admins manage organizations" ON public.organizations;
CREATE POLICY "Admins manage organizations"
    ON public.organizations FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. ORG_MEMBERS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.org_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(organization_id, student_id)
);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Students read own memberships
DROP POLICY IF EXISTS "Students read own org members" ON public.org_members;
CREATE POLICY "Students read own org members"
    ON public.org_members FOR SELECT
    USING (student_id = auth.uid());

-- Admins manage
DROP POLICY IF EXISTS "Admins manage org_members" ON public.org_members;
CREATE POLICY "Admins manage org_members"
    ON public.org_members FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 10. ORG_SUBJECTS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.org_subjects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(organization_id, subject_id)
);

ALTER TABLE public.org_subjects ENABLE ROW LEVEL SECURITY;

-- Students read org_subjects for their orgs
DROP POLICY IF EXISTS "Students read org_subjects for their orgs" ON public.org_subjects;
CREATE POLICY "Students read org_subjects for their orgs"
    ON public.org_subjects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.org_members om
            WHERE om.organization_id = org_subjects.organization_id
              AND om.student_id = auth.uid()
              AND om.status = 'active'
        )
    );

-- Admins manage
DROP POLICY IF EXISTS "Admins manage org_subjects" ON public.org_subjects;
CREATE POLICY "Admins manage org_subjects"
    ON public.org_subjects FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 11. COUPONS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.coupons (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NOT NULL UNIQUE,
    discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
    discount_value integer NOT NULL DEFAULT 0,
    max_redemptions integer,
    redeemed_count integer NOT NULL DEFAULT 0,
    starts_at timestamptz,
    ends_at timestamptz,
    applies_to text NOT NULL DEFAULT 'plan' CHECK (applies_to IN ('plan','subject')),
    plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
    subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admins manage
DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons"
    ON public.coupons FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Authenticated users can read active coupons (for redemption validation)
DROP POLICY IF EXISTS "Auth users read active coupons" ON public.coupons;
CREATE POLICY "Auth users read active coupons"
    ON public.coupons FOR SELECT
    USING (is_active = true AND auth.uid() IS NOT NULL);

-- ══════════════════════════════════════════════════════════════════════════════
-- 12. COUPON_REDEMPTIONS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    redeemed_at timestamptz DEFAULT now()
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Users read own redemptions
DROP POLICY IF EXISTS "Users read own coupon_redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users read own coupon_redemptions"
    ON public.coupon_redemptions FOR SELECT
    USING (user_id = auth.uid());

-- Admins manage
DROP POLICY IF EXISTS "Admins manage coupon_redemptions" ON public.coupon_redemptions;
CREATE POLICY "Admins manage coupon_redemptions"
    ON public.coupon_redemptions FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );


-- ══════════════════════════════════════════════════════════════════════════════
-- 13. INDEXES FOR PERFORMANCE
-- ══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_subjects_access_type ON public.subjects(access_type);
CREATE INDEX IF NOT EXISTS idx_subjects_stage_access ON public.subjects(stage_id, access_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON public.student_subjects(student_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_student ON public.subscriptions(student_id) WHERE status IN ('active','trialing');
CREATE INDEX IF NOT EXISTS idx_subscriptions_owner ON public.subscriptions(owner_user_id) WHERE status IN ('active','trialing');
CREATE INDEX IF NOT EXISTS idx_family_members_student ON public.family_members(student_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subject_invites_student ON public.subject_invites(student_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_org_members_student ON public.org_members(student_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code) WHERE is_active = true;


-- ══════════════════════════════════════════════════════════════════════════════
-- 14. RPC: get_student_subjects
-- Returns ONLY entitled subjects for the calling student, with entitlement reason
-- Priority: assigned > invite > subscription > org > stage > public
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_student_subjects(p_student_id uuid)
RETURNS TABLE (
    id uuid,
    title_ar text,
    title_en text,
    description_ar text,
    description_en text,
    slug text,
    stage_id uuid,
    access_type text,
    sort_order integer,
    is_active boolean,
    show_on_home boolean,
    teaser_ar text,
    teaser_en text,
    created_at timestamptz,
    entitlement_reason text,
    stage_title_ar text,
    stage_title_en text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_stage text;
BEGIN
    -- Verify the caller is the student or an admin
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF auth.uid() != p_student_id THEN
        -- Check if caller is admin
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'super_admin') THEN
            RAISE EXCEPTION 'Access denied: you can only query your own subjects';
        END IF;
    END IF;

    -- Get student's stage slug
    SELECT p.student_stage INTO v_student_stage
    FROM profiles p WHERE p.id = p_student_id;

    RETURN QUERY
    WITH entitled AS (
        -- A) Direct assignment (highest priority)
        SELECT s.id AS subject_id, 'assigned'::text AS reason, 1 AS priority
        FROM student_subjects ss
        JOIN subjects s ON s.id = ss.subject_id
        WHERE ss.student_id = p_student_id
          AND ss.status = 'active'
          AND s.is_active = true

        UNION ALL

        -- B) Invite-only
        SELECT s.id, 'invite'::text, 2
        FROM subject_invites si
        JOIN subjects s ON s.id = si.subject_id
        WHERE si.student_id = p_student_id
          AND si.status = 'active'
          AND (si.expires_at IS NULL OR si.expires_at > now())
          AND s.is_active = true

        UNION ALL

        -- C) Subscription (direct subscriber)
        SELECT s.id, 'subscription'::text, 3
        FROM subscriptions sub
        JOIN plan_subjects ps ON ps.plan_id = sub.plan_id
        JOIN subjects s ON s.id = ps.subject_id
        WHERE (sub.student_id = p_student_id OR sub.owner_user_id = p_student_id)
          AND sub.status IN ('active', 'trialing')
          AND (sub.ends_at IS NULL OR sub.ends_at > now())
          AND (sub.status != 'trialing' OR sub.trial_ends_at IS NULL OR sub.trial_ends_at > now())
          AND s.is_active = true

        UNION ALL

        -- D) Subscription (family member)
        SELECT s.id, 'subscription'::text, 3
        FROM family_members fm
        JOIN subscriptions sub ON sub.id = fm.subscription_id
        JOIN plan_subjects ps ON ps.plan_id = sub.plan_id
        JOIN subjects s ON s.id = ps.subject_id
        WHERE fm.student_id = p_student_id
          AND fm.status = 'active'
          AND sub.status IN ('active', 'trialing')
          AND (sub.ends_at IS NULL OR sub.ends_at > now())
          AND (sub.status != 'trialing' OR sub.trial_ends_at IS NULL OR sub.trial_ends_at > now())
          AND s.is_active = true

        UNION ALL

        -- E) Organization
        SELECT s.id, 'org'::text, 4
        FROM org_members om
        JOIN org_subjects os ON os.organization_id = om.organization_id
        JOIN subjects s ON s.id = os.subject_id
        WHERE om.student_id = p_student_id
          AND om.status = 'active'
          AND os.status = 'active'
          AND s.is_active = true

        UNION ALL

        -- F) Stage-based (match student_stage slug to stages.slug)
        SELECT s.id, 'stage'::text, 5
        FROM subjects s
        JOIN stages st ON st.id = s.stage_id
        WHERE s.access_type = 'stage'
          AND s.is_active = true
          AND v_student_stage IS NOT NULL
          AND st.slug = v_student_stage

        UNION ALL

        -- G) Public subjects
        SELECT s.id, 'public'::text, 6
        FROM subjects s
        WHERE s.access_type = 'public'
          AND s.is_active = true
    ),
    -- Deduplicate: keep highest priority (lowest number) reason per subject
    best AS (
        SELECT DISTINCT ON (e.subject_id)
            e.subject_id,
            e.reason
        FROM entitled e
        ORDER BY e.subject_id, e.priority ASC
    )
    SELECT
        s.id,
        s.title_ar,
        s.title_en,
        s.description_ar,
        s.description_en,
        s.slug,
        s.stage_id,
        s.access_type,
        s.sort_order,
        s.is_active,
        s.show_on_home,
        s.teaser_ar,
        s.teaser_en,
        s.created_at,
        b.reason AS entitlement_reason,
        st.title_ar AS stage_title_ar,
        st.title_en AS stage_title_en
    FROM best b
    JOIN subjects s ON s.id = b.subject_id
    LEFT JOIN stages st ON st.id = s.stage_id
    ORDER BY s.sort_order ASC, s.title_ar ASC;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- 15. RPC: get_discover_subjects
-- Returns subjects NOT entitled to the student, for the "Discover" tab
-- Excludes org_only (internal) subjects
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_discover_subjects(p_student_id uuid)
RETURNS TABLE (
    id uuid,
    title_ar text,
    title_en text,
    description_ar text,
    description_en text,
    slug text,
    stage_id uuid,
    access_type text,
    sort_order integer,
    show_on_home boolean,
    teaser_ar text,
    teaser_en text,
    lock_reason text,
    stage_title_ar text,
    stage_title_en text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    IF auth.uid() != p_student_id THEN
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'super_admin') THEN
            RAISE EXCEPTION 'Access denied';
        END IF;
    END IF;

    RETURN QUERY
    WITH entitled_ids AS (
        SELECT es.id FROM get_student_subjects(p_student_id) es
    )
    SELECT
        s.id,
        s.title_ar,
        s.title_en,
        s.description_ar,
        s.description_en,
        s.slug,
        s.stage_id,
        s.access_type,
        s.sort_order,
        s.show_on_home,
        s.teaser_ar,
        s.teaser_en,
        CASE s.access_type
            WHEN 'subscription' THEN 'needs_subscription'
            WHEN 'invite_only' THEN 'needs_invite'
            WHEN 'stage' THEN 'wrong_stage'
            ELSE 'locked'
        END AS lock_reason,
        st.title_ar AS stage_title_ar,
        st.title_en AS stage_title_en
    FROM subjects s
    LEFT JOIN stages st ON st.id = s.stage_id
    WHERE s.is_active = true
      AND s.access_type != 'org_only'  -- Hide internal org subjects from discovery
      AND s.id NOT IN (SELECT ei.id FROM entitled_ids ei)
    ORDER BY s.sort_order ASC, s.title_ar ASC;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- 16. RPC: check_subject_access
-- Returns true if student has access to a specific subject
-- Used as a guard on subject detail / lesson pages
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_subject_access(p_student_id uuid, p_subject_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- Verify caller
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('has_access', false, 'reason', 'not_authenticated');
    END IF;

    IF auth.uid() != p_student_id THEN
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('super_admin','teacher')) THEN
            RETURN jsonb_build_object('has_access', false, 'reason', 'access_denied');
        END IF;
    END IF;

    -- Check if subject exists and is active
    IF NOT EXISTS (SELECT 1 FROM subjects WHERE subjects.id = p_subject_id AND is_active = true) THEN
        RETURN jsonb_build_object('has_access', false, 'reason', 'subject_not_found');
    END IF;

    -- Check if student is entitled
    IF EXISTS (
        SELECT 1 FROM get_student_subjects(p_student_id) es
        WHERE es.id = p_subject_id
    ) THEN
        SELECT jsonb_build_object('has_access', true, 'reason', es.entitlement_reason)
        INTO v_result
        FROM get_student_subjects(p_student_id) es
        WHERE es.id = p_subject_id
        LIMIT 1;
        RETURN v_result;
    END IF;

    -- Not entitled — return the access_type so frontend can show appropriate CTA
    SELECT jsonb_build_object(
        'has_access', false,
        'reason', 'not_entitled',
        'access_type', s.access_type
    )
    INTO v_result
    FROM subjects s WHERE s.id = p_subject_id;

    RETURN COALESCE(v_result, jsonb_build_object('has_access', false, 'reason', 'unknown'));
END;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- 17. GRANT EXECUTE on RPCs
-- ══════════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.get_student_subjects(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_discover_subjects(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_subject_access(uuid, uuid) TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- Done. All existing subjects default to access_type='stage', preserving
-- current behavior for students who have completed onboarding.
-- ══════════════════════════════════════════════════════════════════════════════
