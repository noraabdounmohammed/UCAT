import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sentryInitMock = vi.fn();
const sentryCaptureMock = vi.fn();

vi.mock('@sentry/react', () => ({
  init: sentryInitMock,
  captureException: sentryCaptureMock,
}));

describe('initSentry', () => {
  beforeEach(() => {
    sentryInitMock.mockClear();
    sentryCaptureMock.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('no-ops when VITE_SENTRY_DSN is absent', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const { initSentry } = await import('@/instrumentation/sentry');
    await initSentry();
    expect(sentryInitMock).not.toHaveBeenCalled();
  });

  it('calls Sentry.init when DSN is present', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc@example.ingest.sentry.io/123');
    const { initSentry } = await import('@/instrumentation/sentry');
    await initSentry();
    expect(sentryInitMock).toHaveBeenCalledTimes(1);
    expect(sentryInitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://abc@example.ingest.sentry.io/123',
      }),
    );
  });
});
