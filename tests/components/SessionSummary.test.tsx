import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionSummary } from '@/components/study/SessionSummary';

describe('<SessionSummary />', () => {
  it('shows correct count, total, and a streak indicator', () => {
    render(<SessionSummary totalAtoms={5} ratings={[3, 3, 4, 1, 3]} streakDays={12} />);
    expect(screen.getByText(/4\s*\/\s*5/)).toBeInTheDocument();
    expect(screen.getByText(/streak day 12/i)).toBeInTheDocument();
  });

  it('handles a perfect session', () => {
    render(<SessionSummary totalAtoms={3} ratings={[3, 4, 4]} streakDays={1} />);
    expect(screen.getByText(/3\s*\/\s*3/)).toBeInTheDocument();
  });

  it('counts forgot (1) and hard (2) as wrong', () => {
    render(<SessionSummary totalAtoms={4} ratings={[1, 2, 3, 4]} streakDays={1} />);
    expect(screen.getByText(/2\s*\/\s*4/)).toBeInTheDocument();
  });
});
