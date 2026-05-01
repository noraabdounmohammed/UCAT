-- Plan 13O follow-up — drop anon grant on next_unseen_atoms_for_user.
--
-- The previous migration granted EXECUTE to both authenticated AND anon.
-- For an anon caller, auth.uid() is NULL — so the NOT EXISTS antijoin
-- treats every row as unseen and returns the entire visible bank.
--
-- The frontend already gates /study behind <AuthGate>, so this isn't
-- being exploited in practice — but a logged-out caller could still
-- enumerate the entire question bank via direct PostgREST calls. Drop
-- the anon grant so only signed-in users can query.

revoke execute on function public.next_unseen_atoms_for_user(text, boolean, boolean, int) from anon;

-- Defensive: explicitly check inside the function body that auth.uid() is
-- non-null. If a future grant accidentally reopens this, the function still
-- returns 0 rows for anon callers.
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
  where auth.uid() is not null
    and a.exam = p_exam
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

grant execute on function public.next_unseen_atoms_for_user(text, boolean, boolean, int) to authenticated;
