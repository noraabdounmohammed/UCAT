-- Create cached_questions table for storing pre-generated questions
-- This allows instant question loading without AI generation delay

CREATE TABLE IF NOT EXISTS cached_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id TEXT NOT NULL,
  concept_title TEXT NOT NULL,
  concept_content TEXT,
  specialty TEXT NOT NULL,
  custom_filters TEXT[] DEFAULT '{}',
  filter_categories JSONB DEFAULT '[]',
  question_stem TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  key_fact TEXT,
  explanation TEXT,
  citation_id TEXT,
  question_format TEXT DEFAULT 'ukmla_sba',
  difficulty TEXT DEFAULT 'medium',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_cached_questions_concept_id ON cached_questions(concept_id);
CREATE INDEX IF NOT EXISTS idx_cached_questions_specialty ON cached_questions(specialty);
CREATE INDEX IF NOT EXISTS idx_cached_questions_status ON cached_questions(status);
CREATE INDEX IF NOT EXISTS idx_cached_questions_format ON cached_questions(question_format);
CREATE INDEX IF NOT EXISTS idx_cached_questions_custom_filters ON cached_questions USING GIN(custom_filters);

-- Enable Row Level Security
ALTER TABLE cached_questions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cached questions (they're shared content)
CREATE POLICY "Anyone can read cached questions"
  ON cached_questions
  FOR SELECT
  USING (true);

-- Only authenticated users can insert (for now - later restrict to admin)
CREATE POLICY "Authenticated users can insert cached questions"
  ON cached_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can update/delete (for moderation)
-- For now, allow authenticated users
CREATE POLICY "Authenticated users can update cached questions"
  ON cached_questions
  FOR UPDATE
  TO authenticated
  USING (true);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_cached_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cached_questions_updated_at
  BEFORE UPDATE ON cached_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_cached_questions_updated_at();

-- Grant permissions
GRANT SELECT ON cached_questions TO anon;
GRANT SELECT, INSERT, UPDATE ON cached_questions TO authenticated;
