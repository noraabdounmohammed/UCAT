/**
 * Cookie / telemetry consent persistence.
 *
 * Stored in `localStorage` under the `cookie_consent` key. Three states:
 *   - `'accepted'` — user opted in; PostHog + Sentry may initialise.
 *   - `'declined'` — user opted out; instrumentation stays no-op.
 *   - `null` (key absent) — user has not yet decided; banner shows.
 *
 * `setConsent()` dispatches a `cookie-consent-change` CustomEvent on `window`
 * so same-page listeners (e.g. the deferred init in `main.tsx`) can react
 * without polling.
 */
const KEY = 'cookie_consent';

export function hasConsented(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(KEY) === 'accepted';
  } catch {
    return false;
  }
}

export function setConsent(value: 'accepted' | 'declined'): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Quota / privacy mode — silently ignore; banner will keep prompting.
    return;
  }
  // Notify same-page listeners (cross-tab consumers can listen to `storage`).
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('cookie-consent-change', { detail: value }));
  }
}

export function getConsentValue(): 'accepted' | 'declined' | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const v = localStorage.getItem(KEY);
    return v === 'accepted' || v === 'declined' ? v : null;
  } catch {
    return null;
  }
}
