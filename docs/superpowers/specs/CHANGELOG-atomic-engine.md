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

---

## 2026-04-26 — Plan 7 ships: streaks

- Real streak day count replaces the `streakDays={1}` placeholder in `/study` and `/mistakes` headers.
- Pure function `computeStreak(dates, now)` in `src/streak/compute.ts` — consecutive UTC-days ending today or yesterday. Multiple reviews per day → 1 day. Any gap > 1 → break.
- `useStreak({ userId, repo })` hook loads `review_events` dates from the past 90 days and computes.
- `userStateRepository.listReviewEventDates(userId, since)` queries `review_events` (owner-scoped RLS).
- Tests added: 12 new (7 streak math, 3 hook, 2 integration). **92 passing total.**
- Grace days (Duolingo pattern) deferred to Plan 7B.

---

## 2026-04-26 — Plan 8 ships: voice mode (`/voice`)

- New `/voice` route — hands-free retrieval. TTS reads each atom's stem; STT listens for the spoken answer; we match loosely against `atom.answer` + distractors and auto-rate (answer→Good 3, distractor→Forgot 1, no-match→Hard 2).
- Web Speech API only (free, browser-native). Graceful "Voice mode unavailable" page on browsers that don't support it (older Safari, etc.).
- `src/voice/match.ts:matchSpokenAnswer(transcript, atom)` — case- and punctuation-insensitive bidirectional substring matching against answer + distractors.
- `src/voice/speech.ts` — `speak`, `listen`, `isVoiceAvailable` thin wrappers around `speechSynthesis` + `SpeechRecognition`.
- `<VoiceAtomView>` — orchestrates the speak→listen→match flow per atom; emits `MatchOutcome` to the parent.
- `<VoicePage>` reuses `useFsrsSession` — same queue and rating pipeline as `/study`. `key={atom.id}` remount pattern (Plan 2 fix) keeps phase state fresh between atoms.
- Tests added: 17 new (6 match, 8 speech wrappers, 3 voice-session integration). **109 passing total.**
- Voice INPUT for atom seeding (Whisper) deferred to Plan 8B. Levenshtein/embedding-based fuzzy matching deferred to Plan 8B.

---

## 2026-04-26 — Plan 9 ships: Pro paywall

- `<PaywallGate />` wraps `/study`, `/mistakes`, `/voice` content.
- Free users get 20 questions/day (`FREE_DAILY_QUESTION_LIMIT` from existing `useSubscription`); after that, `<PaywallGate kind="daily-limit">` shows the upgrade pitch.
- Pro users (`profiles.is_premium = true`) bypass the limit.
- `startStripeCheckout(userId, email)` calls the pre-existing `/.netlify/functions/stripe-checkout` (kept from the old MVP) and redirects to Stripe.
- `<FsrsSessionView>` now accepts an optional `onRatedSideEffect` prop; pages pass `subscription.incrementDailyCount`.
- Reused infra: `useSubscription` hook (old MVP), `profiles.is_premium` column (old MVP migration), Stripe Netlify functions (old MVP), Stripe webhook (flips `is_premium` on subscription events).
- Tests added: 6 new (4 PaywallGate + 2 integration). **115 passing total.**

Free atom-set gating (free_tier=true atoms only for unauthed/free) deferred — current Plan 9 only enforces the daily count limit.

---

## 2026-04-26 — Plan 10 ships: mock exam (`/mock`)

