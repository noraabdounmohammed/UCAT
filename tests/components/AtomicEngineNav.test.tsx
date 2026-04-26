import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useUserRole', () => ({ useUserRole: vi.fn() }));
import { AtomicEngineNav } from '@/components/layout/AtomicEngineNav';
import { useUserRole } from '@/hooks/useUserRole';

function renderNav(initialRoute = '/study') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AtomicEngineNav />
    </MemoryRouter>
  );
}

describe('<AtomicEngineNav />', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows public links only for non-creators', () => {
    (useUserRole as any).mockReturnValue({ isCreator: false });
    renderNav();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Study' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mistakes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mock' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voice' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Seed' })).not.toBeInTheDocument();
  });

  it('shows Review + Seed links for creators', () => {
    (useUserRole as any).mockReturnValue({ isCreator: true });
    renderNav();
    expect(screen.getByRole('link', { name: 'Review' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Seed' })).toBeInTheDocument();
  });

  it('marks the active route', () => {
    (useUserRole as any).mockReturnValue({ isCreator: false });
    renderNav('/mock');
    const mockLink = screen.getByRole('link', { name: 'Mock' });
    expect(mockLink.className).toMatch(/bg-stone-900/);
  });
});
