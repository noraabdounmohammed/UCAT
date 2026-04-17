-- Add marketing consent columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;

-- Add comment
COMMENT ON COLUMN profiles.marketing_consent IS 'Whether the user opted in to receive marketing emails and updates';
COMMENT ON COLUMN profiles.marketing_consent_at IS 'Timestamp when marketing consent was given or withdrawn';

-- Create index for easy querying of opted-in users
CREATE INDEX IF NOT EXISTS idx_profiles_marketing_consent ON profiles(marketing_consent) WHERE marketing_consent = true;
