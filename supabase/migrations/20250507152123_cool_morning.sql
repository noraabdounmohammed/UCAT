/*
  # Fix questions table access

  1. Changes
    - Drop existing RLS policy if it exists
    - Create new RLS policy for questions table
    - Ensure authenticated users can read questions

  2. Security
    - Maintain RLS on questions table
    - Add policy for authenticated users to read questions
*/

DO $$ 
BEGIN
  -- Drop the existing policy if it exists
  DROP POLICY IF EXISTS "Anyone can read questions" ON questions;
  
  -- Create new policy
  CREATE POLICY "Anyone can read questions"
  ON questions
  FOR SELECT
  TO authenticated
  USING (true);
END $$;