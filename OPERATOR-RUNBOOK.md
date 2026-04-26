# Operator Runbook

Things only a human operator can do. Claude can't:
- Rotate API keys
- Sign in to Stripe / Supabase as the project owner
- Apply database migrations to production (without a Supabase-MCP session)
- Make manual deploys
- Test Stripe checkout with a real card
- Recruit beta users

## Daily / weekly maintenance

### Apply pending Supabase migrations
1. Open a fresh Claude Code session in this repo.
2. Confirm `.mcp.json` lists the Supabase MCP server.
3. List unapplied migrations:
   ```
   ls supabase/migrations/ | sort
   ```
4. For each migration not yet in `mcp__supabase__list_migrations`, apply via `mcp__supabase__apply_migration`.
5. Verify: query for the new objects.

### Deploy to production
1. Ensure `ukmla-akt-version` is up to date locally:
   ```
   cd /Users/a/UCAT-ukmla-source && git checkout ukmla-akt-version && git pull
   ```
2. Build + deploy:
   ```
   npm install && npm run build && netlify deploy --prod --dir=dist
   ```
3. Verify production URL responds.

## One-off — security tighten-up

### Rotate the leaked DeepSeek API key
The key `sk-a23965…` is in git history at `DEPLOYMENT.md`. Even after we scrubbed it, treat it as compromised.
1. Generate new key at https://platform.deepseek.com/api_keys.
2. In Netlify dashboard → Site settings → Environment variables, update `VITE_OPENAI_API_KEY`.
3. Trigger a deploy: `netlify deploy --prod --dir=dist` from the repo.
4. Optionally: run `git filter-repo --path DEPLOYMENT.md` (or BFG Repo-Cleaner) to scrub history. **Coordinate force-push with anyone who has the repo locally.**

### Retire old Supabase project `vkzqbwoithtkgbvvtbpm`
That project's anon key was committed on `master`'s `.env`. If unused:
1. Log into https://app.supabase.com.
2. Settings → General → Pause/Delete project.
3. Confirm.

### Set instrumentation env vars (when ready for telemetry)
- `VITE_SENTRY_DSN` — sign up at sentry.io (free tier 5k errors/mo)
- `VITE_POSTHOG_KEY` — sign up at posthog.com (free tier 1M events/mo, EU host recommended)

After setting, redeploy. Both no-op silently when absent so the app works without.

## One-off — content seeding

### Add atoms via the seed form
1. Sign in as Nora's account (creator role).
2. Navigate to https://studyedit.com/seed.
3. Fill out the form for each atom (claim, stem, answer, distractors, citation URL/label, topic path, difficulty, source type, exam, high-yield checkbox).
4. Submit → atom enters review queue.
5. Switch to https://studyedit.com/review to approve.

### Bulk seed via SQL
For initial content drops:
1. Write SQL in the shape of `scripts/seed-dogfood-atoms.sql` (uses `where not exists` so it's idempotent).
2. Apply via Supabase-MCP session: `mcp__supabase__execute_sql`.

## Manual smoke test (before each release)

1. Sign up a fresh free user.
2. Visit `/study` → rate at least one atom.
3. Visit `/mistakes` (will be empty until you've gotten an atom wrong).
4. Visit `/mock` → complete the 20 atoms or let timer run out → confirm `MockResult` renders.
5. Visit `/voice` (Chrome) → start a session → say the answer aloud → confirm auto-rate.
6. Hit 20 questions → confirm `<PaywallGate kind="daily-limit">` renders.
7. Click Upgrade → confirm Stripe Checkout opens.
8. Complete a test purchase (Stripe test mode).
9. Confirm `is_premium` flips on the profile row.
10. Confirm subsequent rating doesn't trigger the paywall.

If any step fails, file an issue or a Plan 13+ entry.

## Things deferred to future plans

See [docs/superpowers/plans/README.md](./docs/superpowers/plans/README.md) for the deferred-work list.
