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
