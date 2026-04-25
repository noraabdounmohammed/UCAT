/**
 * Sentry init helper. No-ops when `VITE_SENTRY_DSN` is unset so that dev/test
 * environments don't pollute production error counters and tests don't need keys.
 */

let initialized = false;

export async function initSentry(): Promise<void> {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return; // No-op when not configured
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
  });
  initialized = true;
}

export async function captureError(err: unknown): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    if (typeof console !== 'undefined') console.error(err);
    return;
  }
  const Sentry = await import('@sentry/react');
  Sentry.captureException(err);
}
