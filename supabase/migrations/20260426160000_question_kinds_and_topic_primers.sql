-- Plan 13G — go beyond flashcards. Add cloze / EMQ question kinds + topic primers.
--
-- User: 'you left flashcards only, what about the other types of questions
-- we had before? exam is not just multiple choice then add your other ideas'
--
-- Two changes:
--
-- 1. atoms.question_kind  — discriminator so /study can rotate the renderer
--    between SBA (existing MCQ), CLOZE (type the answer, forces recall not
--    recognition), and EMQ (extended matching). Defaults to 'sba' so all
--    501 existing atoms keep their current behaviour.
--
-- 2. topic_primers table   — short AI-generated read-before-drilling
--    primer per top-level topic (cardiology, endocrine, ...). 200-300 word
--    overview grounded in NICE/NHS guidance. Pedagogy upgrade — the user
--    can read about a topic before answering questions on it.
--
-- Both additive — zero migration risk.

alter table public.atoms
  add column if not exists question_kind text not null default 'sba'
    check (question_kind in ('sba', 'cloze', 'emq'));

create index if not exists atoms_question_kind_idx
  on public.atoms(question_kind);

create table if not exists public.topic_primers (
  id            uuid primary key default gen_random_uuid(),
  /** Top-level topic key, lowercased — matches atoms.topic_path[0] casing-insensitively. */
  topic_key     text not null unique,
  /** Display name (e.g. 'Cardiology', 'Endocrinology'). */
  topic_name    text not null,
  /** 200-300 word AI-paraphrased primer grounded in NICE/NHS. */
  body          text not null,
  /** Short attribution string (e.g. 'NICE / NHS / BNF'). */
  source        text not null,
  generated_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists topic_primers_topic_key_idx
  on public.topic_primers(topic_key);

-- Public readable; only service role writes. Same posture as approved atoms.
alter table public.topic_primers enable row level security;
create policy "topic_primers_read_all"
  on public.topic_primers for select
  using (true);
