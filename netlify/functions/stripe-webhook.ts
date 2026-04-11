import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

// Use service role key here (server-side only — never expose to client)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  if (!sig || !webhookSecret) {
    console.error('Missing stripe-signature or webhook secret');
    return { statusCode: 400, body: 'Missing signature' };
  }

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body!,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return {
      statusCode: 400,
      body: `Webhook error: ${err instanceof Error ? err.message : 'Unknown'}`,
    };
  }

  console.log('Stripe webhook received:', stripeEvent.type);

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;

        if (!userId) {
          console.error('No supabase_user_id in session metadata');
          break;
        }

        // Mark user as premium in Supabase
        const { error } = await supabase
          .from('profiles')
          .update({
            is_premium: true,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            premium_since: new Date().toISOString(),
          })
          .eq('id', userId);

        if (error) {
          console.error('Supabase update error on checkout.session.completed:', error);
        } else {
          console.log(`✅ User ${userId} upgraded to premium`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          // Try to find by stripe_customer_id
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', subscription.customer)
            .single();

          if (profile) {
            const isActive = subscription.status === 'active' || subscription.status === 'trialing';
            await supabase
              .from('profiles')
              .update({ is_premium: isActive })
              .eq('id', profile.id);
            console.log(`✅ Updated subscription status for user ${profile.id}: ${isActive}`);
          }
          break;
        }

        const isActive = subscription.status === 'active' || subscription.status === 'trialing';
        await supabase
          .from('profiles')
          .update({
            is_premium: isActive,
            stripe_subscription_id: subscription.id,
          })
          .eq('id', userId);

        console.log(`✅ Subscription updated for user ${userId}: ${isActive}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;

        // Find user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              is_premium: false,
              stripe_subscription_id: null,
            })
            .eq('id', profile.id);
          console.log(`✅ Subscription cancelled for user ${profile.id}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        console.warn('Payment failed for customer:', invoice.customer);
        // Optionally: mark user as payment_failed so you can show them a banner
        break;
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Webhook handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook handler failed' }),
    };
  }
};

export { handler };
