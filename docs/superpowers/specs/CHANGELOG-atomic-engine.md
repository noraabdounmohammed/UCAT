# Atomic Engine — schema changelog

## 2026-04-25 — initial migration applied

**Migration:** `supabase/migrations/20260425120000_atomic_engine_schema.sql`
**Registered as:** version `20260425172540`, name `atomic_engine_schema` (visible via `supabase.list_migrations`; this is the first entry — pre-existing tables were applied without migration tracking)
**Project:** `uivitzexbtsmnspcitgh` (production, Marberg Services org)
**Applied via:** Supabase MCP (`apply_migration`) at 2026-04-25T17:26:28Z
**Branch:** `feat/atomic-engine-foundation` (Plan 1 / Task C2)

### Tables created
- `atoms`
- `atom_variants`
- `user_atom_state`
- `review_events`

### Indexes created (8 user-defined, 4 PKs)
- `atoms_exam_status_idx` — B-tree on `(exam, status)`
- `atoms_free_tier_idx` — partial B-tree on `(free_tier) where free_tier = true`
- `atoms_status_idx` — B-tree on `(status)`
- `atom_variants_parent_idx` — B-tree on `(parent_atom_id)`
- `atom_variants_status_idx` — B-tree on `(status)`
- `user_atom_state_due_idx` — B-tree on `(user_id, due_at)` *(see deviation below)*
- `review_events_user_atom_idx` — B-tree on `(user_id, atom_id, created_at desc)`
- `review_events_user_created_idx` — B-tree on `(user_id, created_at desc)`

Plus PKs on each table.

### RLS
- Enabled on all 4 tables (`rowsecurity = true`)
- 5 policies created:
  - `atoms_read_approved` — read when `status = 'approved'` or current user is the reviewer
  - `atom_variants_read_approved` — read when approved, current user is reviewer, or current user owns the parent atom
  - `user_atom_state_owner` — `for all` where `user_id = auth.uid()`
  - `review_events_owner_insert` — insert with check `user_id = auth.uid()`
  - `review_events_owner_select` — select where `user_id = auth.uid()`

### Trigger + function
- `public.touch_updated_at()` (`plpgsql`)
- `atoms_updated_at_touch` — `before update on public.atoms for each row`

### Backup
Not directly verifiable via Supabase MCP (no backups tool exposed). Migration is purely additive — no DDL on existing tables, no data writes. Rollback path is `drop table` of the 4 new tables; no risk to pre-existing data (`profiles`, `curriculum_concepts` 6,681 rows, `user_concepts` 13,155 rows, etc.).

### Deviation from spec — `user_atom_state_due_idx`
The original migration declared the index as a partial B-tree predicated on `where due_at <= now()`. Postgres rejected this with `42P17: functions in index predicate must be marked IMMUTABLE` because `now()` is `STABLE`, not `IMMUTABLE` — the predicate is non-deterministic at write time, so an index entry could change category on every clock tick.

**First apply attempt failed atomically.** Confirmed zero partial state via `information_schema.tables` and `list_migrations` (both empty for the new objects).

**Fix (authorized by user before re-apply):** dropped the `where due_at <= now()` clause. The full B-tree on `(user_id, due_at)` serves the "overdue items for this user" query via a range scan with equivalent performance — the planner walks from `(user_id, -infinity)` up to `(user_id, now())` and stops. Storage cost is negligible (one row per user × atom). Spec §3.2 should be updated to note this DB-engine constraint.

### Security advisors (post-apply)
Run via `mcp__supabase__get_advisors(type='security')`. **One new finding from this migration:**

- `function_search_path_mutable` (WARN) — `public.touch_updated_at` does not pin its `search_path`. Mitigation: `alter function public.touch_updated_at() set search_path = public, pg_temp;` Recommended as a follow-up commit (the existing `public.update_updated_at_column` function in the project has the same warning, so this is consistent with current project posture, not a regression).

