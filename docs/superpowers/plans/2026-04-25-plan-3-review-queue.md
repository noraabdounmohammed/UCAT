# Plan 3 — Nora's Mobile Review Queue

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first inbox at `/review` where Nora (the founder-doctor) can approve / edit / reject atoms in 30-second async chunks during nap times. This is the bottleneck-aware UX that makes the content pipeline feasible — see spec §3.4 and §5.3.

**Architecture:** Same four-layer split as Plan 2:
1. **Repository methods** — extend `atom/repository.ts` with `listPendingReview`, `approveAtom`, `rejectAtom`, `updateAtom` (using the existing schema's `reviewed_by`, `reviewed_at`, `status`)
2. **`useReviewQueue` hook** — orchestrates: load pending atoms → present one card → dispatch action → advance / out-of-queue
3. **Presentational components** — `ReviewCard`, `RejectReasonModal`, `ReviewQueueView`
4. **Page + route** — `ReviewPage` at `/review`, gated on `useUserRole().isCreator` (or new `isReviewer` if needed)

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, Vitest + RTL. Plan 1's atom schema + Plan 2's repository pattern.

**Spec:** `docs/superpowers/specs/2026-04-25-atomic-engine-design.md` §3.4, §5.3.

**Depends on:** Plan 1 (schema + RLS), Plan 2 (repo factory pattern, study UX layer for shared components).

---

## File structure

### Created
- `tests/atom/reviewRepository.test.ts`
- `tests/hooks/useReviewQueue.test.tsx`
- `tests/components/ReviewCard.test.tsx`
- `tests/components/ReviewQueueView.test.tsx`
- `tests/integration/review-queue.test.tsx`
- `src/atom/reviewRepository.ts` — methods: `listPendingReview(exam, limit)`, `approveAtom(atomId, reviewerId)`, `rejectAtom(atomId, reviewerId, reason)`, `updateAtom(atomId, patch)`
- `src/hooks/useReviewQueue.ts`
- `src/components/review/ReviewCard.tsx` — single atom card: claim, stem, answer, distractors, citation, three action buttons
- `src/components/review/RejectReasonModal.tsx` — small modal with 4 preset reasons + free text
- `src/components/review/ReviewQueueView.tsx` — shell that hosts the card + handles loading/empty/error/done states
- `src/pages/ReviewPage.tsx` — gated route page

### Modified
- `src/App.tsx` — add lazy `/review` route
- `src/components/layout/MainLayout.tsx` — extend `currentPage` union to include `'review'`
- `supabase/migrations/20260425133000_review_event_log.sql` — new migration adding a `review_decisions` log table for audit trail

### Untouched
- All Plan 1 + Plan 2 modules consumed read-only

---

## Schema addition (Plan 3)

We need an audit trail of reviewer decisions separate from the user-facing `review_events` (which logs atom-encounters during study). Add `review_decisions`:

```sql
create table if not exists public.review_decisions (
  id              uuid primary key default gen_random_uuid(),
  atom_id         uuid not null references public.atoms(id) on delete cascade,
  reviewer_id     uuid not null references auth.users(id),
  decision        text not null check (decision in ('approve','edit','reject')),
  reason          text,
  prev_status     text,
  created_at      timestamptz not null default now()
);

create index review_decisions_atom_idx on public.review_decisions(atom_id, created_at desc);
create index review_decisions_reviewer_idx on public.review_decisions(reviewer_id, created_at desc);

alter table public.review_decisions enable row level security;

-- Reviewers can read their own decisions; only service-role / authed reviewer can insert.
create policy "review_decisions_owner_select"
  on public.review_decisions for select
  using (auth.uid() = reviewer_id);

create policy "review_decisions_owner_insert"
  on public.review_decisions for insert
  with check (auth.uid() = reviewer_id);
```

---

## Task breakdown — 11 tasks, 6 commits

Each TDD pair (RED + GREEN) is one shippable test/implementation unit. Glue tasks (page wiring, integration test) follow.

### Phase A — Migration

**Task 1.** Write `supabase/migrations/20260425133000_review_event_log.sql` with the schema above.
- Commit: `feat(review): schema migration for review_decisions audit log`

### Phase B — Review repository (TDD)

**Task 2 RED.** `tests/atom/reviewRepository.test.ts` — 4 tests:
- `listPendingReview` filters `status='pending_review'`, orders `high_yield desc, created_at asc`, limits
- `approveAtom` updates `status='approved'`, sets `reviewed_by`, `reviewed_at`
- `rejectAtom` updates `status='rejected'`, sets `reviewed_by`, `reviewed_at`, inserts a `review_decisions` row with `reason`
- `updateAtom` patches `claim`, `canonical_stem`, `answer`, `distractors`, `citation_url`, `citation_label`

Commit: `test(atom): failing tests for reviewRepository (RED)`

**Task 3 GREEN.** `src/atom/reviewRepository.ts` — implement against tests.

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Atom, AtomStatus, Exam } from './types';

