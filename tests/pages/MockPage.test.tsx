import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: vi.fn() }));
vi.mock('@/hooks/useMockSession', () => ({ useMockSession: vi.fn() }));
vi.mock('@/atom/repository', () => ({ createAtomRepository: vi.fn(() => ({})) }));
vi.mock('@/atom/mockAttemptsRepository', () => ({
  createMockAttemptsRepository: vi.fn(() => ({
    saveAttempt: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { MockPage } from '@/pages/MockPage';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useMockSession } from '@/hooks/useMockSession';

function renderPage() {
  return render(
    <MemoryRouter>
      <MockPage />
    </MemoryRouter>
  );
}

const baseMock = {
  status: 'loading' as const,
  currentAtom: null,
  progress: { done: 0, total: 20 },
  secondsLeft: 1800,
  score: null,
  submit: vi.fn(),
  errorMessage: null,
};

describe('<MockPage />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useUserRole as any).mockReturnValue({ isCreator: false });
    (useMockSession as any).mockReturnValue(baseMock);
  });

  it('renders AuthGate when unauthenticated', () => {
    (useAuth as any).mockReturnValue({ user: null });
    renderPage();
    expect(screen.getByRole('heading', { name: /sign in to take a mock/i })).toBeInTheDocument();
  });

  it('renders the Mock exam UI when authenticated', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    renderPage();
    expect(screen.getByRole('heading', { name: /mock exam/i })).toBeInTheDocument();
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders <MockResult /> when status=finished', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    (useMockSession as any).mockReturnValue({
      ...baseMock,
      status: 'finished',
      score: { correct: 14, total: 20, percentage: 70 },
      secondsLeft: 0,
    });
    renderPage();
    expect(screen.getByText('14 / 20')).toBeInTheDocument();
    expect(screen.getByText(/70%/)).toBeInTheDocument();
  });
});
