-- Temporarily DISABLE RLS to test if that's the issue
-- This makes the tables completely public (no authentication required)
-- Run this in Supabase SQL Editor

-- Disable RLS entirely (for testing)
ALTER TABLE published_curriculums DISABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_concepts DISABLE ROW LEVEL SECURITY;

-- Note: This makes the tables completely public with no restrictions
-- Once this works, we can re-enable RLS with proper policies
