/**
 * PostHog init + thin event helpers. No-ops when `VITE_POSTHOG_KEY` is unset
 * so dev/test environments don't pollute analytics counters.
 */

let initialized = false;
// `any` is intentional — posthog-js typings vary by version; we only call
// .capture / .identify which are stable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let phCache: any | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensurePosthog(): Promise<any | null> {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return null;
  if (initialized) return phCache;
  const ph = await import('posthog-js');
  ph.default.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.posthog.com',
  });
  phCache = ph.default;
  initialized = true;
  return phCache;
}

export async function initPosthog(): Promise<void> {
  await ensurePosthog();
}

export async function trackEvent(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>,
): Promise<void> {
  const ph = await ensurePosthog();
  if (!ph) return; // No-op without key
  ph.capture(name, props);
}

export async function identifyUser(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  traits?: Record<string, any>,
): Promise<void> {
  const ph = await ensurePosthog();
  if (!ph) return;
  ph.identify(userId, traits);
}
