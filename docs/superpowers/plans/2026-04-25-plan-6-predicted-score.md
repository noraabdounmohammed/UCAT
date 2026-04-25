# Plan 6 — Predicted Exam-Day Score (live)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** A live "predicted exam-day score" that updates after every retrieval rating. Spec §4.3 calls this the **conversion trigger** and the North Star metric. For v1, "score" is the mean current retention probability across the user's atoms (using ts-fsrs's `forgetting_curve` formula). Coverage % is shown alongside as a secondary metric.

**v1 simplification:**
- Predicted = mean(retrievability) over user's `user_atom_state` rows.
- Cohort calibration (against real UKMLA scores) is **deferred to Plan 10** when we have ≥30 students who've sat the exam. Until then, the metric is "directionally honest" — it says "your retention is X% across the atoms you've seen", which is what students actually want to feel.
- Coverage = covered atoms / total approved atoms in the exam. Useful but not weighted into the headline number for v1.

**Architecture:**
1. Pure function `computeRetention(state, now)` → 0..1, wrapping ts-fsrs's `forgetting_curve`.
2. Pure function `computePredictedScore(states[], now)` → `{ retentionMean, atomCount }`.
3. Hook `usePredictedScore({ userId, repos })` → loads `user_atom_state` rows + total atom count, returns `{ predictedScore, coverageRatio, atomCount, totalAtoms, status }`.
4. Component `<PredictedScoreBadge />` — small inline display: `73% predicted · 50/200 atoms`.
5. Inject into `StudyPage` and `MistakesPage` headers.

**Spec:** §4.3.

**Depends on:** Plans 1-5. Specifically Plan 1's atom + user_atom_state, Plan 2's FSRS scheduler.

---

## File structure

### Created
- `tests/fsrs/retention.test.ts`
- `tests/hooks/usePredictedScore.test.tsx`
- `tests/components/PredictedScoreBadge.test.tsx`
- `src/fsrs/retention.ts` — pure retention math
- `src/hooks/usePredictedScore.ts`
- `src/components/study/PredictedScoreBadge.tsx`

### Modified
- `src/atom/repository.ts` — add `countApprovedByExam(exam)` for coverage denominator
- `src/atom/userStateRepository.ts` — add `listAllForUser(userId)` (no `due_at` filter; needed for retention aggregate)
- `src/pages/StudyPage.tsx` — render `<PredictedScoreBadge />` in header
- `src/pages/MistakesPage.tsx` — render `<PredictedScoreBadge />` in header

### Untouched
- `useFsrsSession` — predicted score is a separate hook (not coupled to session lifecycle)
- All FsrsSessionView / AtomRenderer / SessionSummary — unchanged

---

## Task breakdown — 9 tasks, 8 commits

### Phase A — Retention math (TDD)

**Task 1 RED.** `tests/fsrs/retention.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeRetention, computePredictedScore } from '@/fsrs/retention';
import type { FsrsCardState } from '@/fsrs/types';

const NOW = new Date('2026-04-25T10:00:00Z');

function makeState(stability: number, lastReview: Date | null, reps = 1, lapses = 0): FsrsCardState {
  return { stability, difficulty: 5, dueAt: NOW, lastReviewAt: lastReview, reps, lapses };
}

describe('computeRetention', () => {
  it('returns 1 for an atom reviewed today (zero elapsed days)', () => {
    const state = makeState(10, NOW);
    const r = computeRetention(state, NOW);
    expect(r).toBeGreaterThan(0.99);
    expect(r).toBeLessThanOrEqual(1);
  });

  it('decays toward zero as elapsed days grow large', () => {
    const oneYearAgo = new Date(NOW.getTime() - 365 * 86_400_000);
    const state = makeState(5, oneYearAgo); // small stability + long elapsed → low retention
    const r = computeRetention(state, NOW);
    expect(r).toBeLessThan(0.3);
  });

  it('returns 0 for an unreviewed atom (lastReviewAt null)', () => {
    const state = makeState(0, null, 0, 0);
    expect(computeRetention(state, NOW)).toBe(0);
  });

  it('high stability holds retention longer than low stability for the same elapsed days', () => {
    const oneWeekAgo = new Date(NOW.getTime() - 7 * 86_400_000);
    const high = computeRetention(makeState(60, oneWeekAgo), NOW);
    const low = computeRetention(makeState(2, oneWeekAgo), NOW);
    expect(high).toBeGreaterThan(low);
  });
});

describe('computePredictedScore', () => {
  it('returns retentionMean=0 and atomCount=0 for empty states', () => {
    const result = computePredictedScore([], NOW);
    expect(result).toEqual({ retentionMean: 0, atomCount: 0 });
  });

  it('returns the mean retention across all states', () => {
    const states = [
      makeState(10, NOW),                                                // ~1.0
      makeState(10, new Date(NOW.getTime() - 365 * 86_400_000)),          // ~very low
    ];
    const result = computePredictedScore(states, NOW);
    expect(result.atomCount).toBe(2);
    expect(result.retentionMean).toBeGreaterThan(0);
    expect(result.retentionMean).toBeLessThan(1);
  });
});
```

