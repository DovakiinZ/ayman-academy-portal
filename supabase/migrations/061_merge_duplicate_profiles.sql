-- ==============================================================================
-- 061 MERGE DUPLICATE PROFILES (VERSION 3 - FIXED SYNTAX)
-- Purpose: Clean up redundant profiles created by email-based invitations 
-- followed by authentication-based signups.
-- Transfers all historical data (certificates, progress, etc.) to the 
-- profile linked to the actual Auth user.
-- ==============================================================================

BEGIN;

-- Create a temporary function to handle the merge logic safely
CREATE OR REPLACE FUNCTION merge_redundant_profiles()
RETURNS void AS $$
DECLARE
    r RECORD;
    v_real_id uuid;
    v_shadow_id uuid;
    v_trigger_exists boolean;
BEGIN
    -- Check if the trigger exists once
    SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'enforce_cert_immutability') INTO v_trigger_exists;

    -- 1. Identify and loop through emails that appear in more than one profile
    FOR r IN 
        SELECT email FROM public.profiles 
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email 
        HAVING COUNT(*) > 1
    LOOP
        -- Identify which one is the "Real" profile (linked to auth.users)
        SELECT id INTO v_real_id 
        FROM public.profiles p
        WHERE p.email = r.email 
        AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
        LIMIT 1;

        -- Loop through the "Shadow" profile(s) for the same email
        FOR v_shadow_id IN 
            SELECT id FROM public.profiles p
            WHERE p.email = r.email AND p.id != v_real_id
        LOOP
            IF v_real_id IS NOT NULL THEN
                RAISE NOTICE 'Merging profile % into % for email %', v_shadow_id, v_real_id, r.email;
                
                -- A) Transfer Certificates
                -- Bypass immutability trigger during merge if it exists
                IF v_trigger_exists THEN
                    EXECUTE 'ALTER TABLE public.certificates DISABLE TRIGGER enforce_cert_immutability';
                END IF;

                UPDATE public.certificates SET student_id = v_real_id WHERE student_id = v_shadow_id;
                
                IF v_trigger_exists THEN
                    EXECUTE 'ALTER TABLE public.certificates ENABLE TRIGGER enforce_cert_immutability';
                END IF;
                
                -- B) Transfer Lesson Progress
                INSERT INTO public.lesson_progress (user_id, lesson_id, progress_percent, last_position_seconds, completed_at)
                SELECT v_real_id, lesson_id, progress_percent, last_position_seconds, completed_at
                FROM public.lesson_progress
                WHERE user_id = v_shadow_id
                ON CONFLICT (user_id, lesson_id) DO UPDATE 
                SET 
                    progress_percent = GREATEST(lesson_progress.progress_percent, EXCLUDED.progress_percent),
                    completed_at = COALESCE(lesson_progress.completed_at, EXCLUDED.completed_at),
                    updated_at = NOW();
                
                DELETE FROM public.lesson_progress WHERE user_id = v_shadow_id;

                -- C) Transfer Student Subjects
                INSERT INTO public.student_subjects (student_id, subject_id, status, assigned_by)
                SELECT v_real_id, subject_id, status, assigned_by
                FROM public.student_subjects
                WHERE student_id = v_shadow_id
                ON CONFLICT (student_id, subject_id) DO NOTHING;
                
                DELETE FROM public.student_subjects WHERE student_id = v_shadow_id;

                -- D) Transfer Other Related Records
                UPDATE public.lesson_notes SET user_id = v_real_id WHERE user_id = v_shadow_id;
                UPDATE public.subscriptions SET owner_user_id = v_real_id WHERE owner_user_id = v_shadow_id;
                UPDATE public.subscriptions SET student_id = v_real_id WHERE student_id = v_shadow_id;
                UPDATE public.quiz_attempts SET student_id = v_real_id WHERE student_id = v_shadow_id;
                UPDATE public.lesson_comments SET user_id = v_real_id WHERE user_id = v_shadow_id;
                UPDATE public.lesson_ratings SET user_id = v_real_id WHERE user_id = v_shadow_id;
                UPDATE public.messages SET sender_id = v_real_id WHERE sender_id = v_shadow_id;
                UPDATE public.conversations SET student_id = v_real_id WHERE student_id = v_shadow_id;
                UPDATE public.family_members SET student_id = v_real_id WHERE student_id = v_shadow_id;
                UPDATE public.subject_invites SET student_id = v_real_id WHERE student_id = v_shadow_id;
                UPDATE public.subject_invites SET invited_by_user_id = v_real_id WHERE invited_by_user_id = v_shadow_id;
                UPDATE public.org_members SET student_id = v_real_id WHERE student_id = v_shadow_id;

                -- E) Delete the shadow profile
                DELETE FROM public.profiles WHERE id = v_shadow_id;
                
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the merge
SELECT merge_redundant_profiles();

-- Clean up
DROP FUNCTION merge_redundant_profiles();

-- Force Cache Reload
NOTIFY pgrst, 'reload schema';

COMMIT;
