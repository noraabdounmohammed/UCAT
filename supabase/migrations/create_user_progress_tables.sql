-- User Progress Tracking Tables
-- This migration creates tables for storing user progress data in the cloud

-- Table: user_concepts
-- Stores all concepts for each user with their mastery data
CREATE TABLE IF NOT EXISTS user_concepts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  curriculum_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  custom_filters TEXT[], -- Array of filter tags
  mastery_level INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  correct INTEGER DEFAULT 0,
  incorrect INTEGER DEFAULT 0,
  last_practiced TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one concept per user per curriculum
  UNIQUE(user_id, curriculum_id, concept_id)
);

-- Table: practice_sessions
-- Stores practice session history
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  curriculum_id TEXT NOT NULL,
  session_date TIMESTAMPTZ DEFAULT NOW(),
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  incorrect_answers INTEGER NOT NULL,
  duration_seconds INTEGER,
  concepts_practiced TEXT[], -- Array of concept IDs
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: custom_filters
-- Stores user's custom filters per curriculum
CREATE TABLE IF NOT EXISTS custom_filters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  curriculum_id TEXT NOT NULL,
  filter_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, curriculum_id, filter_id)
);

-- Table: filter_categories
-- Stores user's filter categories per curriculum
CREATE TABLE IF NOT EXISTS filter_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  curriculum_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, curriculum_id, category_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_concepts_user_curriculum 
  ON user_concepts(user_id, curriculum_id);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_curriculum 
  ON practice_sessions(user_id, curriculum_id);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_date 
  ON practice_sessions(session_date DESC);

CREATE INDEX IF NOT EXISTS idx_custom_filters_user_curriculum 
  ON custom_filters(user_id, curriculum_id);

CREATE INDEX IF NOT EXISTS idx_filter_categories_user_curriculum 
  ON filter_categories(user_id, curriculum_id);

-- Row Level Security (RLS) Policies
ALTER TABLE user_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE filter_categories ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own concepts" 
  ON user_concepts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own concepts" 
  ON user_concepts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own concepts" 
  ON user_concepts FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own concepts" 
  ON user_concepts FOR DELETE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" 
  ON practice_sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" 
  ON practice_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own filters" 
  ON custom_filters FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own filters" 
  ON custom_filters FOR ALL 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own categories" 
  ON filter_categories FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own categories" 
  ON filter_categories FOR ALL 
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_concepts_updated_at 
  BEFORE UPDATE ON user_concepts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