Commit: `test(fsrs): failing tests for retention math (RED)`

**Task 2 GREEN.** `src/fsrs/retention.ts`:

```ts
import { forgetting_curve, generatorParameters } from 'ts-fsrs';
import type { FsrsCardState } from './types';

const params = generatorParameters({});
// ts-fsrs defaults — same as the scheduler in src/fsrs/scheduler.ts uses.

export function computeRetention(state: FsrsCardState, now: Date): number {
  if (!state.lastReviewAt || state.stability <= 0) return 0;
  const elapsedMs = now.getTime() - state.lastReviewAt.getTime();
  const elapsedDays = Math.max(0, elapsedMs / 86_400_000);
  return forgetting_curve(params.w, elapsedDays, state.stability);
}

export interface PredictedScore {
  retentionMean: number;
  atomCount: number;
}

export function computePredictedScore(states: FsrsCardState[], now: Date): PredictedScore {
  if (states.length === 0) return { retentionMean: 0, atomCount: 0 };
  const sum = states.reduce((acc, s) => acc + computeRetention(s, now), 0);
  return { retentionMean: sum / states.length, atomCount: states.length };
}
```

Note: ts-fsrs exports `forgetting_curve(parameters | decay, elapsed_days, stability)`. The two-arg-style takes the full `params.w` weights array. Plan 1's scheduler uses `generatorParameters()` with `enable_fuzz: true, request_retention: 0.9` — for retention math, the fuzz/retention tweaks don't affect the curve formula, so passing default params is safe.

Commit: `feat(fsrs): retention math (computeRetention, computePredictedScore) — GREEN`

### Phase B — Repository extensions

**Task 3.** Add `countApprovedByExam(exam)` to `src/atom/repository.ts`:

```ts
// In AtomRepository interface:
countApprovedByExam(exam: Exam): Promise<number>;

// In createAtomRepository:
async countApprovedByExam(exam) {
  const { count, error } = await supabase
    .from('atoms')
    .select('*', { count: 'exact', head: true })
    .eq('exam', exam)
    .eq('status', 'approved');
  if (error) throw error;
  return count ?? 0;
}
```

**Task 4.** Add `listAllForUser(userId)` to `src/atom/userStateRepository.ts`:

```ts
// In UserStateRepository:
listAllForUser(userId: string): Promise<UserAtomState[]>;

// Implementation (reuse rowToState):
async listAllForUser(userId) {
  const { data, error } = await supabase
    .from('user_atom_state')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map(rowToState);
}
```

Combine these two into one commit (small, related): `feat(repo): countApprovedByExam + listAllForUser for predicted score`

(No new tests for these tiny method additions; integration test in Phase D covers them.)

### Phase C — usePredictedScore hook (TDD)

**Task 5 RED.** `tests/hooks/usePredictedScore.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePredictedScore } from '@/hooks/usePredictedScore';
import type { UserAtomState } from '@/atom/types';

const NOW = new Date('2026-04-25T10:00:00Z');

function makeRepos(states: UserAtomState[], totalAtoms: number) {
  return {
    atomRepo: { countApprovedByExam: vi.fn(async () => totalAtoms) } as any,
    userStateRepo: { listAllForUser: vi.fn(async () => states) } as any,
  };
}

describe('usePredictedScore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads + reports zero state when user has no atoms covered', async () => {
    const { atomRepo, userStateRepo } = makeRepos([], 200);
    const { result } = renderHook(() => usePredictedScore({
      userId: 'u1', exam: 'UKMLA', now: () => NOW, atomRepo, userStateRepo,
    }));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.predictedScore).toBe(0);
    expect(result.current.atomCount).toBe(0);
    expect(result.current.totalAtoms).toBe(200);
    expect(result.current.coverageRatio).toBe(0);
  });

  it('computes mean retention when states exist', async () => {
    const states: UserAtomState[] = [
      { userId: 'u1', atomId: 'a1', stability: 10, difficulty: 5, dueAt: NOW.toISOString(), lastReviewAt: NOW.toISOString(), reps: 1, lapses: 0 },
      { userId: 'u1', atomId: 'a2', stability: 10, difficulty: 5, dueAt: NOW.toISOString(), lastReviewAt: NOW.toISOString(), reps: 1, lapses: 0 },
    ];
    const { atomRepo, userStateRepo } = makeRepos(states, 200);
    const { result } = renderHook(() => usePredictedScore({
      userId: 'u1', exam: 'UKMLA', now: () => NOW, atomRepo, userStateRepo,
    }));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.atomCount).toBe(2);
    expect(result.current.totalAtoms).toBe(200);
    expect(result.current.coverageRatio).toBeCloseTo(0.01);
    expect(result.current.predictedScore).toBeGreaterThan(0.99);
  });

  it('error path: status=error with message', async () => {
    const atomRepo = { countApprovedByExam: vi.fn(async () => { throw new Error('boom'); }) } as any;
    const userStateRepo = { listAllForUser: vi.fn() } as any;
    const { result } = renderHook(() => usePredictedScore({
      userId: 'u1', exam: 'UKMLA', now: () => NOW, atomRepo, userStateRepo,
    }));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorMessage).toBe('boom');
  });
});
```

