# Real Deal — Setup Guide

What you need to get a clean production deploy working end-to-end.
Each section is self-contained; do them in order or skip ahead to what's
broken right now.

> Need to know what's currently broken? Open `/market-brief` while signed
> in — the live Setup Diagnostic at the top runs four probes and shows
> green checks / red ✗ with inline fix instructions.

---

## 1 — Core (always required)

### Supabase
1. Project already exists at `https://jskxmcgslbablilroxen.supabase.co`.
2. Run both migrations in order — Supabase Dashboard → SQL Editor → New Query → paste → Run:
   - `supabase/migrations/001_saved_searches.sql`
   - `supabase/migrations/002_market_subscriptions.sql`
3. Grab the `service_role` key from **Settings → API**. Add to Vercel as `SUPABASE_SERVICE_ROLE_KEY`. **Never** put it in client code.

### Anthropic
1. Get an API key at https://console.anthropic.com.
2. Add to Vercel as `ANTHROPIC_API_KEY` (Production scope).

### Vercel
1. The repo deploys automatically on push to `main`.
2. Enable Cron Jobs: **Project → Settings → Cron Jobs → Enable**. Vercel reads `vercel.json` and registers both crons (weekly Monday + daily). Auto-fills `CRON_SECRET`.

---

## 2 — Payments (required to take money)

The Stripe gate is broken right now — every checkout returns 500
"connection to Stripe... retried 2 times." That's an env var issue, not a
code issue. Fix it like so:

1. Stripe Dashboard → **Developers → API Keys** → reveal the live secret key (`sk_live_...`).
2. Stripe → **Products** → create two recurring prices:
   - Pro: $99 CAD/month (or USD)
   - Scale: $299 CAD/month
   Note each `price_...` ID.
3. Add these to Vercel:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PRO_PRICE_ID=price_...
   STRIPE_SCALE_PRICE_ID=price_...
   ```
4. Webhook (for subscription state sync):
   - Stripe → **Developers → Webhooks → Add endpoint**
   - URL: `https://www.realdealestate.app/api/stripe-webhook`
   - Listen to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Reveal the signing secret, add to Vercel as `STRIPE_WEBHOOK_SECRET`

Re-deploy. The Setup Diagnostic at `/market-brief` won't probe Stripe directly, but you can verify by going to `/pricing` and clicking either plan — should redirect to Stripe Checkout, not 500.

---

## 3 — Email digests (Market Triggers + Daily Market Brief)

### Resend
1. Sign up at https://resend.com (free tier: 3K emails/month, plenty).
2. **Get an API key** from the dashboard → API Keys → Create. Add to Vercel as `RESEND_API_KEY`.
3. **Decide your sender:**
   - **Fast path (no DNS):** use `onboarding@resend.dev` as the from address. Emails work today, just look generic.
   - **Branded path:** Resend → Domains → add `realdealestate.app` → add the 3 DNS records (SPF, DKIM, MX-style return-path) to your domain registrar → wait for verification (5–30 min).
4. Set `RESEND_FROM_EMAIL` in Vercel:
   - Fast path: `Real Deal <onboarding@resend.dev>`
   - Branded: `Real Deal <brief@realdealestate.app>` (after verification)

### Verifying it works
1. Sign in → open `/market-brief`.
2. The Setup Diagnostic strip at the top should show:
   - ✓ RSS feeds responding
   - ✓ Resend (API key wired + accepting sends)
3. Pick at least one market → Save.
4. Click **"📧 EMAIL ME A TEST"** — check your inbox.

If Resend shows ◐ amber "API key wired; Resend rejected the test send" — the key is set but your sender domain isn't verified yet. Either finish DNS verification or switch `RESEND_FROM_EMAIL` to `onboarding@resend.dev` temporarily.

---

## 4 — Optional · US property data

The `/property` page uses RentCast for US addresses. Without it, US lookups
return a clear 503 telling the user to use a Canadian address. Canadian
addresses don't need RentCast (they use the open-data fallback).

Sign up at https://app.rentcast.io, get an API key, add to Vercel as `RENTCAST_API_KEY`. Currently the existing key is showing as inactive (403 "billing/subscription-inactive") — reactivate or replace.

---

## 5 — Future · Real MLS data (replaces AI-generated comps + triggers)

Two paths:

### CREA DDF (official, free for members)
1. You need CREA membership OR a partner brokerage agreement.
2. Apply at https://www.crea.ca/dataandstats/data-distribution-facility/
3. They issue `DDF_USERNAME` + `DDF_PASSWORD`. Add to Vercel.
4. The MLS provider factory at `api/_lib/mls/index.js` auto-picks DDF when these are set.
5. ⚠️ DDF adapter implementation is currently a stub. When credentials land, `api/_lib/mls/creaDdf.js` needs the RETS-over-OAuth implementation built out — comments in the file document the path.

### Repliers.io (paid aggregator, easier signup)
1. Sign up at https://repliers.io (~$500+/month).
2. Get `REPLIERS_API_KEY`. Add to Vercel.
3. Factory picks Repliers over Realtor.ca scraper (but DDF wins if both set).
4. ⚠️ Same stub status — see `api/_lib/mls/repliers.js`.

Until either is wired, the Realtor.ca unofficial scraper is the fallback — works today, just not formally licensed.

---

## 6 — Cron sanity check

Once env vars are set + crons enabled, you can manually fire either cron to verify:

```bash
# Weekly trigger digest (Monday morning)
curl https://www.realdealestate.app/api/ai-chat?mode=cron-digest \
  -H "Authorization: Bearer $CRON_SECRET"

# Daily market brief (8am Pacific)
curl https://www.realdealestate.app/api/ai-chat?mode=cron-market-brief \
  -H "Authorization: Bearer $CRON_SECRET"
```

Both return a JSON summary of what they sent. Both fail closed: zero subscribers → zero emails → exit clean.

---

## Quick environment variable reference

| Var | Required for | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | All AI features | console.anthropic.com |
| `SUPABASE_URL` | Everything | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Cron handlers | Supabase → Settings → API (service_role) |
| `STRIPE_SECRET_KEY` | Paid plans | Stripe → Developers → API Keys |
| `STRIPE_PRO_PRICE_ID` | Pro checkout | Stripe → Products |
| `STRIPE_SCALE_PRICE_ID` | Scale checkout | Stripe → Products |
| `STRIPE_WEBHOOK_SECRET` | Subscription sync | Stripe → Developers → Webhooks |
| `RESEND_API_KEY` | All emails | Resend → API Keys |
| `RESEND_FROM_EMAIL` | All emails | Your verified domain (or onboarding@resend.dev) |
| `CRON_SECRET` | Vercel crons | Auto-filled when Cron Jobs is enabled |
| `RENTCAST_API_KEY` | US property lookup (optional) | app.rentcast.io |
| `CALGARY_APP_TOKEN` | Calgary open-data throughput (optional) | data.calgary.ca |
| `DDF_USERNAME` + `DDF_PASSWORD` | Future · CREA DDF MLS | crea.ca/ddf |
| `REPLIERS_API_KEY` | Future · Repliers MLS | repliers.io |
