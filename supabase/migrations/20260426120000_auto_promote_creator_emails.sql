-- Plan 13C — auto-promote configured emails to `role='creator'` on profile insert.
--
-- Reason: the existing AuthForm signup path inserts the profile client-side
-- with `role: 'consumer'`. Two specific operator emails should always land as
-- `creator` so they can use /review and /seed without a manual UPDATE after
-- each signup. A BEFORE INSERT trigger overrides the role for those emails.
--
-- Idempotent in two ways:
--   1. The trigger uses `create or replace function`, so re-running is safe.
--   2. The trigger only mutates NEW.role for the specific email allowlist,
--      so other users are untouched.
--
-- Also runs a one-shot UPDATE so any pre-existing rows for the same emails
-- are aligned. Today: Nora's row already has `role='creator'`, so the UPDATE
-- is a no-op for her; Amro hasn't signed up yet so 0 rows match.

create or replace function public.auto_promote_creators()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if NEW.email in ('noraabdounmohammed@gmail.com', 'amroabdoun@hotmail.co.uk') then
    NEW.role := 'creator';
  end if;
  return NEW;
end;
$$;

drop trigger if exists profiles_auto_promote_creators on public.profiles;
create trigger profiles_auto_promote_creators
  before insert on public.profiles
  for each row
  execute function public.auto_promote_creators();

-- Defensive idempotent backfill — promotes any pre-existing rows whose email
-- matches the allowlist but role hasn't been promoted yet.
update public.profiles
set role = 'creator'
where email in ('noraabdounmohammed@gmail.com', 'amroabdoun@hotmail.co.uk')
  and role is distinct from 'creator';
