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
