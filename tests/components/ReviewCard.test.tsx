import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewCard } from '@/components/review/ReviewCard';
import type { Atom } from '@/atom/types';

const atom: Atom = {
  id: 'a1', exam: 'UKMLA', topicPath: ['Cardiology', 'Stable angina'],
  claim: 'beta-blocker first-line for stable angina',
  canonicalStem: 'A 60-year-old man has stable exertional angina. What is first-line?',
  answer: 'Beta-blocker',
  distractors: ['ACE inhibitor', 'CCB', 'Aspirin'],
  difficulty: 3, imageUrl: null, imageAlt: null,
  citationUrl: 'https://www.nice.org.uk/guidance/cg126',
  citationLabel: 'NICE CG126',
  sourceType: 'NICE', prereqAtomIds: [], highYield: true, freeTier: false,
  reviewedBy: null, reviewedAt: null, status: 'pending_review',
  createdAt: '2026-04-25T00:00:00Z', updatedAt: '2026-04-25T00:00:00Z',
};

describe('<ReviewCard />', () => {
  it('renders the atom claim, stem, answer, distractors, citation', () => {
    render(<ReviewCard atom={atom} onApprove={vi.fn()} onReject={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText(/beta-blocker first-line/i)).toBeInTheDocument();
    expect(screen.getByText(/stable exertional angina/i)).toBeInTheDocument();
    expect(screen.getByText('Beta-blocker')).toBeInTheDocument();
    expect(screen.getByText('ACE inhibitor')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /NICE CG126/i })).toBeInTheDocument();
  });

  it('clicking Approve calls onApprove', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(<ReviewCard atom={atom} onApprove={onApprove} onReject={vi.fn()} onUpdate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /approve/i }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('clicking Reject opens the reject reason modal', async () => {
    const user = userEvent.setup();
    render(<ReviewCard atom={atom} onApprove={vi.fn()} onReject={vi.fn()} onUpdate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /^reject$/i }));
    expect(screen.getByRole('heading', { name: /reject this atom/i })).toBeInTheDocument();
  });

  it('clicking Edit toggles an inline form for claim/stem/answer/citation', async () => {
    const user = userEvent.setup();
    render(<ReviewCard atom={atom} onApprove={vi.fn()} onReject={vi.fn()} onUpdate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /edit/i }));
    expect(screen.getByLabelText(/claim/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/stem/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/answer/i)).toBeInTheDocument();
  });
});