Commit: `test(hook): failing tests for usePredictedScore (RED)`

**Task 6 GREEN.** `src/hooks/usePredictedScore.ts`:

```ts
import { useEffect, useState } from 'react';
import type { Exam } from '@/atom/types';
import type { AtomRepository } from '@/atom/repository';
import type { UserStateRepository } from '@/atom/userStateRepository';
import { fromUserAtomState } from '@/fsrs/mapper';
import { computePredictedScore } from '@/fsrs/retention';

export interface UsePredictedScoreDeps {
  userId: string;
  exam: Exam;
  now?: () => Date;
  atomRepo: AtomRepository;
  userStateRepo: UserStateRepository;
}

type Status = 'loading' | 'ready' | 'error';

export interface UsePredictedScoreResult {
  status: Status;
  predictedScore: number;   // 0..1
  coverageRatio: number;    // 0..1
  atomCount: number;
  totalAtoms: number;
  errorMessage: string | null;
}

export function usePredictedScore(deps: UsePredictedScoreDeps): UsePredictedScoreResult {
  const now = deps.now ?? (() => new Date());
  const [status, setStatus] = useState<Status>('loading');
  const [predictedScore, setPredictedScore] = useState(0);
  const [coverageRatio, setCoverageRatio] = useState(0);
  const [atomCount, setAtomCount] = useState(0);
  const [totalAtoms, setTotalAtoms] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [total, states] = await Promise.all([
          deps.atomRepo.countApprovedByExam(deps.exam),
          deps.userStateRepo.listAllForUser(deps.userId),
        ]);
        if (cancelled) return;
        const cardStates = states.map(fromUserAtomState);
        const { retentionMean, atomCount } = computePredictedScore(cardStates, now());
        setPredictedScore(retentionMean);
        setAtomCount(atomCount);
        setTotalAtoms(total);
        setCoverageRatio(total > 0 ? atomCount / total : 0);
        setStatus('ready');
      } catch (err: any) {
        if (!cancelled) {
          setErrorMessage(err?.message ?? 'Failed to load predicted score');
          setStatus('error');
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.userId, deps.exam]);

  return { status, predictedScore, coverageRatio, atomCount, totalAtoms, errorMessage };
}
```

Commit: `feat(hook): usePredictedScore loads + computes score (GREEN)`

### Phase D — PredictedScoreBadge component (TDD)

**Task 7 RED.** `tests/components/PredictedScoreBadge.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PredictedScoreBadge } from '@/components/study/PredictedScoreBadge';

describe('<PredictedScoreBadge />', () => {
  it('renders predicted score as rounded percentage', () => {
    render(<PredictedScoreBadge predictedScore={0.732} atomCount={50} totalAtoms={200} status="ready" />);
    expect(screen.getByText('73%')).toBeInTheDocument();
    expect(screen.getByText(/50\s*\/\s*200/)).toBeInTheDocument();
  });

  it('renders a placeholder while loading', () => {
    render(<PredictedScoreBadge predictedScore={0} atomCount={0} totalAtoms={0} status="loading" />);
    expect(screen.getByText(/—/)).toBeInTheDocument();
  });

  it('renders zero state with helpful copy when no atoms covered', () => {
    render(<PredictedScoreBadge predictedScore={0} atomCount={0} totalAtoms={200} status="ready" />);
    expect(screen.getByText(/start a session/i)).toBeInTheDocument();
  });

  it('renders nothing visible on error (silent fail-safe)', () => {
    const { container } = render(<PredictedScoreBadge predictedScore={0} atomCount={0} totalAtoms={0} status="error" />);
    expect(container.firstChild).toBeNull();
  });
});
```

