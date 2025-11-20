# Fix Supabase Authentication for studyedit.com

## Problem
Authentication works on the Netlify domain but not on studyedit.com because Supabase needs to be configured to allow the custom domain.

## Solution

### 1. Update Supabase Project Settings

Go to your Supabase Dashboard:
1. Navigate to: https://app.supabase.com/project/uivitzexbtsmnspcitgh/settings/auth
2. Find **"Site URL"** and set it to: `https://studyedit.com`
3. Find **"Redirect URLs"** and add these URLs:
   - `https://studyedit.com`
   - `https://studyedit.com/**`
   - `https://studyedit.com/auth/callback`
   - `https://*.netlify.app` (keep this for staging)
   - `https://*.netlify.app/**`

### 2. Clear Browser Data (Important!)

After updating Supabase settings, you need to:
1. Go to studyedit.com
2. Open DevTools (F12)
3. Go to Application tab → Storage
4. Click "Clear site data"
5. Refresh the page
6. Sign in again

### 3. Alternative: Sign Out and Sign In Again

1. Go to the Netlify domain where you're signed in
2. Sign out completely
3. Go to studyedit.com
4. Sign in with noraabdounmohammed@gmail.com

## Why This Happens

- Supabase uses the domain in the authentication flow
- By default, it only allows the domains you've explicitly configured
- The auth session cookies/tokens are domain-specific
- You need to add studyedit.com to the allowed list

## Code Changes Made

Updated `src/lib/supabase.ts` to use proper auth configuration:
- Persistent sessions across page reloads
- Auto token refresh
- PKCE flow for better security
- Custom storage key to avoid conflicts

## Verification

After making these changes:
1. Deploy the updated code: `netlify deploy --prod`
2. Clear browser data on studyedit.com
3. Sign in with your creator account
4. Verify creator features are visible
