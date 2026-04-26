import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: vi.fn() }));
vi.mock('@/hooks/useFsrsSession', () => ({ useFsrsSession: vi.fn() }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: vi.fn() }));
vi.mock('@/services/stripeCheckout', () => ({ startStripeCheckout: vi.fn() }));
vi.mock('@/atom/repository', () => ({ createAtomRepository: vi.fn(() => ({})) }));
vi.mock('@/atom/userStateRepository', () => ({ createUserStateRepository: vi.fn(() => ({})) }));
vi.mock('@/voice/speech', () => ({
  isVoiceAvailable: vi.fn(() => true),
  speak: vi.fn(),
  listen: vi.fn(() => ({ stop: vi.fn() })),
}));
vi.mock('@/instrumentation/events', () => ({ track: vi.fn() }));

import { VoicePage } from '@/pages/VoicePage';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useFsrsSession } from '@/hooks/useFsrsSession';
import { useSubscription } from '@/hooks/useSubscription';
import { isVoiceAvailable } from '@/voice/speech';

function renderPage() {
  return render(
    <MemoryRouter>
      <VoicePage />
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

const baseSub = {
  isPremium: false,
  loading: false,
  dailyQuestionsUsed: 0,
  dailyQuestionsRemaining: 20,
  isAtLimit: false,
  incrementDailyCount: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn().mockResolvedValue(undefined),
};

describe('<VoicePage />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useUserRole as any).mockReturnValue({ isCreator: false });
    (useFsrsSession as any).mockReturnValue(baseSession);
    (useSubscription as any).mockReturnValue(baseSub);
    (isVoiceAvailable as any).mockReturnValue(true);
  });

  it('renders AuthGate when unauthenticated', () => {
    (useAuth as any).mockReturnValue({ user: null });
    renderPage();
    expect(screen.getByRole('heading', { name: /sign in to use voice mode/i })).toBeInTheDocument();
  });

  it('renders the voice mode UI when authenticated and voice is available', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    renderPage();
    expect(screen.getByRole('heading', { name: /^voice mode$/i })).toBeInTheDocument();
    expect(screen.getByText(/Hands-free retrieval/i)).toBeInTheDocument();
  });

  it('shows the unavailable fallback when isVoiceAvailable is false', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    (isVoiceAvailable as any).mockReturnValue(false);
    renderPage();
    expect(screen.getByRole('heading', { name: /voice mode unavailable/i })).toBeInTheDocument();
    expect(screen.getByText(/doesn't support the Web Speech API/i)).toBeInTheDocument();
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
