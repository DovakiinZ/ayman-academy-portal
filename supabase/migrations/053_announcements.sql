-- ============================================================================
-- 053_announcements.sql
-- Announcements system: teachers post announcements per subject
-- ============================================================================

-- ── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id  uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
    title       text NOT NULL,
    body        text NOT NULL,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_teacher ON public.announcements(teacher_id);
CREATE INDEX IF NOT EXISTS idx_announcements_subject ON public.announcements(subject_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active  ON public.announcements(is_active, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Teachers: full control over their own announcements
DROP POLICY IF EXISTS "Teachers manage own announcements" ON public.announcements;
CREATE POLICY "Teachers manage own announcements"
    ON public.announcements FOR ALL
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- Super admins: full control
DROP POLICY IF EXISTS "Admins manage all announcements" ON public.announcements;
CREATE POLICY "Admins manage all announcements"
    ON public.announcements FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Students & teachers: read active announcements for subjects they can access
DROP POLICY IF EXISTS "Authenticated users read active announcements" ON public.announcements;
CREATE POLICY "Authenticated users read active announcements"
    ON public.announcements FOR SELECT
    USING (is_active = true AND auth.role() = 'authenticated');

-- ── Grants ───────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;

-- ── Trigger: updated_at ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_announcements_updated_at ON public.announcements;
CREATE TRIGGER set_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION update_announcements_updated_at();

NOTIFY pgrst, 'reload schema';
