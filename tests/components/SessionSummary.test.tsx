import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SessionSummary } from '@/components/study/SessionSummary';

function renderSummary(props: Parameters<typeof SessionSummary>[0]) {
  return render(
    <MemoryRouter>
      <SessionSummary {...props} />
    </MemoryRouter>
  );
}

describe('<SessionSummary />', () => {
  it('shows correct count, total, and a streak indicator', () => {
    renderSummary({ totalAtoms: 5, ratings: [3, 3, 4, 1, 3], streakDays: 12 });
    // New layout splits "4 / 5" across two spans — assert the parts.
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/\/\s*5/)).toBeInTheDocument();
    // Streak shows as "day 12" with a flame icon (was "streak day 12").
    expect(screen.getByText(/day 12/i)).toBeInTheDocument();
  });

  it('handles a perfect session', () => {
    renderSummary({ totalAtoms: 3, ratings: [3, 4, 4], streakDays: 1 });
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/\/\s*3/)).toBeInTheDocument();
    // Perfect run gets the "Perfect run" label
    expect(screen.getByText(/Perfect run/i)).toBeInTheDocument();
  });

  it('counts forgot (1) and hard (2) as wrong', () => {
    renderSummary({ totalAtoms: 4, ratings: [1, 2, 3, 4], streakDays: 1 });
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/\/\s*4/)).toBeInTheDocument();
  });

  it('shows topic breakdown when rated[] is provided', () => {
    const baseAtom = (id: string, topic: string) => ({
      id, exam: 'UKMLA' as const, topicPath: [topic],
      claim: '', canonicalStem: '', answer: '',
      distractors: [], difficulty: 3 as const,
      imageUrl: null, imageAlt: null,
      citationUrl: '', citationLabel: '',
      sourceType: 'NICE' as const, prereqAtomIds: [],
      highYield: false, freeTier: false,
      reviewedBy: null, reviewedAt: null, status: 'approved' as const,
      createdAt: '', updatedAt: '',
    });
    renderSummary({
      totalAtoms: 3,
      ratings: [3, 3, 1],
      streakDays: 1,
      rated: [
        { atom: baseAtom('a1', 'Cardiology'), rating: 3, correct: true },
        { atom: baseAtom('a2', 'Cardiology'), rating: 3, correct: true },
        { atom: baseAtom('a3', 'Renal'),      rating: 1, correct: false },
      ],
    });
    expect(screen.getByText(/By topic/i)).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('Renal')).toBeInTheDocument();
    expect(screen.getByText(/2\s*\/\s*2/)).toBeInTheDocument();
    expect(screen.getByText(/0\s*\/\s*1/)).toBeInTheDocument();
  });
});
