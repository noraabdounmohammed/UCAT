# Plan 2 — 3-min Retrieval Session UX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the user-facing 3-min retrieval session — the daily-habit core of the Atomic Engine. Logged-in students get 5-7 atoms drawn from the FSRS due-queue, rate confidence pre-reveal, see answer + citation post-reveal, give the FSRS rating, and end on a 3-line summary. Persists `user_atom_state` (FSRS state) and `review_events` (audit trail) to Supabase via Plan 1's repository + scheduler.

**Architecture:**
1. **`useFsrsSession` hook** — orchestrates: load due atoms → render one → persist on each rating → next.
2. **`<AtomRenderer>`** — pure render of one atom: stem (+image), confidence buttons, reveal, FSRS rating buttons. No state management.
3. **`<FsrsSessionView>`** — shell that hosts the renderer + manages the session lifecycle (start, in-progress, summary).
4. **`<SessionSummary>`** — end-of-session card (`5/7 right · streak day 12 🔥`, predicted-score moves arrive in Plan 6).
5. New `/study` route wraps these in `MainLayout`.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui. Plan 1's `src/atom/` + `src/fsrs/`. Supabase auth + RLS-protected tables. Vitest + RTL for unit/integration tests.

**Spec:** `docs/superpowers/specs/2026-04-25-atomic-engine-design.md` §4.1, §4.2 (Default mode only — mistake deck/mock/voice deferred).

**Depends on:** Plan 1 (atom schema applied + `createAtomRepository` + `createFsrsScheduler`).

---

## File structure

### Created
- `src/atom/userStateRepository.ts` — Supabase queries for `user_atom_state` and `review_events`
- `src/fsrs/session.ts` — pure logic: pick next atom from due queue, advance state, decide if session is done
- `src/hooks/useFsrsSession.ts` — React hook wrapping repository + scheduler + session logic
- `src/components/study/AtomRenderer.tsx` — single-atom view (stem, confidence, reveal, FSRS rating)
- `src/components/study/FsrsSessionView.tsx` — session shell (loading, in-progress, summary states)
- `src/components/study/SessionSummary.tsx` — end-of-session 3-line card
- `src/components/study/ConfidenceButtons.tsx` — 4-button group (1=guessed, 4=certain)
- `src/components/study/FsrsRatingButtons.tsx` — 4-button group (Forgot, Hard, Good, Easy)
- `src/pages/StudyPage.tsx` — route page that mounts `<FsrsSessionView>` inside `MainLayout`
- `tests/atom/userStateRepository.test.ts`
- `tests/fsrs/session.test.ts`
- `tests/hooks/useFsrsSession.test.tsx`
- `tests/components/AtomRenderer.test.tsx`
- `tests/components/FsrsSessionView.test.tsx`
- `tests/integration/study-session.test.tsx`

### Modified
- `src/App.tsx` — add `<Route path="/study" …>` to the router
- `src/components/layout/Sidebar.tsx` — add a "Study" nav item if a sidebar exists (verify before assuming)

### Untouched (deliberate)
- `src/components/practice/*` — legacy practice flow stays alongside the new `/study` route until Plan 9 (mock exam) consolidates
- `src/store/conceptStore.ts` — legacy state stays; `/study` doesn't use it
- All Plan 1 modules — consumed read-only

---

## Phase A — User-state repository

### Task 1: Failing test for user-state repo

**Files:** Create `tests/atom/userStateRepository.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUserStateRepository } from '@/atom/userStateRepository';

function makeStub(rows: any[] = []) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data: rows, error: null }),
  };
  return { from: vi.fn(() => builder), _builder: builder };
}

describe('userStateRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listDueForUser pulls user_atom_state rows where due_at <= now', async () => {
    const supabase = makeStub([
      { user_id: 'u1', atom_id: 'a1', stability: 1.5, difficulty: 5, due_at: '2026-04-25T00:00:00Z', last_review_at: null, reps: 0, lapses: 0 },
    ]);
    const repo = createUserStateRepository(supabase as any);

    const due = await repo.listDueForUser('u1', new Date('2026-04-26T00:00:00Z'), 10);

    expect(supabase.from).toHaveBeenCalledWith('user_atom_state');
    expect(due).toHaveLength(1);
    expect(due[0].atomId).toBe('a1');
    expect(supabase._builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(supabase._builder.lte).toHaveBeenCalledWith('due_at', '2026-04-26T00:00:00.000Z');
    expect(supabase._builder.limit).toHaveBeenCalledWith(10);
  });

  it('upsertState writes camelCase state as snake_case row', async () => {
    const supabase = makeStub([]);
    const repo = createUserStateRepository(supabase as any);

    await repo.upsertState({
      userId: 'u1',
      atomId: 'a1',
      stability: 2.5,
      difficulty: 6,
      dueAt: '2026-05-01T00:00:00.000Z',
      lastReviewAt: '2026-04-25T00:00:00.000Z',
      reps: 1,
      lapses: 0,
    });

    expect(supabase._builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        atom_id: 'a1',
        stability: 2.5,
        difficulty: 6,
        due_at: '2026-05-01T00:00:00.000Z',
        last_review_at: '2026-04-25T00:00:00.000Z',
        reps: 1,
        lapses: 0,
      }),
      { onConflict: 'user_id,atom_id' },
    );
  });

  it('insertReviewEvent writes a review_events row', async () => {
    const supabase = makeStub([]);
    const repo = createUserStateRepository(supabase as any);

    await repo.insertReviewEvent({
      userId: 'u1',
      atomId: 'a1',
      variantId: null,
      rating: 3,
      confidence: 4,
      responseMs: 4_200,
    });

    expect(supabase.from).toHaveBeenCalledWith('review_events');
    expect(supabase._builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        atom_id: 'a1',
        rating: 3,
        confidence: 4,
        response_ms: 4_200,
      }),
    );
  });
});
```

