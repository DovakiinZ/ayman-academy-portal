# Database Migrations - Apply to Supabase

## ⚠️ IMPORTANT: Migrations Need to Be Applied

The features you're testing require database schema changes that haven't been applied to your Supabase instance yet.

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Visit: https://lkdbinrwojvrchunzqfq.supabase.co
   - Login to your Supabase account

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Apply Migration 023 (Homepage Features)**
   ```sql
   -- Copy and paste contents from: supabase/023_stages_homepage_featured.sql
   ```
   - Open `supabase/023_stages_homepage_featured.sql` in your editor
   - Copy entire contents
   - Paste into Supabase SQL Editor
   - Click "Run" button

4. **Verify Student Tables Exist**
   Run this query to check if tables exist:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN (
       'lesson_ratings',
       'lesson_progress',
       'lesson_comments',
       'lesson_notes'
   );
   ```

   If any are missing, apply these migrations in order:
   - `supabase/009_student_engagement.sql` (ratings & comments)
   - `supabase/022_student_experience.sql` (progress tracking)
   - `supabase/schema-student.sql` (notes)

5. **Verify RLS Policies**
   Run this query to check admin permissions:
   ```sql
   -- Check if is_super_admin function exists
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name = 'is_super_admin';
   ```

   If it doesn't exist, apply:
   - `supabase/014_admin_hardening.sql`

### Option 2: Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref lkdbinrwojvrchunzqfq

# Apply migrations
supabase db push
```

## After Applying Migrations

1. **Refresh the application** (Ctrl + Shift + R / Cmd + Shift + R)
2. **Clear browser cache** if issues persist
3. **Test each feature again**:
   - ✅ Create teacher from admin
   - ✅ View lesson editor
   - ✅ Student rating/comments
   - ✅ Lesson progress tracking

## Verification Checklist

After applying migrations, verify in Supabase Dashboard > Table Editor:

- [ ] `stages` table has columns: `show_on_home`, `home_order`, `teaser_ar`, `teaser_en`
- [ ] `lesson_ratings` table exists with columns: `user_id`, `lesson_id`, `rating`, `comment`
- [ ] `lesson_progress` table exists with columns: `user_id`, `lesson_id`, `progress_percent`, `completed_at`
- [ ] `lesson_comments` table exists
- [ ] `lesson_notes` table exists
- [ ] `profiles` table has RLS policy: "profiles_admin_all"

## Common Issues After Migration

### Issue: "Permission denied for table profiles"
**Fix:** RLS policies not applied. Re-run `014_admin_hardening.sql`

### Issue: "Column does not exist"
**Fix:** Specific migration not applied. Check which table/column is missing and apply corresponding migration.

### Issue: "Function is_super_admin() does not exist"
**Fix:** Run `014_admin_hardening.sql` which creates this helper function.

## Need Help?

If you encounter errors while applying migrations, check:
1. Browser console (F12) for JavaScript errors
2. Supabase Dashboard > Logs for database errors
3. Network tab (F12) to see which API calls are failing

The migrations are safe to run multiple times (they use `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`).
