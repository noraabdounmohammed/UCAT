import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const captureMock = vi.fn();
const initMock = vi.fn();
const identifyMock = vi.fn();

vi.mock('posthog-js', () => ({
  default: {
    init: initMock,
    capture: captureMock,
    identify: identifyMock,
  },
}));

describe('track / events wrapper', () => {
  beforeEach(() => {
    captureMock.mockClear();
    initMock.mockClear();
    identifyMock.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('track no-ops without VITE_POSTHOG_KEY', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '');
    const { track } = await import('@/instrumentation/events');
    track('session_started', { mode: 'study' });
    // Wait a tick for fire-and-forget promise to settle
    await new Promise(r => setTimeout(r, 5));
    expect(captureMock).not.toHaveBeenCalled();
    expect(initMock).not.toHaveBeenCalled();
  });

  it('track calls posthog.capture with event name and props when key is set', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key_123');
    const { trackEvent } = await import('@/instrumentation/posthog');
    await trackEvent('atom_rated', { rating: 3, confidence: 'high' });
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledWith('phc_test_key_123', expect.any(Object));
    expect(captureMock).toHaveBeenCalledWith('atom_rated', { rating: 3, confidence: 'high' });
  });

  it('TrackedEvent type accepts the documented event names', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '');
    const events = await import('@/instrumentation/events');
    // Type-only: if these compile under TS strict, the union covers them.
    const names: events.TrackedEvent[] = [
      'session_started',
      'session_completed',
      'atom_rated',
      'mock_started',
      'mock_finished',
      'paywall_shown',
      'upgrade_clicked',
      'nps_submitted',
      'voice_session_started',
    ];
    expect(names).toHaveLength(9);
  });
});
