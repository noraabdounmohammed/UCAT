# Plan 1 — Foundation: Cleanup + Atom Schema + FSRS Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the legacy cruft, install a real test harness, ship the atom-graph schema to Supabase, and integrate the FSRS-5 scheduler — producing a tested, exam-agnostic foundation that all subsequent work depends on. **No user-facing change in this PR** — this is the rails everything else rides on.

**Architecture:** Three independent layers added side-by-side with the existing app: (1) cleanup removes ~40 dead files and the Inworld voice tutor, (2) Vitest test infrastructure, (3) `src/atom/` and `src/fsrs/` modules wrap a Supabase migration and the open-source `ts-fsrs` library behind a typed repository + scheduler interface. The legacy `conceptStore` is left untouched in this plan; it gets replaced organically as Plan 2+ build on the new foundation.

**Tech Stack:** TypeScript, React 18, Vite 5, Supabase (Postgres + RLS + Auth), `ts-fsrs` (FSRS-5 algorithm, MIT, ~6 KB), Vitest 1.x, `@testing-library/react`, `jsdom`.

**Spec:** [docs/superpowers/specs/2026-04-25-atomic-engine-design.md](../specs/2026-04-25-atomic-engine-design.md)

---

## File structure for this plan

### Deleted
- All `*.bak`, `*.fixed*`, `*.new`, `*.old`, `*.loft.tsx` files (~30 files)
- `src/services/inworldRealtimeService.ts`, `inworldService.ts`, `realtimeTutorService.ts`
- `netlify/functions/inworld-session.ts`, `netlify/functions/inworld-tts.ts`
- `src/components/practice/EMQQuestion.tsx`, `TrueFalseQuestion.tsx`, `RankingQuestion.tsx`
- `src/components/practice/ConceptGraphView.tsx`, `ConceptGraphView.new.tsx`
- `src/components/practice/ConceptNodeGraphView.tsx`, `ConceptNodeTreeView.tsx`
- `src/components/practice/ConceptBulkUploadModal*.tsx`, `ConceptBulkUploadPage*.tsx`
- `src/components/track/MasteryDonut.tsx`, `MasteryProgressRing.tsx`, `MasterySummaryBar.tsx`, `BloomsBars.tsx`, `CoverageGrid.tsx`, `CoverageRings.tsx`, `CoverageTiles.tsx`, `ActivityRings.tsx`

### Created
- `vitest.config.ts` — test runner config
- `tests/setup.ts` — testing-library + jsdom setup
- `tests/smoke.test.ts` — proves the harness works
- `supabase/migrations/20260425120000_atomic_engine_schema.sql` — atom + variants + state + events
- `src/atom/types.ts` — TypeScript domain types matching schema
- `src/atom/repository.ts` — Supabase queries, typed
- `tests/atom/repository.test.ts` — mocked Supabase client tests
- `src/fsrs/scheduler.ts` — wrapper around `ts-fsrs`
- `src/fsrs/types.ts` — `FsrsRating`, `FsrsState`, `Card` types
- `tests/fsrs/scheduler.test.ts` — deterministic scheduler tests

### Modified
- `package.json` — remove `@inworld/web-core`; add `ts-fsrs`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- `src/App.tsx` — drop any imports of deleted files (search-and-purge)
- `src/types/conceptTypes.ts` — leave alone for now; Plan 2 will deprecate
- `vite.config.ts` — confirm Vitest can read it; no changes expected

### Untouched (deliberate, replaced in later plans)
- `src/store/conceptStore.ts` — legacy; Plan 3 (review queue) and Plan 4 (seeding) will deprecate
- `src/components/practice/PracticeSection.tsx` — split happens in Plan 2
- All curriculum-publishing service code — gated behind feature flag in Plan 7

---

## Phase A — Cleanup

### Task A1: Delete legacy backup/duplicate files

**Files:**
- Delete (find by glob): `**/*.bak`, `**/*.fixed*`, `**/*.new`, `**/*.old`, `**/*.loft.tsx`, `**/*.txt` under `src/`

- [ ] **Step 1: List all files matching the cruft globs**

```bash
find src -type f \( -name '*.bak' -o -name '*.fixed*' -o -name '*.new' -o -name '*.old' -o -name '*.loft.tsx' -o -name '*.tsx.bak' -o -name '*.tsx.new' -o -name '*.tsx.backup' -o -name '*.txt' \) | sort
```

Expected: a list of ~30 files. Examples to expect: `src/components/practice/PracticeSection.tsx.bak`, `src/store/conceptStore.fixed.ts`, `src/pages/CurriculumHub.loft.tsx`, `src/components/practice/ApplePracticeSession.txt`.

- [ ] **Step 2: Delete them**

```bash
find src -type f \( -name '*.bak' -o -name '*.fixed*' -o -name '*.new' -o -name '*.old' -o -name '*.loft.tsx' -o -name '*.tsx.bak' -o -name '*.tsx.new' -o -name '*.tsx.backup' -o -name '*.txt' \) -print -delete
```

Also delete `public/conceptModel.json.fixed` and `public/conceptModel.json.new`:

