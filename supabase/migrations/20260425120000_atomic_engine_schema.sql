-- Atomic Engine schema (Plan 1 / Spec §3.2)
-- Exam-agnostic. UKMLA first, structurally generalisable.

create table if not exists public.atoms (
  id              uuid primary key default gen_random_uuid(),
  exam            text not null,
  topic_path      text[] not null default '{}',
  claim           text not null,
  canonical_stem  text not null,
  answer          text not null,
  distractors     jsonb not null default '[]'::jsonb,
  difficulty      smallint not null default 3 check (difficulty between 1 and 5),
  image_url       text,
  image_alt       text,
  citation_url    text not null,
  citation_label  text not null,
  source_type     text not null check (source_type in (
    'NICE','NHS','BNF','GMC','past_paper','doctor_seed','student_bounty'
  )),
  prereq_atom_ids uuid[] not null default '{}',
  high_yield      boolean not null default false,
  free_tier       boolean not null default false,
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  status          text not null default 'draft' check (status in (
    'draft','pending_review','approved','rejected'
  )),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index atoms_exam_status_idx on public.atoms(exam, status);
create index atoms_free_tier_idx on public.atoms(free_tier) where free_tier = true;
create index atoms_status_idx on public.atoms(status);

create table if not exists public.atom_variants (
  id              uuid primary key default gen_random_uuid(),
  parent_atom_id  uuid not null references public.atoms(id) on delete cascade,
  stem            text not null,
  answer          text not null,
  distractors     jsonb not null default '[]'::jsonb,
  generated_by    text not null check (generated_by in (
    'ai-deepseek-v3','ai-openai-gpt4o-mini','human','past_paper'
  )),
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  status          text not null default 'draft' check (status in (
    'draft','pending_review','approved','rejected'
  )),
  created_at      timestamptz not null default now()
);

create index atom_variants_parent_idx on public.atom_variants(parent_atom_id);
create index atom_variants_status_idx on public.atom_variants(status);

create table if not exists public.user_atom_state (
  user_id         uuid not null references auth.users(id) on delete cascade,
  atom_id         uuid not null references public.atoms(id) on delete cascade,
  stability       real not null default 0,
  difficulty      real not null default 5,
  due_at          timestamptz not null default now(),
  last_review_at  timestamptz,
  reps            int not null default 0,
  lapses          int not null default 0,
  primary key (user_id, atom_id)
);

-- Partial predicate `where due_at <= now()` removed: Postgres requires
-- index predicates to be IMMUTABLE, and now() is STABLE. The full
-- (user_id, due_at) B-tree serves the "overdue for this user" query
-- via a range scan with equivalent performance.
create index user_atom_state_due_idx
  on public.user_atom_state(user_id, due_at);

create table if not exists public.review_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  atom_id         uuid not null references public.atoms(id) on delete cascade,
  variant_id      uuid references public.atom_variants(id) on delete set null,
  rating          smallint not null check (rating between 1 and 4),
  confidence      smallint check (confidence between 1 and 4),
  response_ms     int,
  created_at      timestamptz not null default now()
);

create index review_events_user_atom_idx on public.review_events(user_id, atom_id, created_at desc);
create index review_events_user_created_idx on public.review_events(user_id, created_at desc);

-- RLS — atoms are world-readable when approved; writes only via service role for now.
alter table public.atoms enable row level security;
alter table public.atom_variants enable row level security;
alter table public.user_atom_state enable row level security;
alter table public.review_events enable row level security;

create policy "atoms_read_approved"
  on public.atoms for select
  using (status = 'approved' or auth.uid() = reviewed_by);

create policy "atom_variants_read_approved"
  on public.atom_variants for select
  using (
    status = 'approved'
    or auth.uid() = reviewed_by
    or exists (select 1 from public.atoms a where a.id = parent_atom_id and a.reviewed_by = auth.uid())
  );

create policy "user_atom_state_owner"
  on public.user_atom_state for all
  using (auth.uid() = user_id);

create policy "review_events_owner_insert"
  on public.review_events for insert
  with check (auth.uid() = user_id);

create policy "review_events_owner_select"
  on public.review_events for select
  using (auth.uid() = user_id);

-- Updated_at trigger for atoms
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger atoms_updated_at_touch
  before update on public.atoms
  for each row execute function public.touch_updated_at();
