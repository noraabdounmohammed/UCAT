import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReviewQueue } from '@/hooks/useReviewQueue';
import type { Atom } from '@/atom/types';

function makeAtom(id: string, overrides: Partial<Atom> = {}): Atom {
  return {
    id, exam: 'UKMLA', topicPath: ['Cardiology'],
    claim: `claim ${id}`, canonicalStem: `stem ${id}?`, answer: `answer ${id}`,
    distractors: ['x', 'y', 'z'], difficulty: 3,
    imageUrl: null, imageAlt: null,
    citationUrl: 'https://nice.org.uk/cg126', citationLabel: 'NICE CG126',
    sourceType: 'NICE', prereqAtomIds: [], highYield: false, freeTier: false,
    reviewedBy: null, reviewedAt: null, status: 'pending_review',
    createdAt: '2026-04-25T00:00:00Z', updatedAt: '2026-04-25T00:00:00Z',
    ...overrides,
  };
}

function makeRepo(atoms: Atom[]) {
  return {
    listPendingReview: vi.fn(async () => atoms),
    approveAtom: vi.fn(async () => undefined),
    rejectAtom: vi.fn(async () => undefined),
    updateAtom: vi.fn(async () => undefined),
  };
}

describe('useReviewQueue', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads pending atoms on mount and exposes the first one', async () => {
    const repo = makeRepo([makeAtom('a1'), makeAtom('a2')]);
    const { result } = renderHook(() =>
      useReviewQueue({ exam: 'UKMLA', reviewerId: 'r1', repo: repo as any }),
    );

    await waitFor(() => expect(result.current.status).toBe('in_progress'));
    expect(result.current.currentAtom?.id).toBe('a1');
    expect(result.current.progress).toEqual({ done: 0, total: 2 });
  });

  it('approve advances queue and calls approveAtom', async () => {
    const repo = makeRepo([makeAtom('a1'), makeAtom('a2')]);
    const { result } = renderHook(() =>
      useReviewQueue({ exam: 'UKMLA', reviewerId: 'r1', repo: repo as any }),
    );
    await waitFor(() => expect(result.current.status).toBe('in_progress'));

    await act(async () => { await result.current.approve(); });

    expect(repo.approveAtom).toHaveBeenCalledWith('a1', 'r1');
    expect(result.current.currentAtom?.id).toBe('a2');
    expect(result.current.progress).toEqual({ done: 1, total: 2 });
  });

  it('reject calls rejectAtom with reason and advances', async () => {
    const repo = makeRepo([makeAtom('a1'), makeAtom('a2')]);
    const { result } = renderHook(() =>
      useReviewQueue({ exam: 'UKMLA', reviewerId: 'r1', repo: repo as any }),
    );
    await waitFor(() => expect(result.current.status).toBe('in_progress'));

    await act(async () => { await result.current.reject('bad citation'); });

    expect(repo.rejectAtom).toHaveBeenCalledWith('a1', 'r1', 'bad citation');
    expect(result.current.currentAtom?.id).toBe('a2');
  });

  it('updateAndApprove calls updateAtom then approveAtom', async () => {
    const repo = makeRepo([makeAtom('a1')]);
    const { result } = renderHook(() =>
      useReviewQueue({ exam: 'UKMLA', reviewerId: 'r1', repo: repo as any }),
    );
    await waitFor(() => expect(result.current.status).toBe('in_progress'));

    await act(async () => {
      await result.current.updateAndApprove({ claim: 'fixed claim' });
    });

    expect(repo.updateAtom).toHaveBeenCalledWith('a1', { claim: 'fixed claim' });
    expect(repo.approveAtom).toHaveBeenCalledWith('a1', 'r1');
    expect(result.current.status).toBe('empty');
  });

  it('transitions to "empty" when no pending atoms exist', async () => {
    const repo = makeRepo([]);
    const { result } = renderHook(() =>
      useReviewQueue({ exam: 'UKMLA', reviewerId: 'r1', repo: repo as any }),
    );
    await waitFor(() => expect(result.current.status).toBe('empty'));
  });
});