```bash
rm -f public/conceptModel.json.fixed public/conceptModel.json.new
```

- [ ] **Step 3: Verify build still passes**

```bash
npm run build
```

Expected: build succeeds, dist/ refreshed, no missing-import errors. If errors appear, the deleted file was actually imported — restore with `git checkout HEAD -- <path>`, investigate the import, and decide whether the importer should also be deleted (likely yes, queue for next task).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete .bak/.fixed/.new/.old/.loft cruft files"
```

---

### Task A2: Remove Inworld voice tutor

The voice-tutor pivot in the spec replaces Inworld with Web Speech API + reviewed atoms. Inworld must go entirely.

**Files:**
- Delete: `src/services/inworldRealtimeService.ts`, `src/services/inworldService.ts`, `src/services/realtimeTutorService.ts`
- Delete: `netlify/functions/inworld-session.ts`, `netlify/functions/inworld-tts.ts`
- Modify: `package.json` — remove `@inworld/web-core`
- Modify: any importer of the deleted services (search to confirm)

- [ ] **Step 1: Find all importers of Inworld code**

```bash
grep -rn 'inworld\|Inworld\|@inworld' src/ netlify/ 2>/dev/null | grep -v 'node_modules' | sort
```

Expected: matches in the three service files, the two Netlify functions, possibly `src/components/practice/AIHelperClean.tsx` or similar UI components, and `package.json`.

- [ ] **Step 2: Delete the service files and Netlify functions**

```bash
rm -f src/services/inworldRealtimeService.ts \
      src/services/inworldService.ts \
      src/services/realtimeTutorService.ts \
      netlify/functions/inworld-session.ts \
      netlify/functions/inworld-tts.ts
```

- [ ] **Step 3: Update importers**

Re-run the grep from Step 1. For each remaining importer:
- If the importer is a UI component whose only purpose is the voice tutor → delete it.
- If the importer uses Inworld as one of multiple features → comment out the Inworld call site and add `// TODO: Plan 8 voice mode` (this TODO is acceptable because it points to a tracked plan).

- [ ] **Step 4: Remove `@inworld/web-core` from package.json**

```bash
npm uninstall @inworld/web-core
```

This auto-edits `package.json` and `package-lock.json`. Verify:

```bash
grep -c inworld package.json package-lock.json
```

Expected: `package.json:0`, `package-lock.json:0`.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: success.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove Inworld voice tutor (replaced by Web Speech API in Plan 8)"
```

---

### Task A3: Remove unused question renderers (EMQ, T-F, Ranking)

**Files:**
- Delete: `src/components/practice/EMQQuestion.tsx`, `TrueFalseQuestion.tsx`, `RankingQuestion.tsx`

- [ ] **Step 1: Find importers**

```bash
grep -rn 'EMQQuestion\|TrueFalseQuestion\|RankingQuestion' src/ 2>/dev/null
```

- [ ] **Step 2: Delete the renderers**

```bash
rm -f src/components/practice/EMQQuestion.tsx \
      src/components/practice/TrueFalseQuestion.tsx \
      src/components/practice/RankingQuestion.tsx
```

- [ ] **Step 3: Update importers**

For each importer found in Step 1: remove the import line and any branching logic that selected these renderers. Most likely importers are `QuestionRenderer.tsx` and `PracticeSection.tsx`.

Example pattern in `QuestionRenderer.tsx`:

```tsx
// before
if (type === 'emq') return <EMQQuestion {...} />
if (type === 'true_false') return <TrueFalseQuestion {...} />
if (type === 'ranking') return <RankingQuestion {...} />

// after — remove these branches; the default renderer handles SBA-only
```

- [ ] **Step 4: Verify build + manual sanity check on remaining renderers**

```bash
npm run build
```

Open `src/components/practice/QuestionRenderer.tsx` and confirm it now branches only on SBA / flashcard / SBA-image variants.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove EMQ, True/False, Ranking renderers (not in UKMLA real exam)"
```

---

### Task A4: Remove vanity-metric components

**Files:**
- Delete: `src/components/track/MasteryDonut.tsx`, `MasteryProgressRing.tsx`, `MasterySummaryBar.tsx`, `BloomsBars.tsx`, `CoverageGrid.tsx`, `CoverageRings.tsx`, `CoverageTiles.tsx`, `ActivityRings.tsx`

- [ ] **Step 1: Find importers**

```bash
grep -rn 'MasteryDonut\|MasteryProgressRing\|MasterySummaryBar\|BloomsBars\|CoverageGrid\|CoverageRings\|CoverageTiles\|ActivityRings' src/ 2>/dev/null
```

Expected importers: `TrackDashboard.tsx`, possibly `Dashboard.tsx`.

- [ ] **Step 2: Delete the components**

```bash
rm -f src/components/track/MasteryDonut.tsx \
      src/components/track/MasteryProgressRing.tsx \
      src/components/track/MasterySummaryBar.tsx \
      src/components/track/BloomsBars.tsx \
      src/components/track/CoverageGrid.tsx \
      src/components/track/CoverageRings.tsx \
      src/components/track/CoverageTiles.tsx \
      src/components/track/ActivityRings.tsx
```

