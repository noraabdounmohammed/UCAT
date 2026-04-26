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
  // Pin to SBA so the test asserts MCQ behaviour deterministically; without
  // this the QuestionRouter would occasionally land in the cloze bucket.
  questionKind: 'sba',
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
      getByIds: async (ids: string[]) => atoms.filter(a => ids.includes(a.id)),
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

  it('full flow: load mistakes → answer 2 → summary', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await waitFor(() => expect(screen.getByText(/Stem m1\?/)).toBeInTheDocument());
    expect(listMistakeAtomsForUser).toHaveBeenCalledTimes(1);

    // Question 1 (m1) — pick correct, then Next
    await user.click(screen.getByRole('button', { name: /Answer m1/i }));
    await user.click(await screen.findByRole('button', { name: /Next question/i }));

    // Question 2 (m2) — pick correct, then Easy
    await waitFor(() => expect(screen.getByText(/Stem m2\?/)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Answer m2/i }));
    await user.click(await screen.findByRole('button', { name: /^Easy$/i }));

    await waitFor(() => expect(screen.getByText(/2\s*\/\s*2/)).toBeInTheDocument());
  });
});
