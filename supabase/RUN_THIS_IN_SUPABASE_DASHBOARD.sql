-- ========================================
-- RUN THIS SQL IN YOUR SUPABASE DASHBOARD
-- ========================================
-- 1. Go to your Supabase project
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Copy and paste this entire file
-- 4. Click "Run" button
-- ========================================

-- Add role column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'consumer' CHECK (role IN ('creator', 'consumer'));

-- Set creator role for specific users by email
-- You can add more emails here as needed
UPDATE profiles 
SET role = 'creator' 
WHERE email IN (
  'noraabdounmohammed@gmail.com'
  -- Add more creator emails here, comma-separated like:
  -- ,'another-creator@example.com'
  -- ,'yet-another-creator@example.com'
);

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Add comment
COMMENT ON COLUMN profiles.role IS 'User role: creator (can create/edit content) or consumer (can only view/practice)';

-- Ensure all existing users have a role (default to consumer)
UPDATE profiles 
SET role = 'consumer' 
WHERE role IS NULL;

-- Verify the changes
SELECT id, email, role, created_at 
FROM profiles 
ORDER BY created_at DESC;