- [ ] **Step 3: Update importers — replace with placeholder**

For each import in `TrackDashboard.tsx` etc., replace the rendered component with a `<div className="text-sm text-stone-500">Predicted exam score (Plan 6)</div>` placeholder. The full TrackDashboard rebuild lives in Plan 6.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove vanity metric components (rings, bars, tiles); placeholder until Plan 6"
```

---

### Task A5: Remove concept graph views and bulk-upload UI

**Files:**
- Delete: `src/components/practice/ConceptGraphView.tsx`, `ConceptGraphView.new.tsx`, `ConceptNodeGraphView.tsx`, `ConceptNodeTreeView.tsx`
- Delete: `src/components/concept/ConceptBulkUploadModal*.tsx`, `ConceptBulkUploadPage*.tsx`

- [ ] **Step 1: Find importers**

```bash
grep -rn 'ConceptGraphView\|ConceptNodeGraphView\|ConceptNodeTreeView\|ConceptBulkUpload' src/ 2>/dev/null
```

- [ ] **Step 2: Delete the components**

```bash
rm -f src/components/practice/ConceptGraphView.tsx \
      src/components/practice/ConceptGraphView.new.tsx \
      src/components/practice/ConceptNodeGraphView.tsx \
      src/components/practice/ConceptNodeTreeView.tsx \
      src/components/concept/ConceptBulkUploadModal*.tsx \
      src/components/concept/ConceptBulkUploadPage*.tsx
```

- [ ] **Step 3: Update importers**

Search-and-remove the import lines and the route/menu entries that exposed these. For graph views: replace with a TODO comment pointing at Plan 2. For bulk upload: simply remove the entry.

- [ ] **Step 4: Verify build + e2e route check**

```bash
npm run build && npm run preview &
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4173/
kill %1
```

Expected: build OK, root returns 200.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove concept graph views and bulk-upload UI (premature creator tools)"
```

---

## Phase B — Test infrastructure

### Task B1: Install Vitest and testing-library

**Files:**
- Modify: `package.json` (deps via `npm install`)
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Install dev dependencies**

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/ui
```

- [ ] **Step 2: Add `vitest.config.ts` at repo root**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/atom/**', 'src/fsrs/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 3: Add `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 4: Add npm scripts**

In `package.json`, add to `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 5: Verify the runner starts**

```bash
npm test
```

Expected: Vitest runs with **0 tests** (no test files yet), exits cleanly with `Test Files  no tests`. If it errors on config, fix the path/alias before continuing.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/
git commit -m "chore: add Vitest + testing-library + jsdom test harness"
```

---

### Task B2: Smoke test proving the harness runs React + assertions

**Files:**
- Create: `tests/smoke.test.tsx`

- [ ] **Step 1: Write the smoke test**

`tests/smoke.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

function Hello({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>;
}

describe('test harness smoke', () => {
  it('arithmetic works', () => {
    expect(2 + 2).toBe(4);
  });

  it('renders a React component and asserts on the DOM', () => {
    render(<Hello name="Atomic Engine" />);
    expect(screen.getByRole('heading')).toHaveTextContent('Hello, Atomic Engine');
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npm test
```

Expected: 2 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/smoke.test.tsx
git commit -m "test: smoke test proving Vitest + RTL + jsdom harness works"
```

---

## Phase C — Atom schema

### Task C1: Write the migration

**Files:**
- Create: `supabase/migrations/20260425120000_atomic_engine_schema.sql`

- [ ] **Step 1: Author the migration**

`supabase/migrations/20260425120000_atomic_engine_schema.sql`:

```sql
-- Atomic Engine schema (Plan 1 / Spec §3.2)
-- Exam-agnostic. UKMLA first, structurally generalisable.

create table if not exists public.atoms (
  id              uuid primary key default gen_random_uuid(),
  exam            text not null,
  topic_path      text[] not null default '{}',
  claim           text not null,
  canonical_stem  text not null,
  answer          text not null,
  distractors     jsonb not null default '[]'::jsonb,
  difficulty      smallint not null default 3 check (difficulty between 1 and 5),
  image_url       text,
  image_alt       text,
  citation_url    text not null,
  citation_label  text not null,
  source_type     text not null check (source_type in (
    'NICE','NHS','BNF','GMC','past_paper','doctor_seed','student_bounty'
  )),
  prereq_atom_ids uuid[] not null default '{}',
  high_yield      boolean not null default false,
  free_tier       boolean not null default false,
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  status          text not null default 'draft' check (status in (
    'draft','pending_review','approved','rejected'
  )),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index atoms_exam_status_idx on public.atoms(exam, status);
create index atoms_free_tier_idx on public.atoms(free_tier) where free_tier = true;
create index atoms_status_idx on public.atoms(status);

create table if not exists public.atom_variants (
  id              uuid primary key default gen_random_uuid(),
  parent_atom_id  uuid not null references public.atoms(id) on delete cascade,
  stem            text not null,
  answer          text not null,
  distractors     jsonb not null default '[]'::jsonb,
  generated_by    text not null check (generated_by in (
    'ai-deepseek-v3','ai-openai-gpt4o-mini','human','past_paper'
  )),
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  status          text not null default 'draft' check (status in (
    'draft','pending_review','approved','rejected'
  )),
  created_at      timestamptz not null default now()
);

create index atom_variants_parent_idx on public.atom_variants(parent_atom_id);
create index atom_variants_status_idx on public.atom_variants(status);

create table if not exists public.user_atom_state (
  user_id         uuid not null references auth.users(id) on delete cascade,
  atom_id         uuid not null references public.atoms(id) on delete cascade,
  stability       real not null default 0,
  difficulty      real not null default 5,
  due_at          timestamptz not null default now(),
  last_review_at  timestamptz,
  reps            int not null default 0,
  lapses          int not null default 0,
  primary key (user_id, atom_id)
);

create index user_atom_state_due_idx
  on public.user_atom_state(user_id, due_at)
  where due_at <= now();

create table if not exists public.review_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  atom_id         uuid not null references public.atoms(id) on delete cascade,
  variant_id      uuid references public.atom_variants(id) on delete set null,
  rating          smallint not null check (rating between 1 and 4),
  confidence      smallint check (confidence between 1 and 4),
  response_ms     int,
  created_at      timestamptz not null default now()
);

