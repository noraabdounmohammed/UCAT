import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaywallGate } from '@/components/paywall/PaywallGate';

describe('<PaywallGate />', () => {
  it('renders children when kind=allowed', () => {
    render(
      <PaywallGate kind="allowed" dailyQuestionsRemaining={5} onUpgrade={vi.fn()}>
        <div>study content</div>
      </PaywallGate>
    );
    expect(screen.getByText('study content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upgrade/i })).not.toBeInTheDocument();
  });

  it('renders upgrade pitch when kind=daily-limit', () => {
    render(
      <PaywallGate kind="daily-limit" dailyQuestionsRemaining={0} onUpgrade={vi.fn()}>
        <div>study content</div>
      </PaywallGate>
    );
    expect(screen.queryByText('study content')).not.toBeInTheDocument();
    expect(screen.getByText(/daily.*free.*limit/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upgrade/i })).toBeInTheDocument();
  });

  it('renders different pitch when kind=free-tier-only', () => {
    render(
      <PaywallGate kind="free-tier-only" dailyQuestionsRemaining={5} onUpgrade={vi.fn()}>
        <div>study content</div>
      </PaywallGate>
    );
    expect(screen.queryByText('study content')).not.toBeInTheDocument();
    expect(screen.getByText(/full.*atom.*bank|pro/i)).toBeInTheDocument();
  });

  it('calls onUpgrade when the upgrade button is clicked', async () => {
    const user = userEvent.setup();
    const onUpgrade = vi.fn();
    render(
      <PaywallGate kind="daily-limit" dailyQuestionsRemaining={0} onUpgrade={onUpgrade}>
        <div>x</div>
      </PaywallGate>
    );
    await user.click(screen.getByRole('button', { name: /upgrade/i }));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it('renders the crossed-target pitch with predicted score', () => {
    render(
      <PaywallGate
        kind="crossed-target"
        dailyQuestionsRemaining={5}
        onUpgrade={vi.fn()}
        predictedScore={0.73}
      >
        <div>study content</div>
      </PaywallGate>
    );
    expect(screen.queryByText('study content')).not.toBeInTheDocument();
    expect(screen.getByText(/nearly.*UKMLA-ready/i)).toBeInTheDocument();
    expect(screen.getByText(/73%/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upgrade/i })).toBeInTheDocument();
  });
});
