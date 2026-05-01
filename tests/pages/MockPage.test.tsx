import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
  atoms: [],
  atomIndex: 0,
  picks: {},
  flagged: new Set<number>(),
  progress: { done: 0, total: 20 },
  secondsLeft: 1800,
  score: null,
  pick: vi.fn(),
  goNext: vi.fn(),
  goPrev: vi.fn(),
  goTo: vi.fn(),
  flag: vi.fn(),
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

  it('shows the length picker for authenticated users on first render', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    renderPage();
    expect(screen.getByRole('heading', { name: /mock exam/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quick/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Full mock/ })).toBeInTheDocument();
  });

  it('starts a session after picking a length and renders Loading', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Quick/ }));
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders <MockResult /> when status=review (post-submit)', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    (useMockSession as any).mockReturnValue({
      ...baseMock,
      status: 'review',
      atoms: Array.from({ length: 20 }, (_, i) => ({
        id: `a${i}`,
        canonicalStem: `stem ${i}`,
        answer: 'A',
        distractors: ['B', 'C', 'D'],
        topicPath: ['x'],
        citationUrl: 'https://example.com',
        citationLabel: 'src',
        sourceType: 'doctor_seed',
        status: 'approved',
      })),
      atomIndex: 0,
      picks: {},
      flagged: new Set(),
      score: { correct: 14, total: 20, percentage: 70, answered: 14 },
      secondsLeft: 0,
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Quick/ }));
    expect(screen.getByText(/14 of 20 correct/i)).toBeInTheDocument();
    expect(screen.getByText('70')).toBeInTheDocument();
    expect(screen.getByText(/Above the rough UKMLA cutoff \(~63%\)/i)).toBeInTheDocument();
  });
});
