-- Cached Questions Table with Granular Filtering
-- Questions generated from JSON concepts, shared across all users

CREATE TABLE IF NOT EXISTS cached_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Source concept info
  concept_id TEXT NOT NULL,
  concept_title TEXT NOT NULL,
  concept_content TEXT,
  
  -- Granular filtering (matches your JSON structure)
  specialty TEXT NOT NULL,                    -- e.g., "Cardiovascular", "Respiratory"
  custom_filters TEXT[] DEFAULT '{}',         -- e.g., ["Acute coronary syndromes", "Definition"]
  filter_categories JSONB DEFAULT '[]',       -- Full category structure from JSON
  
  -- Question content (matches your AI prompt output)
  question_stem TEXT NOT NULL,                -- The clinical vignette
  question_text TEXT NOT NULL,                -- The actual question
  options JSONB NOT NULL,                     -- Array of {id, text} options
  correct_answer TEXT NOT NULL,               -- e.g., "A"
  key_fact TEXT,                              -- Quick takeaway
  explanation TEXT,                           -- Detailed worked solution
  citation_id TEXT,                           -- NICE guideline ID e.g., "NG185"
  
  -- Question metadata
  question_format TEXT DEFAULT 'ukmla_sba',   -- sba, emq, flashcard, etc.
  difficulty TEXT DEFAULT 'medium',           -- easy, medium, hard
  bloom_level TEXT DEFAULT 'apply',           -- remember, understand, apply, analyze
  
  -- Tracking
  generated_by UUID REFERENCES auth.users(id), -- Who triggered generation
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  times_served INTEGER DEFAULT 0,             -- How many times shown to users
  
  -- Quality control
  status TEXT DEFAULT 'active',               -- active, flagged, archived
  flagged_reason TEXT,
  
  -- Indexes for fast filtering
  UNIQUE(concept_id, question_stem)           -- Prevent duplicate questions per concept
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_cached_questions_specialty ON cached_questions(specialty);
CREATE INDEX IF NOT EXISTS idx_cached_questions_filters ON cached_questions USING GIN(custom_filters);
CREATE INDEX IF NOT EXISTS idx_cached_questions_status ON cached_questions(status);
CREATE INDEX IF NOT EXISTS idx_cached_questions_concept ON cached_questions(concept_id);

-- User's FSRS state for cached questions (per-user progress)
CREATE TABLE IF NOT EXISTS user_question_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES cached_questions(id) ON DELETE CASCADE NOT NULL,
  
  -- FSRS state
  stability REAL DEFAULT 0,
  difficulty REAL DEFAULT 0.3,
  due_at TIMESTAMPTZ DEFAULT NOW(),
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  last_rating INTEGER,                        -- 1=Forgot, 2=Hard, 3=Good, 4=Easy
  last_review_at TIMESTAMPTZ,
  
  -- Stats
  times_seen INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_user_question_state_user ON user_question_state(user_id);
CREATE INDEX IF NOT EXISTS idx_user_question_state_due ON user_question_state(user_id, due_at);

-- RLS Policies
ALTER TABLE cached_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_question_state ENABLE ROW LEVEL SECURITY;

-- Anyone can read questions (they're shared content)
CREATE POLICY "Questions are readable by all authenticated users"
  ON cached_questions FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Only authenticated users can insert (when generating)
CREATE POLICY "Authenticated users can generate questions"
  ON cached_questions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can only see/modify their own progress
CREATE POLICY "Users can read own question state"
  ON user_question_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own question state"
  ON user_question_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own question state"
  ON user_question_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
