import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnreviewedAtomChip } from '@/components/study/UnreviewedAtomChip';
import type { Atom } from '@/atom/types';

const baseAtom: Atom = {
  id: 'a1', exam: 'UKMLA', topicPath: ['Cardiology'],
  claim: 'c', canonicalStem: 's', answer: 'a',
  distractors: ['x', 'y', 'z'], difficulty: 3,
  imageUrl: null, imageAlt: null,
  citationUrl: '', citationLabel: 'NICE',
  sourceType: 'NICE', prereqAtomIds: [], highYield: false, freeTier: false,
  reviewedBy: null, reviewedAt: null, status: 'approved',
  createdAt: '2026-04-26T00:00:00Z', updatedAt: '2026-04-26T00:00:00Z',
};

describe('<UnreviewedAtomChip />', () => {
  it('renders nothing for approved atoms', () => {
    const { container } = render(<UnreviewedAtomChip atom={baseAtom} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the disclaimer for pending_review + ai-draft atoms', () => {
    render(<UnreviewedAtomChip atom={{ ...baseAtom, status: 'pending_review', sourceType: 'ai-draft' }} />);
    expect(screen.getByRole('note', { name: /unreviewed AI draft/i })).toBeInTheDocument();
    expect(screen.getByText(/AI-drafted, not yet reviewed/i)).toBeInTheDocument();
    expect(screen.getByText(/verify against your own sources/i)).toBeInTheDocument();
  });

  it('renders the disclaimer for any non-approved status', () => {
    render(<UnreviewedAtomChip atom={{ ...baseAtom, status: 'draft' }} />);
    expect(screen.getByRole('note')).toBeInTheDocument();
  });
});
