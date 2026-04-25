# Plan 11 — Production Readiness (Sentry + PostHog + NPS)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Wire three production-essential observability pieces — Sentry error tracking, PostHog analytics, and an NPS prompt — all opt-in via env-vars so dev/test environments don't pollute counters or require keys.

**Spec:** §11 risk register (errors, NPS) + §10 (Pro paywall conversion telemetry).

**Architecture:**
- Init helpers in `src/instrumentation/sentry.ts`, `src/instrumentation/posthog.ts` — called once from `src/main.tsx`. No-op when their respective env vars are unset.
- Thin event wrapper `src/instrumentation/events.ts` — `track(name, props)` hides PostHog's API behind a stable interface.
- Sprinkle `track(...)` calls at high-value events: `session_started`, `atom_rated`, `mock_finished`, `paywall_shown`, `upgrade_clicked`.
- `<NpsPrompt />` component shown after the 5th completed session of a user (counter in localStorage). Captures 0-10 score + optional comment, writes to a new `nps_responses` Supabase table.

## Schema migration

`supabase/migrations/20260425220000_nps_responses.sql`:

```sql
create table if not exists public.nps_responses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  score       smallint not null check (score between 0 and 10),
  comment     text,
  context     text, -- e.g. "after-5-sessions"
  created_at  timestamptz not null default now()
);

alter table public.nps_responses enable row level security;

create policy "nps_responses_owner_insert"
  on public.nps_responses for insert
  with check (auth.uid() is not null and (auth.uid() = user_id or user_id is null));

-- Reading is admin-only via service-role; no SELECT policy for authed users.
```

## Phases — 9 tasks, 8 commits

### A — Sentry init (TDD)

**Task 1 RED.** `tests/instrumentation/sentry.test.ts` — 2 tests: returns no-op when DSN absent, calls `Sentry.init` when present (mock the import).

**Task 2 GREEN.** `src/instrumentation/sentry.ts`:

```ts
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
```

Install `@sentry/react` as a runtime dep in this commit (`npm install @sentry/react`).

### B — PostHog init + event wrapper (TDD)

**Task 3 RED.** `tests/instrumentation/events.test.ts` — 3 tests: track no-ops without key, track with key calls posthog.capture (mock), trackedEventsList exports valid event names (type-checked).

**Task 4 GREEN.** `src/instrumentation/posthog.ts`:

```ts
let initialized = false;
let phCache: any | null = null;

async function ensurePosthog(): Promise<any | null> {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return null;
  if (initialized) return phCache;
  const ph = await import('posthog-js');
  ph.default.init(key, { api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.posthog.com' });
  phCache = ph.default;
  initialized = true;
  return phCache;
}

export async function initPosthog(): Promise<void> { await ensurePosthog(); }

export async function trackEvent(name: string, props?: Record<string, any>): Promise<void> {
  const ph = await ensurePosthog();
  if (!ph) return; // No-op without key
  ph.capture(name, props);
}

export async function identifyUser(userId: string, traits?: Record<string, any>): Promise<void> {
  const ph = await ensurePosthog();
  if (!ph) return;
  ph.identify(userId, traits);
}
```

`src/instrumentation/events.ts`:

```ts
import { trackEvent } from './posthog';

export type TrackedEvent =
  | 'session_started'
  | 'session_completed'
  | 'atom_rated'
  | 'mock_started'
  | 'mock_finished'
  | 'paywall_shown'
  | 'upgrade_clicked'
  | 'nps_submitted'
  | 'voice_session_started';

export function track(event: TrackedEvent, props?: Record<string, any>): void {
  // Fire-and-forget; awaiting would block render paths.
  trackEvent(event, props).catch(() => {});
}
```

Install `posthog-js` as a runtime dep.

### C — NPS schema + repo (TDD)

**Task 5 RED.** `tests/atom/npsRepository.test.ts` — 1 test: insert with mapped fields.

**Task 6 GREEN.** `src/atom/npsRepository.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export interface NpsRepository {
  submitNps(userId: string, score: number, comment: string | null, context: string): Promise<void>;
}

export function createNpsRepository(supabase: SupabaseClient): NpsRepository {
  return {
    async submitNps(userId, score, comment, context) {
      const { error } = await supabase.from('nps_responses').insert({
        user_id: userId,
        score,
        comment,
        context,
      });
      if (error) throw error;
    },
  };
}
```

Plus the migration file `supabase/migrations/20260425220000_nps_responses.sql` with the schema above.

### D — NpsPrompt component (TDD)

**Task 7 RED.** `tests/components/NpsPrompt.test.tsx` — 4 tests: renders 0-10 buttons, click captures score, optional comment field, calls onSubmit on confirm.

**Task 8 GREEN.** `src/components/nps/NpsPrompt.tsx`:

Mobile-first card with 11 score buttons (0-10), optional textarea, Submit + "Not now" buttons.

### E — Wire instrumentation into the app

**Task 9.** Add to `src/main.tsx`:

```tsx
import { initSentry } from '@/instrumentation/sentry';
import { initPosthog } from '@/instrumentation/posthog';

initSentry();
initPosthog();
```

Sprinkle `track(...)` calls at:
- `useFsrsSession` mount: `track('session_started', { mode: 'study' })`
- `rateAtom`: `track('atom_rated', { rating, confidence })`
- `useMockSession` mount: `track('mock_started')`
- mock finished: `track('mock_finished', { correct, total, percentage })`
- `<PaywallGate>` mount with `kind !== 'allowed'`: `track('paywall_shown', { kind })`
- `startStripeCheckout`: `track('upgrade_clicked')`

For the NPS trigger: in `useFsrsSession`, after a session completes, increment a localStorage counter `nps_session_count`. When counter >= 5 AND we haven't yet shown NPS this calendar quarter, render `<NpsPrompt />` (modal/banner) on next mount.

For simplicity in v1, don't gate the NPS by quarter — just show it once per user per device (set localStorage flag `nps_shown_at`).

Append CHANGELOG entry, run battery, commit `docs: log Plan 11 completion (instrumentation)`.

## Constraints

1. **All three integrations are opt-in via env vars.** When env vars are absent (which is the default in tests + dev unless explicitly set), they no-op silently. Tests cover the no-op path.
2. **Don't apply the migration** — file commit only. Apply via Supabase-MCP session in a separate handoff.
3. **Don't push.**
4. **Don't break Plans 1-10 tests.**
5. **`track(...)` is fire-and-forget** — never `await` it in render paths.
6. **NPS prompt is rendered conditionally** — don't break existing pages if `nps_shown_at` is set.

## Out of scope (Plan 11B)

- Cohort leaderboards (deferred — needs schema + cohort effect)
- Detailed Sentry sourcemap upload pipeline (defaults are fine)
- PostHog feature flags
- A/B testing infra
- Mock session persistence (deferred from Plan 10B)

## Reporting

Each commit SHA, final test count (estimate ~145 = 129 + 2 sentry + 3 events + 1 repo + 4 NpsPrompt + 1 integration), build/tsc clean, any deviations.
