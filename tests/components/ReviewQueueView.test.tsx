import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReviewQueueView } from '@/components/review/ReviewQueueView';
import type { Atom } from '@/atom/types';

const atom: Atom = {
  id: 'a1', exam: 'UKMLA', topicPath: ['Cardiology'],
  claim: 'fact', canonicalStem: 'Stem?', answer: 'Answer',
  distractors: ['x', 'y', 'z'], difficulty: 3,
  imageUrl: null, imageAlt: null,
  citationUrl: 'https://nice.org.uk/cg126', citationLabel: 'NICE CG126',
  sourceType: 'NICE', prereqAtomIds: [], highYield: false, freeTier: false,
  reviewedBy: null, reviewedAt: null, status: 'pending_review',
  createdAt: '2026-04-25T00:00:00Z', updatedAt: '2026-04-25T00:00:00Z',
};

function makeQueue(overrides: any = {}) {
  return {
    status: 'in_progress',
    currentAtom: atom,
    progress: { done: 0, total: 5 },
    errorMessage: null,
    approve: vi.fn().mockResolvedValue(undefined),
    reject: vi.fn().mockResolvedValue(undefined),
    updateAndApprove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('<ReviewQueueView />', () => {
  it('shows loading state', () => {
    render(<ReviewQueueView queue={makeQueue({ status: 'loading' })} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty state when queue is exhausted', () => {
    render(<ReviewQueueView queue={makeQueue({ status: 'empty', currentAtom: null })} />);
    expect(screen.getByText(/no questions left to review/i)).toBeInTheDocument();
  });

  it('shows error state with message', () => {
    render(
      <ReviewQueueView
        queue={makeQueue({ status: 'error', currentAtom: null, errorMessage: 'boom' })}
      />,
    );
    expect(screen.getByText(/boom/i)).toBeInTheDocument();
  });

  it('renders ReviewCard with current atom + progress label', () => {
    render(<ReviewQueueView queue={makeQueue({ progress: { done: 2, total: 5 } })} />);
    expect(screen.getByText(/Stem\?/)).toBeInTheDocument();
    expect(screen.getByText(/2\s*\/\s*5/)).toBeInTheDocument();
  });
});
