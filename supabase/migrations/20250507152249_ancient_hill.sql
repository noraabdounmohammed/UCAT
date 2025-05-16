/*
  # Fix questions table structure and permissions

  1. Changes
    - Drop existing policy
    - Recreate table with proper structure
    - Enable RLS
    - Add new policy for authenticated users
*/

-- First, drop the existing policy
DROP POLICY IF EXISTS "Anyone can read questions" ON questions;

-- Recreate the questions table with proper structure
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  main_topic text NOT NULL,
  micro_skill text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  question_stem text,
  individual_question text NOT NULL,
  options text[] NOT NULL,
  correct_answer text NOT NULL,
  worked_solution text,
  data_type text,
  data_block jsonb,
  explanation_audio_url text,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Add constraints
  CONSTRAINT valid_section CHECK (section IN ('QR', 'VR', 'DM', 'SJ'))
);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Anyone can read questions"
ON questions
FOR SELECT
TO authenticated
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS questions_section_idx ON questions(section);
CREATE INDEX IF NOT EXISTS questions_main_topic_idx ON questions(main_topic);
CREATE INDEX IF NOT EXISTS questions_micro_skill_idx ON questions(micro_skill);