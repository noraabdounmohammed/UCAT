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
vi.mock('@/atom/userStateRepository', () => ({ createUserStateRepository: vi.fn(() => ({})) }));
vi.mock('@/atom/npsRepository', () => ({ createNpsRepository: vi.fn(() => ({})) }));

import { StudyPage } from '@/pages/StudyPage';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useFsrsSession } from '@/hooks/useFsrsSession';
import { usePredictedScore } from '@/hooks/usePredictedScore';
import { useStreak } from '@/hooks/useStreak';
import { useSubscription } from '@/hooks/useSubscription';
import { useNpsTrigger } from '@/hooks/useNpsTrigger';

function renderPage() {
  return render(
    <MemoryRouter>
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

  it('renders the FSRS session view when authenticated', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    renderPage();
    // Loading state of the FsrsSessionView
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    // PredictedScoreBadge content from baseScore
    expect(screen.queryByRole('heading', { name: /sign in to study/i })).not.toBeInTheDocument();
  });

  it('shows the paywall when at the daily limit and not premium', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    (useSubscription as any).mockReturnValue({
      ...baseSub,
      isAtLimit: true,
      dailyQuestionsRemaining: 0,
    });
    renderPage();
    expect(screen.getByText(/daily.*free.*limit/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upgrade/i })).toBeInTheDocument();
  });
});
