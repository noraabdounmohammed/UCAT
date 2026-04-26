-- Plan 4 — RLS write policies for atoms + atom_variants (tightened post-audit).
-- Plan 1's schema only had SELECT policies, so INSERT/UPDATE were silently
-- blocked. This unblocks Plan 3's review queue (updates to non-finalised
-- atoms) and Plan 4's seed form (inserts of pending_review drafts).
--
-- Tightening vs the original (loose) draft of this migration:
--   - UPDATE only on rows whose CURRENT status is 'draft' or 'pending_review'
--     → approved/rejected atoms are locked from further edits.
--   - UPDATE's WITH CHECK requires reviewed_by ∈ {NULL, auth.uid()}
--     → can't impersonate another reviewer's sign-off.
-- App-level isCreator gating remains the practical access control.

-- atoms: INSERT new draft atoms (pending_review only)
create policy "atoms_insert_authed_draft"
  on public.atoms for insert
  with check (
    auth.uid() is not null
    and status = 'pending_review'
    and reviewed_by is null
  );

-- atoms: UPDATE only on non-finalised rows; reviewer must claim authorship
create policy "atoms_update_in_review"
  on public.atoms for update
  using (status in ('draft', 'pending_review'))
  with check (
    auth.uid() is not null
    and (reviewed_by is null or reviewed_by = auth.uid())
  );

-- atom_variants: INSERT pending_review drafts only
create policy "atom_variants_insert_authed_draft"
  on public.atom_variants for insert
  with check (
    auth.uid() is not null
    and status = 'pending_review'
  );

-- atom_variants: UPDATE only on non-finalised rows
create policy "atom_variants_update_in_review"
  on public.atom_variants for update
  using (status in ('draft', 'pending_review'))
  with check (auth.uid() is not null);
