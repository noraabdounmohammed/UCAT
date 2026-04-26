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
  variety = [],
  seenIds = [],
}: {
  due: UserAtomState[];
  available: Atom[];
  variety?: Atom[];
  seenIds?: string[];
}) {
  const userStateRepo: UserStateRepository = {
    listDueForUser: vi.fn().mockResolvedValue(due),
    listMistakeAtomsForUser: vi.fn(),
    listAllForUser: vi.fn(),
    listReviewEventDates: vi.fn(),
    getReviewEventStats: vi.fn(),
    listSeenAtomIds: vi.fn().mockResolvedValue(seenIds),
    upsertState: vi.fn(),
    insertReviewEvent: vi.fn(),
  };
  const atomRepo: AtomRepository = {
    listApprovedByExam: vi.fn(),
    listFreeTier: vi.fn(),
    listAvailableForExam: vi.fn().mockResolvedValue(available),
    listVarietyForExam: vi.fn().mockResolvedValue(variety),
    getById: vi.fn(),
    getByIds: vi.fn(),
    countApprovedByExam: vi.fn(),
    countAvailableForExam: vi.fn(),
  };
  return { userStateRepo, atomRepo };
}

describe('buildStudyQueue', () => {
  it('caps total at maxAtoms when due rows are plentiful (variety still reserved)', async () => {
    // Variety phase reserves up to 2 slots even when FSRS-due is plentiful,
    // so a 3-atom session = up to 2 variety + due-fill (cap 3).
    const due = [makeUserState('a1'), makeUserState('a2'), makeUserState('a3'), makeUserState('a4')];
    const { userStateRepo, atomRepo } = makeRepos({ due, available: [], variety: [] });

    const queue = await buildStudyQueue({
      userId: USER_ID, exam: 'UKMLA', asOf: NOW, maxAtoms: 3,
      includeUnreviewed: false, atomRepo, userStateRepo,
    });

    expect(queue.length).toBeLessThanOrEqual(3);
    // Variety pool was queried even though due was plentiful.
    expect(atomRepo.listVarietyForExam).toHaveBeenCalled();
  });

  it('injects variety atoms (calc/EMQ/case) ahead of FSRS-due when bank has them', async () => {
    const due = [makeUserState('d1'), makeUserState('d2'), makeUserState('d3'), makeUserState('d4')];
    const calcAtom = makeAtom('calc1', { questionKind: 'calc' });
    const emqAtom = makeAtom('emq1', { questionKind: 'emq' });
    const { userStateRepo, atomRepo } = makeRepos({
      due, available: [], variety: [calcAtom, emqAtom],
    });

    const queue = await buildStudyQueue({
      userId: USER_ID, exam: 'UKMLA', asOf: NOW, maxAtoms: 5,
      includeUnreviewed: false, atomRepo, userStateRepo,
    });

    // 2 variety reserved + 3 due (5 total).
    expect(queue).toHaveLength(5);
    const ids = queue.map(q => q.atomId);
    expect(ids).toContain('calc1');
    expect(ids).toContain('emq1');
  });

  it('tops up with brand-new atoms when due rows + variety are short', async () => {
    const due = [makeUserState('a1')];
    const newAtom = makeAtom('a2');
    const { userStateRepo, atomRepo } = makeRepos({
      due, available: [newAtom], variety: [],
    });

    const queue = await buildStudyQueue({
      userId: USER_ID, exam: 'UKMLA', asOf: NOW, maxAtoms: 5,
      includeUnreviewed: false, atomRepo, userStateRepo,
    });

    expect(queue.length).toBeGreaterThanOrEqual(2);
    const ids = queue.map(q => q.atomId);
    expect(ids).toContain('a1');
    expect(ids).toContain('a2');
  });

  it('passes includeUnreviewed through to both variety and top-up calls', async () => {
    const { userStateRepo, atomRepo } = makeRepos({ due: [], available: [], variety: [] });

    await buildStudyQueue({
      userId: USER_ID, exam: 'UKMLA', asOf: NOW, maxAtoms: 5,
      includeUnreviewed: true, atomRepo, userStateRepo,
    });

    expect(atomRepo.listVarietyForExam).toHaveBeenCalledWith(
      'UKMLA',
      expect.objectContaining({ includeUnreviewedAiDrafts: true }),
    );
    expect(atomRepo.listAvailableForExam).toHaveBeenCalledWith(
      'UKMLA',
      expect.objectContaining({ includeUnreviewedAiDrafts: true }),
    );
  });

  it('returns empty queue when no phase produces rows', async () => {
    const { userStateRepo, atomRepo } = makeRepos({ due: [], available: [], variety: [] });

    const queue = await buildStudyQueue({
      userId: USER_ID, exam: 'UKMLA', asOf: NOW, maxAtoms: 5,
      includeUnreviewed: true, atomRepo, userStateRepo,
    });

    expect(queue).toEqual([]);
  });
});
