/**
 * Calls the existing /.netlify/functions/stripe-checkout (from the old MVP),
 * which creates a Stripe Checkout Session and returns its URL.
 */
export async function startStripeCheckout(userId: string, email: string): Promise<void> {
  const res = await fetch('/.netlify/functions/stripe-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userEmail: email }),
  });
  if (!res.ok) {
    throw new Error(`Checkout failed: HTTP ${res.status}`);
  }
  const { url } = await res.json();
  if (!url) throw new Error('Stripe checkout returned no URL');
  window.location.href = url;
}
