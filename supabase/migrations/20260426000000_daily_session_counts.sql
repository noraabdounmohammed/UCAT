-- Plan 12 — daily_session_counts: server-side daily quota
-- Replaces the localStorage-based counter in useSubscription, which a free
-- user could trivially clear to bypass the paywall.

create table if not exists public.daily_session_counts (
  user_id     uuid not null references auth.users(id) on delete cascade,
  day         date not null,
  count       int not null default 0,
  primary key (user_id, day)
);

create index daily_session_counts_user_day_idx
  on public.daily_session_counts(user_id, day desc);

alter table public.daily_session_counts enable row level security;

-- Users can read and upsert their own row, scoped to (user_id, day).
create policy "daily_session_counts_owner_select"
  on public.daily_session_counts for select
  using (auth.uid() = user_id);

create policy "daily_session_counts_owner_insert"
  on public.daily_session_counts for insert
  with check (auth.uid() = user_id);

create policy "daily_session_counts_owner_update"
  on public.daily_session_counts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
