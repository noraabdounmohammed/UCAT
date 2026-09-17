import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

function dispatchInstallAvailability() {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  Object.assign(event, {
    prompt: vi.fn(async () => undefined),
    userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
  });
  window.dispatchEvent(event);
}

describe('<PWAInstallPrompt />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not interrupt a learner before they have completed three sessions', () => {
    render(<PWAInstallPrompt />);

    act(() => {
      dispatchInstallAvailability();
      vi.advanceTimersByTime(15_000);
    });

    expect(screen.queryByRole('heading', { name: /install study edit/i })).not.toBeInTheDocument();
  });

  it('offers installation from the review moment after the third completed session', () => {
    localStorage.setItem('studyedit_completed_sessions_v1', '2');
    render(<PWAInstallPrompt />);

    act(() => {
      dispatchInstallAvailability();
      localStorage.setItem('studyedit_completed_sessions_v1', '3');
      window.dispatchEvent(new CustomEvent('studyedit:session-reviewed'));
    });

    act(() => vi.advanceTimersByTime(1200));
    expect(screen.getByRole('heading', { name: /install study edit/i })).toBeInTheDocument();
  });
});
