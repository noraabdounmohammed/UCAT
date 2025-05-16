/*
  # Update questions table RLS policies

  1. Changes
    - Ensure RLS is enabled on questions table
    - Add policy for authenticated users to read questions (if not exists)
*/

DO $$ 
BEGIN
  -- Check if RLS is enabled, if not enable it
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'questions' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Check if policy exists, if not create it
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'questions' 
    AND policyname = 'Anyone can read questions'
  ) THEN
    CREATE POLICY "Anyone can read questions"
    ON questions
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;