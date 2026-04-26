import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/useCohortLeaderboard', () => ({ useCohortLeaderboard: vi.fn() }));
vi.mock('@/atom/cohortRepository', () => ({ createCohortRepository: vi.fn(() => ({})) }));

import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { useAuth } from '@/contexts/AuthContext';
import { useCohortLeaderboard } from '@/hooks/useCohortLeaderboard';

function renderPage() {
  return render(
    <MemoryRouter>
      <LeaderboardPage />
    </MemoryRouter>
  );
}

const baseLb = {
  status: 'loading' as const,
  cohort: null,
  rows: [],
  errorMessage: null,
  refresh: vi.fn().mockResolvedValue(undefined),
};

describe('<LeaderboardPage />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useCohortLeaderboard as any).mockReturnValue(baseLb);
  });

  it('renders AuthGate when unauthenticated', () => {
    (useAuth as any).mockReturnValue({ user: null });
    renderPage();
    expect(
      screen.getByRole('heading', { name: /sign in to see your cohort/i }),
    ).toBeInTheDocument();
  });

  it('renders the cohort-select form in no-cohort state', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    (useCohortLeaderboard as any).mockReturnValue({
      ...baseLb,
      status: 'no-cohort',
    });
    renderPage();
    expect(screen.getByRole('heading', { name: /leaderboard/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /join your cohort/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/medical school/i)).toBeInTheDocument();
  });

  it('renders the leaderboard table in ready state', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    (useCohortLeaderboard as any).mockReturnValue({
      ...baseLb,
      status: 'ready',
      cohort: 'Imperial College London',
      rows: [
        { userId: 'u1', displayName: 'Nora', reviewsThisWeek: 42 },
        { userId: 'u2', displayName: 'Anonymous', reviewsThisWeek: 30 },
      ],
    });
    renderPage();
    expect(screen.getByRole('heading', { name: /leaderboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Imperial College London · last 7 days/i)).toBeInTheDocument();
    expect(screen.getByText('Nora')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    // Highlight on the auth user's row.
    expect(screen.getByText(/\(you\)/i)).toBeInTheDocument();
  });

  it('renders an error banner in error state', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    (useCohortLeaderboard as any).mockReturnValue({
      ...baseLb,
      status: 'error',
      errorMessage: 'view denied',
    });
    renderPage();
    expect(screen.getByText(/view denied/i)).toBeInTheDocument();
  });
});
