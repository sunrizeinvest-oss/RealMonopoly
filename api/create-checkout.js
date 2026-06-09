import Stripe from 'stripe';

// Stripe price IDs per plan. Pro is the existing $99/mo subscription.
// SCALE_PRICE_ID env var holds the $299/mo Scale plan — set in Vercel.
// Falls back to PRO_PRICE_ID if SCALE_PRICE_ID isn't configured yet
// (so the upgrade flow still works during launch — both buttons → Pro).
const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || 'price_1TTDmjCLyHEd8NzicsMjVt6x';
const SCALE_PRICE_ID = process.env.STRIPE_SCALE_PRICE_ID || PRO_PRICE_ID;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { userId, email, plan = 'pro' } = req.body;
    const priceId = plan === 'scale' ? SCALE_PRICE_ID : PRO_PRICE_ID;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      // metadata propagates to stripe-webhook so we can set the right plan
      // string on the subscriptions row (pro vs scale).
      metadata: { userId, plan },
      success_url: `${req.headers.origin}/analyze?upgraded=${plan}`,
      cancel_url: `${req.headers.origin}/pricing`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
