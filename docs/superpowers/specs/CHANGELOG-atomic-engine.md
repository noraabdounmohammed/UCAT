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

---

## 2026-04-25 — Plan 3 + Plan 4 migrations & dogfood seed applied to production

**Project:** `uivitzexbtsmnspcitgh` (production, Marberg Services org)
**Applied via:** Supabase MCP (`apply_migration` for DDL, `execute_sql` for seed)
**Branch this changelog ships from:** `docs/atomic-engine-prod-apply-2026-04-25` (off `ukmla-akt-version`)

### What was applied (in order)

| # | Source | Migration name (registered) | Applied at (UTC) | Result |
|---|---|---|---|---|
| 1 | `supabase/migrations/20260425133000_review_event_log.sql` | `review_event_log` (`20260425195634`) | 2026-04-25T19:56:34Z | OK |
| 2 | `supabase/migrations/20260425150000_atoms_write_policies.sql` (tightened variant — see below) | `atoms_write_policies_tightened` (`20260425200503`) | 2026-04-25T20:05:03Z | OK |
| 3 | `scripts/seed-dogfood-atoms.sql` (DML, not migration-tracked) | n/a — `execute_sql` | 2026-04-25T~20:07Z | OK, idempotent |

### Migration 1 — `review_event_log` (Plan 3)

Created `public.review_decisions` (audit log of approve/edit/reject decisions, distinct from `review_events` which logs student answers):
- 7 columns including `decision text check (decision in ('approve','edit','reject'))`, `reason`, `prev_status`
- 2 indexes: `review_decisions_atom_idx (atom_id, created_at desc)`, `review_decisions_reviewer_idx (reviewer_id, created_at desc)`
- RLS enabled, 2 owner-scoped policies (`review_decisions_owner_select`, `review_decisions_owner_insert`)

### Migration 2 — `atoms_write_policies_tightened` (Plan 4 prerequisite)

**Why the registered name diverges from the file name:** The original `20260425150000_atoms_write_policies.sql` contained a permissive UPDATE policy (`atoms_update_authed` — any authed user could update any atom). The privacy auditor correctly flagged this as too permissive given the production data's user-facing exposure. Applied a tightened variant inline, registered under a distinct migration name to make the divergence explicit. PR #5 (`fix/tighten-atoms-update-policy`) updates the file content to match what's in production.

Tightening vs the original draft:
- UPDATE only on rows whose **current** status is `'draft'` or `'pending_review'` → approved/rejected atoms are locked from further edits.
- UPDATE's `WITH CHECK` requires `reviewed_by ∈ {NULL, auth.uid()}` → can't impersonate another reviewer's sign-off.

Policies created (4 total, with renamed UPDATE):
- `atoms_insert_authed_draft` (INSERT, `status='pending_review' and reviewed_by is null`)
- `atoms_update_in_review` (UPDATE, `status in ('draft','pending_review')` + reviewer-claim check)
- `atom_variants_insert_authed_draft` (INSERT, `status='pending_review'`)
- `atom_variants_update_in_review` (UPDATE, `status in ('draft','pending_review')`)

App-level `isCreator` gating remains the practical access control. Database-level `is_creator()` tightening is queued for Plan 4B.

### Seed — `scripts/seed-dogfood-atoms.sql`

Idempotent insert of 5 free-tier UKMLA atoms with NICE citations: stable angina (CG126), hypertension (NG136), asthma exacerbation (NG80), atrial fibrillation (NG196), type 2 diabetes (NG28). Gated on `where not exists (select 1 from public.atoms a where a.claim = v.claim)` so re-runs are safe.

### Post-apply verification

| Check | Expected | Actual |
|---|---|---|
| `select count(*) from public.atoms where free_tier=true and status='approved'` | ≥ 5 | **5** ✓ |
| Policies on `public.atoms` | `atoms_insert_authed_draft, atoms_read_approved, atoms_update_in_review` (3) | **3 matching** ✓ |
| Policies on `public.atom_variants` | `atom_variants_insert_authed_draft, atom_variants_read_approved, atom_variants_update_in_review` (3) | **3 matching** ✓ |
| `public.review_decisions` exists | yes | yes (1 row in `information_schema.tables`) ✓ |
| `review_decisions` policy + index count | 2 policies, 3 indexes (incl. PK) | 2 / 3 ✓ |
| `list_migrations` registered | 3 entries | `atomic_engine_schema (20260425172540)`, `review_event_log (20260425195634)`, `atoms_write_policies_tightened (20260425200503)` ✓ |

### Backup posture

Supabase MCP doesn't expose a backups tool. Apply was purely additive — one new table + 6 new policies + one DML insert into a previously-empty table. Rollback path:
```sql
-- review_decisions: drop the table (cascades the 2 indexes + 2 policies)
drop table public.review_decisions;
-- atoms_write_policies_tightened: drop the 4 policies (they reference no objects)
drop policy "atoms_insert_authed_draft" on public.atoms;
drop policy "atoms_update_in_review" on public.atoms;
drop policy "atom_variants_insert_authed_draft" on public.atom_variants;
drop policy "atom_variants_update_in_review" on public.atom_variants;
-- seed: delete by claim equality (or status='approved' + free_tier=true if no other writes have happened yet)
delete from public.atoms where free_tier = true and status = 'approved';
```
No risk to pre-existing data (`profiles`, `curriculum_concepts`, `user_concepts`, etc.).

### Auditor pushback narrative

For the historical record (these blocks did their job):
1. **First seed attempt** — auditor blocked, citing "agent-authored INSERTs to prod". The content was verbatim from the seed file but the auditor couldn't trust the Read tool output. Resolved by re-issuing after explicit user re-authorization with the file content checksummed against disk.
2. **Atoms write policies (loose variant)** — auditor blocked, citing the permissive UPDATE-any-row pattern. Resolved by user pasting a tightened variant inline (status-gated UPDATE + reviewer-claim discipline), applied under the distinct name `atoms_write_policies_tightened`.

---

## 2026-04-26 — Plan 5 ships: mistake deck (`/mistakes`)

- New `/mistakes` route — drills atoms the user got wrong in the last 30 days (`user_atom_state.lapses >= 1` AND `last_review_at >= now - 30d`).
- `userStateRepository.listMistakeAtomsForUser(userId, since, limit)` — owner-scoped query against `user_atom_state`.
- `useFsrsSession` now accepts an optional `loadQueue` strategy (backwards-compat: default unchanged = `listDueForUser`). MistakesPage passes a custom strategy.
- `<MistakesPage>` reuses Plan 2's `<FsrsSessionView>` — same retrieval-loop UX, different queue.
- Tests added: 4 new (2 repo, 1 hook, 1 integration). **67 passing total.**
- No new infra; no migrations; no API keys; no external deps.

Tightening to "exclude already-corrected mistakes" deferred to Plan 5B.

---

## 2026-04-26 — Plan 6 ships: predicted exam-day score

- New `<PredictedScoreBadge />` shown above the session in `/study` and `/mistakes`.
- `usePredictedScore({ userId, exam })` hook loads `user_atom_state` rows + total approved atom count, computes mean retention via ts-fsrs's `forgetting_curve`.
- Pure functions in `src/fsrs/retention.ts`: `computeRetention(state, now)`, `computePredictedScore(states, now)`.
- Repository extensions: `atomRepo.countApprovedByExam(exam)`, `userStateRepo.listAllForUser(userId)`.
- v1 metric is "directionally honest" — mean retention across covered atoms. Cohort calibration vs real UKMLA scores deferred to Plan 10.
- Tests added: 11 new (4 retention math, 3 hook, 4 badge). **78 passing total.**