create index review_events_user_atom_idx on public.review_events(user_id, atom_id, created_at desc);
create index review_events_user_created_idx on public.review_events(user_id, created_at desc);

-- RLS — atoms are world-readable when approved; writes only via service role for now.
alter table public.atoms enable row level security;
alter table public.atom_variants enable row level security;
alter table public.user_atom_state enable row level security;
alter table public.review_events enable row level security;

create policy "atoms_read_approved"
  on public.atoms for select
  using (status = 'approved' or auth.uid() = reviewed_by);

create policy "atom_variants_read_approved"
  on public.atom_variants for select
  using (
    status = 'approved'
    or auth.uid() = reviewed_by
    or exists (select 1 from public.atoms a where a.id = parent_atom_id and a.reviewed_by = auth.uid())
  );

create policy "user_atom_state_owner"
  on public.user_atom_state for all
  using (auth.uid() = user_id);

create policy "review_events_owner_insert"
  on public.review_events for insert
  with check (auth.uid() = user_id);

create policy "review_events_owner_select"
  on public.review_events for select
  using (auth.uid() = user_id);

-- Updated_at trigger for atoms
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger atoms_updated_at_touch
  before update on public.atoms
  for each row execute function public.touch_updated_at();
```

- [ ] **Step 2: Sanity-check syntax with the Supabase CLI (if installed) or via psql --dry-run**

Local Supabase CLI is the cleanest, but we don't require it for this plan. Minimum check: open the file in a SQL-aware editor (or `psql -f migration.sql --single-transaction --set ON_ERROR_STOP=on -h DRY_HOST` against a throwaway db) and confirm no syntax errors. If unsure, defer the apply step to Task C2.

- [ ] **Step 3: Commit (do NOT apply yet — apply happens in C2 after Nora's review)**

```bash
git add supabase/migrations/20260425120000_atomic_engine_schema.sql
git commit -m "feat(atom): add atomic-engine schema migration (atoms, variants, state, events)"
```

---

### Task C2: Apply the migration

This is the only step that touches production data infrastructure. Pause and confirm with Nora before running.

**Files:**
- None new — this is a runtime apply

- [ ] **Step 1: Confirm the target Supabase project**

```bash
cat .env.local | grep VITE_SUPABASE_URL
```

Expected: `https://uivitzexbtsmnspcitgh.supabase.co` (current production). If you see anything else, **stop** and re-verify with Nora before applying — the old project on master had a different ref.

- [ ] **Step 2: Take a logical backup before applying**

In the Supabase dashboard for the production project: Settings → Database → Backups → confirm a backup from the last 24 hours exists. If not, trigger one and wait for completion before continuing.

- [ ] **Step 3: Apply the migration via the Supabase dashboard SQL editor**

Open the project SQL editor, paste the contents of the migration file, run it. Verify success message. Confirm tables exist via:

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name in (
  'atoms','atom_variants','user_atom_state','review_events'
);
```

Expected: 4 rows.

- [ ] **Step 4: Confirm RLS policies**

```sql
select tablename, policyname from pg_policies
where schemaname = 'public' and tablename in (
  'atoms','atom_variants','user_atom_state','review_events'
)
order by tablename, policyname;
```

Expected: 5 rows (one per policy declared).

- [ ] **Step 5: No commit needed (already in C1)**. Document in `docs/superpowers/specs/CHANGELOG-atomic-engine.md`:

Create the file with:

```markdown
# Atomic Engine — schema changelog

## 2026-04-25 — initial migration applied

Migration: `supabase/migrations/20260425120000_atomic_engine_schema.sql`
Project: `uivitzexbtsmnspcitgh` (production)
Applied by: <name> via Supabase dashboard
Backup taken: yes
```

```bash
git add docs/superpowers/specs/CHANGELOG-atomic-engine.md
git commit -m "docs: log atomic-engine migration apply"
```

---

### Task C3: TypeScript domain types

**Files:**
- Create: `src/atom/types.ts`

- [ ] **Step 1: Write the types**

`src/atom/types.ts`:

```ts
/**
 * Atomic Engine domain types — must match
 * supabase/migrations/20260425120000_atomic_engine_schema.sql
 */

