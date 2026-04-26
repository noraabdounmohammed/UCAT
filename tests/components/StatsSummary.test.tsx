import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StatsSummary } from '@/components/study/StatsSummary';

describe('<StatsSummary />', () => {
  it('renders attempts / correct / wrong cells once data loads', async () => {
    const repo = {
      getReviewEventStats: vi.fn().mockResolvedValue({
        totalAttempts: 15,
        correctAttempts: 9,
        wrongAttempts: 6,
      }),
    } as any;

    render(<StatsSummary userId="u1" repo={repo} />);

    await waitFor(() => {
      expect(screen.getByText('attempts')).toBeInTheDocument();
      expect(screen.getByText('correct')).toBeInTheDocument();
      expect(screen.getByText('wrong')).toBeInTheDocument();
    });
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText(/60% correct overall/)).toBeInTheDocument();
  });

  it('renders nothing when the user has zero attempts yet', async () => {
    const repo = {
      getReviewEventStats: vi.fn().mockResolvedValue({
        totalAttempts: 0,
        correctAttempts: 0,
        wrongAttempts: 0,
      }),
    } as any;
    const { container } = render(<StatsSummary userId="u1" repo={repo} />);
    await Promise.resolve();
    await Promise.resolve();
    expect(container.firstChild).toBeNull();
  });
});
