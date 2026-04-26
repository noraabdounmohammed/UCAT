-- Plan 13D — backfill profiles for the auto-promote allowlist.
--
-- The Plan 13C `auto_promote_creators` trigger fires on profiles INSERT
-- and overrides `role := 'creator'` for two operator emails. But Amro
-- (amroabdoun@hotmail.co.uk) signed up before that trigger existed, and
-- his auth.users row was never followed by a profiles row — the AuthForm's
-- in-React profile-INSERT call must have failed silently. Result: he had
-- an auth session but no profile row → useUserRole() returned null →
-- /review showed "Not authorised".
--
-- This migration backfills profiles for any auth.users in the allowlist
-- that don't yet have one, with `role = 'consumer'` (the trigger then
-- promotes them to 'creator' BEFORE INSERT). The double-write is
-- defensive: if the trigger ever changes, the explicit `'creator'` here
-- guarantees the right end state.
--
-- Idempotent — re-running is a no-op if profiles already exist.

insert into public.profiles (id, email, name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'first_name', split_part(u.email, '@', 1)) as name,
  'creator' as role
from auth.users u
where u.email in ('noraabdounmohammed@gmail.com', 'amroabdoun@hotmail.co.uk')
  and not exists (select 1 from public.profiles p where p.id = u.id);

-- Defensive: if any of these emails had a profile created with role !=
-- 'creator' before the Plan 13C trigger landed, force-promote now.
update public.profiles
set role = 'creator'
where email in ('noraabdounmohammed@gmail.com', 'amroabdoun@hotmail.co.uk')
  and role is distinct from 'creator';
