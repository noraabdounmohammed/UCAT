import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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
      getByIds: async (ids: string[]) => atoms.filter(a => ids.includes(a.id)),
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
    render(<MemoryRouter><Harness /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText(/Stem a1\?/)).toBeInTheDocument());
    // Question 1 (a1) — pick correct, then Next
    await user.click(screen.getByRole('button', { name: /Answer a1/i }));
    await user.click(await screen.findByRole('button', { name: /Next question/i }));

    await waitFor(() => expect(screen.getByText(/Stem a2\?/)).toBeInTheDocument());
    // Question 2 (a2) — pick correct, then Easy
    await user.click(screen.getByRole('button', { name: /Answer a2/i }));
    await user.click(await screen.findByRole('button', { name: /^Easy$/i }));

    await waitFor(() => expect(screen.getByText(/2\s*\/\s*2/)).toBeInTheDocument());
  });
});
