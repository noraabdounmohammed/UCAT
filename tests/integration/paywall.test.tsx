import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaywallGate } from '@/components/paywall/PaywallGate';

// Lightweight integration: PaywallGate kind=daily-limit blocks children + shows upgrade.

describe('paywall integration', () => {
  it('daily-limit hides session content and shows upgrade pitch', () => {
    const onUpgrade = vi.fn();
    render(
      <PaywallGate kind="daily-limit" dailyQuestionsRemaining={0} onUpgrade={onUpgrade}>
        <div data-testid="session-content">live session</div>
      </PaywallGate>
    );
    expect(screen.queryByTestId('session-content')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upgrade/i })).toBeInTheDocument();
  });

  it('allowed shows session content and no upgrade pitch', () => {
    render(
      <PaywallGate kind="allowed" dailyQuestionsRemaining={5} onUpgrade={vi.fn()}>
        <div data-testid="session-content">live session</div>
      </PaywallGate>
    );
    expect(screen.getByTestId('session-content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upgrade/i })).not.toBeInTheDocument();
  });
});
