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

## One-off — fix sign-up confirmation redirect (URGENT)

**Symptom:** sign-up confirmation email link redirects to `https://medicu-app.netlify.app/?code=…` instead of `https://studyedit.com/?code=…`.

**Cause:** Supabase Auth's **Site URL** is still set to the legacy Netlify subdomain. The `?code=` flow falls back to Site URL when the requested `emailRedirectTo` isn't in the Redirect URLs allow list.

**Fix (2 min, dashboard only):**

1. Open https://supabase.com/dashboard/project/uivitzexbtsmnspcitgh/auth/url-configuration.
2. **Site URL** → change to `https://studyedit.com`.
3. **Redirect URLs** → ensure both are listed (so legacy bookmarks still work during the cutover):
   - `https://studyedit.com/**`
   - `https://medicu-app.netlify.app/**`
4. Click **Save**.
5. Trigger a real sign-up against `https://studyedit.com` to verify the email link now points there.

**Optional follow-up:** the in-app `signUp` call passes `emailRedirectTo: window.location.origin` ([src/components/auth/AuthForm.tsx:82](src/components/auth/AuthForm.tsx:82)). That works *if* the user signs up on the canonical domain. To make it bulletproof, hard-code to `'https://studyedit.com/auth/callback'` in a future PR.

## One-off — fix the broken Upgrade button (URGENT)

**Symptom:** clicking **Upgrade — £19.99/mo** does nothing (or shows a generic error).

**Cause:** `/.netlify/functions/stripe-checkout` returns 500 with `"Failed to create checkout session"` because one or more env vars are missing in Netlify. The function code itself is fine ([netlify/functions/stripe-checkout.ts](netlify/functions/stripe-checkout.ts)).

**Fix (5 min, Netlify dashboard + Stripe dashboard):**

1. Open https://app.netlify.com/sites/medicu-app/configuration/env (or the Netlify-side equivalent for `studyedit.com` if it's a separate site).
2. Verify these env vars exist and are non-empty:
   - `STRIPE_SECRET_KEY` — from https://dashboard.stripe.com/apikeys (use **live** key for prod, `sk_live_…`).
   - `STRIPE_PRICE_ID_MONTHLY` — from https://dashboard.stripe.com/products → click your product → copy the price ID, format `price_…`.
   - `STRIPE_WEBHOOK_SECRET` — from https://dashboard.stripe.com/webhooks → click your webhook → "Signing secret" → reveal, format `whsec_…`. **This is what `stripe-webhook.ts` uses to verify incoming Stripe events; without it, paid users won't get `is_premium = true` flipped.**
   - `VITE_SUPABASE_URL` — already set for the frontend, also needed by the webhook.
   - `SUPABASE_SERVICE_ROLE_KEY` — from https://supabase.com/dashboard/project/uivitzexbtsmnspcitgh/settings/api → "service_role secret". **Server-side only — never expose this in any `VITE_…` var.**
3. **Trigger a redeploy** so the functions pick up the new env: `netlify deploy --prod --dir=dist` (or click **Trigger deploy** in the Netlify dashboard).
4. **Verify** by signing in with a test account, hitting the daily limit (20 questions), clicking **Upgrade**. Stripe Checkout page should load. Use Stripe test card `4242 4242 4242 4242` (test mode) to confirm webhook → `is_premium` flow.
5. **Optional check from a terminal** (don't probe with a real `userId` against prod; use a known-bad one to confirm only that the function isn't 500ing on env):
   ```sh
   curl -i -X POST https://studyedit.com/.netlify/functions/stripe-checkout \
     -H 'Content-Type: application/json' \
     -d '{"userId":"00000000-0000-0000-0000-000000000000","userEmail":"diagnostic@studyedit.com"}'
   ```
   - **400** with `"userId and userEmail are required"` ⇒ payload-validation OK.
   - **500** with `"Stripe price not configured"` ⇒ `STRIPE_PRICE_ID_MONTHLY` still missing.
   - **500** with `"Failed to create checkout session"` + a Stripe error in the body ⇒ `STRIPE_SECRET_KEY` invalid or wrong mode (test key in prod, etc.).
   - **200** with a `url` field ⇒ env is good. (You'll have created an orphan Stripe Checkout Session — delete it from the Stripe dashboard if you want to keep things clean.)

## One-off — upload brand-aligned auth email templates

The 5 HTML templates in [supabase/templates/](supabase/templates/) replace Supabase's default emails. They match the in-app warm Stone palette + Unbounded/Manrope typography. **They don't auto-deploy** — they need a one-off paste into the Supabase dashboard.

**Steps (10 min, dashboard only):**

1. Open https://supabase.com/dashboard/project/uivitzexbtsmnspcitgh/auth/templates.
2. For each of the 5 templates, paste the full file contents into the matching slot:

   | Dashboard tab | File to paste | Subject line |
   |---|---|---|
   | **Confirm signup** | `supabase/templates/confirmation.html` | `Confirm your Study Edit account` |
   | **Magic Link** | `supabase/templates/magic_link.html` | `Your Study Edit sign-in link` |
   | **Reset Password** | `supabase/templates/recovery.html` | `Reset your Study Edit password` |
   | **Change Email Address** | `supabase/templates/email_change.html` | `Confirm your new email · Study Edit` |
   | **Invite User** | `supabase/templates/invite.html` | `You're invited to Study Edit` |

3. For each tab, also update the **Subject** field to the value above (the dashboard subject overrides the `<title>` inside the HTML).
4. Click **Save** on each tab (the dashboard does not save across tabs automatically).
5. **Verify with a real-client test:** trigger one email of each type to a personal inbox (Gmail web + iOS Mail at minimum). Check:
   - Wordmark renders in Unbounded (or Inter fallback) — the divider line below it should be visible.
   - CTA button is a black pill with white uppercase text.
   - Card has rounded corners and a stone-200 border.
   - The fallback `Or paste this link` URL is selectable / clickable.
   - In Outlook 365, the layout doesn't collapse (we use `<table>` for layout precisely to survive Outlook).

**Reverting** is easy — Supabase Auth has "Reset to default" on each template tab if anything regresses.

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
