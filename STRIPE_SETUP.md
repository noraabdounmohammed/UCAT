# Stripe Setup — Do This Now (30 minutes)

## Step 1: Supabase Migration

Go to: https://supabase.com/dashboard → your project → SQL Editor

Run this SQL:

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS premium_since TIMESTAMPTZ;

-- Index for webhook lookups by Stripe customer ID
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON profiles(stripe_customer_id);
```

---

## Step 2: Create Stripe Product & Price

1. Go to https://dashboard.stripe.com/products
2. Click **+ Add product**
3. Name: `Medicu Student Pro`
4. Description: `Unlimited AI-generated UKMLA questions`
5. Pricing: **Recurring · £9.99 · Monthly**
6. Click Save — copy the **Price ID** (starts with `price_...`)

---

## Step 3: Netlify Environment Variables

Go to: https://app.netlify.com → your site → Site configuration → Environment variables

Add these:

| Variable | Value |
|---|---|
| `STRIPE_SECRET_KEY` | From https://dashboard.stripe.com/apikeys (use **Secret key**, starts with `sk_live_...`) |
| `STRIPE_PRICE_ID_MONTHLY` | The price ID you copied above (`price_...`) |
| `STRIPE_WEBHOOK_SECRET` | From Step 4 below (`whsec_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Settings → API → **service_role** key |

---

## Step 4: Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **+ Add endpoint**
3. URL: `https://studyedit.com/.netlify/functions/stripe-webhook`
4. Events to listen to (select these):
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Add it as `STRIPE_WEBHOOK_SECRET` in Netlify (Step 3)

---

## Step 5: Deploy

```bash
npx vite build
npx netlify deploy --prod --dir=dist
```

---

## Step 6: Test

1. Go to https://studyedit.com/pricing
2. Click "Subscribe" — you should be redirected to Stripe Checkout
3. Use Stripe test card: `4242 4242 4242 4242` · any expiry · any CVC
4. After payment: you should land on `/concept-practice?upgraded=true`
5. Check Supabase → profiles table → your user should have `is_premium = true`

---

## Notes

- Free users: 20 questions/day (tracked in localStorage + verified server-side)
- The gate is in `netlify/functions/ai-generate.ts` — calls check `is_premium` from DB
- Webhook handles cancellations automatically (sets `is_premium = false`)
- To test locally: use `stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook`
