import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMockSession } from '@/hooks/useMockSession';
import type { Atom } from '@/atom/types';

function makeAtom(id: string): Atom {
  return {
    id, exam: 'UKMLA', topicPath: ['x'],
    claim: `c${id}`, canonicalStem: `Stem ${id}?`, answer: `A${id}`,
    distractors: ['d1', 'd2', 'd3'], difficulty: 3,
    imageUrl: null, imageAlt: null,
    citationUrl: 'https://nice.org.uk/cg126', citationLabel: 'NICE CG126',
    sourceType: 'NICE', prereqAtomIds: [], highYield: false, freeTier: false,
    reviewedBy: null, reviewedAt: null, status: 'approved',
    createdAt: '2026-04-25T00:00:00Z', updatedAt: '2026-04-25T00:00:00Z',
  };
}

describe('useMockSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads atoms and exposes the first atom', async () => {
    const atomRepo = {
      listApprovedByExam: vi.fn(),
      listAvailableForExam: vi.fn(async () => [makeAtom('a1'), makeAtom('a2'), makeAtom('a3')]),
      listFreeTier: vi.fn(),
      getById: vi.fn(),
      getByIds: vi.fn(),
      countApprovedByExam: vi.fn(),
    };
    const { result } = renderHook(() =>
      useMockSession({
        atomRepo: atomRepo as any,
        exam: 'UKMLA',
        atomCount: 3,
        durationSec: 1800,
        startTimer: () => () => {},
      })
    );
    await waitFor(() => expect(result.current.status).toBe('in_progress'));
    expect(result.current.currentAtom?.id).toBeDefined();
    expect(result.current.progress).toEqual({ done: 0, total: 3 });
  });

  it('pick records the answer at the current index without auto-advancing', async () => {
    const atomRepo = {
      listApprovedByExam: vi.fn(),
      listAvailableForExam: vi.fn(async () => [makeAtom('a1'), makeAtom('a2')]),
      listFreeTier: vi.fn(), getById: vi.fn(), getByIds: vi.fn(), countApprovedByExam: vi.fn(),
    };
    const { result } = renderHook(() =>
      useMockSession({
        atomRepo: atomRepo as any,
        exam: 'UKMLA',
        atomCount: 2,
        durationSec: 1800,
        startTimer: () => () => {},
      })
    );
    await waitFor(() => expect(result.current.status).toBe('in_progress'));
    const firstAtomId = result.current.currentAtom?.id;
    act(() => result.current.pick({ correct: true, choiceIndex: 0 }));
    // Same atom (no auto-advance) but pick recorded.
    expect(result.current.currentAtom?.id).toBe(firstAtomId);
    expect(result.current.progress).toEqual({ done: 1, total: 2 });
    expect(result.current.picks[0]).toEqual({ correct: true, choiceIndex: 0 });
  });

  it('submit() finalizes — flips status to review with score, blanks count as 0', async () => {
    const atomRepo = {
      listApprovedByExam: vi.fn(),
      listAvailableForExam: vi.fn(async () => [makeAtom('a1'), makeAtom('a2')]),
      listFreeTier: vi.fn(), getById: vi.fn(), getByIds: vi.fn(), countApprovedByExam: vi.fn(),
    };
    const { result } = renderHook(() =>
      useMockSession({
        atomRepo: atomRepo as any,
        exam: 'UKMLA',
        atomCount: 2,
        durationSec: 1800,
        startTimer: () => () => {},
      })
    );
    await waitFor(() => expect(result.current.status).toBe('in_progress'));
    act(() => result.current.pick({ correct: true, choiceIndex: 0 }));
    act(() => result.current.goNext());
    act(() => result.current.pick({ correct: false, choiceIndex: 1 }));
    act(() => result.current.submit());
    expect(result.current.status).toBe('review');
    expect(result.current.score?.correct).toBe(1);
    expect(result.current.score?.total).toBe(2);
    expect(result.current.score?.percentage).toBe(50);
  });

  it('flag() toggles flagged set for the current question', async () => {
    const atomRepo = {
      listApprovedByExam: vi.fn(),
      listAvailableForExam: vi.fn(async () => [makeAtom('a1'), makeAtom('a2')]),
      listFreeTier: vi.fn(), getById: vi.fn(), getByIds: vi.fn(), countApprovedByExam: vi.fn(),
    };
    const { result } = renderHook(() =>
      useMockSession({
        atomRepo: atomRepo as any,
        exam: 'UKMLA',
        atomCount: 2,
        durationSec: 1800,
        startTimer: () => () => {},
      })
    );
    await waitFor(() => expect(result.current.status).toBe('in_progress'));
    expect(result.current.flagged.has(0)).toBe(false);
    act(() => result.current.flag());
    expect(result.current.flagged.has(0)).toBe(true);
    act(() => result.current.flag());
    expect(result.current.flagged.has(0)).toBe(false);
  });

  it('empty bank → status=empty', async () => {
    const atomRepo = {
      listApprovedByExam: vi.fn(),
      listAvailableForExam: vi.fn(async () => []),
      listFreeTier: vi.fn(), getById: vi.fn(), getByIds: vi.fn(), countApprovedByExam: vi.fn(),
    };
    const { result } = renderHook(() =>
      useMockSession({
        atomRepo: atomRepo as any,
        exam: 'UKMLA',
        atomCount: 5,
        durationSec: 1800,
        startTimer: () => () => {},
      })
    );
    await waitFor(() => expect(result.current.status).toBe('empty'));
  });
});
