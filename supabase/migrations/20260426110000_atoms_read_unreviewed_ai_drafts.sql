-- Plan 13B — let signed-in users opt in to reading AI-drafted, not-yet-reviewed atoms.
--
-- Existing `atoms_read_approved` only allows SELECT when:
--   status = 'approved'  OR  auth.uid() = reviewed_by
--
-- That keeps the entire AI-drafted backlog (status = 'pending_review',
-- source_type = 'ai-draft') invisible to regular users until Nora clears the
-- review queue. With ~500 ai-drafted atoms now pending and ~5 approved, that's
-- the wrong default for users who explicitly opt in via the new
-- `useUnreviewedToggle` UI. Adds a third clause for unreviewed AI drafts.
--
-- Security posture: only `pending_review` + `source_type = 'ai-draft'` is
-- exposed — `draft` and `rejected` rows stay hidden, and non-AI pending rows
-- (e.g. doctor-seeded drafts mid-review) also stay hidden.

drop policy if exists "atoms_read_approved" on public.atoms;

create policy "atoms_read_approved_or_ai_draft"
  on public.atoms for select
  using (
    status = 'approved'
    or auth.uid() = reviewed_by
    or (status = 'pending_review' and source_type = 'ai-draft')
  );
