-- ==============================================================================
-- 043 FIX AUTH TRIGGER FOR PRE-CREATED PROFILES
-- Ensures that when a user signs up, if a profile already exists for their email 
-- (manually created by admin), it is updated with the real auth ID.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Check if a profile with this email already exists (manually created by admin)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = NEW.email) THEN
    -- Update the existing profile with the new auth ID
    -- This handles the case where Admin created a profile before user registered
    UPDATE public.profiles
    SET 
      id = NEW.id,
      full_name = COALESCE(NULLIF(full_name, ''), COALESCE(NEW.raw_user_meta_data->>'full_name', '')),
      updated_at = NOW()
    WHERE email = NEW.email;
  ELSE
    -- 2. Normal creation if it doesn't exist
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'student'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