- [ ] **Step 2: Run — confirm failure**

```bash
npm test -- tests/atom/userStateRepository.test.ts
```

Expected: `Cannot find module '@/atom/userStateRepository'`.

- [ ] **Step 3: Commit (RED)**

```bash
git add tests/atom/userStateRepository.test.ts
git commit -m "test(atom): failing tests for userStateRepository (RED)"
```

### Task 2: Implement user-state repository (GREEN)

**Files:** Create `src/atom/userStateRepository.ts`

- [ ] **Step 1: Implement** — exact content:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserAtomState, ReviewEvent, FsrsRatingValue, ConfidenceValue } from './types';

function rowToState(row: any): UserAtomState {
  return {
    userId: row.user_id,
    atomId: row.atom_id,
    stability: row.stability,
    difficulty: row.difficulty,
    dueAt: row.due_at,
    lastReviewAt: row.last_review_at ?? null,
    reps: row.reps,
    lapses: row.lapses,
  };
}

export interface UserStateRepository {
  listDueForUser(userId: string, asOf: Date, limit: number): Promise<UserAtomState[]>;
  upsertState(state: UserAtomState): Promise<void>;
  insertReviewEvent(ev: Omit<ReviewEvent, 'id' | 'createdAt'>): Promise<void>;
}

export function createUserStateRepository(supabase: SupabaseClient): UserStateRepository {
  return {
    async listDueForUser(userId, asOf, limit) {
      const { data, error } = await supabase
        .from('user_atom_state')
        .select('*')
        .eq('user_id', userId)
        .lte('due_at', asOf.toISOString())
        .order('due_at', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(rowToState);
    },

    async upsertState(state) {
      const { error } = await supabase.from('user_atom_state').upsert(
        {
          user_id: state.userId,
          atom_id: state.atomId,
          stability: state.stability,
          difficulty: state.difficulty,
          due_at: state.dueAt,
          last_review_at: state.lastReviewAt,
          reps: state.reps,
          lapses: state.lapses,
        },
        { onConflict: 'user_id,atom_id' },
      );
      if (error) throw error;
    },

    async insertReviewEvent(ev) {
      const { error } = await supabase.from('review_events').insert({
        user_id: ev.userId,
        atom_id: ev.atomId,
        variant_id: ev.variantId,
        rating: ev.rating as FsrsRatingValue,
        confidence: ev.confidence as ConfidenceValue | null,
        response_ms: ev.responseMs,
      });
      if (error) throw error;
    },
  };
}
```

- [ ] **Step 2: Run tests — GREEN**

```bash
npm test -- tests/atom/userStateRepository.test.ts
```

Expected: 3 pass.

- [ ] **Step 3: Commit**

```bash
git add src/atom/userStateRepository.ts
git commit -m "feat(atom): user-state repository (due queue + state upsert + event insert)"
```

---

## Phase B — Pure session logic

### Task 3: Failing test for session logic

**Files:** Create `tests/fsrs/session.test.ts`

- [ ] **Step 1: Write the failing test** — exact content:

```ts
import { describe, it, expect } from 'vitest';
import { pickNextAtomId, isSessionDone, type SessionState } from '@/fsrs/session';

describe('session logic', () => {
  it('picks the first not-yet-rated atom from the due queue', () => {
    const state: SessionState = {
      atomIds: ['a1', 'a2', 'a3'],
      ratedAtomIds: ['a1'],
      maxAtoms: 5,
    };
    expect(pickNextAtomId(state)).toBe('a2');
  });

  it('returns null when all atoms are rated', () => {
    const state: SessionState = {
      atomIds: ['a1', 'a2'],
      ratedAtomIds: ['a1', 'a2'],
      maxAtoms: 5,
    };
    expect(pickNextAtomId(state)).toBeNull();
  });

  it('caps the session at maxAtoms even if more are due', () => {
    const state: SessionState = {
      atomIds: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
      ratedAtomIds: ['a1', 'a2', 'a3', 'a4', 'a5'],
      maxAtoms: 5,
    };
    expect(pickNextAtomId(state)).toBeNull();
    expect(isSessionDone(state)).toBe(true);
  });

  it('isSessionDone is false until the cap or queue is exhausted', () => {
    const state: SessionState = {
      atomIds: ['a1', 'a2', 'a3'],
      ratedAtomIds: ['a1'],
      maxAtoms: 5,
    };
    expect(isSessionDone(state)).toBe(false);
  });
});
```

- [ ] **Step 2: Run — RED**

```bash
npm test -- tests/fsrs/session.test.ts
```

- [ ] **Step 3: Commit (RED)**

```bash
git add tests/fsrs/session.test.ts
git commit -m "test(fsrs): failing tests for session logic (RED)"
```

### Task 4: Implement session logic (GREEN)

**Files:** Create `src/fsrs/session.ts`

- [ ] **Step 1: Implement** — exact content:

```ts
export interface SessionState {
  /** atom IDs in due-queue order */
  atomIds: string[];
  /** atoms already rated this session, in order */
  ratedAtomIds: string[];
  /** the cap (default 5-7 for the 3-min session) */
  maxAtoms: number;
}

export function pickNextAtomId(state: SessionState): string | null {
  if (state.ratedAtomIds.length >= state.maxAtoms) return null;
  for (const id of state.atomIds) {
    if (!state.ratedAtomIds.includes(id)) return id;
  }
  return null;
}

export function isSessionDone(state: SessionState): boolean {
  return pickNextAtomId(state) === null;
}
```

- [ ] **Step 2: Run — GREEN**

```bash
npm test -- tests/fsrs/session.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/fsrs/session.ts
git commit -m "feat(fsrs): pure session logic (pickNextAtomId, isSessionDone)"
```

---

## Phase C — useFsrsSession hook

### Task 5: Failing test for the hook

**Files:** Create `tests/hooks/useFsrsSession.test.tsx`

- [ ] **Step 1: Write the failing test** — exact content:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFsrsSession } from '@/hooks/useFsrsSession';
import type { Atom, UserAtomState } from '@/atom/types';

const NOW = new Date('2026-04-25T10:00:00Z');

function makeAtom(id: string, overrides: Partial<Atom> = {}): Atom {
  return {
    id,
    exam: 'UKMLA',
    topicPath: ['Cardiology'],
    claim: `claim ${id}`,
    canonicalStem: `stem ${id}?`,
    answer: `answer ${id}`,
    distractors: ['x', 'y', 'z'],
    difficulty: 3,
    imageUrl: null,
    imageAlt: null,
    citationUrl: 'https://nice.org.uk/cg126',
    citationLabel: 'NICE CG126',
    sourceType: 'NICE',
    prereqAtomIds: [],
    highYield: false,
    freeTier: false,
    reviewedBy: null,
    reviewedAt: null,
    status: 'approved',
    createdAt: '2026-04-25T00:00:00Z',
    updatedAt: '2026-04-25T00:00:00Z',
    ...overrides,
  };
}

function makeState(atomId: string): UserAtomState {
  return {
    userId: 'u1',
    atomId,
    stability: 0,
    difficulty: 5,
    dueAt: NOW.toISOString(),
    lastReviewAt: null,
    reps: 0,
    lapses: 0,
  };
}

function makeDeps(atoms: Atom[]) {
  const upsertState = vi.fn().mockResolvedValue(undefined);
  const insertReviewEvent = vi.fn().mockResolvedValue(undefined);
  return {
    userId: 'u1',
    now: () => NOW,
    maxAtoms: 5,
    atomRepo: {
      listApprovedByExam: vi.fn(),
      listFreeTier: vi.fn(),
      getById: vi.fn(async (id: string) => atoms.find(a => a.id === id) ?? null),
    },
    userStateRepo: {
      listDueForUser: vi.fn(async () => atoms.map(a => makeState(a.id))),
      upsertState,
      insertReviewEvent,
    },
  };
}

describe('useFsrsSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads due atoms on mount and exposes the first one', async () => {
    const atoms = [makeAtom('a1'), makeAtom('a2')];
    const deps = makeDeps(atoms);

    const { result } = renderHook(() => useFsrsSession(deps));

    await waitFor(() => expect(result.current.status).toBe('in_progress'));
    expect(result.current.currentAtom?.id).toBe('a1');
    expect(result.current.progress).toEqual({ done: 0, total: 2 });
  });

  it('rateAtom advances to the next atom and persists state + event', async () => {
    const atoms = [makeAtom('a1'), makeAtom('a2')];
    const deps = makeDeps(atoms);

    const { result } = renderHook(() => useFsrsSession(deps));
    await waitFor(() => expect(result.current.status).toBe('in_progress'));

    await act(async () => {
      await result.current.rateAtom({ rating: 3, confidence: 4, responseMs: 1234 });
    });

    expect(result.current.currentAtom?.id).toBe('a2');
    expect(result.current.progress).toEqual({ done: 1, total: 2 });
    expect(deps.userStateRepo.upsertState).toHaveBeenCalledTimes(1);
    expect(deps.userStateRepo.insertReviewEvent).toHaveBeenCalledTimes(1);
    expect(deps.userStateRepo.insertReviewEvent.mock.calls[0][0]).toMatchObject({
      atomId: 'a1',
      rating: 3,
      confidence: 4,
      responseMs: 1234,
    });
  });

  it('transitions to "summary" once maxAtoms reached', async () => {
    const atoms = [makeAtom('a1'), makeAtom('a2')];
    const deps = { ...makeDeps(atoms), maxAtoms: 2 };

    const { result } = renderHook(() => useFsrsSession(deps));
    await waitFor(() => expect(result.current.status).toBe('in_progress'));

    await act(async () => {
      await result.current.rateAtom({ rating: 3, confidence: 4, responseMs: 1000 });
    });
    await act(async () => {
      await result.current.rateAtom({ rating: 4, confidence: 4, responseMs: 1000 });
    });

    expect(result.current.status).toBe('summary');
    expect(result.current.summary?.totalAtoms).toBe(2);
  });

  it('when no atoms are due, transitions straight to "empty"', async () => {
    const deps = makeDeps([]);

    const { result } = renderHook(() => useFsrsSession(deps));

    await waitFor(() => expect(result.current.status).toBe('empty'));
    expect(result.current.currentAtom).toBeNull();
  });
});
```

- [ ] **Step 2: Run — RED**

```bash
npm test -- tests/hooks/useFsrsSession.test.tsx
```

- [ ] **Step 3: Commit (RED)**

```bash
git add tests/hooks/useFsrsSession.test.tsx
git commit -m "test(hook): failing tests for useFsrsSession (RED)"
```

### Task 6: Implement useFsrsSession (GREEN)

**Files:** Create `src/hooks/useFsrsSession.ts`

- [ ] **Step 1: Implement** — exact content:

```ts
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Atom, FsrsRatingValue, ConfidenceValue } from '@/atom/types';
import type { AtomRepository } from '@/atom/repository';
import type { UserStateRepository } from '@/atom/userStateRepository';
import { createFsrsScheduler } from '@/fsrs/scheduler';
import { fromUserAtomState, toUserAtomState } from '@/fsrs/mapper';
import { isSessionDone, pickNextAtomId, type SessionState } from '@/fsrs/session';

export interface FsrsSessionDeps {
  userId: string;
  /** Override for testability; default: () => new Date() */
  now?: () => Date;
  /** Default 5-7. The 3-min session cap. */
  maxAtoms?: number;
  atomRepo: AtomRepository;
  userStateRepo: UserStateRepository;
}

export interface RateInput {
  rating: FsrsRatingValue;
  confidence: ConfidenceValue;
  responseMs: number;
}

export interface SessionSummaryData {
  totalAtoms: number;
  ratings: FsrsRatingValue[];
  startedAt: Date;
  finishedAt: Date;
}

type Status = 'loading' | 'in_progress' | 'summary' | 'empty' | 'error';

export interface UseFsrsSessionResult {
  status: Status;
  currentAtom: Atom | null;
  progress: { done: number; total: number };
  summary: SessionSummaryData | null;
  rateAtom: (input: RateInput) => Promise<void>;
  errorMessage: string | null;
}

export function useFsrsSession(deps: FsrsSessionDeps): UseFsrsSessionResult {
  const now = deps.now ?? (() => new Date());
  const maxAtoms = deps.maxAtoms ?? 5;
  const scheduler = useMemo(() => createFsrsScheduler(), []);

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>({
    atomIds: [],
    ratedAtomIds: [],
    maxAtoms,
  });
  const atomCacheRef = useRef<Map<string, Atom>>(new Map());
  const stateCacheRef = useRef<Map<string, ReturnType<typeof fromUserAtomState>>>(new Map());
  const ratingsRef = useRef<FsrsRatingValue[]>([]);
  const startedAtRef = useRef<Date>(now());

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dueRows = await deps.userStateRepo.listDueForUser(deps.userId, now(), maxAtoms);
        if (cancelled) return;
        if (dueRows.length === 0) {
          setStatus('empty');
          return;
        }
        // Hydrate atom + state caches
        const atomIds = dueRows.map(r => r.atomId);
        const atoms = await Promise.all(atomIds.map(id => deps.atomRepo.getById(id)));
        if (cancelled) return;
        for (const a of atoms) if (a) atomCacheRef.current.set(a.id, a);
        for (const r of dueRows) stateCacheRef.current.set(r.atomId, fromUserAtomState(r));
        setSessionState({ atomIds, ratedAtomIds: [], maxAtoms });
        startedAtRef.current = now();
        setStatus('in_progress');
      } catch (err: any) {
        if (!cancelled) {
          setErrorMessage(err?.message ?? 'Failed to load session');
          setStatus('error');
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.userId]);

  const currentAtomId = pickNextAtomId(sessionState);
  const currentAtom = currentAtomId ? atomCacheRef.current.get(currentAtomId) ?? null : null;

  const rateAtom = async ({ rating, confidence, responseMs }: RateInput) => {
    if (!currentAtomId) return;
    const prevState = stateCacheRef.current.get(currentAtomId);
    if (!prevState) return;

    const { newState } = scheduler.applyReview(prevState, rating, now());
    stateCacheRef.current.set(currentAtomId, newState);

    await deps.userStateRepo.upsertState(toUserAtomState(deps.userId, currentAtomId, newState));
    await deps.userStateRepo.insertReviewEvent({
      userId: deps.userId,
      atomId: currentAtomId,
      variantId: null,
      rating,
      confidence,
      responseMs,
    });

    ratingsRef.current.push(rating);
    const nextRated = [...sessionState.ratedAtomIds, currentAtomId];
    const nextState: SessionState = { ...sessionState, ratedAtomIds: nextRated };
    setSessionState(nextState);

    if (isSessionDone(nextState)) {
      setStatus('summary');
    }
  };

  const summary: SessionSummaryData | null = status === 'summary'
    ? {
        totalAtoms: sessionState.ratedAtomIds.length,
        ratings: [...ratingsRef.current],
        startedAt: startedAtRef.current,
        finishedAt: now(),
      }
    : null;

  return {
    status,
    currentAtom,
    progress: { done: sessionState.ratedAtomIds.length, total: sessionState.atomIds.length },
    summary,
    rateAtom,
    errorMessage,
  };
}
```

- [ ] **Step 2: Run — GREEN**

```bash
npm test -- tests/hooks/useFsrsSession.test.tsx
```

If a test fails, the most likely cause is a timing issue with `waitFor` / async `useEffect`. Don't relax assertions; fix the hook.

- [ ] **Step 3: Run full suite — confirm no regressions**

```bash
npm test
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useFsrsSession.ts
git commit -m "feat(hook): useFsrsSession orchestrates atoms + FSRS + persistence (GREEN)"
```

---

## Phase D — Presentational components (TDD)

### Task 7: AtomRenderer with confidence + reveal + FSRS rating

**Files:**
- Create: `src/components/study/ConfidenceButtons.tsx`, `FsrsRatingButtons.tsx`, `AtomRenderer.tsx`
- Create: `tests/components/AtomRenderer.test.tsx`

- [ ] **Step 1: Write the failing test** for `AtomRenderer`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AtomRenderer } from '@/components/study/AtomRenderer';
import type { Atom } from '@/atom/types';

