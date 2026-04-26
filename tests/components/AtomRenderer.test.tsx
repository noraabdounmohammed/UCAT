import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AtomRenderer } from '@/components/study/AtomRenderer';
import type { Atom } from '@/atom/types';

const atom: Atom = {
  id: 'a1', exam: 'UKMLA', topicPath: ['Cardiology'],
  claim: 'beta-blocker first-line for stable angina',
  canonicalStem: 'A 60-year-old man has stable exertional angina. What is first-line?',
  answer: 'Beta-blocker',
  distractors: ['ACE inhibitor', 'Calcium-channel blocker', 'Aspirin only'],
  difficulty: 3, imageUrl: null, imageAlt: null,
  citationUrl: 'https://www.nice.org.uk/guidance/cg126',
  citationLabel: 'NICE CG126',
  sourceType: 'NICE', prereqAtomIds: [], highYield: true, freeTier: true,
  reviewedBy: null, reviewedAt: null, status: 'approved',
  createdAt: '2026-04-25T00:00:00Z', updatedAt: '2026-04-25T00:00:00Z',
};

describe('<AtomRenderer />', () => {
  it('renders the stem and four confidence buttons before reveal', () => {
    render(<AtomRenderer atom={atom} onRated={vi.fn()} />);
    expect(screen.getByText(/stable exertional angina/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /how sure/i })).toHaveLength(4);
    expect(screen.queryByText(/beta-blocker/i)).not.toBeInTheDocument();
  });

  it('reveals the answer + citation after the user picks confidence', async () => {
    const user = userEvent.setup();
    render(<AtomRenderer atom={atom} onRated={vi.fn()} />);
    await user.click(screen.getAllByRole('button', { name: /how sure/i })[3]); // certain
    expect(await screen.findByText('Beta-blocker')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /NICE CG126/i })).toBeInTheDocument();
  });

  it('calls onRated with confidence + rating + responseMs when an FSRS button is clicked', async () => {
    const user = userEvent.setup();
    const onRated = vi.fn();
    render(<AtomRenderer atom={atom} onRated={onRated} />);
    await user.click(screen.getAllByRole('button', { name: /how sure/i })[2]); // confident
    await user.click(await screen.findByRole('button', { name: /^Good$/i }));
    expect(onRated).toHaveBeenCalledTimes(1);
    expect(onRated.mock.calls[0][0]).toMatchObject({
      rating: 3, confidence: 3,
    });
    expect(typeof onRated.mock.calls[0][0].responseMs).toBe('number');
  });
});
