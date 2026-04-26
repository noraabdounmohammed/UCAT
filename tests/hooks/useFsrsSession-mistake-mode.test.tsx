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
      getByIds: vi.fn(async (ids: string[]) => atoms.filter(a => ids.includes(a.id))),
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
