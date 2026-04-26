-- Plan 13 — allow AI-drafted atoms with traceability back to UKMLA.json concept_id.
--
-- Two additive changes to the `atoms` table:
--   1. Extend `source_type` CHECK to allow 'ai-draft' values.
--   2. Add a nullable `source_concept_id text` column so each AI-drafted atom
--      points back to the UKMLA.json concept it was generated from. Used for
--      idempotency in `scripts/generate-atoms-from-ukmla.ts` (skip concepts
--      already drafted) and to let reviewers see the source content.

alter table public.atoms
  drop constraint if exists atoms_source_type_check;

alter table public.atoms
  add constraint atoms_source_type_check
  check (source_type in (
    'NICE','NHS','BNF','GMC','past_paper','doctor_seed','student_bounty','ai-draft'
  ));

alter table public.atoms
  add column if not exists source_concept_id text;

create index if not exists atoms_source_concept_id_idx
  on public.atoms(source_concept_id)
  where source_concept_id is not null;

-- Same for atom_variants: allow 'ai-draft' generation source.
alter table public.atom_variants
  drop constraint if exists atom_variants_generated_by_check;

alter table public.atom_variants
  add constraint atom_variants_generated_by_check
  check (generated_by in (
    'ai-deepseek-v3','ai-openai-gpt4o-mini','ai-draft','human','past_paper'
  ));
