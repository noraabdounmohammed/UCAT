-- Add image columns and featured flag to cached_questions

-- Vignette image (shown before answering - patient presentation)
ALTER TABLE cached_questions 
ADD COLUMN IF NOT EXISTS vignette_image_url TEXT;

-- Explanation image (shown after answering - concept explanation)
ALTER TABLE cached_questions 
ADD COLUMN IF NOT EXISTS explanation_image_url TEXT;

-- Memory hook mnemonic
ALTER TABLE cached_questions 
ADD COLUMN IF NOT EXISTS memory_hook TEXT;

-- Featured flag for high-yield showcase questions
ALTER TABLE cached_questions 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Priority for ordering
ALTER TABLE cached_questions 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Condition name for grouping
ALTER TABLE cached_questions 
ADD COLUMN IF NOT EXISTS condition_name TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cached_questions_featured 
ON cached_questions(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_cached_questions_condition 
ON cached_questions(condition_name);