export type Exam = 'UKMLA' | 'UCAT' | string;

export type AtomSourceType =
  | 'NICE' | 'NHS' | 'BNF' | 'GMC' | 'past_paper'
  | 'doctor_seed' | 'student_bounty';

export type AtomStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export type VariantGeneratedBy =
  | 'ai-deepseek-v3' | 'ai-openai-gpt4o-mini'
  | 'human' | 'past_paper';

export interface Atom {
  id: string;
  exam: Exam;
  topicPath: string[];
  claim: string;
  canonicalStem: string;
  answer: string;
  distractors: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  imageUrl: string | null;
  imageAlt: string | null;
  citationUrl: string;
  citationLabel: string;
  sourceType: AtomSourceType;
  prereqAtomIds: string[];
  highYield: boolean;
  freeTier: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null; // ISO 8601
  status: AtomStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AtomVariant {
  id: string;
  parentAtomId: string;
  stem: string;
  answer: string;
  distractors: string[];
  generatedBy: VariantGeneratedBy;
  reviewedBy: string | null;
  reviewedAt: string | null;
  status: AtomStatus;
  createdAt: string;
}

export interface UserAtomState {
  userId: string;
  atomId: string;
  stability: number;
  difficulty: number;
  dueAt: string;
  lastReviewAt: string | null;
  reps: number;
  lapses: number;
}

export type FsrsRatingValue = 1 | 2 | 3 | 4; // forgot | hard | good | easy
export type ConfidenceValue = 1 | 2 | 3 | 4;

export interface ReviewEvent {
  id: string;
  userId: string;
  atomId: string;
  variantId: string | null;
  rating: FsrsRatingValue;
  confidence: ConfidenceValue | null;
  responseMs: number | null;
  createdAt: string;
}
```

- [ ] **Step 2: TypeScript-compile check**

```bash
npx tsc --noEmit
```

Expected: no new errors. Existing errors (legacy code) are tolerable for this PR — fix the ones you introduce only.

- [ ] **Step 3: Commit**

```bash
git add src/atom/types.ts
git commit -m "feat(atom): TypeScript domain types matching schema"
```

---

### Task C4: Atom repository — write the failing test first

**Files:**
- Create: `tests/atom/repository.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/atom/repository.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAtomRepository } from '@/atom/repository';
import type { Atom } from '@/atom/types';

// Minimal in-memory stub of the parts of supabase-js we use.
function makeSupabaseStub(rows: Partial<Atom>[]) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data: rows, error: null }),
  };
  return {
    from: vi.fn(() => builder),
  };
}

