-- Plan 13N — let users SEE doctor_seed pending_review atoms.
--
-- Context: doctor_seed source_type denotes hand-authored, NICE/BNF-cited
-- clinician content (calcs, EMQs, chained-case atoms, brand-aligned seeds).
-- Trust posture is the same as 'approved' — they're just awaiting Nora's
-- formal sign-off in the review queue.
--
-- The previous policy `atoms_read_approved_or_ai_draft` allowed SELECT for:
--   status='approved'
--   OR auth.uid() = reviewed_by
--   OR (status='pending_review' AND source_type='ai-draft')
--
-- That left doctor_seed pending atoms invisible to regular users — which
-- meant the entire calc + EMQ + chained-case content add was blocked at
-- the RLS layer no matter what the client query asked for.
--
-- This migration replaces the policy with one that ALSO permits
-- doctor_seed pending. AI drafts remain opt-in via the user-facing toggle
-- (the in-app filter still gates them; this just unblocks the doctor_seed
-- branch).

drop policy if exists "atoms_read_approved_or_ai_draft" on public.atoms;

create policy "atoms_read_approved_or_pending_doctor_or_ai"
  on public.atoms for select
  using (
    status = 'approved'
    or auth.uid() = reviewed_by
    or (status = 'pending_review' and source_type = 'doctor_seed')
    or (status = 'pending_review' and source_type = 'ai-draft')
  );
