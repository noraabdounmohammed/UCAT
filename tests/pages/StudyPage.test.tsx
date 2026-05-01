import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: vi.fn() }));
vi.mock('@/hooks/useFsrsSession', () => ({ useFsrsSession: vi.fn() }));
vi.mock('@/hooks/usePredictedScore', () => ({ usePredictedScore: vi.fn() }));
vi.mock('@/hooks/useStreak', () => ({ useStreak: vi.fn() }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: vi.fn() }));
vi.mock('@/hooks/useNpsTrigger', () => ({ useNpsTrigger: vi.fn() }));
vi.mock('@/services/stripeCheckout', () => ({ startStripeCheckout: vi.fn() }));
vi.mock('@/atom/repository', () => ({ createAtomRepository: vi.fn(() => ({})) }));
vi.mock('@/atom/userStateRepository', () => ({
  createUserStateRepository: vi.fn(() => ({
    // <StatsSummary /> calls this on mount.
    listAllForUser: vi.fn().mockResolvedValue([]),
    getReviewEventStats: vi.fn().mockResolvedValue({ totalAttempts: 0, correctAttempts: 0, wrongAttempts: 0 }),
  })),
}));
vi.mock('@/atom/npsRepository', () => ({ createNpsRepository: vi.fn(() => ({})) }));

import { StudyPage } from '@/pages/StudyPage';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useFsrsSession } from '@/hooks/useFsrsSession';
import { usePredictedScore } from '@/hooks/usePredictedScore';
import { useStreak } from '@/hooks/useStreak';
import { useSubscription } from '@/hooks/useSubscription';
import { useNpsTrigger } from '@/hooks/useNpsTrigger';

function renderPage(initialEntry = '/study') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <StudyPage />
    </MemoryRouter>
  );
}

const baseSession = {
  status: 'loading' as const,
  currentAtom: null,
  progress: { done: 0, total: 0 },
  summary: null,
  errorMessage: null,
  rateAtom: vi.fn(),
};

const baseScore = {
  status: 'ready' as const,
  predictedScore: 0.7,
  coverageRatio: 0.5,
  atomCount: 10,
  totalAtoms: 20,
  errorMessage: null,
  refresh: vi.fn().mockResolvedValue(undefined),
};

const baseStreak = { status: 'ready' as const, streakDays: 1, errorMessage: null };

const baseSub = {
  isPremium: false,
  loading: false,
  dailyQuestionsUsed: 0,
  dailyQuestionsRemaining: 20,
  isAtLimit: false,
  incrementDailyCount: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn().mockResolvedValue(undefined),
};

const baseNps = { shouldShow: false, submit: vi.fn(), dismiss: vi.fn() };

describe('<StudyPage />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useUserRole as any).mockReturnValue({ isCreator: false });
    (useFsrsSession as any).mockReturnValue(baseSession);
    (usePredictedScore as any).mockReturnValue(baseScore);
    (useStreak as any).mockReturnValue(baseStreak);
    (useSubscription as any).mockReturnValue(baseSub);
    (useNpsTrigger as any).mockReturnValue(baseNps);
  });

  it('renders AuthGate when unauthenticated', () => {
    (useAuth as any).mockReturnValue({ user: null });
    renderPage();
    expect(screen.getByRole('heading', { name: /sign in to study/i })).toBeInTheDocument();
  });

  it('renders the discovery dashboard for authenticated users on /study', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    renderPage();
    // Dashboard hero + section headings (post-modernisation copy).
    expect(screen.getByText("Today's mission")).toBeInTheDocument();
    expect(screen.getByText('Daily 5')).toBeInTheDocument();
    expect(screen.getByText('Pick a system')).toBeInTheDocument();
    expect(screen.getByText('Pick your format')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /sign in to study/i })).not.toBeInTheDocument();
  });

  it('renders the FSRS session view when ?session=daily forces past the dashboard', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    renderPage('/study?session=daily');
    // FsrsSessionView 'loading' state.
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('shows the paywall when at the daily limit and not premium (in-session flow)', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    (useSubscription as any).mockReturnValue({
      ...baseSub,
      isAtLimit: true,
      dailyQuestionsRemaining: 0,
    });
    renderPage('/study?session=daily');
    expect(screen.getByText(/daily.*free.*limit/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upgrade/i })).toBeInTheDocument();
  });
});
