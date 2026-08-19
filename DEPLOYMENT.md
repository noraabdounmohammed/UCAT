# Deployment Instructions

## Security setup

StudyEdit uses Netlify serverless functions for AI generation so provider credentials stay on the server and are never bundled into the browser application.

### How it works

1. **Frontend** calls `/.netlify/functions/ai-generate`.
2. **Serverless function** reads the AI provider credential from Netlify environment variables.
3. **Response** returns the generated content to the frontend.

No real API key should ever be committed to this repository, documentation, a `VITE_*` variable, or client-side code.

## Deployment steps

### 1. Configure environment variables in Netlify

In the Netlify project dashboard, open **Project configuration → Environment variables** and configure the variables required by the serverless functions and client application.

For AI-provider credentials, use server-only names such as `OPENAI_API_KEY` or the provider-specific variable expected by the relevant function. Do **not** prefix secret credentials with `VITE_`, because Vite exposes `VITE_*` variables to client bundles.

Use a placeholder in documentation only:

```text
OPENAI_API_KEY=<set securely in Netlify>
```

If a credential has ever been committed to Git history, treat it as compromised and rotate it with the provider.

### 2. Build

Netlify builds the site using the repository `netlify.toml` configuration:

```bash
npm ci
npm run build
```

### 3. Verify deployment

After deployment:

1. Open the deployed application and complete a normal practice session.
2. Confirm AI generation succeeds through `/.netlify/functions/ai-generate`.
3. Confirm no provider secret is visible in browser source, client JavaScript, or network request headers.
4. Confirm authenticated progress and question generation behave correctly in a deploy preview before promoting to production.

## Development

Local development should use a local `.env` file that is excluded from version control. Server-side functions should read provider credentials from environment variables rather than from client-side `VITE_*` variables.

## Security requirements

- Never commit live API keys or access tokens.
- Never place provider secrets in documentation.
- Never expose a secret through `VITE_*` variables.
- Store production secrets in Netlify environment variables with the minimum required scope.
- Rotate any credential that has previously appeared in Git history.
- Keep Supabase public/anon configuration separate from privileged service-role credentials.
