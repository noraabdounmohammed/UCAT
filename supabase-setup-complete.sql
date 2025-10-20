-- Complete Supabase setup: Create tables + Enable public access
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/uivitzexbtsmnspcitgh/sql/new

-- Step 1: Create tables if they don't exist
CREATE TABLE IF NOT EXISTS published_curriculums (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    country TEXT,
    color TEXT,
    author TEXT,
    version TEXT,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    download_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    tags TEXT[],
    custom_filters TEXT[],
    filter_categories JSONB,
    filter_assignments JSONB,
    practice_templates JSONB,
    concept_count INTEGER DEFAULT 0,
    difficulty TEXT,
    estimated_hours INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curriculum_concepts (
    id SERIAL PRIMARY KEY,
    curriculum_id TEXT NOT NULL REFERENCES published_curriculums(id) ON DELETE CASCADE,
    concept_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    prerequisites TEXT[],
    custom_filters TEXT[],
    mastery_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(curriculum_id, concept_id)
);

-- Step 2: Enable RLS on tables
ALTER TABLE published_curriculums ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_concepts ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON published_curriculums;
DROP POLICY IF EXISTS "Allow public insert access" ON published_curriculums;
DROP POLICY IF EXISTS "Allow public update access" ON published_curriculums;
DROP POLICY IF EXISTS "Allow public delete access" ON published_curriculums;

DROP POLICY IF EXISTS "Allow public read access" ON curriculum_concepts;
DROP POLICY IF EXISTS "Allow public insert access" ON curriculum_concepts;
DROP POLICY IF EXISTS "Allow public update access" ON curriculum_concepts;
DROP POLICY IF EXISTS "Allow public delete access" ON curriculum_concepts;

-- Step 4: Create public access policies for published_curriculums
CREATE POLICY "Allow public read access" 
ON published_curriculums FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Allow public insert access" 
ON published_curriculums FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON published_curriculums FOR UPDATE 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow public delete access" 
ON published_curriculums FOR DELETE 
TO anon, authenticated 
USING (true);

-- Step 5: Create public access policies for curriculum_concepts
CREATE POLICY "Allow public read access" 
ON curriculum_concepts FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Allow public insert access" 
ON curriculum_concepts FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON curriculum_concepts FOR UPDATE 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow public delete access" 
ON curriculum_concepts FOR DELETE 
TO anon, authenticated 
USING (true);

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_published_curriculums_published_at ON published_curriculums(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_curriculum_concepts_curriculum_id ON curriculum_concepts(curriculum_id);
