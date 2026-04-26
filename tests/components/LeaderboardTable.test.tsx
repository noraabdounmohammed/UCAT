import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';

const ROWS = [
  { userId: 'u1', displayName: 'Nora', reviewsThisWeek: 42 },
  { userId: 'u2', displayName: 'Anonymous', reviewsThisWeek: 30 },
  { userId: 'u3', displayName: 'Sam', reviewsThisWeek: 7 },
];

describe('<LeaderboardTable />', () => {
  it('renders the empty-state copy when given no rows', () => {
    render(<LeaderboardTable rows={[]} currentUserId="u1" />);
    expect(screen.getByText(/no reviews yet this week/i)).toBeInTheDocument();
  });

  it('renders one row per leaderboard entry with rank, name, count', () => {
    render(<LeaderboardTable rows={ROWS} currentUserId="u-other" />);

    // Three data rows.
    const rows = screen.getAllByRole('row').filter(r => r.getAttribute('data-rank'));
    expect(rows).toHaveLength(3);

    // Rank 1 = Nora · 42
    const nora = within(rows[0]);
    expect(nora.getByText('1')).toBeInTheDocument();
    expect(nora.getByText('Nora')).toBeInTheDocument();
    expect(nora.getByText('42')).toBeInTheDocument();

    // Rank 3 = Sam · 7
    const sam = within(rows[2]);
    expect(sam.getByText('3')).toBeInTheDocument();
    expect(sam.getByText('Sam')).toBeInTheDocument();
    expect(sam.getByText('7')).toBeInTheDocument();
  });

  it('appends "(you)" badge to the current user row', () => {
    render(<LeaderboardTable rows={ROWS} currentUserId="u2" />);
    const youRow = screen.getByText(/\(you\)/i).closest('tr');
    expect(youRow).not.toBeNull();
    expect(within(youRow as HTMLElement).getByText('Anonymous')).toBeInTheDocument();
    // No "(you)" anywhere else.
    expect(screen.getAllByText(/\(you\)/i)).toHaveLength(1);
  });
});
