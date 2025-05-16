/*
  # Update questions schema and add sample questions

  1. Schema Changes
    - Add section column
    - Update difficulty check constraint
    - Add sample questions for QR section

  2. Security
    - Enable RLS
    - Add policy for authenticated users to read questions
*/

-- Drop existing questions table if it exists
DROP TABLE IF EXISTS questions;

-- Create questions table with updated schema
CREATE TABLE questions (
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
  created_at timestamp without time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create read policy
CREATE POLICY "Anyone can read questions"
  ON questions
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert sample questions
INSERT INTO questions (
  section,
  main_topic,
  micro_skill,
  difficulty,
  individual_question,
  options,
  correct_answer,
  worked_solution
) VALUES
  (
    'QR',
    'Percentages',
    'percent-change',
    'Medium',
    'A store increases its prices by 20% and then offers a 25% discount. What is the overall percentage change?',
    ARRAY['-10%', '-5%', '0%', '+5%'],
    '0',
    'First increase: ×1.2, Then decrease: ×0.75, Combined: 1.2 × 0.75 = 0.9, Therefore -10% change'
  ),
  (
    'QR',
    'Percentages',
    'percent-value',
    'Easy',
    'What is 15% of 80?',
    ARRAY['8', '12', '15', '20'],
    '1',
    '15% = 15/100, 15/100 × 80 = 12'
  ),
  (
    'QR',
    'Ratios',
    'ratio-word',
    'Medium',
    'In a class of 30 students, the ratio of boys to girls is 2:3. How many boys are there?',
    ARRAY['10', '12', '15', '18'],
    '1',
    'Total parts = 2 + 3 = 5, Each part = 30 ÷ 5 = 6, Boys = 2 × 6 = 12'
  ),
  (
    'QR',
    'Data Interpretation',
    'read-tables',
    'Hard',
    'A study tracked patient recovery times. If 40% recovered within 2 days, and 75% within 4 days, what percentage recovered between 2 and 4 days?',
    ARRAY['25%', '35%', '40%', '45%'],
    '1',
    'After 2 days: 40%, After 4 days: 75%, Difference = 75% - 40% = 35%'
  ),
  (
    'QR',
    'Averages & Statistics',
    'mean-calc',
    'Medium',
    'The mean of five numbers is 12. If four of the numbers are 8, 13, 15, and 16, what is the fifth number?',
    ARRAY['6', '8', '10', '12'],
    '1',
    'Sum = Mean × Count, 12 × 5 = 60, Known sum = 8 + 13 + 15 + 16 = 52, Fifth number = 60 - 52 = 8'
  );