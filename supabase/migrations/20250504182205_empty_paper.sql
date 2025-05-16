/*
  # Update questions table schema
  
  1. Changes
    - Add main_topic and micro_skill columns
    - Add difficulty with check constraint
    - Add data related columns
    - Enable RLS with read policy
  
  2. Security
    - Enable RLS on questions table
    - Add policy for authenticated users to read questions
*/

-- Create questions table if it doesn't exist
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  main_topic text NOT NULL,
  micro_skill text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question_stem text,
  individual_question text NOT NULL,
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  worked_solution text,
  data_type text,
  data_block jsonb,
  explanation_audio_url text,
  created_at timestamp without time zone DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate it
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can read questions" ON questions;
  
  CREATE POLICY "Anyone can read questions"
    ON questions
    FOR SELECT
    TO authenticated
    USING (true);
END $$;