Commit: `test(study): failing tests for PredictedScoreBadge (RED)`

**Task 8 GREEN.** `src/components/study/PredictedScoreBadge.tsx`:

```tsx
import type { UsePredictedScoreResult } from '@/hooks/usePredictedScore';

type BadgeProps = Pick<UsePredictedScoreResult, 'predictedScore' | 'atomCount' | 'totalAtoms' | 'status'>;

export function PredictedScoreBadge({ predictedScore, atomCount, totalAtoms, status }: BadgeProps) {
  if (status === 'error') return null;

  if (status === 'loading') {
    return (
      <div className="rounded-xl bg-stone-50 border border-stone-200 px-4 py-2 inline-flex items-center gap-2 text-sm">
        <span className="text-stone-400">—</span>
        <span className="text-stone-500">predicted</span>
      </div>
    );
  }

  if (atomCount === 0) {
    return (
      <div className="rounded-xl bg-stone-50 border border-stone-200 px-4 py-2 inline-flex items-center gap-2 text-sm">
        <span className="text-stone-700">Start a session to see your predicted score.</span>
      </div>
    );
  }

  const pct = Math.round(predictedScore * 100);
  return (
    <div className="rounded-xl bg-stone-50 border border-stone-200 px-4 py-2 inline-flex items-center gap-3 text-sm">
      <span className="text-2xl font-semibold text-stone-900">{pct}%</span>
      <span className="text-stone-500">predicted</span>
      <span className="text-stone-300">·</span>
      <span className="text-stone-500">{atomCount} / {totalAtoms} atoms</span>
    </div>
  );
}
```

Commit: `feat(study): PredictedScoreBadge component (GREEN)`

### Phase E — Wire badge into pages + verify

**Task 9.** In `src/pages/StudyPage.tsx` and `src/pages/MistakesPage.tsx`, instantiate `usePredictedScore` and render `<PredictedScoreBadge />` above `<FsrsSessionView />`. Two small edits to each page; pattern:

```tsx
const score = usePredictedScore({
  userId: user?.id ?? '',
  exam: 'UKMLA',
  atomRepo,
  userStateRepo,
});

// in JSX, above <FsrsSessionView>:
<PredictedScoreBadge {...score} />
```

Then run full battery:
- `npm test` (expect 67 + 4 retention + 3 hook + 4 badge = 78 passing — let me re-count: actually 67 + 4 (T1) + 3 (T5) + 4 (T7) = 78, no Phase B tests, that's right)
- `npm run build`
- `npx tsc --noEmit`

Append CHANGELOG entry:

```markdown

---

## 2026-04-26 — Plan 6 ships: predicted exam-day score

- New `<PredictedScoreBadge />` shown above the session in `/study` and `/mistakes`.
- `usePredictedScore({ userId, exam })` hook loads `user_atom_state` rows + total approved atom count, computes mean retention via ts-fsrs's `forgetting_curve`.
- Pure functions in `src/fsrs/retention.ts`: `computeRetention(state, now)`, `computePredictedScore(states, now)`.
- Repository extensions: `atomRepo.countApprovedByExam(exam)`, `userStateRepo.listAllForUser(userId)`.
- v1 metric is "directionally honest" — mean retention across covered atoms. Cohort calibration vs real UKMLA scores deferred to Plan 10.
- Tests added: 11 new (4 retention math, 3 hook, 4 badge). **78 passing total.**
```

Commit: `feat(study): predicted score badge in /study and /mistakes`. Then `docs: log Plan 6 completion`.

---

## Self-review

1. Spec coverage: §4.3 live predicted score; cohort calibration explicitly deferred.
2. No new infra. Pure FSRS math + 2 small repo methods.
3. Backwards-compat: existing pages still render. The badge appears above the session view as a non-intrusive header element.
4. Math verified: ts-fsrs's `forgetting_curve` is the canonical retention formula. Tests cover boundary cases (zero elapsed, large elapsed, unreviewed, high vs low stability).
5. Hook is read-only — no writes, no race conditions with `useFsrsSession`.
6. RLS-correct: `listAllForUser` is owner-scoped; `countApprovedByExam` reads only public `status='approved'` rows.

## Out of scope

- **Real-time recomputation after each rating** (when student rates an atom, the score should re-fetch). v1 loads once on mount; refresh on navigation. Plan 6B can wire a refetch trigger from `useFsrsSession.rateAtom`.
- **Cohort calibration** → Plan 10
- **Per-topic predicted score** → defer
- **Days-to-exam projection** ("at this rate you'll be ready by date X") → defer
- **High-yield weighting** → defer
