/*
  # Add practice questions relationship

  1. Changes
    - Add practice_questions junction table to link practice_sessions with questions
    - Add foreign key constraints and indexes for performance
  
  2. Security
    - Enable RLS on practice_questions table
    - Add policy for authenticated users to read/write their own practice questions
*/

CREATE TABLE IF NOT EXISTS practice_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_session_id uuid NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer text,
  is_correct boolean,
  time_taken integer, -- in seconds
  created_at timestamptz DEFAULT now(),
  UNIQUE(practice_session_id, question_id)
);

-- Enable RLS
ALTER TABLE practice_questions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own practice questions"
  ON practice_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM practice_sessions ps
      WHERE ps.id = practice_session_id
      AND ps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read their own practice questions"
  ON practice_questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM practice_sessions ps
      WHERE ps.id = practice_session_id
      AND ps.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX practice_questions_practice_session_id_idx ON practice_questions(practice_session_id);
CREATE INDEX practice_questions_question_id_idx ON practice_questions(question_id);