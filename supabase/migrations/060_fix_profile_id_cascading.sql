-- ==============================================================================
-- 060 FIX PROFILE ID CASCADING
-- Purpose: Ensure that when a profile ID is updated (e.g., shadow -> real auth),
-- all related records in other tables are automatically updated.
-- This is critical for Student Certificate visibility after signup.
-- ==============================================================================

BEGIN;

-- 1. Certificates
ALTER TABLE public.certificates 
    DROP CONSTRAINT IF EXISTS certificates_student_id_fkey,
    ADD CONSTRAINT certificates_student_id_fkey 
    FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Lesson Progress
ALTER TABLE public.lesson_progress
    DROP CONSTRAINT IF EXISTS lesson_progress_user_id_fkey,
    ADD CONSTRAINT lesson_progress_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Lesson Notes (checking standard names)
ALTER TABLE public.lesson_notes
    DROP CONSTRAINT IF EXISTS lesson_notes_user_id_fkey,
    ADD CONSTRAINT lesson_notes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Student Subjects
ALTER TABLE public.student_subjects
    DROP CONSTRAINT IF EXISTS student_subjects_student_id_fkey,
    ADD CONSTRAINT student_subjects_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Subscriptions
ALTER TABLE public.subscriptions
    DROP CONSTRAINT IF EXISTS subscriptions_owner_user_id_fkey,
    ADD CONSTRAINT subscriptions_owner_user_id_fkey
    FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.subscriptions
    DROP CONSTRAINT IF EXISTS subscriptions_student_id_fkey,
    ADD CONSTRAINT subscriptions_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Family Members
ALTER TABLE public.family_members
    DROP CONSTRAINT IF EXISTS family_members_student_id_fkey,
    ADD CONSTRAINT family_members_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Subject Invites
ALTER TABLE public.subject_invites
    DROP CONSTRAINT IF EXISTS subject_invites_student_id_fkey,
    ADD CONSTRAINT subject_invites_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;
    
ALTER TABLE public.subject_invites
    DROP CONSTRAINT IF EXISTS subject_invites_invited_by_user_id_fkey,
    ADD CONSTRAINT subject_invites_invited_by_user_id_fkey
    FOREIGN KEY (invited_by_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Org Members
ALTER TABLE public.org_members
    DROP CONSTRAINT IF EXISTS org_members_student_id_fkey,
    ADD CONSTRAINT org_members_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. Coupon Redemptions
ALTER TABLE public.coupon_redemptions
    DROP CONSTRAINT IF EXISTS coupon_redemptions_user_id_fkey,
    ADD CONSTRAINT coupon_redemptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 10. Force Cache Reload
NOTIFY pgrst, 'reload schema';

COMMIT;
