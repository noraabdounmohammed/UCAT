# Supabase Authentication Setup

This guide will help you configure authentication in your Supabase project.

## Prerequisites

- Supabase project created (already done ✅)
- Environment variables configured (already done ✅)

## Enable Email Authentication

1. **Go to Supabase Dashboard**
   - Visit: https://uivitzexbtsmnspcitgh.supabase.co
   - Navigate to: Authentication → Providers

2. **Configure Email Provider**
   - Enable "Email" provider
   - **Confirm email:** Toggle ON (recommended for production) or OFF (for testing)
   - **Secure email change:** Toggle ON (recommended)
   - Click "Save"

## Email Templates (Optional but Recommended)

Navigate to: Authentication → Email Templates

### Confirm Signup Template
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

### Magic Link Template
```html
<h2>Magic Link</h2>
<p>Follow this link to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
```

### Reset Password Template
```html
<h2>Reset Password</h2>
<p>Follow this link to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

## Site URL Configuration

Navigate to: Authentication → URL Configuration

1. **Site URL:** `https://medicu-app.netlify.app`
2. **Redirect URLs:** Add these URLs:
   - `https://medicu-app.netlify.app`
   - `https://medicu-app.netlify.app/**`
   - `http://localhost:5173` (for local development)
   - `http://localhost:5173/**`

## Testing Authentication

### Local Testing
1. Run the app: `npm run dev`
2. Click "Sign in" button in the top-right
3. Create an account or sign in
4. Check your email for confirmation (if enabled)

### Production Testing
1. Deploy to Netlify: `npx netlify deploy --prod`
2. Visit: https://medicu-app.netlify.app
3. Test sign up/sign in flow

## Features Implemented

✅ **Email/Password Authentication**
- Sign up with email and password
- Sign in with existing account
- Email confirmation (configurable)
- Password reset flow

✅ **Auth Context**
- Global auth state management
- Automatic session persistence
- Auth state change listeners

✅ **User Interface**
- AuthBar component in header
- Sign in/Sign up modal
- User profile modal
- Sign out functionality

✅ **User Profile**
- View email address
- View account creation date
- View user ID
- Sign out button

## Security Best Practices

1. **Row Level Security (RLS)**
   - Enable RLS on all tables that store user data
   - Create policies to restrict access to user's own data

2. **Email Confirmation**
   - Enable for production to prevent spam accounts
   - Disable for testing to speed up development

3. **Password Requirements**
   - Minimum 6 characters (enforced in form)
   - Consider adding more requirements for production

## Troubleshooting

### "Invalid credentials" error
- Check that email/password are correct
- Verify email confirmation is not required (or email is confirmed)
- Check Supabase logs: Authentication → Logs

### Email not received
- Check spam folder
- Verify SMTP settings in Supabase
- Check email templates are configured
- For testing, disable email confirmation

### Session not persisting
- Check browser localStorage is enabled
- Verify Supabase URL and anon key are correct
- Check browser console for errors

## Next Steps

1. **Enable RLS on tables** (if storing user-specific data)
2. **Add password reset flow** (optional)
3. **Add social auth providers** (Google, GitHub, etc.) (optional)
4. **Implement user roles/permissions** (optional)
5. **Add user profile editing** (optional)

## Support

For issues with Supabase authentication:
- Supabase Docs: https://supabase.com/docs/guides/auth
- Supabase Discord: https://discord.supabase.com
