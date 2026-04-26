-- Plan 13E — AI-side QA on the AI-drafted backlog before Nora sees it.
--
-- 496 ai-drafted atoms landed in `pending_review` overnight. To save Nora
-- triage time, run a second LLM pass that flags each atom as:
--   - 'ok'      — clinically sound to UKMLA standard, ready for human approve
--   - 'concern' — something looks off (wrong answer, weak distractors,
--                 ambiguous stem, factual error) — Nora should look first
--   - null      — not yet reviewed by the AI pass
--
-- The notes column captures the AI's reasoning so Nora can scan + decide
-- without re-reading the source paper.
--
-- Both columns are nullable + default null → existing rows are unaffected
-- and the AI-review script can backfill incrementally.

alter table public.atoms
  add column if not exists ai_review_status text
    check (ai_review_status in ('ok', 'concern')),
  add column if not exists ai_review_notes text,
  add column if not exists ai_reviewed_at timestamptz;

create index if not exists atoms_ai_review_status_idx
  on public.atoms(ai_review_status)
  where ai_review_status is not null;
