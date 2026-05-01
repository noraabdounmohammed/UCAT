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
  it('renders the stem with 4 lettered options and no answer revealed yet', () => {
    render(<AtomRenderer atom={atom} onRated={vi.fn()} />);
    expect(screen.getByText(/stable exertional angina/i)).toBeInTheDocument();
    // 4 option buttons (A, B, C, D)
    const options = screen.getAllByRole('button');
    expect(options.length).toBeGreaterThanOrEqual(4);
    // Citation hidden until pick
    expect(screen.queryByRole('link', { name: /NICE CG126/i })).not.toBeInTheDocument();
  });

  it('marks the picked-correct option green, reveals citation, and offers Next + Easy', async () => {
    const user = userEvent.setup();
    const onRated = vi.fn();
    render(<AtomRenderer atom={atom} onRated={onRated} />);

    await user.click(screen.getByRole('button', { name: /Beta-blocker/i }));

    expect(await screen.findByText(/Nice — that's right/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /NICE CG126/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next question/i })).toBeInTheDocument();
    // Easy override only on correct
    expect(screen.getByRole('button', { name: /^Easy$/i })).toBeInTheDocument();
  });

  it('Next after a correct pick fires onRated with rating 3 (Good)', async () => {
    const user = userEvent.setup();
    const onRated = vi.fn();
    render(<AtomRenderer atom={atom} onRated={onRated} />);

    await user.click(screen.getByRole('button', { name: /Beta-blocker/i }));
    await user.click(await screen.findByRole('button', { name: /Next question/i }));

    expect(onRated).toHaveBeenCalledTimes(1);
    expect(onRated.mock.calls[0][0]).toMatchObject({ rating: 3, confidence: 3 });
    expect(typeof onRated.mock.calls[0][0].responseMs).toBe('number');
  });

  it('Easy after a correct pick fires onRated with rating 4 (Easy)', async () => {
    const user = userEvent.setup();
    const onRated = vi.fn();
    render(<AtomRenderer atom={atom} onRated={onRated} />);

    await user.click(screen.getByRole('button', { name: /Beta-blocker/i }));
    await user.click(await screen.findByRole('button', { name: /^Easy$/i }));

    expect(onRated).toHaveBeenCalledTimes(1);
    expect(onRated.mock.calls[0][0]).toMatchObject({ rating: 4, confidence: 4 });
  });

  it('marks a wrong pick red and Next fires onRated with rating 1 (Forgot); no Easy override', async () => {
    const user = userEvent.setup();
    const onRated = vi.fn();
    render(<AtomRenderer atom={atom} onRated={onRated} />);

    await user.click(screen.getByRole('button', { name: /ACE inhibitor/i }));
    expect(await screen.findByText(/Not this one/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Easy$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Next question/i }));
    expect(onRated.mock.calls[0][0]).toMatchObject({ rating: 1, confidence: 1 });
  });
});
