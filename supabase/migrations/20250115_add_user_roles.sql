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
