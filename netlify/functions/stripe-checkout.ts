import { Handler } from '@netlify/functions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

const PRICE_ID_MONTHLY = process.env.STRIPE_PRICE_ID_MONTHLY!;
const APP_URL = process.env.URL || 'https://studyedit.com';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { userId, userEmail, plan = 'monthly' } = JSON.parse(event.body || '{}');

    if (!userId || !userEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId and userEmail are required' }),
      };
    }

    const priceId = PRICE_ID_MONTHLY;

    if (!priceId) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Stripe price not configured. Set STRIPE_PRICE_ID_MONTHLY in Netlify env vars.' }),
      };
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: userEmail,
      success_url: `${APP_URL}/concept-practice?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/pricing?cancelled=true`,
      metadata: {
        supabase_user_id: userId,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
        },
      },
      allow_promotion_codes: true,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to create checkout session',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { handler };
