import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { computeStats, StatsSummary } from '@/components/study/StatsSummary';
import type { UserAtomState } from '@/atom/types';

function row(over: Partial<UserAtomState>): UserAtomState {
  return {
    userId: 'u1', atomId: 'a1', stability: 1, difficulty: 5,
    dueAt: '2026-04-26T10:00:00Z', lastReviewAt: '2026-04-25T10:00:00Z',
    reps: 1, lapses: 0, ...over,
  };
}

describe('computeStats', () => {
  it('counts lifetime totals + classifies by reps + lapses', () => {
    const rows = [
      row({ atomId: 'a1', reps: 1, lapses: 0 }), // in-progress
      row({ atomId: 'a2', reps: 5, lapses: 0 }), // mastered
      row({ atomId: 'a3', reps: 3, lapses: 0 }), // mastered
      row({ atomId: 'a4', reps: 2, lapses: 1 }), // mistake (lapses>=1 wins)
      row({ atomId: 'a5', reps: 4, lapses: 2 }), // mistake
    ];
    expect(computeStats(rows)).toEqual({
      total: 5, mastered: 2, inProgress: 1, mistakes: 2,
    });
  });

  it('returns all-zero counts for empty input', () => {
    expect(computeStats([])).toEqual({ total: 0, mastered: 0, inProgress: 0, mistakes: 0 });
  });
});

describe('<StatsSummary />', () => {
  it('renders the 3 cell counters once data loads', async () => {
    const repo = {
      listAllForUser: vi.fn().mockResolvedValue([
        row({ atomId: 'a1', reps: 1, lapses: 0 }),
        row({ atomId: 'a2', reps: 5, lapses: 0 }),
        row({ atomId: 'a3', reps: 4, lapses: 1 }),
      ]),
    } as any;

    render(<StatsSummary userId="u1" repo={repo} />);

    await waitFor(() => {
      expect(screen.getByText('answered')).toBeInTheDocument();
      expect(screen.getByText('mastered')).toBeInTheDocument();
      expect(screen.getByText('mistakes')).toBeInTheDocument();
    });
    expect(screen.getByText('3')).toBeInTheDocument(); // total answered
    // mastered=1 + mistakes=1 (both numbers '1') — assert count, not single match
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(2);
  });

  it('renders nothing when the user has no atoms answered yet', async () => {
    const repo = { listAllForUser: vi.fn().mockResolvedValue([]) } as any;
    const { container } = render(<StatsSummary userId="u1" repo={repo} />);
    // Wait one microtask for the promise to settle, then assert empty.
    await Promise.resolve();
    await Promise.resolve();
    expect(container.firstChild).toBeNull();
  });
});
