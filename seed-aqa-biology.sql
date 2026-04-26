-- Insert AQA GCSE Biology curriculum
INSERT INTO published_curriculums (
  id, name, description, category, country, color, author, version,
  published_at, download_count, rating, tags, custom_filters,
  filter_categories, filter_assignments, concept_count, difficulty, estimated_hours, is_locked
) VALUES (
  'pub-aqa-gcse-biology-v1',
  'AQA GCSE Biology',
  'Complete AQA GCSE Biology curriculum covering all topics from Cell Biology to Ecology',
  'School',
  'United Kingdom',
  'bg-blue-500',
  'Dr. Nora Abdoun',
  '1.0.0',
  '2024-03-01',
  0,
  5.0,
  ARRAY['GCSE', 'Biology', 'AQA', 'School'],
  ARRAY['cell-structure', 'cell-division', 'animal-tissues,-organs-and-organ-systems', 'plant-tissues,-organs-and-systems'],
  '[
    {"name": "Topic 1: Cell Biology", "color": "#3B82F6", "filters": ["cell-structure", "cell-division"]},
    {"name": "Topic 2: Organisation", "color": "#10B981", "filters": ["animal-tissues,-organs-and-organ-systems", "plant-tissues,-organs-and-systems"]}
  ]'::jsonb,
  '{
    "cell-structure": "Topic 1: Cell Biology",
    "cell-division": "Topic 1: Cell Biology",
    "animal-tissues,-organs-and-organ-systems": "Topic 2: Organisation",
    "plant-tissues,-organs-and-systems": "Topic 2: Organisation"
  }'::jsonb,
  342,
  'Beginner',
  50,
  false
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Insert sample concepts (you can add all 342 later)
INSERT INTO curriculum_concepts (curriculum_id, concept_id, title, content, prerequisites, custom_filters) VALUES
('pub-aqa-gcse-biology-v1', 'cb-001', 'CB-001: Definition of eukaryotic cells', 'Eukaryotic cells are cells that contain a nucleus.', '{}', ARRAY['cell-structure']),
('pub-aqa-gcse-biology-v1', 'cb-002', 'CB-002: Examples of eukaryotic organisms', 'Eukaryotic cells are found in plants, animals, fungi, and protists.', '{}', ARRAY['cell-structure']),
('pub-aqa-gcse-biology-v1', 'cb-003', 'CB-003: Three key features of eukaryotic cells', 'All eukaryotic cells have a cell membrane, cytoplasm, and genetic material enclosed in a nucleus.', '{}', ARRAY['cell-structure']),
('pub-aqa-gcse-biology-v1', 'cb-004', 'CB-004: Definition of prokaryotic cells', 'Prokaryotic cells are cells without a nucleus.', '{}', ARRAY['cell-structure']),
('pub-aqa-gcse-biology-v1', 'cb-005', 'CB-005: Examples of prokaryotic organisms', 'Prokaryotic cells are found in bacteria.', '{}', ARRAY['cell-structure'])
ON CONFLICT (curriculum_id, concept_id) DO NOTHING;
