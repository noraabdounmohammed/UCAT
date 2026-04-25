# Plan 5 — Mistake Deck (auto-curated review of recent forgets)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** A `/mistakes` route that pulls atoms the user recently got wrong (FSRS rating = `Forgot`) and lets them drill the same retrieval-loop UX as Plan 2's `/study` session. Spec §4.2 — UWorld's #1 used view; UKMLA tools mostly don't have it.

**Definition of "mistake":** an atom whose `user_atom_state.lapses >= 1` AND `last_review_at > now() - 30 days`. Includes atoms the user has since corrected — which is intentional for v1 (you still might want to drill weak concepts). Tightening to "last review was a lapse" is queued as Plan 5B.

**Architecture (lean):** mirrors Plan 2 exactly. New repo method + new page that reuses everything else.

1. **Repository:** add `listMistakeAtomsForUser(userId, since: Date, limit)` to `userStateRepository`.
2. **Page:** new `/mistakes` route with a `MistakesPage` that calls `useFsrsSession` with a custom queue loader pointing at the new repo method.
3. **Hook change (small):** add an optional `loadQueue` parameter to `useFsrsSession` so the same hook can drive both `/study` (default = listDueForUser) and `/mistakes` (= listMistakeAtomsForUser).

**Spec:** §4.2.

**Depends on:** Plans 1-4. Specifically Plan 2's `useFsrsSession` and `<FsrsSessionView>`.

---

## File structure

### Created
- `tests/atom/userStateRepository-mistakes.test.ts` (one new method test on existing repo)
- `tests/hooks/useFsrsSession-mistake-mode.test.tsx` (one new branch test on existing hook)
- `tests/integration/mistake-deck.test.tsx`
- `src/pages/MistakesPage.tsx`

### Modified
- `src/atom/userStateRepository.ts` — adds `listMistakeAtomsForUser`
- `src/hooks/useFsrsSession.ts` — adds optional `loadQueue` strategy
- `src/App.tsx` — lazy `/mistakes` route
- `src/components/layout/MainLayout.tsx` — add `'mistakes'` to `currentPage` union

### Untouched
- `src/components/study/*` — reused
- All Plan 1-4 modules

---

## Task breakdown — 7 tasks, 6 commits

### Phase A — Repository extension (TDD)

**Task 1 RED.** `tests/atom/userStateRepository-mistakes.test.ts` — 2 tests:
- `listMistakeAtomsForUser` queries `user_atom_state` filtered by `user_id`, `lapses >= 1`, `last_review_at >= since`
- Returns mapped UserAtomState objects, ordered by last_review_at DESC, limited

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUserStateRepository } from '@/atom/userStateRepository';

function makeStub(rows: any[] = []) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data: rows, error: null }),
  };
  return { from: vi.fn(() => builder), _builder: builder };
}

describe('userStateRepository.listMistakeAtomsForUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries user_atom_state filtered by user_id, lapses>=1, last_review_at>=since', async () => {
    const supabase = makeStub([
      { user_id: 'u1', atom_id: 'a1', stability: 1, difficulty: 6, due_at: '2026-04-25T00:00:00Z', last_review_at: '2026-04-24T10:00:00Z', reps: 2, lapses: 1 },
    ]);
    const repo = createUserStateRepository(supabase as any);
    const since = new Date('2026-03-26T00:00:00Z');

    const result = await repo.listMistakeAtomsForUser('u1', since, 20);

    expect(supabase.from).toHaveBeenCalledWith('user_atom_state');
    expect(supabase._builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(supabase._builder.gte).toHaveBeenCalledWith('lapses', 1);
    expect(supabase._builder.gte).toHaveBeenCalledWith('last_review_at', '2026-03-26T00:00:00.000Z');
    expect(supabase._builder.order).toHaveBeenCalledWith('last_review_at', { ascending: false });
    expect(supabase._builder.limit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
    expect(result[0].atomId).toBe('a1');
    expect(result[0].lapses).toBe(1);
  });

  it('maps snake_case rows to camelCase domain types', async () => {
    const supabase = makeStub([
      { user_id: 'u1', atom_id: 'a2', stability: 0.5, difficulty: 8, due_at: '2026-04-26T00:00:00Z', last_review_at: '2026-04-25T00:00:00Z', reps: 3, lapses: 2 },
    ]);
    const repo = createUserStateRepository(supabase as any);

    const result = await repo.listMistakeAtomsForUser('u1', new Date('2026-04-01T00:00:00Z'), 10);

    expect(result[0]).toMatchObject({
      userId: 'u1',
      atomId: 'a2',
      stability: 0.5,
      difficulty: 8,
      reps: 3,
      lapses: 2,
    });
  });
});
```

Commit: `test(atom): failing tests for listMistakeAtomsForUser (RED)`

**Task 2 GREEN.** Add to `src/atom/userStateRepository.ts`:

```ts
// In UserStateRepository interface:
listMistakeAtomsForUser(userId: string, since: Date, limit: number): Promise<UserAtomState[]>;

