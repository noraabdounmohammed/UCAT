# Study Edit (medicu-app)

<!-- deploy-trigger: 2026-08-25-long-press-fix -->

UKMLA exam-prep with FSRS-5 spaced repetition, made by a UK doctor.
Live at **[studyedit.com](https://studyedit.com)**.

## What this is

A retrieval-first medical exam-prep web app (PWA + Capacitor mobile shells). Students get 3-min spaced-repetition study sessions, mistake-deck drills, hands-free voice mode, timed mock exams, and a paywall-gated full question bank. Creators (named clinicians, currently Nora Mohammed, MD) approve / edit / reject AI-drafted questions before they reach students.

The internal architecture refers to a single testable claim as an **atom** — see `src/atom/` for the schema, types, and repos. Users of the live app see the word **question** instead; the rename is purely UI surface.

## Stack

| Layer | What |
|---|---|
| Frontend | React 18, TypeScript, Vite 5, Tailwind, shadcn/ui, react-router-dom |
| Spaced rep | `ts-fsrs` (FSRS-5 algorithm) |
| Backend | Supabase (Postgres + Auth + RLS), Netlify Functions for Stripe + AI |
| Tests | Vitest + RTL + jsdom (unit/integration), Playwright (E2E smoke) |
| Hosting | Netlify, custom domain `studyedit.com` |
| Telemetry (opt-in) | Sentry, PostHog (no-op without env vars) |
| Mobile | Capacitor wired in package.json (App Store builds: see Plan 16) |

## Getting started

```bash
git clone https://github.com/noraabdounmohammed/UCAT.git
cd UCAT
git checkout ukmla-akt-version  # the active dev branch (master is the old MVP)
npm install
npm test            # 204 Vitest tests
npm run build       # production build → dist/
npm run dev         # local dev server
```

You'll need a `.env.local` with:

```
VITE_SUPABASE_URL=https://uivitzexbtsmnspcitgh.supabase.co
VITE_SUPABASE_ANON_KEY=<from Netlify env>
SUPABASE_SERVICE_ROLE_KEY=<from Netlify env>   # needed for scripts/*
VITE_OPENAI_API_KEY=<DeepSeek key, named OpenAI for legacy reasons>
# Optional (no-op if absent):
VITE_SENTRY_DSN=<sentry.io>
VITE_POSTHOG_KEY=<posthog.com>
```

Pull production env via `netlify env:list --plain > .env.local` (you must `netlify login` first and have access to the `medicu-app` site).

## Routes

| Path | Audience | What |
|---|---|---|
| `/` | Anyone | Curriculum carousel + 'Try Study Mode' CTA |
| `/study` | Authed | 3-min FSRS retrieval session |
| `/mistakes` | Authed | Drill recently-forgotten questions |
| `/mock` | Authed | 30-min, 20-question timed mock |
| `/voice` | Authed (Chrome) | Hands-free TTS+STT retrieval |
| `/leaderboard` | Authed | Cohort top 10 by reviews this week |
| `/seed` | Creators | Form to add new questions |
| `/review` | Creators | Mobile inbox to approve/edit/reject draft questions |
| `/privacy` | Anyone | Privacy + cookie disclosure |

## Architecture

```
src/
  atom/              # Internal "atom" (= question) schema + repos
    types.ts         # Atom, AtomVariant, UserAtomState, ReviewEvent
    repository.ts    # listApprovedByExam, listFreeTier, getById, countApprovedByExam
    userStateRepository.ts  # FSRS state CRUD + review-event log + due queue
    seedRepository.ts       # createDraftAtom (creator-only)
    reviewRepository.ts     # listPendingReview / approve / reject / update
    cohortRepository.ts     # leaderboard + cohort selection
    mockAttemptsRepository.ts
    npsRepository.ts
  fsrs/              # FSRS-5 scheduler + retention math
    scheduler.ts     # createFsrsScheduler() — wraps ts-fsrs
    retention.ts     # computeRetention, computePredictedScore
    mapper.ts        # FsrsCardState ↔ user_atom_state row
    session.ts       # pure session-state machine (pickNext, isDone)
    types.ts
  hooks/
    useFsrsSession.ts useReviewQueue.ts useMockSession.ts useStreak.ts
    usePredictedScore.ts useSubscription.ts useNpsTrigger.ts
    useSeedAtom.ts useCohortLeaderboard.ts useUserRole.ts
  components/
    study/ AtomRenderer FsrsSessionView SessionSummary PredictedScoreBadge
    review/ ReviewCard ReviewQueueView RejectReasonModal
    mock/ MockQuestion MockTimer MockResult
    voice/ VoiceAtomView
    seed/ AtomSeedForm
    paywall/ PaywallGate
    leaderboard/ CohortSelectModal LeaderboardTable
    nps/ NpsPrompt
    consent/ CookieConsent
    auth/ AuthGate AuthBar AuthForm
    layout/ MainLayout AtomicEngineNav
  pages/
    LandingPage StudyPage MistakesPage MockPage VoicePage
    SeedPage ReviewPage LeaderboardPage PrivacyPolicy
  instrumentation/
    sentry posthog events consent  # all opt-in via env vars + cookie consent
  streak/ compute.ts   # local-tz day keys, grace-day support
  mock/ state.ts       # pure mock state machine
  voice/ speech.ts match.ts  # Web Speech API wrappers + answer matching
supabase/migrations/  # 9 migrations (3 not yet applied — see OPERATOR-RUNBOOK)
scripts/generate-atoms-from-ukmla.ts  # bulk AI-draft generator from UKMLA syllabus
tests/{atom,fsrs,hooks,components,pages,integration,e2e,instrumentation,streak,mock,voice}/
```

## Key conventions

- **Repositories are factories** that take a `SupabaseClient` and return `{...methods}`. Hooks accept the repo as a dep so unit tests can pass a stub. See `useFsrsSession`, `useReviewQueue`, `useMockSession`.
- **TDD discipline**: every feature has a RED commit (failing test) preceding the GREEN commit (implementation). Look at `git log --grep "(RED)"` for the audit trail.
- **Routes are lazy-loaded** via `React.lazy()` for code-splitting; `MainLayout` provides the shared `<AtomicEngineNav>` top tab strip.
- **Subscription state** lives in Supabase (`profiles.is_premium`) + a daily counter (`daily_session_counts`). Stripe Checkout flips the premium flag via webhook.
- **RLS is owner-scoped** on user-data tables; `atoms` reads are public-on-approved; writes are gated by a DB-level `is_creator(uid)` function (see migrations).

## Development workflow

The project ships in **plans** — numbered design + execution docs. See [`docs/superpowers/plans/README.md`](./docs/superpowers/plans/README.md) for the index.

To start a new plan:

```bash
git checkout ukmla-akt-version && git pull
git worktree add .worktrees/plan-N-name origin/ukmla-akt-version -b feat/plan-N-name
cd .worktrees/plan-N-name && npm install
# write the plan doc, then implement TDD-style
git push -u origin feat/plan-N-name
gh pr create --base ukmla-akt-version
```

After merge, apply any new Supabase migrations via the Supabase MCP — see [`OPERATOR-RUNBOOK.md`](./OPERATOR-RUNBOOK.md) for the human-only ops procedures (key rotation, deploys, smoke testing, content seeding).

## CI

GitHub Actions runs on every push to any branch:
- `npm test` (Vitest)
- `npx tsc --noEmit` (informational; pre-existing legacy errors don't block)
- `npm run build`

On pushes to `ukmla-akt-version`, an additional Playwright E2E smoke suite hits production.

## Status

15 plans implemented, 3 plan docs ready for execution (Plans 14, 15, 16). 218 tests total. See [`docs/superpowers/plans/README.md`](./docs/superpowers/plans/README.md) for the full status table.

## License

Closed-source as of 2026-04. Contact [nora@studyedit.com](mailto:nora@studyedit.com) for collaboration enquiries.