export interface ReviewRepository {
  listPendingReview(exam: Exam, limit: number): Promise<Atom[]>;
  approveAtom(atomId: string, reviewerId: string): Promise<void>;
  rejectAtom(atomId: string, reviewerId: string, reason: string): Promise<void>;
  updateAtom(atomId: string, patch: Partial<Pick<Atom,
    'claim' | 'canonicalStem' | 'answer' | 'distractors' | 'citationUrl' | 'citationLabel'
  >>): Promise<void>;
}

export function createReviewRepository(supabase: SupabaseClient): ReviewRepository {
  return {
    async listPendingReview(exam, limit) { /* select where status='pending_review', map rowToAtom */ },
    async approveAtom(atomId, reviewerId) {
      // Single transaction: update atoms.status='approved' AND insert review_decisions row.
      // Use supabase.rpc(...) with a stored function, OR two sequential calls (acceptable for v1).
    },
    async rejectAtom(atomId, reviewerId, reason) {
      // Same shape as approve but status='rejected', reason recorded in review_decisions.
    },
    async updateAtom(atomId, patch) {
      // map camelCase patch → snake_case row, update where id = atomId.
    },
  };
}
```

Commit: `feat(atom): review repository (list pending, approve, reject, update) — GREEN`

### Phase C — useReviewQueue hook (TDD)

**Task 4 RED.** `tests/hooks/useReviewQueue.test.tsx` — 4 tests:
- Loads pending atoms on mount, exposes first
- `approve()` advances queue, calls `approveAtom`
- `reject(reason)` advances queue, calls `rejectAtom`
- `updateAndApprove(patch)` calls `updateAtom` then `approveAtom`

Commit: `test(hook): failing tests for useReviewQueue (RED)`

**Task 5 GREEN.** `src/hooks/useReviewQueue.ts` — same factory pattern as `useFsrsSession`.

Commit: `feat(hook): useReviewQueue orchestrates the queue + actions (GREEN)`

### Phase D — Components (TDD)

**Task 6 RED.** `tests/components/ReviewCard.test.tsx` — 3 tests (renders fields, calls handlers, edit toggles inline form).

**Task 7 GREEN.** `src/components/review/ReviewCard.tsx` + `RejectReasonModal.tsx` — focused components.

Commit pair: `test(review): RED` → `feat(review): ReviewCard + RejectReasonModal (GREEN)`

**Task 8 RED.** `tests/components/ReviewQueueView.test.tsx` — 4 tests (loading / empty / in_progress / done).

**Task 9 GREEN.** `src/components/review/ReviewQueueView.tsx`.

Commit pair: `test(review): RED` → `feat(review): ReviewQueueView shell (GREEN)`

### Phase E — Page + route

**Task 10.** `src/pages/ReviewPage.tsx` + add `/review` lazy route in `App.tsx`. Gate on `useUserRole().isCreator` — if false, render "Not authorised" message. (We can extend the role model in a later plan; for now `isCreator` is the closest existing flag and Nora is a creator.)

Commit: `feat(review): /review route gated on creator role`

### Phase F — Integration + verification

**Task 11.** `tests/integration/review-queue.test.tsx` — full flow: 2 pending atoms → approve first → reject second with reason → see "no atoms left to review" empty state. + final verification battery + CHANGELOG entry.

Commit: `test(review): integration test + Plan 3 CHANGELOG`

---

## Self-review checklist

After all 11 tasks:
1. **Spec coverage** — §3.4 list/approve/edit/reject + §5.3 throughput all covered.
2. **Mobile-first**: components use `max-w-md`, large tap targets, no hover-only states.
3. **RLS-correct**: review_decisions writes are owner-scoped (reviewer = auth.uid()).
4. **Auth-gate**: `/review` returns "not authorised" for non-creators.
5. **No placeholders**.
6. **Type-schema consistency**: review_decisions row mapping symmetrical.
7. **TDD discipline**: every component has a failing test before implementation.

## Out of scope (deferred)

- **Voice-input edits** (spec §3.4) — Plan 8's voice mode work covers the Web Speech API plumbing; this plan keeps edits to keyboard-only.
- **Real-time sync** (Supabase Realtime) — defer; pull-on-mount is fine for v1.
- **Reviewer role distinct from creator** — defer; Nora is the only reviewer and `isCreator` works.
- **Batch approve / keyboard shortcuts** — defer.
- **Variant review** (`atom_variants` table) — defer to Plan 4 when AI variant generation lands.
