-- Plan 13O — eliminate two latent bugs in buildStudyQueue:
--
--   #2: client-side excludeAtomIds capped at 200 (URL length). A power-user
--       with >200 seen atoms could get repeats served as "pristine", which
--       upsertState then OVERWRITES — destroying their FSRS progress on
--       that atom.
--
--   #3: listSeenAtomIds did an unbounded SELECT every session start.
--       Worked at current scale (avg 12 atoms/user) but a foot-gun.
--
-- Fix: a single Postgres RPC that does the anti-join server-side, using
-- auth.uid() for security (callers can't peek at other users' queues).
-- Returns either "newer kind" content (calc / EMQ / case-bound) when
-- p_variety_only is true, or any kind otherwise. RLS still enforced via
-- security invoker.

create or replace function public.next_unseen_atoms_for_user(
  p_exam              text,
  p_include_unreviewed boolean,
  p_variety_only      boolean,
  p_limit             int
)
returns setof public.atoms
language sql
stable
security invoker
set search_path = public
as $$
  select a.*
  from public.atoms a
  where a.exam = p_exam
    and (
      a.status = 'approved'
      or (a.status = 'pending_review' and a.source_type = 'doctor_seed')
      or (p_include_unreviewed and a.status = 'pending_review' and a.source_type = 'ai-draft')
    )
    and (
      not p_variety_only
      or a.question_kind in ('calc', 'emq')
      or a.case_id is not null
    )
    and not exists (
      select 1
      from public.user_atom_state s
      where s.user_id = auth.uid()
        and s.atom_id = a.id
    )
  order by a.high_yield desc nulls last, a.created_at desc
  limit p_limit;
$$;

-- Allow authenticated users to invoke (RLS on atoms still applies inside).
grant execute on function public.next_unseen_atoms_for_user(text, boolean, boolean, int) to authenticated;
grant execute on function public.next_unseen_atoms_for_user(text, boolean, boolean, int) to anon;

comment on function public.next_unseen_atoms_for_user is
  'Returns up to p_limit atoms the user (auth.uid()) has not seen yet. '
  'When p_variety_only is true, restricts to question_kind in (calc, emq) OR case_id NOT NULL. '
  'Used by buildStudyQueue to inject variety atoms and to top up with fresh content '
  'without round-tripping the seen-atom list (which previously capped at 200 ids).';
