-- Plan 12 — mock_attempts: persistence for /mock results.
-- Plan 10 shipped mock exam mode but didn't store attempts; results were
-- throwaway. This adds an audit + analytics surface and unlocks Plan 13's
-- score-over-time / cohort comparisons.

create table if not exists public.mock_attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  exam            text not null default 'UKMLA',
  atom_count      int not null,
  correct         int not null,
  total           int not null,
  percentage      real not null,
  duration_sec    int not null,
  time_used_sec   int not null,
  finished        boolean not null,
  started_at      timestamptz not null,
  finished_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index mock_attempts_user_finished_idx
  on public.mock_attempts(user_id, finished_at desc);

alter table public.mock_attempts enable row level security;

create policy "mock_attempts_owner_select"
  on public.mock_attempts for select
  using (auth.uid() = user_id);

create policy "mock_attempts_owner_insert"
  on public.mock_attempts for insert
  with check (auth.uid() = user_id);
