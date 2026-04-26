# Fix Creator Features Disappearing

## Problem
The `profiles` table is missing the `role` column, which causes:
1. Creator features to disappear
2. User role to default to 'consumer'
3. Concepts to appear then disappear

## Solution

### Step 1: Run the Migration

You need to run the SQL migration to add the `role` column to the profiles table.

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to: https://app.supabase.com/project/uivitzexbtsmnspcitgh/sql/new
2. Copy and paste this SQL:

```sql
-- Add role column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'consumer' CHECK (role IN ('creator', 'consumer'));

-- Set noraabdounmohammed@gmail.com as creator
UPDATE profiles 
SET role = 'creator' 
WHERE email = 'noraabdounmohammed@gmail.com';

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Add comment
COMMENT ON COLUMN profiles.role IS 'User role: creator (can create/edit content) or consumer (can only view/practice)';
```

3. Click "Run" button
4. Verify success message

**Option B: Using Supabase CLI**
```bash
cd c:\Users\Nora\Desktop\Educate\UCAT-ukmla
supabase db push
```

### Step 2: Deploy Updated Code

The code has been updated with better logging and error handling. Deploy it:

```bash
netlify deploy --prod
```

### Step 3: Clear Browser Cache and Re-login

1. Go to https://studyedit.com
2. Open DevTools (F12)
3. Go to Console tab - you'll now see helpful logs like:
   - 📝 Initial session loaded: noraabdounmohammed@gmail.com
   - ✅ User role loaded: creator for noraabdounmohammed@gmail.com
   - 🔄 Auth state changed: SIGNED_IN noraabdounmohammed@gmail.com
4. If you see ❌ errors or ⚠️ warnings, they'll tell you what's wrong
5. Go to Application tab → Storage → Clear site data
6. Refresh and sign in again

### Step 4: Verify

After migration and re-login:
1. ✅ Creator features should stay visible
2. ✅ Concepts should persist after adding
3. ✅ Console should show: "✅ User role loaded: creator"

## What Was Fixed

### Code Changes:
1. **Better logging**: Added emoji-based console logs to track auth state
2. **Error handling**: Catches missing column errors specifically
3. **Session persistence**: Improved Supabase client configuration
4. **Timeout increased**: From 3s to 5s to prevent premature loading state

### Database Changes:
1. **Added `role` column** to profiles table
2. **Set your account** as 'creator'
3. **Added index** for faster role lookups
4. **Added constraint** to only allow 'creator' or 'consumer' values

## Troubleshooting

If creator features still disappear:

1. **Check Console Logs**: Look for these patterns:
   - ❌ Error fetching user role → Database issue
   - 🔄 Auth state changed → Session refresh happening
   - ⚠️ Role column missing → Migration not run

2. **Verify Database**:
   ```sql
   SELECT email, role FROM profiles WHERE email = 'noraabdounmohammed@gmail.com';
   ```
   Should return: `noraabdounmohammed@gmail.com | creator`

3. **Check Supabase Auth Settings**:
   - Ensure studyedit.com is in allowed redirect URLs
   - Verify Site URL is set to https://studyedit.com

4. **Clear All Auth Data**:
   ```javascript
   // In browser console
   Object.keys(localStorage).filter(k => k.includes('supabase') || k.startsWith('sb-')).forEach(k => localStorage.removeItem(k));
   location.reload();
   ```