const atom: Atom = {
  id: 'a1', exam: 'UKMLA', topicPath: ['Cardiology'],
  claim: 'beta-blocker first-line for stable angina',
  canonicalStem: 'A 60-year-old man has stable exertional angina. What is first-line?',
  answer: 'Beta-blocker',
  distractors: ['ACE inhibitor', 'Calcium-channel blocker', 'Aspirin only'],
  difficulty: 3, imageUrl: null, imageAlt: null,
  citationUrl: 'https://www.nice.org.uk/guidance/cg126',
  citationLabel: 'NICE CG126',
  sourceType: 'NICE', prereqAtomIds: [], highYield: true, freeTier: true,
  reviewedBy: null, reviewedAt: null, status: 'approved',
  createdAt: '2026-04-25T00:00:00Z', updatedAt: '2026-04-25T00:00:00Z',
};

describe('<AtomRenderer />', () => {
  it('renders the stem and four confidence buttons before reveal', () => {
    render(<AtomRenderer atom={atom} onRated={vi.fn()} />);
    expect(screen.getByText(/stable exertional angina/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /how sure/i })).toHaveLength(4);
    expect(screen.queryByText(/beta-blocker/i)).not.toBeInTheDocument();
  });

  it('reveals the answer + citation after the user picks confidence', async () => {
    const user = userEvent.setup();
    render(<AtomRenderer atom={atom} onRated={vi.fn()} />);
    await user.click(screen.getAllByRole('button', { name: /how sure/i })[3]); // certain
    expect(await screen.findByText('Beta-blocker')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /NICE CG126/i })).toBeInTheDocument();
  });

  it('calls onRated with confidence + rating + responseMs when an FSRS button is clicked', async () => {
    const user = userEvent.setup();
    const onRated = vi.fn();
    render(<AtomRenderer atom={atom} onRated={onRated} />);
    await user.click(screen.getAllByRole('button', { name: /how sure/i })[2]); // confident
    await user.click(await screen.findByRole('button', { name: /^Good$/i }));
    expect(onRated).toHaveBeenCalledTimes(1);
    expect(onRated.mock.calls[0][0]).toMatchObject({
      rating: 3, confidence: 3,
    });
    expect(typeof onRated.mock.calls[0][0].responseMs).toBe('number');
  });
});
```

- [ ] **Step 2: Run — RED. Then commit failing test:**

```bash
git add tests/components/AtomRenderer.test.tsx
git commit -m "test(components): failing tests for AtomRenderer (RED)"
```

- [ ] **Step 3: Implement** — three small focused components.

`src/components/study/ConfidenceButtons.tsx`:

```tsx
import type { ConfidenceValue } from '@/atom/types';

