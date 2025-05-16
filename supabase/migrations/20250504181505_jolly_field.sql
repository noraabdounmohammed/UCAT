/*
  # Add questions table

  1. New Tables
    - `questions`
      - `id` (uuid, primary key)
      - `topic` (text)
      - `micro_skill` (text)
      - `difficulty` (text)
      - `content` (text)
      - `options` (jsonb array)
      - `correct_answer` (integer)
      - `explanation` (text)
      - `time_limit` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `questions` table
    - Add policy for authenticated users to read questions
*/

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  micro_skill text NOT NULL,
  difficulty text NOT NULL,
  content text NOT NULL,
  options jsonb NOT NULL,
  correct_answer integer NOT NULL,
  explanation text NOT NULL,
  time_limit integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read questions"
  ON questions
  FOR SELECT
  TO authenticated
  USING (true);