import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FsrsSessionView } from '@/components/study/FsrsSessionView';
import type { Atom } from '@/atom/types';

const atom: Atom = {
  id: 'a1', exam: 'UKMLA', topicPath: ['Cardiology'],
  claim: 'fact', canonicalStem: 'Stem text?', answer: 'Answer',
  distractors: ['x', 'y', 'z'], difficulty: 3,
  imageUrl: null, imageAlt: null,
  citationUrl: 'https://nice.org.uk/cg126', citationLabel: 'NICE CG126',
  sourceType: 'NICE', prereqAtomIds: [], highYield: false, freeTier: true,
  reviewedBy: null, reviewedAt: null, status: 'approved',
  createdAt: '2026-04-25T00:00:00Z', updatedAt: '2026-04-25T00:00:00Z',
};

function makeMockHookResult(overrides: any = {}) {
  return {
    status: 'in_progress',
    currentAtom: atom,
    progress: { done: 0, total: 5 },
    summary: null,
    rateAtom: vi.fn().mockResolvedValue(undefined),
    errorMessage: null,
    ...overrides,
  };
}

describe('<FsrsSessionView />', () => {
  it('shows a loading state', () => {
    render(<FsrsSessionView session={makeMockHookResult({ status: 'loading' })} streakDays={1} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an empty state when no atoms are due', () => {
    render(<FsrsSessionView session={makeMockHookResult({ status: 'empty', currentAtom: null })} streakDays={1} />);
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it('renders the atom in progress and updates progress label', () => {
    render(<FsrsSessionView session={makeMockHookResult({ progress: { done: 2, total: 5 } })} streakDays={1} />);
    expect(screen.getByText(/Stem text/i)).toBeInTheDocument();
    expect(screen.getByText(/2\s*\/\s*5/)).toBeInTheDocument();
  });

  it('shows summary when status is summary', () => {
    render(
      <FsrsSessionView
        session={makeMockHookResult({
          status: 'summary',
          currentAtom: null,
          summary: { totalAtoms: 5, ratings: [3, 3, 4, 1, 3], startedAt: new Date(), finishedAt: new Date() },
        })}
        streakDays={12}
      />,
    );
    expect(screen.getByText(/4\s*\/\s*5/)).toBeInTheDocument();
    expect(screen.getByText(/streak day 12/i)).toBeInTheDocument();
  });

  it('clicking confidence then FSRS calls rateAtom', async () => {
    const user = userEvent.setup();
    const session = makeMockHookResult();
    render(<FsrsSessionView session={session} streakDays={1} />);
    await user.click(screen.getAllByRole('button', { name: /how sure/i })[2]);
    await user.click(await screen.findByRole('button', { name: /^Good$/i }));
    await waitFor(() => expect(session.rateAtom).toHaveBeenCalledTimes(1));
  });
});
