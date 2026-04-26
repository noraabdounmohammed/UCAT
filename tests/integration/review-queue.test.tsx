import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewQueueView } from '@/components/review/ReviewQueueView';
import { useReviewQueue } from '@/hooks/useReviewQueue';
import type { Atom } from '@/atom/types';

const atoms: Atom[] = ['a1', 'a2'].map(id => ({
  id, exam: 'UKMLA', topicPath: ['Cardiology'],
  claim: `claim ${id}`, canonicalStem: `Stem ${id}?`, answer: `Answer ${id}`,
  distractors: ['x', 'y', 'z'], difficulty: 3,
  imageUrl: null, imageAlt: null,
  citationUrl: 'https://nice.org.uk/cg126', citationLabel: 'NICE CG126',
  sourceType: 'NICE', prereqAtomIds: [], highYield: false, freeTier: false,
  reviewedBy: null, reviewedAt: null, status: 'pending_review',
  createdAt: '2026-04-25T00:00:00Z', updatedAt: '2026-04-25T00:00:00Z',
}));

const repo = {
  listPendingReview: vi.fn(async () => atoms),
  approveAtom: vi.fn(async () => undefined),
  rejectAtom: vi.fn(async () => undefined),
  updateAtom: vi.fn(async () => undefined),
};

function Harness() {
  const queue = useReviewQueue({
    exam: 'UKMLA',
    reviewerId: 'r1',
    repo: repo as any,
  });
  return <ReviewQueueView queue={queue} />;
}

describe('review queue integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('full flow: load → approve → reject → empty', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    // First atom appears
    await waitFor(() => expect(screen.getByText(/Stem a1\?/)).toBeInTheDocument());

    // Approve first
    await user.click(screen.getByRole('button', { name: /approve/i }));
    expect(repo.approveAtom).toHaveBeenCalledWith('a1', 'r1');

    // Second atom appears
    await waitFor(() => expect(screen.getByText(/Stem a2\?/)).toBeInTheDocument());

    // Reject second with a reason — open the modal first
    await user.click(screen.getByRole('button', { name: /^reject$/i }));
    const modalHeading = await screen.findByRole('heading', { name: /reject this question/i });
    const modal = modalHeading.closest('div')!.parentElement!;

    // Pick a preset reason inside the modal
    await user.click(within(modal).getByRole('button', { name: /wrong citation/i }));

    // Confirm reject — the modal's confirm button is the red one
    await user.click(within(modal).getByRole('button', { name: /^reject$/i }));

    expect(repo.rejectAtom).toHaveBeenCalledWith('a2', 'r1', 'Wrong citation');

    // Empty state
    await waitFor(() => expect(screen.getByText(/no questions left to review/i)).toBeInTheDocument());
  });
});