Pre-existing findings (not introduced or modified by this migration): permissive RLS policies on `curriculum_concepts` and `published_curriculums`, missing policies on `publish_admins`, leaked-password-protection disabled at the auth level. None of these are scoped to Plan 1.

---

## 2026-04-25 — Plan 1 verification (Task E1)

| Check | Result |
|---|---|
| `npm test` | **10 / 10 pass** (smoke 2 + atom-repo 2 + fsrs-scheduler 4 + fsrs-integration 2) |
| `npm run build` | **3.20 s**, 29 PWA precache entries, 1460 KiB |
| `npx tsc --noEmit` | clean (no output) |
| `du -sh dist/` | 10 MB (held steady vs pre-Plan-1 baseline) |
| Commit count on branch | 24 commits since `ukmla-akt-version` |
| Net line delta | +4,754 / −31,169 (net **−26,415**) |

The branch is ready for code review and PR. No remote push performed.

---

## 2026-04-26 — Plan 2 ships: 3-min retrieval session (`/study`)

- New `/study` route (lazy) hosting `<FsrsSessionView>` powered by `useFsrsSession`
- `<AtomRenderer>` renders one atom: stem (+ image) → confidence buttons → reveal + citation → FSRS rating buttons
- `<SessionSummary>` end-of-session card (`right/total · streak day N`)
- `userStateRepository` writes `user_atom_state` (FSRS state) and `review_events` (audit trail)
- Pure session logic in `src/fsrs/session.ts` (`pickNextAtomId`, `isSessionDone`)
- Hook hardens against pristine `user_atom_state` rows by re-initialising via the FSRS scheduler before first review
- Tests added: 12 new (3 user-state repo, 4 session, 4 hook, 3 confidence/AtomRenderer, 3 summary, 5 view, 1 integration). **33 passing total.**
- 5 free-tier UKMLA atoms in `scripts/seed-dogfood-atoms.sql` — apply pending in a Supabase-MCP session.

---

## 2026-04-26 — Plan 3 ships: review queue (`/review`)

- New `/review` route gated on `useUserRole().isCreator`. Non-creators see "Not authorised".
- `<ReviewQueueView>` powered by `useReviewQueue` (load pending → approve / reject-with-reason / edit-and-approve → advance).
- `<ReviewCard>` shows claim, stem, answer, distractors, citation chip + 3 action buttons + inline edit form.
- `<RejectReasonModal>` mobile-first bottom-sheet with 4 preset reasons + free text.
- `reviewRepository`: `listPendingReview`, `approveAtom`, `rejectAtom`, `updateAtom`.
- New schema migration `supabase/migrations/20260425133000_review_event_log.sql` adds `review_decisions` audit table with owner-scoped RLS. **Apply pending.**
- Tests added: 18 new (4 repo, 5 hook, 4 ReviewCard, 4 ReviewQueueView, 1 integration). **51 passing total.**

---

## 2026-04-26 — Plan 4 ships: atom seeding form (`/seed`)

- New `/seed` route gated on `useUserRole().isCreator`. Non-creators see "Not authorised".
- `<AtomSeedForm>` 13-field mobile-first form: claim, stem, answer, 3 distractors, citation URL/label, topic path, difficulty, source type, exam, high-yield checkbox.
- `useSeedAtom` hook: idle / submitting / success / error states.
- `seedRepository.createDraftAtom` inserts as `status='pending_review'` so the new atom flows directly into Plan 3's review queue.
- Cross-cutting RLS fix: new migration `20260425150000_atoms_write_policies.sql` adds INSERT + UPDATE policies on `atoms` and `atom_variants` (Plan 1's schema only had SELECT, so writes were silently blocked). **Apply pending — unblocks both Plan 3 review queue updates and Plan 4 seed inserts in production.**
- Tests added: 11 new (2 repo, 4 hook, 5 form, 1 integration). **63 passing total.**
- Voice + AI variant generation deferred (Plan 8 / Plan 4B).
