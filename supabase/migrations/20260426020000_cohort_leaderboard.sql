-- Plan 17 — cohort leaderboards.
-- Adds two opt-in columns to profiles + a SECURITY DEFINER view that
-- aggregates this-week review counts by cohort. The view is the only path
-- to other users' aggregate counts (RLS on review_events stays owner-only).

alter table public.profiles
  add column if not exists cohort_school text,
  add column if not exists display_name text;

create index if not exists profiles_cohort_school_idx
  on public.profiles(cohort_school)
  where cohort_school is not null;

-- View: this-week review counts per (cohort, user). SECURITY DEFINER lets
-- non-owner users read aggregates. Personal review_events stays private.
create or replace view public.cohort_weekly_leaderboard
with (security_invoker = false) as
select
  p.cohort_school,
  p.id            as user_id,
  coalesce(p.display_name, 'Anonymous') as display_name,
  count(re.id)    as reviews_this_week
from public.profiles p
left join public.review_events re
  on re.user_id = p.id
  and re.created_at >= (now() - interval '7 days')
where p.cohort_school is not null
group by p.cohort_school, p.id, p.display_name;

-- Restrict view: any authed user can read, but they only see their own
-- cohort's rows.
alter view public.cohort_weekly_leaderboard owner to postgres;

revoke all on public.cohort_weekly_leaderboard from public;
grant select on public.cohort_weekly_leaderboard to authenticated;

-- Helper RLS-style check for the page: a function returning the auth user's cohort.
create or replace function public.my_cohort()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select cohort_school from public.profiles where id = auth.uid();
$$;
