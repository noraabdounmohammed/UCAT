# Deployment Instructions

StudyEdit uses Netlify serverless functions for AI generation. Provider credentials must be configured in Netlify environment variables and must never be committed to the repository or exposed through client-side `VITE_*` variables.

## Build

```bash
npm ci
npm run build
```

## Security

- Keep provider API keys server-side only.
- Store production secrets in Netlify environment variables.
- Treat any credential that has appeared in Git history as compromised and rotate it.
- Supabase anon/public configuration may be client-visible; privileged service-role credentials must never be committed.