describe('atom repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listApprovedByExam returns only approved atoms for the requested exam', async () => {
    const supabase = makeSupabaseStub([
      { id: 'a1', exam: 'UKMLA', status: 'approved', claim: 'beta-blocker first-line for stable angina' },
    ]);
    const repo = createAtomRepository(supabase as any);

    const atoms = await repo.listApprovedByExam('UKMLA');

    expect(supabase.from).toHaveBeenCalledWith('atoms');
    expect(atoms).toHaveLength(1);
    expect(atoms[0].id).toBe('a1');
  });

  it('listFreeTier returns only free-tier approved atoms', async () => {
    const supabase = makeSupabaseStub([
      { id: 'a2', exam: 'UKMLA', status: 'approved', freeTier: true, claim: 'fact 1' },
    ]);
    const repo = createAtomRepository(supabase as any);

    const atoms = await repo.listFreeTier('UKMLA');

    expect(atoms).toHaveLength(1);
    expect(atoms[0].freeTier).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails for the right reason**

```bash
npm test -- tests/atom/repository.test.ts
```

Expected: FAIL with `Cannot find module '@/atom/repository'`. If the alias isn't resolved, fix `vitest.config.ts` resolve.alias before continuing.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/atom/repository.test.ts
git commit -m "test(atom): failing test for atom repository (RED)"
```

---

### Task C5: Implement atom repository to make the test pass

**Files:**
- Create: `src/atom/repository.ts`

- [ ] **Step 1: Write the minimal implementation**

`src/atom/repository.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Atom, Exam } from './types';

/**
 * Maps a snake_case Supabase row to the camelCase Atom domain type.
 */
function rowToAtom(row: any): Atom {
  return {
    id: row.id,
    exam: row.exam,
    topicPath: row.topic_path ?? [],
    claim: row.claim,
    canonicalStem: row.canonical_stem,
    answer: row.answer,
    distractors: row.distractors ?? [],
    difficulty: row.difficulty,
    imageUrl: row.image_url ?? null,
    imageAlt: row.image_alt ?? null,
    citationUrl: row.citation_url,
    citationLabel: row.citation_label,
    sourceType: row.source_type,
    prereqAtomIds: row.prereq_atom_ids ?? [],
    highYield: row.high_yield,
    freeTier: row.free_tier,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface AtomRepository {
  listApprovedByExam(exam: Exam): Promise<Atom[]>;
  listFreeTier(exam: Exam): Promise<Atom[]>;
  getById(id: string): Promise<Atom | null>;
}

export function createAtomRepository(supabase: SupabaseClient): AtomRepository {
  return {
    async listApprovedByExam(exam) {
      const { data, error } = await supabase
        .from('atoms')
        .select('*')
        .eq('exam', exam)
        .eq('status', 'approved')
        .order('high_yield', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToAtom);
    },

    async listFreeTier(exam) {
      const { data, error } = await supabase
        .from('atoms')
        .select('*')
        .eq('exam', exam)
        .eq('status', 'approved')
        .eq('free_tier', true)
        .limit(50);
      if (error) throw error;
      return (data ?? []).map(rowToAtom);
    },

    async getById(id) {
      const { data, error } = await supabase
        .from('atoms')
        .select('*')
        .eq('id', id)
        .limit(1)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null; // no rows
        throw error;
      }
      return data ? rowToAtom(data) : null;
    },
  };
}
```

- [ ] **Step 2: Run tests — confirm they pass**

```bash
npm test -- tests/atom/repository.test.ts
```

Expected: 2 tests pass. The test stub uses camelCase fields, so `rowToAtom` will produce `freeTier: undefined` for the first test and `freeTier: true` for the second — both correct against assertions.

- [ ] **Step 3: Commit**

```bash
git add src/atom/repository.ts
git commit -m "feat(atom): repository (listApprovedByExam, listFreeTier, getById) — GREEN"
```

---

## Phase D — FSRS-5 engine

### Task D1: Add ts-fsrs dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
npm install ts-fsrs
```

Verify the version is 4.x or 5.x:

```bash
npm view ts-fsrs version
```

Document the version in the commit message.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(fsrs): add ts-fsrs dependency for FSRS-5 algorithm"
```

---

### Task D2: FSRS scheduler types

**Files:**
- Create: `src/fsrs/types.ts`

- [ ] **Step 1: Write types**

`src/fsrs/types.ts`:

```ts
import type { FsrsRatingValue } from '@/atom/types';

/**
 * Per-(user, atom) memory state. Mirrors `user_atom_state` in Postgres.
 */
export interface FsrsCardState {
  stability: number;       // memory stability in days
  difficulty: number;      // 1..10 internal scale
  dueAt: Date;
  lastReviewAt: Date | null;
  reps: number;
  lapses: number;
}

/**
 * Result of scheduling a single review. The repo persists this back.
 */
export interface FsrsReviewResult {
  newState: FsrsCardState;
  intervalDays: number;
}

export interface FsrsScheduler {
  /**
   * Initial state for a never-seen-before atom.
   */
  initialState(now?: Date): FsrsCardState;

  /**
   * Apply a user's rating (1=forgot..4=easy) to an existing state and produce
   * the next due date + updated stability/difficulty.
   */
  applyReview(
    state: FsrsCardState,
    rating: FsrsRatingValue,
    now?: Date,
  ): FsrsReviewResult;

  /**
   * Returns true if the card is due at the given moment.
   */
  isDue(state: FsrsCardState, now?: Date): boolean;
}
```

- [ ] **Step 2: TypeScript compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/fsrs/types.ts
git commit -m "feat(fsrs): scheduler types"
```

---

### Task D3: Failing test for scheduler initial state

**Files:**
- Create: `tests/fsrs/scheduler.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/fsrs/scheduler.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createFsrsScheduler } from '@/fsrs/scheduler';

describe('FsrsScheduler', () => {
  const NOW = new Date('2026-04-25T10:00:00Z');

  it('initialState produces a card due immediately with zero reps', () => {
    const sched = createFsrsScheduler();
    const state = sched.initialState(NOW);

    expect(state.reps).toBe(0);
    expect(state.lapses).toBe(0);
    expect(state.lastReviewAt).toBeNull();
    // Brand new cards are due now (or in the past).
    expect(state.dueAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
  });

  it('applyReview with rating=Good advances dueAt into the future', () => {
    const sched = createFsrsScheduler();
    const initial = sched.initialState(NOW);

    const { newState, intervalDays } = sched.applyReview(initial, 3 /* good */, NOW);

    expect(newState.reps).toBe(1);
    expect(newState.lastReviewAt?.getTime()).toBe(NOW.getTime());
    expect(newState.dueAt.getTime()).toBeGreaterThan(NOW.getTime());
    expect(intervalDays).toBeGreaterThan(0);
  });

  it('applyReview with rating=Forgot increments lapses', () => {
    const sched = createFsrsScheduler();
    const initial = sched.initialState(NOW);
    const after1 = sched.applyReview(initial, 3, NOW).newState;
    const tomorrow = new Date(NOW.getTime() + 24 * 3600 * 1000);

    const after2 = sched.applyReview(after1, 1 /* forgot */, tomorrow).newState;

    expect(after2.lapses).toBe(1);
    expect(after2.reps).toBe(2);
  });

  it('isDue returns true when dueAt has passed', () => {
    const sched = createFsrsScheduler();
    const initial = sched.initialState(NOW);
    const after = sched.applyReview(initial, 3, NOW).newState;
    const farFuture = new Date(NOW.getTime() + 365 * 24 * 3600 * 1000);

    expect(sched.isDue(after, NOW)).toBe(false); // just reviewed
    expect(sched.isDue(after, farFuture)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — confirm failure**

```bash
npm test -- tests/fsrs/scheduler.test.ts
```

Expected: FAIL with `Cannot find module '@/fsrs/scheduler'`.

- [ ] **Step 3: Commit failing test**

```bash
git add tests/fsrs/scheduler.test.ts
git commit -m "test(fsrs): failing tests for scheduler (RED)"
```

---

### Task D4: Implement scheduler — make tests pass

**Files:**
- Create: `src/fsrs/scheduler.ts`

- [ ] **Step 1: Implement the scheduler wrapping ts-fsrs**

`src/fsrs/scheduler.ts`:

```ts
import { fsrs, generatorParameters, createEmptyCard, Rating } from 'ts-fsrs';
import type { FsrsCardState, FsrsReviewResult, FsrsScheduler } from './types';
import type { FsrsRatingValue } from '@/atom/types';

const params = generatorParameters({
  enable_fuzz: true,
  request_retention: 0.9, // target 90% recall
});

const f = fsrs(params);

/**
 * Map our 1..4 rating onto ts-fsrs Rating enum.
 */
function toFsrsRating(r: FsrsRatingValue): Rating {
  switch (r) {
    case 1: return Rating.Again;
    case 2: return Rating.Hard;
    case 3: return Rating.Good;
    case 4: return Rating.Easy;
  }
}

function tsCardToState(card: ReturnType<typeof createEmptyCard>, lastReviewAt: Date | null, reps: number, lapses: number): FsrsCardState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    dueAt: new Date(card.due),
    lastReviewAt,
    reps,
    lapses,
  };
}

