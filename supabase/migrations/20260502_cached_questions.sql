-- Cached Questions Table
-- Stores AI-generated questions to avoid regenerating the same content

CREATE TABLE IF NOT EXISTS cached_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id TEXT NOT NULL UNIQUE,
  question_json JSONB NOT NULL,
  citation_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by concept_id
CREATE INDEX IF NOT EXISTS idx_cached_questions_concept_id ON cached_questions(concept_id);

-- Index for user-specific queries
CREATE INDEX IF NOT EXISTS idx_cached_questions_user_id ON cached_questions(user_id);

-- RLS Policies
ALTER TABLE cached_questions ENABLE ROW LEVEL SECURITY;

-- Anyone can read cached questions (shared cache)
CREATE POLICY "Anyone can read cached questions"
  ON cached_questions FOR SELECT
  USING (true);

-- Authenticated users can insert/update their own cached questions
CREATE POLICY "Authenticated users can insert cached questions"
  ON cached_questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cached questions"
  ON cached_questions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cached_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cached_questions_updated_at
  BEFORE UPDATE ON cached_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_cached_questions_updated_at();
