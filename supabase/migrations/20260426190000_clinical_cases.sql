-- Plan 13K — chained clinical cases.
--
-- A clinical case is a vignette (markdown) that several atoms can hang off.
-- Use case to teach reasoning across investigation → diagnosis → management
-- — much closer to how UKMLA actually tests.
--
-- Data model:
--   clinical_cases  → id, exam, title, vignette_md, citation, source_concept_id
--   atoms.case_id   → nullable FK; when set, renderer shows the vignette card
--                     above the question.

create table if not exists public.clinical_cases (
  id uuid primary key default gen_random_uuid(),
  exam text not null,
  title text not null,
  vignette_md text not null,
  citation_url text,
  citation_label text,
  source_type text not null default 'doctor_seed',
  status text not null default 'pending_review' check (status in ('draft','pending_review','approved','rejected')),
  source_concept_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clinical_cases_exam_idx on public.clinical_cases (exam);
create index if not exists clinical_cases_status_idx on public.clinical_cases (status);

alter table public.clinical_cases enable row level security;

-- Everyone can read approved / pending_review cases (matches atoms behaviour).
drop policy if exists clinical_cases_read on public.clinical_cases;
create policy clinical_cases_read on public.clinical_cases
  for select
  using (status in ('approved','pending_review'));

-- Creators can do anything (uses existing is_creator(uuid) helper).
drop policy if exists clinical_cases_creator_all on public.clinical_cases;
create policy clinical_cases_creator_all on public.clinical_cases
  for all
  using (public.is_creator(auth.uid()))
  with check (public.is_creator(auth.uid()));

alter table public.atoms
  add column if not exists case_id uuid references public.clinical_cases(id) on delete set null;

create index if not exists atoms_case_id_idx on public.atoms (case_id);
