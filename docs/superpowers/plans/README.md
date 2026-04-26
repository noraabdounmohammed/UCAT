# Atomic Engine — Plan index

The Atomic Engine ships in numbered plans. Each has a spec doc and an implementation plan; this index tracks status.

| # | Title | Plan doc | Status | What it does |
|---|---|---|---|---|
| 1 | Foundation | [2026-04-25-foundation-cleanup-atom-fsrs.md](./2026-04-25-foundation-cleanup-atom-fsrs.md) | Shipped | Atom schema + FSRS-5 scheduler + cleanup |
| 2 | 3-min Retrieval Session | [2026-04-25-plan-2-retrieval-session.md](./2026-04-25-plan-2-retrieval-session.md) | Shipped | `/study` route — confidence + reveal + FSRS rating |
| 3 | Review Queue | [2026-04-25-plan-3-review-queue.md](./2026-04-25-plan-3-review-queue.md) | Shipped | `/review` mobile inbox for Nora |
| 4 | Atom Seed Form | [2026-04-25-plan-4-seed-pipeline.md](./2026-04-25-plan-4-seed-pipeline.md) | Shipped | `/seed` form + RLS write policies |
| 5 | Mistake Deck | [2026-04-25-plan-5-mistake-deck.md](./2026-04-25-plan-5-mistake-deck.md) | Shipped | `/mistakes` route — recent lapses |
| 6 | Predicted Score | [2026-04-25-plan-6-predicted-score.md](./2026-04-25-plan-6-predicted-score.md) | Shipped | Live retention probability badge |
| 7 | Streaks | [2026-04-25-plan-7-streaks.md](./2026-04-25-plan-7-streaks.md) | Shipped | Consecutive-days counter (local-tz, with grace) |
| 8 | Voice Mode | [2026-04-25-plan-8-voice-mode.md](./2026-04-25-plan-8-voice-mode.md) | Shipped | `/voice` Web Speech retrieval |
| 9 | Pro Paywall | [2026-04-25-plan-9-paywall.md](./2026-04-25-plan-9-paywall.md) | Shipped | Stripe-backed daily quota + crossed-target trigger |
| 10 | Mock Exam | [2026-04-25-plan-10-mock-exam.md](./2026-04-25-plan-10-mock-exam.md) | Shipped | `/mock` 30-min timed exam |
| 11 | Instrumentation | [2026-04-25-plan-11-instrumentation.md](./2026-04-25-plan-11-instrumentation.md) | Shipped | Sentry + PostHog + NPS prompt |
| 12 | Tighten-up | [2026-04-25-plan-12-tighten-up.md](./2026-04-25-plan-12-tighten-up.md) | In flight | Critical-review fixes (5 batches) |

## Deferred (not yet planned)

| Title | Why |
|---|---|
| Plan 13 — AI Variant Generation (RAG) | Significant infra; needs careful citation discipline |
| Plan 14 — Whisper voice atom seeding | Helps Nora; needs Whisper API + UI |
| Plan 15 — Image stem upload (Cloudflare R2) | UI + storage + admin tooling |
| Plan 16 — Native iOS / Android (Capacitor) | App store flows |
| Plan 17 — Cohort leaderboards | Needs a real student cohort to be meaningful |
| Plan 18 — Playwright E2E | Has been deferred twice; worth doing |

## How to read a plan doc

Each plan file has the same shape: goal, architecture, file structure, task breakdown (numbered, TDD-paired), self-review checklist, out-of-scope list. Plans are intended for subagent-driven execution.

## How to ship a plan

```bash
git checkout ukmla-akt-version && git pull
git worktree add .worktrees/plan-N-name origin/ukmla-akt-version -b feat/plan-N-name
cd .worktrees/plan-N-name && npm install
# ... write + commit per plan ...
git push -u origin feat/plan-N-name
gh pr create --base ukmla-akt-version
gh pr merge <num> --merge
# Apply any new migrations via Supabase MCP session
# Deploy: cd /Users/a/UCAT-ukmla-source && git checkout ukmla-akt-version && git pull && npm run build && netlify deploy --prod --dir=dist
```
