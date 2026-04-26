# Plan 9 — Pro Paywall (Stripe)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Wire the existing useSubscription hook + Stripe checkout into the new atomic-engine UX. Free users get 20 questions/day; Pro users unlimited. The free atom set (`atoms.free_tier=true`) stays available for unauthed/free users; the full bank is Pro-only.

**Spec:** §10 (pricing & business model). £19.99/mo Pro, £149/yr.

**Architecture (lean):**
- `<PaywallGate />` component — checks subscription state, gates children with an upgrade pitch when blocked.
- `usePaywallStatus({ session })` — derived hook: returns `{ kind: 'allowed' | 'free-tier-only' | 'daily-limit-reached', message, ctaUrl }`.
- Existing `stripe-checkout.ts` Netlify function provides the upgrade URL (POSTs to /.netlify/functions/stripe-checkout, returns Stripe checkout URL).
- Wire into `/study`, `/mistakes`, `/voice` — after each rating, call `incrementDailyCount`. When `isAtLimit`, swap `<FsrsSessionView>` for `<PaywallGate>`.
- Plan 1's atom RLS policy `atoms_read_approved` is already permissive (anyone authed can read approved atoms — no schema change needed for free-tier). The free/Pro distinction is purely client-side gating in v1.

## Phases — 7 tasks, 6 commits

### A — PaywallGate (TDD)

**Task 1 RED.** `tests/components/PaywallGate.test.tsx` — 4 tests covering free unlimited / blocked-by-daily / Pro / loading states.

**Task 2 GREEN.** `src/components/paywall/PaywallGate.tsx`:

- Props: `{ kind: 'allowed' | 'daily-limit' | 'free-tier-only', dailyQuestionsRemaining, onUpgrade, children }`
- When `kind === 'allowed'` → render children
- Otherwise render an upgrade card with appropriate copy + an "Upgrade to Pro" button that calls `onUpgrade` (which fires the Stripe checkout)

### B — Stripe checkout trigger

**Task 3.** Add `src/services/stripeCheckout.ts` — a thin client that POSTs to `/.netlify/functions/stripe-checkout` with the user id and redirects to the returned URL. (The Netlify function already exists from old MVP; we're just adding the client side.)

```ts
export async function startStripeCheckout(userId: string, email: string): Promise<void> {
  const res = await fetch('/.netlify/functions/stripe-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userEmail: email }),
  });
  if (!res.ok) throw new Error(`Checkout failed: ${res.status}`);
  const { url } = await res.json();
  if (url) window.location.href = url;
}
```

(No test for this — single fetch + redirect; integration covered indirectly when wired.)

### C — Wire into pages

**Task 4.** Modify `src/pages/StudyPage.tsx`, `MistakesPage.tsx`, `VoicePage.tsx`:
- Pull `useSubscription` alongside the existing `useFsrsSession`
- After session.rateAtom, call `subscription.incrementDailyCount()` (need to wrap rateAtom — the FsrsSessionView's onRated → rate atom + increment)
- When `subscription.isAtLimit && !subscription.isPremium`, render `<PaywallGate kind="daily-limit" dailyQuestionsRemaining={0} onUpgrade={...} />` instead of the session view
- Pass an `onUpgrade` that calls `startStripeCheckout(user.id, user.email)`

To wrap rateAtom cleanly, the simplest approach is: in each page, define a local `handleRated` that does both `session.rateAtom(input)` and `subscription.incrementDailyCount()`, and pass that to `FsrsSessionView`. **But** `FsrsSessionView` currently passes the rateAtom from `session` directly to AtomRenderer. We need to either:
  (a) thread an alternative `onRated` through FsrsSessionView (small API change to FsrsSessionView)
  (b) wrap rateAtom in the page level by intercepting via a memoized session shim

Pick (a) — it's a small, backwards-compatible change: add an optional `onRatedSideEffect` prop to FsrsSessionView, called after rateAtom resolves.

### D — Tests

**Task 5.** `tests/components/PaywallGate.test.tsx` already in Phase A. Add `tests/integration/paywall.test.tsx` — verify that hitting the daily limit triggers the PaywallGate render in StudyPage equivalent.

### E — Verify + CHANGELOG

**Task 6.** Final battery: tests, build, tsc. Append CHANGELOG.

## Out of scope

- Pro pricing page UI (Stripe-hosted checkout)
- Webhook handler logic changes (existing webhook flips is_premium when Stripe fires)
- Yearly tier UI
- Upgrade flow analytics
- Free atoms quota refresh / countdown UI (v1 just shows "you've hit today's free 20")
- Predicted-score-crossing-target trigger (Plan 9B)
