import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // ── Idempotency check — Stripe retries webhooks at-least-once.
  // First-write-wins on event.id; if we've already processed this event,
  // short-circuit and return 200 so Stripe stops retrying.
  // Requires Supabase table (run once in SQL editor):
  //   CREATE TABLE IF NOT EXISTS processed_stripe_events (
  //     event_id TEXT PRIMARY KEY,
  //     processed_at TIMESTAMPTZ DEFAULT now()
  //   );
  const { error: dedupeErr } = await supabase
    .from('processed_stripe_events')
    .insert({ event_id: event.id });
  if (dedupeErr) {
    // 23505 = unique violation → already processed
    if (dedupeErr.code === '23505') {
      console.log('Stripe event already processed:', event.id);
      return res.status(200).json({ received: true, duplicate: true });
    }
    // Table missing or other error → fail-open (log + continue) so we don't
    // block real webhook processing on infra hiccups
    console.warn('Idempotency check skipped:', dedupeErr.message);
  }

  const session = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      const userId = session.metadata?.userId;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      if (userId) {
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: 'active',
          plan: 'pro',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      await supabase.from('subscriptions')
        .update({ status: sub.status, updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await supabase.from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await supabase.from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', invoice.subscription);
      break;
    }
    // Stripe fires invoice.payment_succeeded for every successful renewal AND
    // for the first payment on a new subscription. If a customer paid via a
    // saved card, the checkout.session.completed handler above may not have
    // fired (or the metadata is missing), so we backstop the "subscription
    // is now active" transition here too. Also flips past_due → active on
    // dunning recovery.
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        await supabase.from('subscriptions')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', invoice.subscription);
      }
      break;
    }
  }

  return res.status(200).json({ received: true });
}
