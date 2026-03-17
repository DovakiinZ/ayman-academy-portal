-- Fix for auth trigger to prevent "Database error saving new user"
-- Ensures robust profile creation with safe defaults

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role := 'student';
  v_full_name text;
BEGIN
  -- Safely extract full name
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User');

  -- Safely determine role (default to student if missing or invalid)
  BEGIN
    IF NEW.raw_user_meta_data->>'role' IS NOT NULL AND NEW.raw_user_meta_data->>'role' != '' THEN
      v_role := (NEW.raw_user_meta_data->>'role')::user_role;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'student';
  END;

  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_role,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
    -- We update on conflict just in case, though usually ID shouldn't exist for new user.
    -- DO NOTHING is also fine, but updating ensures sync.

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions explicitly if needed (usually handled by SECURITY DEFINER)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