// In createUserStateRepository implementation:
async listMistakeAtomsForUser(userId, since, limit) {
  const { data, error } = await supabase
    .from('user_atom_state')
    .select('*')
    .eq('user_id', userId)
    .gte('lapses', 1)
    .gte('last_review_at', since.toISOString())
    .order('last_review_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(rowToState);
}
```

Note: `rowToState` already exists in the file from Plan 2 — reuse, don't duplicate.

Commit: `feat(atom): listMistakeAtomsForUser (recent lapses) — GREEN`

### Phase B — useFsrsSession `loadQueue` strategy (TDD)

**Task 3 RED.** `tests/hooks/useFsrsSession-mistake-mode.test.tsx` — verifies that passing a custom `loadQueue` overrides the default `listDueForUser` call:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFsrsSession } from '@/hooks/useFsrsSession';
import type { Atom, UserAtomState } from '@/atom/types';

const NOW = new Date('2026-04-25T10:00:00Z');

function makeAtom(id: string): Atom {
  return {
    id, exam: 'UKMLA', topicPath: ['Cardiology'],
    claim: `c${id}`, canonicalStem: `Stem ${id}?`, answer: `A${id}`,
    distractors: ['x','y','z'], difficulty: 3,
    imageUrl: null, imageAlt: null,
    citationUrl: 'https://nice.org.uk/cg126', citationLabel: 'NICE CG126',
    sourceType: 'NICE', prereqAtomIds: [], highYield: false, freeTier: false,
    reviewedBy: null, reviewedAt: null, status: 'approved',
    createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
  };
}

function makeState(atomId: string, lapses = 1): UserAtomState {
  return {
    userId: 'u1', atomId, stability: 0, difficulty: 5,
    dueAt: NOW.toISOString(), lastReviewAt: NOW.toISOString(),
    reps: 1, lapses,
  };
}

describe('useFsrsSession with custom loadQueue (mistake mode)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses loadQueue strategy instead of default listDueForUser', async () => {
    const atoms = [makeAtom('m1'), makeAtom('m2')];
    const customLoad = vi.fn(async () => atoms.map(a => makeState(a.id, 1)));

    const userStateRepo = {
      listDueForUser: vi.fn(),
      listMistakeAtomsForUser: vi.fn(),
      upsertState: vi.fn().mockResolvedValue(undefined),
      insertReviewEvent: vi.fn().mockResolvedValue(undefined),
    };

    const atomRepo = {
      listApprovedByExam: vi.fn(),
      listFreeTier: vi.fn(),
      getById: vi.fn(async (id: string) => atoms.find(a => a.id === id) ?? null),
    };

    const { result } = renderHook(() =>
      useFsrsSession({
        userId: 'u1',
        now: () => NOW,
        maxAtoms: 5,
        atomRepo: atomRepo as any,
        userStateRepo: userStateRepo as any,
        loadQueue: customLoad,
      } as any),
    );

    await waitFor(() => expect(result.current.status).toBe('in_progress'));

    expect(customLoad).toHaveBeenCalledTimes(1);
    expect(userStateRepo.listDueForUser).not.toHaveBeenCalled();
    expect(result.current.currentAtom?.id).toBe('m1');
  });
});
```

Commit: `test(hook): failing test for useFsrsSession custom loadQueue (RED)`

**Task 4 GREEN.** Modify `src/hooks/useFsrsSession.ts` — add optional `loadQueue` to `FsrsSessionDeps`. If provided, the initial-load effect calls it instead of `userStateRepo.listDueForUser`.

```ts
// Append to FsrsSessionDeps:
loadQueue?: (userId: string, now: Date, maxAtoms: number) => Promise<UserAtomState[]>;

// In the useEffect's load:
const dueRows = deps.loadQueue
  ? await deps.loadQueue(deps.userId, now(), maxAtoms)
  : await deps.userStateRepo.listDueForUser(deps.userId, now(), maxAtoms);
```

Default behaviour unchanged — Plan 2 tests still pass. Mistake mode passes `loadQueue` pointing at `listMistakeAtomsForUser`.

Commit: `feat(hook): useFsrsSession accepts custom loadQueue strategy (GREEN)`

### Phase C — MistakesPage + route

**Task 5.** Create `src/pages/MistakesPage.tsx`:

```tsx
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { FsrsSessionView } from '@/components/study/FsrsSessionView';
import { useFsrsSession } from '@/hooks/useFsrsSession';
import { createAtomRepository } from '@/atom/repository';
import { createUserStateRepository } from '@/atom/userStateRepository';

const LOOKBACK_DAYS = 30;

export function MistakesPage() {
  const { user } = useAuth();
  const atomRepo = useMemo(() => createAtomRepository(supabase), []);
  const userStateRepo = useMemo(() => createUserStateRepository(supabase), []);

  const session = useFsrsSession({
    userId: user?.id ?? '',
    atomRepo,
    userStateRepo,
    maxAtoms: 5,
    loadQueue: async (userId, now, max) => {
      const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);
      return userStateRepo.listMistakeAtomsForUser(userId, since, max);
    },
  });

  if (!user) {
    return (
      <MainLayout currentPage="mistakes">
        <div className="text-center py-12 text-stone-600">Sign in to drill mistakes.</div>
      </MainLayout>
    );
  }

  // Streak placeholder until Plan 7 wires real data.
  const streakDays = 1;

  return (
    <MainLayout currentPage="mistakes">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
        <h1 className="text-xl font-semibold text-stone-900">Mistake deck</h1>
        <p className="text-xs text-stone-500">Atoms you got wrong in the last {LOOKBACK_DAYS} days.</p>
        <FsrsSessionView session={session} streakDays={streakDays} />
      </div>
    </MainLayout>
  );
}
```

In `src/App.tsx`, add lazy import + route. In `MainLayout.tsx`, add `'mistakes'` to the union.

Commit: `feat(mistakes): /mistakes route + MistakesPage hosting FsrsSessionView`

### Phase D — Integration test + verify

**Task 6.** `tests/integration/mistake-deck.test.tsx` — full flow against mocked repos:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FsrsSessionView } from '@/components/study/FsrsSessionView';
import { useFsrsSession } from '@/hooks/useFsrsSession';
import type { Atom } from '@/atom/types';

