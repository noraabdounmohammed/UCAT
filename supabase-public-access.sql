-- Remove authentication requirement from Supabase tables
-- This allows anyone to read/write to published_curriculums and curriculum_concepts without signing in

-- Enable RLS on tables (if not already enabled)
ALTER TABLE published_curriculums ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_concepts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON published_curriculums;
DROP POLICY IF EXISTS "Allow public insert access" ON published_curriculums;
DROP POLICY IF EXISTS "Allow public update access" ON published_curriculums;
DROP POLICY IF EXISTS "Allow public delete access" ON published_curriculums;

DROP POLICY IF EXISTS "Allow public read access" ON curriculum_concepts;
DROP POLICY IF EXISTS "Allow public insert access" ON curriculum_concepts;
DROP POLICY IF EXISTS "Allow public update access" ON curriculum_concepts;
DROP POLICY IF EXISTS "Allow public delete access" ON curriculum_concepts;

-- Create public access policies for published_curriculums
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

-- Create public access policies for curriculum_concepts
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