function stateToTsCard(state: FsrsCardState) {
  // Reconstruct a ts-fsrs Card from our persisted state.
  const card = createEmptyCard(state.lastReviewAt ?? new Date(0));
  card.stability = state.stability;
  card.difficulty = state.difficulty;
  card.due = state.dueAt;
  card.reps = state.reps;
  card.lapses = state.lapses;
  card.last_review = state.lastReviewAt ?? undefined;
  return card;
}

export function createFsrsScheduler(): FsrsScheduler {
  return {
    initialState(now = new Date()) {
      const card = createEmptyCard(now);
      return tsCardToState(card, null, 0, 0);
    },

    applyReview(state, rating, now = new Date()) {
      const card = stateToTsCard(state);
      const result = f.next(card, now, toFsrsRating(rating));
      const newCard = result.card;
      const intervalDays = Math.max(
        0,
        (new Date(newCard.due).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const newLapses = rating === 1 ? state.lapses + 1 : state.lapses;
      return {
        newState: tsCardToState(newCard, now, state.reps + 1, newLapses),
        intervalDays,
      };
    },

    isDue(state, now = new Date()) {
      return state.dueAt.getTime() <= now.getTime();
    },
  };
}
```

- [ ] **Step 2: Run tests — should be GREEN**

```bash
npm test -- tests/fsrs/scheduler.test.ts
```

Expected: 4 tests pass. If the ts-fsrs API differs in the installed version (it has had minor breaking changes), adjust the imports/calls in `scheduler.ts` and re-run. Use `npx ts-fsrs --help` or check `node_modules/ts-fsrs/dist/index.d.ts` for the exact exports.

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: smoke + atom-repo + fsrs all pass. Total 8 tests.

- [ ] **Step 4: Commit**

```bash
git add src/fsrs/scheduler.ts
git commit -m "feat(fsrs): FSRS-5 scheduler wrapping ts-fsrs — GREEN"
```

---

### Task D5: Integration test — repository + scheduler round-trip

**Files:**
- Create: `tests/fsrs/integration.test.ts`

- [ ] **Step 1: Write the integration test**

`tests/fsrs/integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createFsrsScheduler } from '@/fsrs/scheduler';
import type { UserAtomState } from '@/atom/types';
import type { FsrsCardState } from '@/fsrs/types';

/**
 * The DB row -> in-memory FsrsCardState mapping. Lives in src/fsrs/mapper.ts
 * (created in Step 2 below).
 */
import { fromUserAtomState, toUserAtomState } from '@/fsrs/mapper';

describe('FSRS state round-trip', () => {
  const NOW = new Date('2026-04-25T10:00:00Z');

  it('a freshly-initialised state survives DB-row mapping unchanged', () => {
    const sched = createFsrsScheduler();
    const initial = sched.initialState(NOW);

    const dbRow: UserAtomState = toUserAtomState('user-1', 'atom-1', initial);
    const restored: FsrsCardState = fromUserAtomState(dbRow);

    expect(restored.stability).toBe(initial.stability);
    expect(restored.difficulty).toBe(initial.difficulty);
    expect(restored.reps).toBe(initial.reps);
    expect(restored.lapses).toBe(initial.lapses);
    expect(restored.dueAt.toISOString()).toBe(initial.dueAt.toISOString());
  });

  it('applyReview, persist, restore, applyReview again gives same trajectory', () => {
    const sched = createFsrsScheduler();
    const tomorrow = new Date(NOW.getTime() + 86400_000);

    const s0 = sched.initialState(NOW);
    const s1 = sched.applyReview(s0, 3, NOW).newState;

    const persisted = toUserAtomState('user-1', 'atom-1', s1);
    const restored = fromUserAtomState(persisted);
    const s2 = sched.applyReview(restored, 3, tomorrow).newState;

    expect(s2.reps).toBe(2);
    expect(s2.lastReviewAt?.toISOString()).toBe(tomorrow.toISOString());
  });
});
```

- [ ] **Step 2: Add the mapper module**

`src/fsrs/mapper.ts`:

```ts
import type { UserAtomState } from '@/atom/types';
import type { FsrsCardState } from './types';

export function fromUserAtomState(row: UserAtomState): FsrsCardState {
  return {
    stability: row.stability,
    difficulty: row.difficulty,
    dueAt: new Date(row.dueAt),
    lastReviewAt: row.lastReviewAt ? new Date(row.lastReviewAt) : null,
    reps: row.reps,
    lapses: row.lapses,
  };
}

export function toUserAtomState(
  userId: string,
  atomId: string,
  state: FsrsCardState,
): UserAtomState {
  return {
    userId,
    atomId,
    stability: state.stability,
    difficulty: state.difficulty,
    dueAt: state.dueAt.toISOString(),
    lastReviewAt: state.lastReviewAt ? state.lastReviewAt.toISOString() : null,
    reps: state.reps,
    lapses: state.lapses,
  };
}
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: 10 tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/fsrs/integration.test.ts src/fsrs/mapper.ts
git commit -m "feat(fsrs): mapper between DB row and in-memory state + integration test"
```

---

## Phase E — Wrap-up + verification

### Task E1: Verify the whole foundation builds, tests, and lints

**Files:**
- None new — verification only

- [ ] **Step 1: Full test suite**

```bash
npm test
```

Expected: all tests pass. Capture exit code 0.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: success, dist/ refreshed.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no NEW errors. Existing legacy errors documented and acceptable for this PR.

- [ ] **Step 4: Lighthouse / dist size sanity**

```bash
du -sh dist/
```

Expected: ≤ 12 MB (was 10 MB pre-cleanup; cleanup should have reduced or held steady).

- [ ] **Step 5: Commit final tally as a docs note**

`docs/superpowers/specs/CHANGELOG-atomic-engine.md` — append:

```markdown
## 2026-04-25 — Plan 1 complete

- Cleanup: 30+ dead files removed; Inworld voice tutor removed; ~5k LOC dropped.
- Test infra: Vitest + RTL + jsdom; 10 tests passing.
- Schema: 4 tables, 5 indexes, 5 RLS policies, applied to production.
- FSRS: ts-fsrs integrated; scheduler + mapper + repository all tested.
- Build: passes. Bundle: <size after> MB. Type-check: no new errors.
```

```bash
git add docs/superpowers/specs/CHANGELOG-atomic-engine.md
git commit -m "docs: log Plan 1 completion"
```

- [ ] **Step 6: Push and open PR (only when explicitly authorised by the user)**

```bash
git push -u origin docs/atomic-engine-spec
gh pr create --base ukmla-akt-version --title "Plan 1: foundation — cleanup + atom schema + FSRS engine" --body "$(cat <<'EOF'
## Summary
- Cleanup: removed Inworld, vanity metrics, unused renderers, legacy backup files
- Test infra: Vitest + RTL + jsdom (10 tests)
- Atomic-engine schema migration applied to Supabase production
- FSRS-5 scheduler integrated via ts-fsrs

## Test plan
- [ ] CI green (Vitest, build, type-check)
- [ ] Manual: studyedit.com still loads and functions in Netlify deploy preview
- [ ] Schema: verify atoms / atom_variants / user_atom_state / review_events exist in Supabase

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review checklist (run at end of plan)

After each phase, before committing the wrap-up, verify:

1. **Spec coverage** — every Plan 1 deliverable from the spec §11 W1-W2 is implemented:
   - ☑ Cleanup (Phase A)
   - ☑ Vitest setup (Phase B)
   - ☑ Atom schema migration (Phase C)
   - ☑ FSRS engine integration (Phase D)
2. **No placeholders** — search the plan for `TBD|TODO|FIXME` outside intentional in-code TODOs that point to a tracked plan number.
3. **Type consistency** — `Atom`, `FsrsCardState`, `UserAtomState` field names match between schema, types.ts, repository, and tests.
4. **Test discipline** — every new module has a failing test before implementation (RED → GREEN → commit).

---

## Out of scope for this plan

- Student-facing UI (Plan 2)
- Nora's review queue (Plan 3)
- Atom seeding from voice (Plan 4)
- Image upload to R2 (Plan 5)
- Predicted exam score (Plan 6)
- Streaks + paywall (Plan 7)
- Voice mode (Plan 8)
- Mock + leaderboards (Plan 9)
- Beta launch instrumentation (Plan 10)
