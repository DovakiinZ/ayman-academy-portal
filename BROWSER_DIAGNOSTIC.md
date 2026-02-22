# Browser Console Diagnostic

## How to Check for Errors

1. **Open Browser Console**
   - Press `F12` (Windows/Linux) or `Cmd + Option + I` (Mac)
   - Click on "Console" tab

2. **Look for Red Errors**
   - Errors will be shown in red
   - Common errors to look for:
     - "relation does not exist" → Migration not applied
     - "column does not exist" → Column missing, migration needed
     - "permission denied" → RLS policy issue
     - "auth.uid() is null" → Not logged in

## Quick Database Check

Paste this code in the browser console while on http://localhost:8080:

```javascript
// Check if Supabase is connected
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

// Check authentication
const { supabase } = await import('/src/lib/supabase.ts');
const { data: session, error: sessionError } = await supabase.auth.getSession();
console.log('Session:', session?.session?.user?.email || 'Not logged in');
console.log('User ID:', session?.session?.user?.id || 'N/A');

// Check if lesson_ratings table exists
const { data: ratings, error: ratingsError } = await supabase
  .from('lesson_ratings')
  .select('*')
  .limit(1);
console.log('lesson_ratings table:', ratingsError ? `❌ ${ratingsError.message}` : '✅ Exists');

// Check if lesson_progress table exists
const { data: progress, error: progressError } = await supabase
  .from('lesson_progress')
  .select('*')
  .limit(1);
console.log('lesson_progress table:', progressError ? `❌ ${progressError.message}` : '✅ Exists');

// Check if stages has homepage columns
const { data: stages, error: stagesError } = await supabase
  .from('stages')
  .select('id, show_on_home, home_order, teaser_ar, teaser_en')
  .limit(1);
console.log('stages homepage columns:', stagesError ? `❌ ${stagesError.message}` : '✅ Exists');

// Check current user role
if (session?.session?.user?.id) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, email, full_name')
    .eq('id', session.session.user.id)
    .single();
  console.log('User Profile:', profile || `❌ ${profileError?.message}`);
}
```

## Expected Output (When Everything Works)

```
Supabase URL: https://lkdbinrwojvrchunzqfq.supabase.co
Session: your-email@example.com
User ID: <uuid>
lesson_ratings table: ✅ Exists
lesson_progress table: ✅ Exists
stages homepage columns: ✅ Exists
User Profile: { role: 'super_admin', email: '...', full_name: '...' }
```

## Common Error Messages & Fixes

### Error: "relation 'public.lesson_ratings' does not exist"
**Fix:** Run migration `009_student_engagement.sql` in Supabase Dashboard

### Error: "column 'show_on_home' does not exist"
**Fix:** Run migration `023_stages_homepage_featured.sql` in Supabase Dashboard

### Error: "permission denied for table profiles"
**Fix:**
1. Verify you're logged in as super_admin
2. Run migration `014_admin_hardening.sql` to apply RLS policies

### Error: "auth.uid() is null"
**Fix:** You're not logged in. Go to `/login` and login with super_admin account

### Error: "Failed to fetch" or "Network error"
**Fix:**
1. Check if dev server is running
2. Check if Supabase URL is correct in `.env`
3. Check internet connection

## Testing Specific Features

### Test 1: Create Teacher (Super Admin Only)
```javascript
// Must be logged in as super_admin
const { data, error } = await supabase
  .from('profiles')
  .insert({
    email: 'test-teacher@example.com',
    full_name: 'Test Teacher',
    role: 'teacher',
    is_active: true
  })
  .select()
  .single();

console.log('Create teacher:', error ? `❌ ${error.message}` : '✅ Success', data);
```

### Test 2: Student Rating
```javascript
// Must be logged in as student
const { data, error } = await supabase
  .from('lesson_ratings')
  .insert({
    lesson_id: '<paste-lesson-uuid>',
    user_id: '<paste-user-id>',
    rating: 5,
    comment: 'Test rating'
  })
  .select()
  .single();

console.log('Create rating:', error ? `❌ ${error.message}` : '✅ Success', data);
```

### Test 3: Lesson Progress
```javascript
// Must be logged in as student
const { data, error } = await supabase
  .from('lesson_progress')
  .upsert({
    lesson_id: '<paste-lesson-uuid>',
    user_id: '<paste-user-id>',
    progress_percent: 50,
    last_position_seconds: 120
  })
  .select()
  .single();

console.log('Save progress:', error ? `❌ ${error.message}` : '✅ Success', data);
```

## Next Steps

1. ✅ Apply migrations as per `APPLY_MIGRATIONS.md`
2. ✅ Run diagnostic script above
3. ✅ Fix any errors shown
4. ✅ Test features again
