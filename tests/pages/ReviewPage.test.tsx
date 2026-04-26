import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: vi.fn() }));
vi.mock('@/hooks/useReviewQueue', () => ({ useReviewQueue: vi.fn() }));
vi.mock('@/atom/reviewRepository', () => ({ createReviewRepository: vi.fn(() => ({})) }));

import { ReviewPage } from '@/pages/ReviewPage';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useReviewQueue } from '@/hooks/useReviewQueue';

function renderPage() {
  return render(
    <MemoryRouter>
      <ReviewPage />
    </MemoryRouter>
  );
}

const baseQueue = {
  status: 'loading' as const,
  currentAtom: null,
  progress: { done: 0, total: 0 },
  errorMessage: null,
  approve: vi.fn().mockResolvedValue(undefined),
  reject: vi.fn().mockResolvedValue(undefined),
  updateAndApprove: vi.fn().mockResolvedValue(undefined),
};

describe('<ReviewPage />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useReviewQueue as any).mockReturnValue(baseQueue);
  });

  it('renders AuthGate when unauthenticated', () => {
    (useAuth as any).mockReturnValue({ user: null });
    (useUserRole as any).mockReturnValue({ isCreator: false });
    renderPage();
    expect(screen.getByRole('heading', { name: /sign in to review atoms/i })).toBeInTheDocument();
  });

  it('shows "Not authorised" when authed but not a creator', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    (useUserRole as any).mockReturnValue({ isCreator: false });
    renderPage();
    expect(screen.getByText(/not authorised/i)).toBeInTheDocument();
    expect(screen.getByText(/clinical reviewers/i)).toBeInTheDocument();
  });

  it('renders the review queue when authed as a creator', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    (useUserRole as any).mockReturnValue({ isCreator: true });
    renderPage();
    expect(screen.getByRole('heading', { name: /review queue/i })).toBeInTheDocument();
    // The queue is in 'loading' state via baseQueue
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    expect(screen.queryByText(/not authorised/i)).not.toBeInTheDocument();
  });
});
