import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn(() => ({ user: null })) }));
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: vi.fn(() => ({ isCreator: false })) }));

import { PrivacyPolicy } from '@/pages/PrivacyPolicy';

describe('<PrivacyPolicy />', () => {
  it('renders the heading and contact link', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /privacy.*data/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^contact$/i })).toHaveAttribute('href', 'mailto:nora@studyedit.com');
  });
});