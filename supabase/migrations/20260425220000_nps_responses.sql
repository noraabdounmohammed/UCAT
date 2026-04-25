-- Plan 11: NPS responses table.
-- Captures 0-10 score + optional comment + context tag (e.g. "after-5-sessions").
-- Apply via Supabase-MCP session in a separate handoff (file commit only here).

create table if not exists public.nps_responses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  score       smallint not null check (score between 0 and 10),
  comment     text,
  context     text, -- e.g. "after-5-sessions"
  created_at  timestamptz not null default now()
);

alter table public.nps_responses enable row level security;

create policy "nps_responses_owner_insert"
  on public.nps_responses for insert
  with check (auth.uid() is not null and (auth.uid() = user_id or user_id is null));

-- Reading is admin-only via service-role; no SELECT policy for authed users.
