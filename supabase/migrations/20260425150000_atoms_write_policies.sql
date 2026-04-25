-- Plan 4 prerequisite — RLS write policies for atoms + atom_variants
-- Plan 1's schema only had SELECT policies, so INSERT/UPDATE were blocked
-- for non-service-role users. This unblocks Plan 3's review queue (which
-- updates atom status) and Plan 4's seed form (which inserts drafts).

-- atoms: allow any authed user to INSERT new draft atoms (pending_review)
create policy "atoms_insert_authed_draft"
  on public.atoms for insert
  with check (
    auth.uid() is not null
    and status = 'pending_review'
    and reviewed_by is null
  );

-- atoms: allow any authed user to UPDATE atoms. App-level isCreator gate
-- is the practical control; tightening to a database-level is_creator()
-- check is queued for a Plan 4B follow-up.
create policy "atoms_update_authed"
  on public.atoms for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- atom_variants: same shape — INSERT drafts, UPDATE freely (app-gated)
create policy "atom_variants_insert_authed_draft"
  on public.atom_variants for insert
  with check (
    auth.uid() is not null
    and status = 'pending_review'
  );

create policy "atom_variants_update_authed"
  on public.atom_variants for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
