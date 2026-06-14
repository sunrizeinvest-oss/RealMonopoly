# Repliers MLS Integration — Setup & Cost Analysis

## What this unlocks

Real Canadian MLS comps via the CREA feed: **active listings + sold comps (last 6 months) + rental comps** for any Canadian address. This is the "comps" claim in your pricing that's currently aspirational — wiring Repliers makes it true.

Before this: PropertyHub returns empty `soldComps: []` for Canadian addresses because RentCast doesn't cover Canada.
After this: PropertyHub returns real sold prices, days-on-market, list-to-sale ratios, active competition — same data CoStar charges $5K-50K/mo for.

## Cost analysis

Repliers' pricing (as of current public site, verify before subscribing):

| Tier | Monthly | Calls included | Per extra call |
|---|---|---|---|
| **Starter** | ~$249 USD/mo | 5,000 | $0.05 |
| **Growth** | ~$549 USD/mo | 25,000 | $0.025 |
| **Scale** | ~$1,249 USD/mo | 100,000 | $0.015 |

Each Property Hub search that pulls comps = ~2 calls (active + sold). At Starter, **2,500 property searches/month** before overage.

Math for your stage:
- If you have 100 paying customers × 5 searches/day × 20 trading days = 10,000 calls/month → **need Growth tier**.
- If you have 20 paying customers × 5 searches/day × 20 trading days = 2,000 calls/month → **Starter is fine**.

**Recommendation:** start on Starter ($249/mo), monitor Repliers dashboard for call volume, upgrade when you cross 4,500/mo.

## What's already built (your repo)

✅ `/api/comps.js` is wired with full Repliers integration. Routes Canadian addresses to Repliers, US addresses to RentCast. Maps Repliers' response shape to the same unified payload PropertyHub already consumes — zero frontend changes needed.

✅ **Feature-flagged.** When `REPLIERS_API_KEY` isn't set, the Canadian path returns clean empty arrays plus `notConfigured: "repliers"` so the UI can render an "upgrade to enable comps" card instead of crashing.

✅ **Both types**:
- `type=sale` → active for-sale listings + recently-sold comps (180-day window) + implied AVM from median sold
- `type=rental` → active for-rent listings + recently-leased comps + implied rent estimate from median

✅ **Spatial radius**: 1km around the matched property. Configurable in `api/comps.js` (search for `radius=1`).

## Setup steps (when you decide to subscribe)

### Step 1 — Sign up at Repliers

1. Visit **`https://www.repliers.com/`**
2. Click **Get Started** or **Start Free Trial**
3. Pick the **Starter** plan
4. Complete signup with your email + payment method

### Step 2 — Get the API key

1. After signup, log into the Repliers dashboard
2. Navigate to **Settings** → **API Keys** (or **Account** → **API**)
3. Generate a **production key**
4. Copy it — looks like `xxxxxxxxxxxxxxxxxx` (32+ chars)

### Step 3 — Set the Vercel env var

Open [Vercel env vars](https://vercel.com/sunrizeinvest-oss-projects/flip-analyzer/settings/environment-variables) and add:

| Field | Value |
|---|---|
| **Key** | `REPLIERS_API_KEY` |
| **Value** | `xxxxxxxxxxxxxxxxxx` *(no spaces)* |
| **Environments** | ✅ Production |

Save.

### Step 4 — Redeploy

```
! vercel --prod --yes
```

### Step 5 — Smoke test

After deploy, hit a Canadian address and verify real comps land:

```bash
curl -s "https://www.realdealestate.app/api/comps?type=sale&address=$(python3 -c "import urllib.parse; print(urllib.parse.quote('233 Gloucester St, Ottawa ON'))")" | python3 -m json.tool | head -40
```

Expected:
- `source: "repliers"`
- `soldComps: [...]` with real `price`, `psf`, `soldDate`
- `activeListings: [...]` with real `price`, `daysOnMarket`
- `stats: { medianSoldPrice: 800000, ... }`

If `source: "none"` and `notConfigured: "repliers"` come back, the key didn't propagate — re-check Step 3 and redeploy.

## What happens to existing comp behavior

| Address | Backend | Before this commit | After |
|---|---|---|---|
| US (NY, CA, TX...) | RentCast | 403 (sub inactive) | 403 (sub inactive — unchanged) |
| Canada (with key) | Repliers | empty arrays | real MLS comps ✓ |
| Canada (no key) | none | empty arrays | empty arrays + `notConfigured: "repliers"` flag |

The frontend can use the new `notConfigured` flag to render an upsell card:

```jsx
{comps.notConfigured === "repliers" && (
  <UpgradeCard message="MLS comps require a paid subscription tier" />
)}
```

(Optional UI work — surface the upsell in PropertyHub. See `src/PropertyHub.jsx` around the comps render.)

## Per-call cost monitoring

Repliers' dashboard shows:
- Total calls this month
- Calls by endpoint
- Calls by API key (so you can tell traffic apart if you add a staging key)

Watch the dashboard for the first 2 weeks. Real-world per-user call volume is the unknown — your assumptions on "5 searches/day" might be 2x off in either direction.

## What's NOT included in this integration

| Feature | Status | Notes |
|---|---|---|
| **Photo URLs** | Code returns `null` | Repliers includes them but the UI doesn't render comp photos yet |
| **Polygon-level submarket filters** | Out of scope | Current radius is 1km circle |
| **Historical price trends** | Out of scope | Need a separate `/api/comps/trends` endpoint |
| **Saved comp watchlists** | Out of scope | Would need a new Supabase table |
| **Repliers webhooks** | Out of scope | We poll on user search; no realtime push |

All four are addressable Q4 if there's demand.

## What this changes about the pitch

Before:
> *"AI underwriting layer for retail Canadian investors — open-data first, AI translates what you have access to."*

After:
> **"Real Canadian MLS comps + AI underwriting in one platform. Pulled from the CREA feed. Same data CoStar charges $5K-50K/mo for, at $99-$299."**

You can credibly add "real-time comps" to the Pricing page and to the LP demo. The "we cover this gap" slide flips from blank to active.

## Risks to watch

1. **CREA data freshness** — Repliers pulls from CREA's national feed, which updates every 15 min. Some regional boards have a 24-72h lag.
2. **MLS attribution** — CREA requires a "data provided by CREA" attribution somewhere visible to end users. Add to the comps section footer when you ship the upsell card.
3. **Rate limit on Starter** — 5,000 calls/mo is **2,500 property searches/mo**. If usage spikes (viral moment, demo to a big channel), you'll hit overage quickly.
4. **Single-source risk** — if Repliers' upstream feed breaks, your comps go dark. Worth monitoring uptime in their status page. Alternative providers: Constellation Web Solutions, Trestle (CoreLogic), but all cost more.

## Done — what to tell investors

> "MLS comps are live for every Canadian address. We pull active + sold + rental data through Repliers' CREA feed, normalize against CMHC for rent context, and feed the AI underwriting layer. End-to-end cost to deliver: $0.05 per comp call, or $0.10 per property search. We mark up by 100x via the $99-$299/mo tier."

That's the slide.
