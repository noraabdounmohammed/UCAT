import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockQuestion } from '@/components/mock/MockQuestion';
import type { Atom } from '@/atom/types';

const atom: Atom = {
  id: 'a1', exam: 'UKMLA', topicPath: ['Cardiology'],
  claim: 'fact', canonicalStem: 'Stem text?',
  answer: 'Beta-blocker',
  distractors: ['ACE inhibitor', 'CCB', 'Aspirin'],
  difficulty: 3, imageUrl: null, imageAlt: null,
  citationUrl: 'https://nice.org.uk/cg126', citationLabel: 'NICE CG126',
  sourceType: 'NICE', prereqAtomIds: [], highYield: false, freeTier: false,
  reviewedBy: null, reviewedAt: null, status: 'approved',
  createdAt: '2026-04-25T00:00:00Z', updatedAt: '2026-04-25T00:00:00Z',
};

describe('<MockQuestion />', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the stem and 4 options', () => {
    render(<MockQuestion atom={atom} onSubmit={vi.fn()} />);
    expect(screen.getByText(/stem text/i)).toBeInTheDocument();
    expect(screen.getByText('Beta-blocker')).toBeInTheDocument();
    expect(screen.getByText('ACE inhibitor')).toBeInTheDocument();
    expect(screen.getByText('CCB')).toBeInTheDocument();
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
  });

  it('clicking the correct answer calls onSubmit with correct=true', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MockQuestion atom={atom} onSubmit={onSubmit} />);
    await user.click(screen.getByText('Beta-blocker'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ correct: true });
  });

  it('clicking a distractor calls onSubmit with correct=false', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MockQuestion atom={atom} onSubmit={onSubmit} />);
    await user.click(screen.getByText('ACE inhibitor'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ correct: false });
  });
});
