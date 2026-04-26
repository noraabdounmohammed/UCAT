-- Plan 12 — is_creator() function + DB-level enforcement on atoms write policies.
-- Replaces the deferred Plan 4B promise: was relying on app-level isCreator
-- gating; a malicious authed user could bypass the React app and call the
-- REST API directly to mutate any atom. This closes that gap server-side.
--
-- Source of creator-truth: the existing `profiles.role` text column
-- (added in old MVP migration `20250115_add_user_roles.sql`), where the
-- value `'creator'` denotes a content creator and `'consumer'` is default.

create or replace function public.is_creator(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role = 'creator' from public.profiles where id = uid),
    false
  );
$$;

-- Replace the loose write policies with creator-gated versions.
drop policy if exists "atoms_insert_authed_draft" on public.atoms;
drop policy if exists "atoms_update_in_review" on public.atoms;
drop policy if exists "atom_variants_insert_authed_draft" on public.atom_variants;
drop policy if exists "atom_variants_update_in_review" on public.atom_variants;

-- atoms: only creators can INSERT new drafts
create policy "atoms_insert_creator_draft"
  on public.atoms for insert
  with check (
    public.is_creator(auth.uid())
    and status = 'pending_review'
    and reviewed_by is null
  );

-- atoms: only creators can UPDATE non-finalised rows; reviewer-claim discipline preserved
create policy "atoms_update_creator_in_review"
  on public.atoms for update
  using (status in ('draft', 'pending_review') and public.is_creator(auth.uid()))
  with check (
    public.is_creator(auth.uid())
    and (reviewed_by is null or reviewed_by = auth.uid())
  );

create policy "atom_variants_insert_creator_draft"
  on public.atom_variants for insert
  with check (
    public.is_creator(auth.uid())
    and status = 'pending_review'
  );

create policy "atom_variants_update_creator_in_review"
  on public.atom_variants for update
  using (status in ('draft', 'pending_review') and public.is_creator(auth.uid()))
  with check (public.is_creator(auth.uid()));
