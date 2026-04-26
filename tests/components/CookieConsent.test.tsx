import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CookieConsent } from '@/components/consent/CookieConsent';

describe('<CookieConsent />', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the banner when no consent value is set', () => {
    render(<CookieConsent />);
    expect(screen.getByRole('dialog', { name: /cookie consent/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
  });

  it('persists the choice and hides the banner after Accept', async () => {
    const user = userEvent.setup();
    render(<CookieConsent />);
    await user.click(screen.getByRole('button', { name: /accept/i }));
    expect(localStorage.getItem('cookie_consent')).toBe('accepted');
    expect(screen.queryByRole('dialog', { name: /cookie consent/i })).not.toBeInTheDocument();
  });

  it('persists the choice and hides the banner after Decline', async () => {
    const user = userEvent.setup();
    render(<CookieConsent />);
    await user.click(screen.getByRole('button', { name: /decline/i }));
    expect(localStorage.getItem('cookie_consent')).toBe('declined');
    expect(screen.queryByRole('dialog', { name: /cookie consent/i })).not.toBeInTheDocument();
  });
});