const LABELS: Record<ConfidenceValue, string> = {
  1: 'Guessed',
  2: 'Unsure',
  3: 'Confident',
  4: 'Certain',
};

export function ConfidenceButtons({ onPick }: { onPick: (c: ConfidenceValue) => void }) {
  return (
    <div className="flex gap-2" aria-label="How sure are you?">
      {[1, 2, 3, 4].map(n => (
        <button
          key={n}
          type="button"
          aria-label={`How sure: ${LABELS[n as ConfidenceValue]}`}
          onClick={() => onPick(n as ConfidenceValue)}
          className="flex-1 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-100 text-sm"
        >
          {LABELS[n as ConfidenceValue]}
        </button>
      ))}
    </div>
  );
}
```

`src/components/study/FsrsRatingButtons.tsx`:

```tsx
import type { FsrsRatingValue } from '@/atom/types';

const RATINGS: Array<{ value: FsrsRatingValue; label: string }> = [
  { value: 1, label: 'Forgot' },
  { value: 2, label: 'Hard' },
  { value: 3, label: 'Good' },
  { value: 4, label: 'Easy' },
];

export function FsrsRatingButtons({ onPick }: { onPick: (r: FsrsRatingValue) => void }) {
  return (
    <div className="flex gap-2">
      {RATINGS.map(r => (
        <button
          key={r.value}
          type="button"
          onClick={() => onPick(r.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-100 text-sm font-medium"
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
```

`src/components/study/AtomRenderer.tsx`:

```tsx
import { useRef, useState } from 'react';
import type { Atom, ConfidenceValue, FsrsRatingValue } from '@/atom/types';
import { ConfidenceButtons } from './ConfidenceButtons';
import { FsrsRatingButtons } from './FsrsRatingButtons';

export interface AtomRated {
  rating: FsrsRatingValue;
  confidence: ConfidenceValue;
  responseMs: number;
}

export function AtomRenderer({ atom, onRated }: { atom: Atom; onRated: (r: AtomRated) => void }) {
  const startedAt = useRef(performance.now());
  const [confidence, setConfidence] = useState<ConfidenceValue | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-stone-900">{atom.canonicalStem}</h2>
      {atom.imageUrl && (
        <img src={atom.imageUrl} alt={atom.imageAlt ?? ''} className="rounded-lg max-h-64 mx-auto" />
      )}

      {confidence === null ? (
        <ConfidenceButtons onPick={setConfidence} />
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-stone-50 p-3 border border-stone-200">
            <div className="font-medium text-stone-900">{atom.answer}</div>
            <a
              href={atom.citationUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-stone-600 hover:underline mt-1 inline-block"
            >
              {atom.citationLabel}
            </a>
          </div>
          <FsrsRatingButtons
            onPick={(rating) =>
              onRated({
                rating,
                confidence,
                responseMs: Math.round(performance.now() - startedAt.current),
              })
            }
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — GREEN:**

```bash
npm test -- tests/components/AtomRenderer.test.tsx
```

- [ ] **Step 5: Commit:**

```bash
git add src/components/study/
git commit -m "feat(study): AtomRenderer + ConfidenceButtons + FsrsRatingButtons (GREEN)"
```

---

### Task 8: SessionSummary

**Files:**
- Create: `src/components/study/SessionSummary.tsx`
- Create: `tests/components/SessionSummary.test.tsx`

- [ ] **Step 1: Write the failing test:**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionSummary } from '@/components/study/SessionSummary';

describe('<SessionSummary />', () => {
  it('shows correct count, total, and a streak indicator', () => {
    render(<SessionSummary totalAtoms={5} ratings={[3, 3, 4, 1, 3]} streakDays={12} />);
    expect(screen.getByText(/4\s*\/\s*5/)).toBeInTheDocument();
    expect(screen.getByText(/streak day 12/i)).toBeInTheDocument();
  });

  it('handles a perfect session', () => {
    render(<SessionSummary totalAtoms={3} ratings={[3, 4, 4]} streakDays={1} />);
    expect(screen.getByText(/3\s*\/\s*3/)).toBeInTheDocument();
  });

  it('counts forgot (1) and hard (2) as wrong', () => {
    render(<SessionSummary totalAtoms={4} ratings={[1, 2, 3, 4]} streakDays={1} />);
    expect(screen.getByText(/2\s*\/\s*4/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — RED. Commit failing test:**

```bash
git add tests/components/SessionSummary.test.tsx
git commit -m "test(study): failing tests for SessionSummary (RED)"
```

- [ ] **Step 3: Implement:**

```tsx
import type { FsrsRatingValue } from '@/atom/types';

export function SessionSummary({
  totalAtoms,
  ratings,
  streakDays,
}: {
  totalAtoms: number;
  ratings: FsrsRatingValue[];
  streakDays: number;
}) {
  const right = ratings.filter(r => r >= 3).length;
  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-6 max-w-md mx-auto text-center space-y-2">
      <div className="text-4xl font-semibold text-stone-900">
        {right} / {totalAtoms}
      </div>
      <div className="text-sm text-stone-600">streak day {streakDays} 🔥</div>
      <div className="text-xs text-stone-500">
        Predicted exam-day score arrives in Plan 6.
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — GREEN. Commit:**

```bash
git add src/components/study/SessionSummary.tsx
git commit -m "feat(study): SessionSummary card (GREEN)"
```

---

## Phase E — FsrsSessionView shell

### Task 9: Failing test for the session shell

**Files:** Create `tests/components/FsrsSessionView.test.tsx`

- [ ] **Step 1:**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FsrsSessionView } from '@/components/study/FsrsSessionView';
import type { Atom } from '@/atom/types';

const atom: Atom = {
  id: 'a1', exam: 'UKMLA', topicPath: ['Cardiology'],
  claim: 'fact', canonicalStem: 'Stem text?', answer: 'Answer',
  distractors: ['x', 'y', 'z'], difficulty: 3,
  imageUrl: null, imageAlt: null,
  citationUrl: 'https://nice.org.uk/cg126', citationLabel: 'NICE CG126',
  sourceType: 'NICE', prereqAtomIds: [], highYield: false, freeTier: true,
  reviewedBy: null, reviewedAt: null, status: 'approved',
  createdAt: '2026-04-25T00:00:00Z', updatedAt: '2026-04-25T00:00:00Z',
};

function makeMockHookResult(overrides: any = {}) {
  return {
    status: 'in_progress',
    currentAtom: atom,
    progress: { done: 0, total: 5 },
    summary: null,
    rateAtom: vi.fn().mockResolvedValue(undefined),
    errorMessage: null,
    ...overrides,
  };
}

describe('<FsrsSessionView />', () => {
  it('shows a loading state', () => {
    render(<FsrsSessionView session={makeMockHookResult({ status: 'loading' })} streakDays={1} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an empty state when no atoms are due', () => {
    render(<FsrsSessionView session={makeMockHookResult({ status: 'empty', currentAtom: null })} streakDays={1} />);
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it('renders the atom in progress and updates progress label', () => {
    render(<FsrsSessionView session={makeMockHookResult({ progress: { done: 2, total: 5 } })} streakDays={1} />);
    expect(screen.getByText(/Stem text/i)).toBeInTheDocument();
    expect(screen.getByText(/2\s*\/\s*5/)).toBeInTheDocument();
  });

  it('shows summary when status is summary', () => {
    render(
      <FsrsSessionView
        session={makeMockHookResult({
          status: 'summary',
          currentAtom: null,
          summary: { totalAtoms: 5, ratings: [3, 3, 4, 1, 3], startedAt: new Date(), finishedAt: new Date() },
        })}
        streakDays={12}
      />,
    );
    expect(screen.getByText(/4\s*\/\s*5/)).toBeInTheDocument();
    expect(screen.getByText(/streak day 12/i)).toBeInTheDocument();
  });

  it('clicking confidence then FSRS calls rateAtom', async () => {
    const user = userEvent.setup();
    const session = makeMockHookResult();
    render(<FsrsSessionView session={session} streakDays={1} />);
    await user.click(screen.getAllByRole('button', { name: /how sure/i })[2]);
    await user.click(await screen.findByRole('button', { name: /^Good$/i }));
    await waitFor(() => expect(session.rateAtom).toHaveBeenCalledTimes(1));
  });
});
```

- [ ] **Step 2:** Run — RED. Commit failing test.

```bash
git add tests/components/FsrsSessionView.test.tsx
git commit -m "test(study): failing tests for FsrsSessionView shell (RED)"
```

### Task 10: Implement FsrsSessionView (GREEN)

**Files:** Create `src/components/study/FsrsSessionView.tsx`

- [ ] **Step 1:**

```tsx
import type { UseFsrsSessionResult } from '@/hooks/useFsrsSession';
import { AtomRenderer } from './AtomRenderer';
import { SessionSummary } from './SessionSummary';

export function FsrsSessionView({
  session,
  streakDays,
}: {
  session: UseFsrsSessionResult;
  streakDays: number;
}) {
  if (session.status === 'loading') {
    return <div className="text-stone-500 text-center py-12">Loading…</div>;
  }
  if (session.status === 'empty') {
    return (
      <div className="text-stone-700 text-center py-12 max-w-md mx-auto">
        <div className="text-2xl font-medium mb-2">All caught up 🎉</div>
        <p className="text-sm text-stone-500">No atoms due right now. Come back tomorrow.</p>
      </div>
    );
  }
  if (session.status === 'error') {
    return (
      <div className="text-red-700 text-center py-12">
        Something went wrong: {session.errorMessage}
      </div>
    );
  }
  if (session.status === 'summary' && session.summary) {
    return (
      <SessionSummary
        totalAtoms={session.summary.totalAtoms}
        ratings={session.summary.ratings}
        streakDays={streakDays}
      />
    );
  }
  // in_progress
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="text-xs text-stone-500 text-right">
        {session.progress.done} / {session.progress.total}
      </div>
      {session.currentAtom && (
        <AtomRenderer
          atom={session.currentAtom}
          onRated={(r) => session.rateAtom(r)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2:** Run — GREEN. Run full suite. Commit.

```bash
npm test
git add src/components/study/FsrsSessionView.tsx
git commit -m "feat(study): FsrsSessionView shell (GREEN)"
```

---

## Phase F — Wire route + page

### Task 11: StudyPage + route

**Files:**
- Create: `src/pages/StudyPage.tsx`
- Modify: `src/App.tsx` (add route)

- [ ] **Step 1: Implement `StudyPage`**:

```tsx
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { FsrsSessionView } from '@/components/study/FsrsSessionView';
import { useFsrsSession } from '@/hooks/useFsrsSession';
import { createAtomRepository } from '@/atom/repository';
import { createUserStateRepository } from '@/atom/userStateRepository';

export function StudyPage() {
  const { user } = useAuth();
  const atomRepo = useMemo(() => createAtomRepository(supabase), []);
  const userStateRepo = useMemo(() => createUserStateRepository(supabase), []);

  const session = useFsrsSession({
    userId: user?.id ?? '',
    atomRepo,
    userStateRepo,
    maxAtoms: 5,
  });

  if (!user) {
    return (
      <MainLayout currentPage="study">
        <div className="text-center py-12 text-stone-600">
          Sign in to study.
        </div>
      </MainLayout>
    );
  }

  // Streak placeholder until Plan 7 wires it from a server-side count.
  const streakDays = 1;

  return (
    <MainLayout currentPage="study">
      <FsrsSessionView session={session} streakDays={streakDays} />
    </MainLayout>
  );
}
```

- [ ] **Step 2: Add route in `src/App.tsx`** — add a `<Route path="/study" element={<StudyPage />} />` alongside the existing routes. Wrap in lazy() if existing routes use it. Read `App.tsx` first to match the pattern.

- [ ] **Step 3: Build**:

```bash
npm run build
```

- [ ] **Step 4: Commit**:

```bash
git add src/pages/StudyPage.tsx src/App.tsx
git commit -m "feat(study): /study route + StudyPage hosting FsrsSessionView"
```

---

## Phase G — Integration test

### Task 12: End-to-end session flow

**Files:** Create `tests/integration/study-session.test.tsx`

- [ ] **Step 1: Write the integration test** — exercises the full flow using mocked Supabase + real hook + real components. ~80 lines, similar pattern to the hook tests but renders `<FsrsSessionView>` connected to `useFsrsSession` against a stubbed Supabase that returns 2 due atoms; user rates both; summary appears.

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FsrsSessionView } from '@/components/study/FsrsSessionView';
import { useFsrsSession } from '@/hooks/useFsrsSession';
import type { Atom } from '@/atom/types';

const NOW = new Date('2026-04-25T10:00:00Z');

const atoms: Atom[] = ['a1', 'a2'].map(id => ({
  id, exam: 'UKMLA', topicPath: ['Cardiology'],
  claim: `claim ${id}`, canonicalStem: `Stem ${id}?`, answer: `Answer ${id}`,
  distractors: ['x', 'y', 'z'], difficulty: 3,
  imageUrl: null, imageAlt: null,
  citationUrl: 'https://nice.org.uk/cg126', citationLabel: 'NICE CG126',
  sourceType: 'NICE', prereqAtomIds: [], highYield: false, freeTier: true,
  reviewedBy: null, reviewedAt: null, status: 'approved',
  createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
}));

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
      listDueForUser: async () =>
        atoms.map(a => ({
          userId: 'u1', atomId: a.id, stability: 0, difficulty: 5,
          dueAt: NOW.toISOString(), lastReviewAt: null, reps: 0, lapses: 0,
        })),
      upsertState: vi.fn().mockResolvedValue(undefined),
      insertReviewEvent: vi.fn().mockResolvedValue(undefined),
    } as any,
  });
  return <FsrsSessionView session={session} streakDays={1} />;
}

describe('study session integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('full flow: load → rate 2 → summary', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await waitFor(() => expect(screen.getByText(/Stem a1\?/)).toBeInTheDocument());
    await user.click(screen.getAllByRole('button', { name: /how sure/i })[2]);
    await user.click(await screen.findByRole('button', { name: /^Good$/i }));

    await waitFor(() => expect(screen.getByText(/Stem a2\?/)).toBeInTheDocument());
    await user.click(screen.getAllByRole('button', { name: /how sure/i })[3]);
    await user.click(await screen.findByRole('button', { name: /^Easy$/i }));

    await waitFor(() => expect(screen.getByText(/2\s*\/\s*2/)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run — should pass against the implementation:**

```bash
npm test -- tests/integration/study-session.test.tsx
```

- [ ] **Step 3: Run full suite. Commit:**

```bash
npm test
git add tests/integration/study-session.test.tsx
git commit -m "test(study): integration test for full session flow"
```

---

## Phase H — Verification + first dogfood atoms

### Task 13: Seed 5 free-tier atoms in production for manual smoke

Without atoms in the DB, the `/study` route shows "all caught up". To smoke-test, we need at least a handful of approved free-tier atoms.

**Files:** Create `scripts/seed-dogfood-atoms.sql` (committed, idempotent)

- [ ] **Step 1: Write seed SQL**:

```sql
-- 5 high-yield UKMLA atoms with NICE citations, marked free_tier so
-- unauthenticated demo users can hit them. Idempotent: if an atom with
-- the same claim already exists, it's skipped.

insert into public.atoms (
  exam, topic_path, claim, canonical_stem, answer, distractors,
  difficulty, citation_url, citation_label, source_type,
  high_yield, free_tier, status, reviewed_at
)
select * from (values
  (
    'UKMLA',
    ARRAY['Cardiology', 'Stable angina'],
    'first-line treatment for stable angina is a beta-blocker (or rate-limiting CCB if intolerant)',
    'A 60-year-old man has angina on exertion, relieved by rest. Examination and resting ECG are unremarkable. What is the first-line antianginal medication?',
    'Beta-blocker',
    '["ACE inhibitor","Long-acting nitrate","Aspirin alone"]'::jsonb,
    3,
    'https://www.nice.org.uk/guidance/cg126',
    'NICE CG126',
    'NICE',
    true, true, 'approved', now()
  )
  -- … 4 more atoms in the same shape, covering: hypertension, asthma exacerbation,
  -- DKA insulin protocol, atrial fibrillation rate vs rhythm. Use NICE/BNF citations
  -- only; verify each before committing.
) as v(exam, topic_path, claim, canonical_stem, answer, distractors, difficulty,
       citation_url, citation_label, source_type, high_yield, free_tier, status, reviewed_at)
where not exists (
  select 1 from public.atoms a where a.claim = v.claim
);
```

The agent executing this task should expand the 4 placeholder atoms to real NICE/BNF-cited UKMLA-syllabus claims. **Do not invent citations.** If unsure of a fact, ask Nora before committing the file.

- [ ] **Step 2: Apply via the Supabase MCP** (or hand off to a session that has it):

```bash
# Either:
# - mcp__supabase__execute_sql with the file contents
# - OR: send the file contents to a Claude session that has the Supabase MCP loaded
```

- [ ] **Step 3: Verify**:

```sql
select count(*) from public.atoms where free_tier = true and status = 'approved';
-- expect: 5
```

- [ ] **Step 4: Commit the file**:

```bash
git add scripts/seed-dogfood-atoms.sql
git commit -m "chore: dogfood seed of 5 free-tier UKMLA atoms with NICE citations"
```

### Task 14: Final verification

- [ ] **Step 1:** `npm test` — expect all previous + Plan 2 tests pass (estimate ~22-28 total).

- [ ] **Step 2:** `npm run build` — clean.

- [ ] **Step 3:** `npx tsc --noEmit` — clean.

- [ ] **Step 4:** Manual smoke: `npm run dev`, sign in, visit `/study`, verify the 3-min session loads, rate one atom, see state persist (refresh — same atom should not reappear because its `due_at` advanced).

- [ ] **Step 5:** Append to `docs/superpowers/specs/CHANGELOG-atomic-engine.md`:

```markdown
## 2026-04-26 — Plan 2 ships: 3-min retrieval session (`/study`)

- New `/study` route with `<FsrsSessionView>` powered by `useFsrsSession`
- AtomRenderer with confidence + reveal + FSRS rating
- userStateRepository writes `user_atom_state` and `review_events`
- 5 free-tier dogfood atoms seeded for smoke testing
- Tests added: ~12 new, all passing
```

```bash
git add docs/superpowers/specs/CHANGELOG-atomic-engine.md
git commit -m "docs: log Plan 2 completion"
```

---

## Self-review checklist

1. **Spec coverage** — every Plan 2 deliverable from the spec §4.1 (3-min default mode) is implemented:
   - ☑ Pull from FSRS due-queue
   - ☑ Confidence pre-reveal
   - ☑ Reveal with citation
   - ☑ FSRS rating buttons
   - ☑ End-of-session summary
   - ☑ State + event persistence
2. **No placeholders** — search for `TBD|FIXME` outside intentional in-code TODOs.
3. **Type consistency** — `Atom`, `UserAtomState`, `FsrsCardState` field names match Plan 1's schema/types/repository.
4. **TDD discipline** — every component has a failing test before implementation.

## Out of scope for Plan 2 (deferred)

- **Mistake deck** — Plan 5
- **Mock exam mode** — Plan 9
- **Voice mode** — Plan 8
- **Predicted exam-day score** — Plan 6 (the `streakDays={1}` placeholder in `StudyPage` is a known stub)
- **Cohort leaderboards** — Plan 9
- **Streaks with grace** — Plan 7
- **Image upload pipeline** — Plan 5 (atoms with images render fine if `imageUrl` is set, but no admin UI to upload)
- **Real atom seeding** — Plan 4 (Task 13 here is just dogfood smoke seed; full pipeline is Plan 4)
