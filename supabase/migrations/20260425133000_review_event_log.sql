-- Plan 3 — review_decisions audit log
-- Records every approve / edit / reject decision a reviewer makes on an atom.
-- Distinct from `review_events` (which logs student answers in study sessions).

create table if not exists public.review_decisions (
  id              uuid primary key default gen_random_uuid(),
  atom_id         uuid not null references public.atoms(id) on delete cascade,
  reviewer_id     uuid not null references auth.users(id),
  decision        text not null check (decision in ('approve','edit','reject')),
  reason          text,
  prev_status     text,
  created_at      timestamptz not null default now()
);

create index review_decisions_atom_idx on public.review_decisions(atom_id, created_at desc);
create index review_decisions_reviewer_idx on public.review_decisions(reviewer_id, created_at desc);

alter table public.review_decisions enable row level security;

create policy "review_decisions_owner_select"
  on public.review_decisions for select
  using (auth.uid() = reviewer_id);

create policy "review_decisions_owner_insert"
  on public.review_decisions for insert
  with check (auth.uid() = reviewer_id);
