import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn(() => ({ user: null })) }));
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: vi.fn(() => ({ isCreator: false })) }));

import { PrivacyPolicy } from '@/pages/PrivacyPolicy';

describe('<PrivacyPolicy />', () => {
  it('renders the heading and contact email', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /privacy.*cookies/i, level: 1 })).toBeInTheDocument();
    // The contact email should appear at least once (data-deletion + made-by-doctor sections).
    const emails = screen.getAllByText(/nora@studyedit\.com/i);
    expect(emails.length).toBeGreaterThanOrEqual(1);
  });
});
