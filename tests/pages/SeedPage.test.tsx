import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: vi.fn() }));
vi.mock('@/hooks/useSeedAtom', () => ({ useSeedAtom: vi.fn() }));
vi.mock('@/atom/seedRepository', () => ({ createSeedRepository: vi.fn(() => ({})) }));

import { SeedPage } from '@/pages/SeedPage';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useSeedAtom } from '@/hooks/useSeedAtom';

function renderPage() {
  return render(
    <MemoryRouter>
      <SeedPage />
    </MemoryRouter>
  );
}

const baseSeed = {
  status: 'idle' as const,
  lastAtomId: null,
  errorMessage: null,
  submit: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
};

describe('<SeedPage />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSeedAtom as any).mockReturnValue(baseSeed);
  });

  it('renders AuthGate when unauthenticated', () => {
    (useAuth as any).mockReturnValue({ user: null });
    (useUserRole as any).mockReturnValue({ isCreator: false });
    renderPage();
    expect(screen.getByRole('heading', { name: /sign in to seed atoms/i })).toBeInTheDocument();
  });

  it('shows "Not authorised" when authed but not a creator', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    (useUserRole as any).mockReturnValue({ isCreator: false });
    renderPage();
    expect(screen.getByText(/not authorised/i)).toBeInTheDocument();
    expect(screen.getByText(/clinical creators/i)).toBeInTheDocument();
  });

  it('renders the seed form when authed as a creator', () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1', email: 'u@x.com' } });
    (useUserRole as any).mockReturnValue({ isCreator: true });
    renderPage();
    expect(screen.getByRole('heading', { name: /seed an atom/i })).toBeInTheDocument();
    expect(screen.queryByText(/not authorised/i)).not.toBeInTheDocument();
  });
});
