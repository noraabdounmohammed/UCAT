-- Early-access product feedback. Learners (including guests) can submit,
-- but only the project owner/service role can read the private inbox.
create table public.pilot_feedback (
  id uuid primary key,
  created_at timestamptz not null default now(),
  reaction text check (reaction in ('useful', 'mixed', 'not_useful')),
  topics text[] not null default '{}' check (
    cardinality(topics) <= 6
    and array_position(topics, null) is null
    and topics <@ array['unclear','bug','content','progress','tutor','idea']::text[]
  ),
  message text not null default '' check (char_length(message) <= 2000),
  used_voice boolean not null default false,
  source text not null check (source in ('home','practice','session_complete')),
  question_id text check (char_length(question_id) <= 200),
  answered_count smallint check (answered_count between 0 and 1000),
  case_count smallint check (case_count between 1 and 1000),
  check (reaction is not null or cardinality(topics) > 0 or char_length(btrim(message)) > 0),
  check (answered_count is null or case_count is null or answered_count <= case_count)
);

alter table public.pilot_feedback enable row level security;
revoke all on public.pilot_feedback from public, anon, authenticated;
grant insert (id, reaction, topics, message, used_voice, source, question_id, answered_count, case_count)
  on public.pilot_feedback to anon, authenticated;
grant all on public.pilot_feedback to service_role;

create policy "Learners can submit private pilot feedback"
  on public.pilot_feedback for insert to anon, authenticated
  with check (true);

create index pilot_feedback_created_at_idx on public.pilot_feedback (created_at desc);
comment on table public.pilot_feedback is 'Private early-access feedback inbox. No learner read/update/delete access; no account, email, audio or tutor conversation is collected.';