- New `/mock` route — 20-atom timed mock (30 min default).
- Pure state machine `src/mock/state.ts` — initial / submit / tick / finish / score.
- `useMockSession` hook with injectable timer for tests.
- `<MockQuestion>` randomly shuffles 4 options per atom; click submits.
- `<MockTimer>` — count-down display, red ≤60s.
- `<MockResult>` — final correct/total/percentage card.
- No FSRS state mutation during mocks (it's a test, not learning).
- Mock-attempt persistence + per-topic breakdown deferred to Plan 10B.
- Tests added: 6 state + 4 hook + 3 component + 1 integration = **14 new**, **129 total**.

---

## 2026-04-25 — Plan 11 ships: production-readiness instrumentation (Sentry + PostHog + NPS)

- `src/instrumentation/sentry.ts` + `posthog.ts` + `events.ts` — three-piece scaffold.
  All three are **opt-in via env vars** (`VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`,
  optional `VITE_POSTHOG_HOST`). When unset, the integrations no-op silently —
  dev/test environments don't pollute counters and tests don't need keys.
- Stable `TrackedEvent` union (9 names) keeps mistyped events failing at compile time.
- `track()` is fire-and-forget — never blocks render paths, swallows transport errors.
- `track(...)` instrumented at: `session_started`, `atom_rated`, `session_completed`
  (`useFsrsSession`); `mock_started`, `mock_finished` (`useMockSession`);
  `paywall_shown` (`PaywallGate` mount); `upgrade_clicked` (`startStripeCheckout`);
  `voice_session_started` (`VoicePage`); `nps_submitted` (`useNpsTrigger`).
- New `nps_responses` table (migration `20260425220000`, **not yet applied** — file
  commit only; will be applied via Supabase-MCP in a separate handoff). RLS
  permits owner-insert only; reads are admin-via-service-role.
- `<NpsPrompt />` — 11-button 0-10 score, optional comment, Submit + "Not now".
- `useNpsTrigger` — gates the prompt on a localStorage session counter (>=5)
  and a per-device "shown" flag, persists submissions via `createNpsRepository`.
- StudyPage mounts the prompt conditionally after a user completes 5 study sessions.
- `tests/setup.ts` adds an in-memory localStorage fallback (jsdom v29 ships an
  incomplete implementation in some configurations).
- Runtime deps added: `@sentry/react@^10.50`, `posthog-js@^1.372`.
- Tests added: 2 sentry + 3 events + 2 npsRepository + 5 NpsPrompt + 6 useNpsTrigger
  = **18 new**, **147 total**.

Cohort leaderboards, sourcemap upload pipeline, PostHog feature flags, A/B testing
infra, and mock-session persistence are deferred to Plan 11B.

---

## 2026-04-26 — Plan 12 batches 1-4 ship: critical-review tighten-up

### Batch 1 — UX polish
- Home `/` gets 'Try Study Mode' CTA banner.
- Made-by-a-doctor credit on home + AuthGate.
- Streak switches to local timezone (was UTC).
- Predicted score recomputes after every rating (was stale).

### Batch 2 — Server-side hardening (migrations NOT yet applied)
- `daily_session_counts` table → moves daily quota from localStorage (paywall-bypassable) to Supabase.
- `is_creator(uid)` PL/pgSQL function + tightened atoms write policies → DB-level enforcement, no longer relying on app-level isCreator alone.
- `mock_attempts` table → persists `/mock` results (was throwaway).

### Batch 3 — Testing
- Page-level tests for all 6 new pages (`/study`, `/mistakes`, `/mock`, `/voice`, `/review`, `/seed`).
- AtomicEngineNav test (creator gating + active route).
- GitHub Actions CI workflow (test + tsc + build on every push).

### Batch 4 — Compliance + retention
- `/privacy` page with PostHog/Sentry consent disclosure.
- Cookie consent banner gates instrumentation init (no telemetry until accepted).
- Streak grace: one missed day per rolling 7-day window forgiven (Duolingo pattern).
- Paywall conversion trigger: when predicted score >= 70% with >= 30 atoms covered, gentler 'you're nearly there' upgrade pitch instead of hard cap.

Tests added: ~6 new across batches. **~184 passing total.**

---

## 2026-04-26 — Plan 17 ships: cohort leaderboards

- New `/leaderboard` route showing top 10 studiers in user's chosen med school cohort, last 7 days.
- New `<CohortSelectModal />` for first-time users to set `cohort_school` + `display_name`.
- Schema: `profiles.cohort_school` + `profiles.display_name`, `cohort_weekly_leaderboard` view (security_invoker=false), `my_cohort()` function.
- View aggregates `review_events` per (cohort, user) — keeps personal events private via RLS while allowing aggregate visibility within a cohort.
- Tests: 20 new (5 repo + 4 hook + 4 modal + 3 table + 4 page tests). 204 total.
- Migration NOT yet applied — handoff via Supabase-MCP.

---

## 2026-04-26 — Plan 18 ships: Playwright E2E smoke

- New `npm run test:e2e` runs Playwright against `E2E_BASE_URL` (default https://studyedit.com).
- 3 spec files: home (CTA + nav + cookie consent), 7-route smoke, /privacy.
- Auto-run in CI on `ukmla-akt-version` post-merge.
- Doesn't cover sign-up / paywall / voice — those need real test accounts and Stripe test mode (deferred).
- ~13 E2E tests new, all passing.

---

## 2026-04-26 — Plan 12 + Plan 13 + Plan 17 migrations applied to production

**Project:** `uivitzexbtsmnspcitgh` (production, Marberg Services org)
**Applied via:** Supabase MCP (`apply_migration`)
**Branch this changelog ships from:** `docs/atomic-engine-prod-apply-2026-04-26` (off `ukmla-akt-version`)

### What was applied (in order)

| # | Source | Migration name (registered) | Applied at (UTC) | Result |
|---|---|---|---|---|
| 1 | `supabase/migrations/20260426000000_daily_session_counts.sql` | `daily_session_counts` (`20260426101344`) | 2026-04-26T10:13:44Z | OK |
| 2 | `supabase/migrations/20260426000100_is_creator_function_and_tightened_atoms_policies.sql` (patched — see deviation below) | `is_creator_function_and_tightened_atoms_policies` (`20260426101518`) | 2026-04-26T10:15:18Z | OK on second attempt |
| 3 | `supabase/migrations/20260426000200_mock_attempts.sql` | `mock_attempts` (`20260426101533`) | 2026-04-26T10:15:33Z | OK |
| 4 | `supabase/migrations/20260426010000_atoms_ai_draft_source.sql` | `atoms_ai_draft_source` (`20260426101551`) | 2026-04-26T10:15:51Z | OK |
| 5 | `supabase/migrations/20260426020000_cohort_leaderboard.sql` | `cohort_leaderboard` (`20260426101611`) | 2026-04-26T10:16:11Z | OK |

### Deviation from spec — migration 2 referenced a column that doesn't exist

**First apply attempt failed atomically** with `ERROR: 42703: column "is_creator" does not exist`. The function body queried `select is_creator from public.profiles`, but the actual `profiles` schema (per `information_schema.columns`) has no such column. The legacy MVP migration `20250115_add_user_roles.sql` added a `role text check (role in ('creator','consumer'))` column, **not** an `is_creator boolean` — the migration's own header comment was wrong about what the legacy migration did.

**Fix (applied in-place to the migration file before re-apply, this PR carries the diff):**
- Changed function body from `select is_creator from public.profiles where id = uid` to `select role = 'creator' from public.profiles where id = uid`.
- Updated header comment to reference `profiles.role` text column accurately.

Behaviour is equivalent: `coalesce(<bool> = 'creator', false)` returns `true` only when the user has `role = 'creator'`, which is the existing source of creator-truth (1 row currently — `noraabdounmohammed@gmail.com`, confirmed via `select distinct role from public.profiles`).

### Post-apply verification

| Check | Expected | Actual |
|---|---|---|
| `select count(*) from public.daily_session_counts` | 0 | **0** ✓ |
| `select count(*) from pg_proc where proname='is_creator'` | 1 | **1** ✓ |
| `select count(*) from public.mock_attempts` | 0 | **0** ✓ |
| `select count(*) from public.atoms where source_type='ai-draft'` | 0 | **0** ✓ |
| `select policyname from pg_policies where tablename='atoms'` | 5 rows | **3 rows** — see note ⚠ |
| `select * from public.cohort_weekly_leaderboard limit 1` | view exists | view exists, 0 rows (no `cohort_school` populated yet) ✓ |

**Note on the 3-vs-5 atoms policies discrepancy:** the handoff brief expected 5 policies on `atoms` after migration 2; actual is 3. Migration 2 `drop policy if exists` removes the two old write policies (`atoms_insert_authed_draft`, `atoms_update_in_review` from `atoms_write_policies_tightened`) and creates two replacements (`atoms_insert_creator_draft`, `atoms_update_creator_in_review`) — net zero change in count. The pre-existing `atoms_read_approved` SELECT policy survives untouched. Final `pg_policies` rows for `atoms`:
- `atoms_insert_creator_draft` (INSERT) — new, creator-gated
- `atoms_read_approved` (SELECT) — pre-existing
- `atoms_update_creator_in_review` (UPDATE) — new, creator-gated

`atom_variants` mirrors this with 3 policies (`atom_variants_insert_creator_draft`, `atom_variants_read_approved`, `atom_variants_update_creator_in_review`). 3 + 3 = 6 across the two tables, which matches the migration's intent (replace 2 + 2, leave 2 reads). The "5 rows" line in the brief looks like an off-by-N typo; the policy set on disk is correct.

### Security advisors (post-apply)

Run via `mcp__supabase__get_advisors(type='security')`. **One new finding from these migrations:**

- **`security_definer_view` (ERROR)** — `public.cohort_weekly_leaderboard` is defined `with (security_invoker = false)`. This is **intentional** per migration 5's spec: "SECURITY DEFINER lets non-owner users read aggregates. Personal `review_events` stays private." Without it, the view would inherit the caller's RLS and only expose the caller's own row. The DEFINER posture is gated by `revoke all from public; grant select to authenticated`, so only authed users can read, and the view exposes only `(cohort_school, user_id, display_name, reviews_this_week)` — no PII beyond what users opt-in to populate via `cohort_school` + `display_name`. Remediation link: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view. **Decision: accept the warning as a known trade-off; document but do not change.**

Pre-existing findings (not introduced by these migrations): permissive RLS on `curriculum_concepts` + `published_curriculums`, `rls_enabled_no_policy` on `publish_admins`, `function_search_path_mutable` on `update_updated_at_column` + `touch_updated_at`, `auth_leaked_password_protection` disabled.

### Performance advisors (post-apply)

Run via `mcp__supabase__get_advisors(type='performance')`. **Two classes of new findings from these migrations:**

1. **`auth_rls_initplan` (WARN) — 9 new flags.** The new RLS policies call `auth.uid()` per row; Supabase recommends `(select auth.uid())` so Postgres evaluates it once via initplan. Affected policies:
   - `daily_session_counts_owner_select` / `_owner_insert` / `_owner_update` (3)
   - `atoms_insert_creator_draft`, `atoms_update_creator_in_review` (2)
   - `atom_variants_insert_creator_draft`, `atom_variants_update_creator_in_review` (2)
   - `mock_attempts_owner_select`, `mock_attempts_owner_insert` (2)
   At current row counts (all 4 tables empty or near-empty) the impact is negligible; deferring the rewrite. Link: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan. **Follow-up: tracker for "wrap auth.uid() in subselect across all RLS policies on Plan-12+ tables".**

2. **`unused_index` (INFO) — 4 new flags.** Expected for indexes created seconds before the advisor run: `daily_session_counts_user_day_idx`, `mock_attempts_user_finished_idx`, `atoms_source_concept_id_idx`, `profiles_cohort_school_idx`. Will resolve naturally once the queries that use them start running.

Pre-existing findings: 24 prior `auth_rls_initplan` flags on older tables, 17 `multiple_permissive_policies`, 6 `unindexed_foreign_keys` (incl. `atom_variants_reviewed_by_fkey`, `atoms_reviewed_by_fkey` — pre-Plan-12), 16 prior `unused_index` flags.

### Backup posture

Supabase MCP doesn't expose a backups tool. Apply was almost entirely additive: 3 new tables (`daily_session_counts`, `mock_attempts`), 2 new columns on existing tables (`atoms.source_concept_id`, `profiles.cohort_school`, `profiles.display_name`), 1 new view, 2 new functions, 4 new policies replacing 4 old ones. Rollback path:

```sql
-- migration 5 (cohort_leaderboard)
drop view public.cohort_weekly_leaderboard;
drop function public.my_cohort();
drop index public.profiles_cohort_school_idx;
alter table public.profiles drop column cohort_school, drop column display_name;
-- migration 4 (atoms_ai_draft_source) — restore old source_type CHECK without 'ai-draft'
drop index public.atoms_source_concept_id_idx;
alter table public.atoms drop column source_concept_id;
alter table public.atoms drop constraint atoms_source_type_check;
alter table public.atoms add constraint atoms_source_type_check
  check (source_type in ('NICE','NHS','BNF','GMC','past_paper','doctor_seed','student_bounty'));
alter table public.atom_variants drop constraint atom_variants_generated_by_check;
alter table public.atom_variants add constraint atom_variants_generated_by_check
  check (generated_by in ('ai-deepseek-v3','ai-openai-gpt4o-mini','human','past_paper'));
-- migration 3 (mock_attempts)
drop table public.mock_attempts;
-- migration 2 (is_creator + tightened atoms policies) — restore the old loose policies
drop policy "atoms_insert_creator_draft" on public.atoms;
drop policy "atoms_update_creator_in_review" on public.atoms;
drop policy "atom_variants_insert_creator_draft" on public.atom_variants;
drop policy "atom_variants_update_creator_in_review" on public.atom_variants;
drop function public.is_creator(uuid);
-- (would need to re-create the old atoms_insert_authed_draft / atoms_update_in_review etc.)
-- migration 1 (daily_session_counts)
drop table public.daily_session_counts;
```

No risk to pre-existing rows — all DDL is additive or replaces an empty constraint with a wider one. `profiles` rows continue to satisfy the new (`cohort_school`, `display_name`) nullable columns; existing `atoms` rows continue to satisfy the widened `source_type` CHECK; existing `atom_variants` rows continue to satisfy the widened `generated_by` CHECK.

### `list_migrations` registered after apply

```
20260425172540  atomic_engine_schema
20260425195634  review_event_log
20260425200503  atoms_write_policies_tightened
20260425214456  nps_responses
20260426101344  daily_session_counts                           ← new
20260426101518  is_creator_function_and_tightened_atoms_policies ← new
20260426101533  mock_attempts                                  ← new
20260426101551  atoms_ai_draft_source                          ← new
20260426101611  cohort_leaderboard                             ← new
```
