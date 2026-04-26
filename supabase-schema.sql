-- Create published_curriculums table
CREATE TABLE IF NOT EXISTS published_curriculums (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  country TEXT NOT NULL,
  color TEXT NOT NULL,
  author TEXT NOT NULL,
  version TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  download_count INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0.0,
  tags TEXT[] DEFAULT '{}',
  custom_filters TEXT[] DEFAULT '{}',
  filter_categories JSONB DEFAULT '[]',
  filter_assignments JSONB DEFAULT '{}',
  practice_templates JSONB DEFAULT '{"ukmla_templates": [], "flashcard_templates": []}',
  concept_count INTEGER DEFAULT 0,
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  estimated_hours INTEGER DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create curriculum_concepts table
CREATE TABLE IF NOT EXISTS curriculum_concepts (
  id SERIAL PRIMARY KEY,
  curriculum_id TEXT NOT NULL REFERENCES published_curriculums(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  prerequisites TEXT[] DEFAULT '{}',
  custom_filters TEXT[] DEFAULT '{}',
  mastery_data JSONB DEFAULT '{"attempts": 0, "correct": 0, "incorrect": 0, "mastery_level": 0, "last_practiced": null}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(curriculum_id, concept_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_published_curriculums_category ON published_curriculums(category);
CREATE INDEX IF NOT EXISTS idx_published_curriculums_country ON published_curriculums(country);
CREATE INDEX IF NOT EXISTS idx_published_curriculums_is_locked ON published_curriculums(is_locked);
CREATE INDEX IF NOT EXISTS idx_curriculum_concepts_curriculum_id ON curriculum_concepts(curriculum_id);

-- Enable Row Level Security (RLS)
ALTER TABLE published_curriculums ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_concepts ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to published curriculums"
  ON published_curriculums FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to curriculum concepts"
  ON curriculum_concepts FOR SELECT
  USING (true);

-- Optional: Create policies for authenticated users to insert/update
-- Uncomment these if you want users to be able to publish curriculums
-- CREATE POLICY "Allow authenticated users to insert curriculums"
--   ON published_curriculums FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Allow authenticated users to insert concepts"
--   ON curriculum_concepts FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated');
