/*
  Optimize Expert publish performance
  - Deduplicate curriculum_concepts (curriculum_id, concept_id)
  - Add unique index on (curriculum_id, concept_id)
  - Ensure fast lookup by curriculum_id
*/

BEGIN;

-- 1) Deduplicate concept rows keeping the lowest id per (curriculum_id, concept_id)
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY curriculum_id, concept_id
           ORDER BY id
         ) AS rn
  FROM curriculum_concepts
)
DELETE FROM curriculum_concepts c
USING duplicates d
WHERE c.id = d.id
  AND d.rn > 1;

-- 2) Ensure index on curriculum_id for fast filtering by curriculum
CREATE INDEX IF NOT EXISTS idx_curriculum_concepts_curriculum
  ON curriculum_concepts(curriculum_id);

-- 3) Enforce uniqueness so future publishes are idempotent and inserts are optimized
CREATE UNIQUE INDEX IF NOT EXISTS ux_curriculum_concepts_curriculum_concept
  ON curriculum_concepts(curriculum_id, concept_id);

COMMIT;