const NOW = new Date('2026-04-25T10:00:00Z');

const atoms: Atom[] = ['m1', 'm2'].map(id => ({
  id, exam: 'UKMLA', topicPath: ['Cardiology'],
  claim: `claim ${id}`, canonicalStem: `Stem ${id}?`, answer: `Answer ${id}`,
  distractors: ['x', 'y', 'z'], difficulty: 3,
  imageUrl: null, imageAlt: null,
  citationUrl: 'https://nice.org.uk/cg126', citationLabel: 'NICE CG126',
  sourceType: 'NICE', prereqAtomIds: [], highYield: false, freeTier: false,
  reviewedBy: null, reviewedAt: null, status: 'approved',
  createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
}));

const listMistakeAtomsForUser = vi.fn(async () =>
  atoms.map(a => ({
    userId: 'u1', atomId: a.id,
    stability: 0.5, difficulty: 7,
    dueAt: NOW.toISOString(), lastReviewAt: NOW.toISOString(),
    reps: 2, lapses: 1,
  })),
);

function Harness() {
  const session = useFsrsSession({
    userId: 'u1',
    now: () => NOW,
    maxAtoms: 5,
    atomRepo: {
      listApprovedByExam: vi.fn(),
      listFreeTier: vi.fn(),
      getById: async (id) => atoms.find(a => a.id === id) ?? null,
    } as any,
    userStateRepo: {
      listDueForUser: vi.fn(),
      listMistakeAtomsForUser,
      upsertState: vi.fn().mockResolvedValue(undefined),
      insertReviewEvent: vi.fn().mockResolvedValue(undefined),
    } as any,
    loadQueue: async (userId, now, max) =>
      listMistakeAtomsForUser(userId, new Date(now.getTime() - 30 * 86_400_000), max),
  });
  return <FsrsSessionView session={session} streakDays={1} />;
}

describe('mistake deck integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('full flow: load mistakes → rate 2 → summary', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await waitFor(() => expect(screen.getByText(/Stem m1\?/)).toBeInTheDocument());
    expect(listMistakeAtomsForUser).toHaveBeenCalledTimes(1);

    await user.click(screen.getAllByRole('button', { name: /how sure/i })[2]);
    await user.click(await screen.findByRole('button', { name: /^Good$/i }));

    await waitFor(() => expect(screen.getByText(/Stem m2\?/)).toBeInTheDocument());
    await user.click(screen.getAllByRole('button', { name: /how sure/i })[3]);
    await user.click(await screen.findByRole('button', { name: /^Easy$/i }));

    await waitFor(() => expect(screen.getByText(/2\s*\/\s*2/)).toBeInTheDocument());
  });
});
```

Commit: `test(mistakes): integration test for mistake-deck flow`

**Task 7.** Append CHANGELOG entry, run battery, commit.

Commit: `docs: log Plan 5 completion (mistake deck)`

---

## Self-review

1. Spec coverage: §4.2 mistake-deck mode ✓; auto-curated from `lapses >= 1`.
2. No new infra (no R2, no API keys, no new external deps).
3. Backwards-compatible: useFsrsSession's `loadQueue` is optional with sane default.
4. RLS-correct: `user_atom_state` queries are owner-scoped (Plan 1's `user_atom_state_owner` policy).
5. Hook change is a single new optional parameter — Plan 2 tests still pass.

## Out of scope

- "Last review was a lapse" filtering (Plan 5B — to exclude already-corrected mistakes)
- Mode toggle on the same `/study` page (separate route is simpler)
- Image stems → Plan 6+
- Filter by topic / date range UI
- "Drill X mistakes" mode picker
