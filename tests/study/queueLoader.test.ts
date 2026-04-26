import { describe, it, expect, vi } from 'vitest';
import { buildStudyQueue } from '@/study/queueLoader';
import type { Atom, UserAtomState } from '@/atom/types';
import type { AtomRepository } from '@/atom/repository';
import type { UserStateRepository } from '@/atom/userStateRepository';

const NOW = new Date('2026-04-26T12:00:00Z');
const USER_ID = 'user-1';

function makeAtom(id: string, overrides: Partial<Atom> = {}): Atom {
  return {
    id, exam: 'UKMLA', topicPath: ['Cardiology'],
    claim: `claim ${id}`, canonicalStem: `stem ${id}`,
    answer: `ans ${id}`, distractors: ['x', 'y', 'z'],
    difficulty: 3, imageUrl: null, imageAlt: null,
    citationUrl: '', citationLabel: 'NICE',
    sourceType: 'NICE', prereqAtomIds: [], highYield: false, freeTier: false,
    reviewedBy: null, reviewedAt: null, status: 'approved',
    createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

function makeUserState(atomId: string): UserAtomState {
  return {
    userId: USER_ID, atomId,
    stability: 1, difficulty: 5,
    dueAt: NOW.toISOString(), lastReviewAt: NOW.toISOString(),
    reps: 1, lapses: 0,
  };
}

function makeRepos({
  due,
  available,
}: {
  due: UserAtomState[];
  available: Atom[];
}) {
  const userStateRepo: UserStateRepository = {
    listDueForUser: vi.fn().mockResolvedValue(due),
    listMistakeAtomsForUser: vi.fn(),
    listAllForUser: vi.fn(),
    listReviewEventDates: vi.fn(),
    upsertState: vi.fn(),
    insertReviewEvent: vi.fn(),
  };
  const atomRepo: AtomRepository = {
    listApprovedByExam: vi.fn(),
    listFreeTier: vi.fn(),
    listAvailableForExam: vi.fn().mockResolvedValue(available),
    getById: vi.fn(),
    countApprovedByExam: vi.fn(),
  };
  return { userStateRepo, atomRepo };
}

describe('buildStudyQueue', () => {
  it('returns due rows directly when there are already enough', async () => {
    const due = [makeUserState('a1'), makeUserState('a2'), makeUserState('a3')];
    const { userStateRepo, atomRepo } = makeRepos({ due, available: [] });

    const queue = await buildStudyQueue({
      userId: USER_ID, exam: 'UKMLA', asOf: NOW, maxAtoms: 3,
      includeUnreviewed: false, atomRepo, userStateRepo,
    });

    expect(queue).toHaveLength(3);
    expect(atomRepo.listAvailableForExam).not.toHaveBeenCalled();
  });

  it('tops up with new pristine atoms when due rows are short', async () => {
    const due = [makeUserState('a1')];
    const newAtom = makeAtom('a2');
    const { userStateRepo, atomRepo } = makeRepos({ due, available: [newAtom] });

    const queue = await buildStudyQueue({
      userId: USER_ID, exam: 'UKMLA', asOf: NOW, maxAtoms: 5,
      includeUnreviewed: false, atomRepo, userStateRepo,
    });

    expect(queue).toHaveLength(2);
    expect(queue[0].atomId).toBe('a1');
    expect(queue[1]).toMatchObject({
      userId: USER_ID, atomId: 'a2',
      reps: 0, lapses: 0, lastReviewAt: null, // pristine
    });
    expect(atomRepo.listAvailableForExam).toHaveBeenCalledWith('UKMLA', {
      includeUnreviewedAiDrafts: false,
      excludeAtomIds: ['a1'],
      limit: 4,
    });
  });

  it('passes includeUnreviewed through to the atom repo', async () => {
    const { userStateRepo, atomRepo } = makeRepos({ due: [], available: [] });

    await buildStudyQueue({
      userId: USER_ID, exam: 'UKMLA', asOf: NOW, maxAtoms: 5,
      includeUnreviewed: true, atomRepo, userStateRepo,
    });

    expect(atomRepo.listAvailableForExam).toHaveBeenCalledWith('UKMLA', {
      includeUnreviewedAiDrafts: true,
      excludeAtomIds: [],
      limit: 5,
    });
  });

  it('returns empty queue when neither phase produces rows', async () => {
    const { userStateRepo, atomRepo } = makeRepos({ due: [], available: [] });

    const queue = await buildStudyQueue({
      userId: USER_ID, exam: 'UKMLA', asOf: NOW, maxAtoms: 5,
      includeUnreviewed: true, atomRepo, userStateRepo,
    });

    expect(queue).toEqual([]);
  });
});
