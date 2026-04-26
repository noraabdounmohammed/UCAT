import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockQuestion } from '@/components/mock/MockQuestion';
import { MockResult } from '@/components/mock/MockResult';
import { useMockSession } from '@/hooks/useMockSession';
import type { Atom } from '@/atom/types';

const atoms: Atom[] = ['a1', 'a2'].map(id => ({
  id, exam: 'UKMLA', topicPath: ['Cardiology'],
  claim: `c${id}`, canonicalStem: `Stem ${id}?`,
  answer: 'Right',
  distractors: ['Wrong1', 'Wrong2', 'Wrong3'],
  difficulty: 3, imageUrl: null, imageAlt: null,
  citationUrl: 'https://nice.org.uk/cg126', citationLabel: 'NICE CG126',
  sourceType: 'NICE', prereqAtomIds: [], highYield: false, freeTier: false,
  reviewedBy: null, reviewedAt: null, status: 'approved',
  createdAt: '2026-04-25T00:00:00Z', updatedAt: '2026-04-25T00:00:00Z',
}));

function Harness() {
  const session = useMockSession({
    atomRepo: {
      listApprovedByExam: vi.fn(),
      listAvailableForExam: async () => atoms,
      listFreeTier: vi.fn(),
      getById: vi.fn(),
      getByIds: vi.fn(),
      countApprovedByExam: vi.fn(),
    } as any,
    exam: 'UKMLA',
    atomCount: 2,
    durationSec: 1800,
    startTimer: () => () => {}, // no-op timer in tests
  });
  if (session.status === 'in_progress' && session.currentAtom) {
    return (
      <MockQuestion
        key={session.currentAtom.id}
        atom={session.currentAtom}
        onSubmit={(a) => session.submit(a)}
      />
    );
  }
  if (session.status === 'finished' && session.score) {
    return (
      <MockResult
        correct={session.score.correct}
        total={session.score.total}
        percentage={session.score.percentage}
        timeUsedSec={0}
      />
    );
  }
  return <div>{session.status}</div>;
}

describe('mock exam integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('full flow: load → answer 2 → final score', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    // wait for first stem (could be a1 or a2 depending on shuffle)
    await waitFor(() => {
      expect(screen.queryByText(/Stem a1\?|Stem a2\?/)).toBeInTheDocument();
    });
    // first answer: click "Right"
    await user.click(screen.getByText('Right'));
    // wait for the second stem (the other one)
    await waitFor(() => {
      // second atom should now be on screen and 'Right' button still available
      expect(screen.getByText(/Stem a1\?|Stem a2\?/)).toBeInTheDocument();
      expect(screen.getByText('Right')).toBeInTheDocument();
    });
    // second answer: click a distractor
    await user.click(screen.getByText('Wrong1'));
    // final result: 1 / 2
    await waitFor(() => expect(screen.getByText('1 / 2')).toBeInTheDocument());
  });
});
