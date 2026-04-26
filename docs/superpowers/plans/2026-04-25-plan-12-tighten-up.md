# Plan 12 — Critical-review Tighten-up

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Address all autonomous-fixable items from the post-Plan-11 critical review. The original 11 plans built the engine; this plan closes the rough edges that would surface within minutes of a real student using studyedit.com.

**Out-of-scope** (correctly deferred — cannot do autonomously):

| Issue | Why deferred |
|---|---|
| Rotate leaked DeepSeek key | Requires user to generate new key + update Netlify env |
| Write 50+ more atoms | Requires Nora's clinical judgement |
| Manual end-to-end smoke on production | Requires user with auth + payment method |
| Set `VITE_SENTRY_DSN` / `VITE_POSTHOG_KEY` | Requires user to sign up + paste keys into Netlify |
| AI variant generation (RAG over NICE/NHS) | Significant new infra; warrants Plan 13 |
| Whisper voice seeding for Nora | Significant; warrants Plan 14 |
| Image stem upload UI + Cloudflare R2 | Warrants Plan 15 |
| Native iOS / Android Capacitor builds | App Store flow; warrants Plan 16 |
| Cohort leaderboards | Plan 12 already named in spec; deferred to a later plan |

## What this plan ships — 5 batches

### Batch 1 — Discoverability + UX polish (no schema)
- Home `/` gets a "Try the new study mode" CTA linking to `/study`
- "Made by Nora, MD" surface on home + AuthGate cards
- Streak switches from UTC to user's local timezone
- `predictedScore` recomputes live after every `rateAtom`
- Remove `ApplePracticeSession` bundle bloat (208 KB legacy practice flow no `/study` user ever hits)

### Batch 2 — Supabase write-side hardening (schema migration)
- New `daily_session_counts(user_id, date, count)` table → moves daily quota out of localStorage
- New `is_creator(uid)` PL/pgSQL function + tightened `atoms_update_*` policy
- New `mock_attempts(user_id, atom_count, correct, total, percentage, time_used_sec, started_at, finished_at)` table
- Migration files committed; **apply via Supabase-MCP session** (separate handoff)

### Batch 3 — CI + page-level testing
- `.github/workflows/ci.yml` — runs `npm test`, `npm run build`, `npx tsc --noEmit` on every push
- Page-level tests for `StudyPage`, `MistakesPage`, `MockPage`, `VoicePage`, `ReviewPage`, `SeedPage`
- Test for `<AtomicEngineNav />` (creator gating, route active-state)

### Batch 4 — Compliance + retention features
- `<PrivacyPolicy />` page at `/privacy` with PostHog/Sentry consent disclosure
- `<CookieConsent />` banner, gates PostHog/Sentry init until user consents
- Streak grace days (Duolingo pattern: one missed day forgiven per week)
- Conversion trigger: when `predictedScore >= target` and free user, prompt upgrade with "you're nearly there" copy

### Batch 5 — Cleanup
- Remove nested `.worktrees/` symlinks from disk (functional, just messy)
- `docs/superpowers/plans/README.md` — index of all plans + status
- Document the user-action items in a top-level `OPERATOR-RUNBOOK.md`

## Reporting

After each batch: PR + merge + deploy. Final state: `studyedit.com` serves all the polished routes, all migrations applied, CI green on push.

The four "DEFERRED to user/Nora" items remain pending — those are the only blockers between this and a real beta launch.
