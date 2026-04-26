import { useState } from 'react';
import { getConsentValue, setConsent } from '@/instrumentation/consent';

/**
 * Cookie consent banner.
 *
 * Shows once, in the bottom-right of the viewport, until the user clicks
 * Accept or Decline. The choice persists in `localStorage` (see
 * `instrumentation/consent.ts`) and dispatches a `cookie-consent-change`
 * event so deferred init code in `main.tsx` can fire PostHog + Sentry
 * without a page reload.
 */
export function CookieConsent() {
  const [decided, setDecided] = useState<boolean>(() => getConsentValue() !== null);

  if (decided) return null;

  const accept = () => {
    setConsent('accepted');
    setDecided(true);
  };
  const decline = () => {
    setConsent('declined');
    setDecided(true);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 rounded-2xl bg-stone-900 text-white p-4 shadow-2xl"
    >
      <div className="text-sm">
        We use cookies for product analytics + error reporting (PostHog, Sentry). Both opt-in.
        See <a href="/privacy" className="underline">privacy</a>.
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        <button
          type="button"
          onClick={decline}
          className="text-xs px-3 py-1.5 rounded-lg border border-white/30 hover:bg-white/10"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={accept}
          className="text-xs px-3 py-1.5 rounded-lg bg-white text-stone-900 hover:bg-stone-100 font-medium"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
