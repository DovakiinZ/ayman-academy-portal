
-- Migration 025: Robust Auth Trigger
-- Handles:
-- 1. Automatic profile creation upon signup
-- 2. Respecting 'role' and 'full_name' from auth metadata
-- 3. Merging orphaned "shadow" profiles created for teachers
-- 4. Safe defaults and error handling to prevent signup failures

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role public.user_role;
    v_full_name TEXT;
    v_existing_id UUID;
BEGIN
    -- 1. Extract and validate role from metadata
    BEGIN
        v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
    EXCEPTION WHEN OTHERS THEN
        v_role := 'student';
    END;
    
    -- 2. Extract full name
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

    -- 3. Check for existing shadow profile by email
    -- This happens when an admin "Creates a Teacher" before the teacher signs up
    SELECT id INTO v_existing_id FROM public.profiles WHERE email = NEW.email;

    IF v_existing_id IS NOT NULL THEN
        -- UPDATE existing shadow profile with real auth ID
        -- We use DO UPDATE to handle potential race conditions or ID mismatches
        UPDATE public.profiles
        SET id = NEW.id,
            role = COALESCE(v_role, role),
            full_name = CASE WHEN full_name = '' OR full_name IS NULL THEN v_full_name ELSE full_name END,
            is_active = true
        WHERE id = v_existing_id;
        
        -- Log the merge for debugging
        RAISE NOTICE 'Merged existing profile with email % into new auth user id %', NEW.email, NEW.id;
    ELSE
        -- INSERT new profile
        INSERT INTO public.profiles (id, email, full_name, role, is_active)
        VALUES (
            NEW.id,
            NEW.email,
            v_full_name,
            COALESCE(v_role, 'student'),
            true
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Prevent signup failure even if profile logic fails
    -- Better to have a user with no profile than no user at all
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-enable or create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure proper permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
