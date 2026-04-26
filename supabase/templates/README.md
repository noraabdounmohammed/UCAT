# Supabase Auth — email templates

Brand-aligned HTML for the auth-related transactional emails Supabase sends.

| File | Supabase template slot | When it fires |
|---|---|---|
| `confirmation.html` | Confirm signup | New user registers with email/password and confirmation is enabled |
| `magic_link.html` | Magic Link | User signs in via passwordless link |
| `recovery.html` | Reset Password | User requests password reset via "Forgot password?" |
| `email_change.html` | Change Email Address | Authed user changes their email |
| `invite.html` | Invite User | Admin sends invite via dashboard / API |

## Design system (matches the in-app brand)

- **Page**: `#fafaf9` (stone-50) — warm off-white.
- **Card**: `#ffffff` with 1 px `#e7e5e4` (stone-200) border, `border-radius: 24 px`.
- **Ink**: `#1c1917` (stone-900) for display, `#44403c` (stone-700) for body, `#78716c` (stone-500) for muted, `#a8a29e` (stone-400) for footer.
- **Display type**: Unbounded 500 (`-0.02em` tracking). System fallback: `Inter`, `-apple-system`, `BlinkMacSystemFont`, etc.
- **Body type**: Manrope 300 / 400. Same fallback chain.
- **CTA**: full-pill button (`border-radius: 9999px`) on `#1c1917` with white Unbounded 500 uppercase text, `0.08em` tracking.
- **Layout**: 560 px max width, table-based for Outlook safety, 100 % inline CSS (Gmail strips `<style>`).
- **Light-only**: explicit `color-scheme: light only` so dark-mode mail clients don't auto-invert.

## Variables used

Standard [Supabase email template variables](https://supabase.com/docs/guides/auth/auth-email-templates#using-the-template-variables):

- `{{ .ConfirmationURL }}` — primary CTA target. Used by every template.
- `{{ .Email }}` — only `email_change.html` (current address).
- `{{ .NewEmail }}` — only `email_change.html` (target address).

OTP / Token variables (`{{ .Token }}`, `{{ .TokenHash }}`) are not used — the templates rely on click-through via `ConfirmationURL`. If you switch the project to OTP-first, add a prominent code display block above the CTA.

## Uploading to production

These template files **do not auto-deploy**. They live in the repo for version control + diff review; the operator must paste them into the Supabase dashboard. See [`OPERATOR-RUNBOOK.md`](../../OPERATOR-RUNBOOK.md#one-off--upload-brand-aligned-auth-email-templates) for the click-by-click steps.

For local Supabase CLI dev, the templates can be referenced via `supabase/config.toml` once one exists in the repo (currently the project has no `config.toml`, so local dev uses Supabase defaults).

## Previewing locally

Open any of the `.html` files directly in a browser — they render without server-side substitution. The `{{ .ConfirmationURL }}` literal will be visible; replace it with a dummy URL to dry-run a click.

For real-client testing:
- **Litmus / Email on Acid** — paste the rendered HTML, check Outlook 365 / Gmail-web / iOS Mail / Apple Mail.
- **Mailpit / MailHog** — run locally, point Supabase Auth at it, trigger a real signup.
