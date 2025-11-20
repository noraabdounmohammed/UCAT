/* Test minimal insert to diagnose the issue
   Run this in Supabase SQL Editor to see what's blocking the insert */

/* First, check if the table exists and what columns it has */
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'published_curriculums'
ORDER BY ordinal_position;

-- Try a minimal insert with only required fields
INSERT INTO published_curriculums (
  id,
  name,
  description,
  category,
  country,
  color,
  author,
  version,
  published_at,
  concept_count
) VALUES (
  'test-curriculum-123',
  'Test Curriculum',
  'Test Description',
  'Medical Exam',
  'International',
  'blue',
  'Test Author',
  '1.0.0',
  NOW(),
  0
) RETURNING *;

-- Clean up test data
DELETE FROM published_curriculums WHERE id = 'test-curriculum-123';
