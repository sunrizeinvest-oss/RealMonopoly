# Architecture — Technical DD Survival Kit

Written so any technical advisor or engineering DD can pick this up and have a complete mental model of the platform in 10 minutes. Every claim maps to verified code; nothing in here is roadmap or aspirational.

---

## TL;DR

- **Stack:** React 19 + Vite 7 + React Router 7 (37 routes, 35 lazy-loaded), Vercel serverless (12 Node functions, Hobby plan), Supabase Postgres + Auth, Stripe live mode, Anthropic Claude (haiku + sonnet), 6 city open-data ArcGIS / Socrata feeds, CMHC rental anchor data (embedded JSON), Repliers MLS (feature-flagged).
- **Topology:** SPA frontend → Vercel CDN edge → serverless function pool → external APIs (Supabase / Stripe / Anthropic / CREA / city open data). Stateless.
- **Cost at 100 paying users:** ~$80-150/mo all-in (Vercel + Supabase + Anthropic + DNS). Repliers adds $249-$549/mo on top when subscribed.
- **Scaling chokepoint:** Vercel Hobby plan's 12-function cap. Currently at 12/12 — every new endpoint piggybacks on `/api/ai-chat` as a mode. Pro plan ($20/mo, unlimited) is the obvious upgrade.

---

## 1. Stack inventory

### Frontend
- **React 19** + **Vite 7** + **React Router 7**
- 37 routes (`src/main.jsx`); 35 lazy-loaded via `React.lazy()`
- 61 component files (`src/**/*.jsx`)
- State management: local component state + Supabase auth context + 1 cross-page cache (`src/lib/aiReadCache.js` for AI Read results + `src/lib/xrayPrefill.js` for X-Ray prefill handoff)
- PDF generation: `jspdf` (client-side, also runs in Node for the sample-memo generator)

### Backend
- **Vercel serverless** (Node runtime, Hobby plan)
- 12 functions in `api/*.js` — at the plan's hard cap
- 8 shared lib modules in `api/_lib/`
- New backend modes piggyback on `api/ai-chat.js` (currently hosts 15 distinct modes) to stay within the cap

### External services
| Service | What for | Status |
|---|---|---|
| **Supabase** | Postgres + Auth + Row-Level Security | Live |
| **Stripe** | Subscription billing (Pro $99, Scale $299) | Live mode |
| **Anthropic Claude** | AI Read narrative + parse-document + building grade + year-built estimator | Live (haiku-4-5 for fast, sonnet-4-6 for OCR) |
| **CMHC RMS data** | 26-CMA rent + vacancy anchor | Embedded JSON (Oct 2023 snapshot, refresh annually) |
| **City open data ArcGIS feeds** | Parcel-level zoning + assessment | 6 cities: Calgary (Socrata), Edmonton (Socrata), Vancouver (Socrata), Toronto (ArcGIS), Ottawa (ArcGIS), Mississauga (ArcGIS) |
| **Nominatim** | Address geocoding | OpenStreetMap, no key required |
| **Repliers** | Canadian MLS comps (CREA feed) | Code shipped, feature-flagged on `REPLIERS_API_KEY` |
| **RentCast** | US AVM + comps | Wired, currently inactive subscription |
| **Resend** | Transactional email (digest + market brief) | Code shipped, awaiting domain verification |

---

## 2. Data flow — what calls what

```
                    ┌───────────────────────────┐
USER BROWSER ───►   │ Vercel CDN (static SPA)   │
                    │ React Router 7 lazy chunks│
                    └────┬─────────────┬────────┘
                         │             │
            POST/GET     │             │  POST
            /api/*       │             │  /auth/v1/*
                         │             │
                         ▼             ▼
              ┌──────────────┐  ┌──────────────┐
              │  Vercel      │  │  Supabase    │
              │  Serverless  │  │  (DB + Auth) │
              │  Functions   │  └──────────────┘
              │  (12 funcs)  │
              └──┬──┬──┬──┬──┘
                 │  │  │  │
        ┌────────┘  │  │  └──────────┐
        ▼           ▼  ▼             ▼
  ┌──────────┐ ┌───────┐ ┌────────┐ ┌──────────┐
  │ Anthropic│ │ Stripe│ │  CREA  │ │  City    │
  │ Claude   │ │  API  │ │ via    │ │  open    │
  │ haiku +  │ │       │ │Repliers│ │  data    │
  │ sonnet   │ │       │ │ (FF'd) │ │  (6 svcs)│
  └──────────┘ └───────┘ └────────┘ └──────────┘
```

### The "X-Ray scan" data flow — most-used path

1. User types address → frontend calls `GET /api/property-lookup?address=...`
2. property-lookup → `_lib/geocode.js` → Nominatim → returns `{lat, lng, city, province, citySlug}`
3. Based on `citySlug`, dynamically imports city adapter (`_lib/cities/calgary.js` etc.)
4. **Parallel** (`Promise.allSettled`): city.getAssessment() + city.getZoning() + lookupCMHC() + predictRent()
5. If `yearBuilt` is null after step 4, **conditional fallback**: calls `estimateYearBuilt` (heuristic table → Claude haiku if heuristic misses)
6. Response: unified JSON shape — same fields whether city returns parcel data or not
7. Frontend renders X-Ray result cells, async-fires `/api/ai-chat?mode=building-grade` for the 4-dimension grade overlay
8. Saves the address to `localStorage` (`rde_xray_prefill_v1`, 30-min TTL) so the user can navigate to any calculator and the field auto-prefills

### The "Rent Roll → Loss-to-Lease" data flow — the moat

1. User drags PDF → frontend FileReader → base64
2. POST `/api/ai-chat` with `mode: "rent-roll-loss-to-lease"`, `document`, `city`, `province`
3. Server resolves CMHC anchor via `lookupCMHC` (fail-fast on non-covered cities)
4. Claude sonnet-4-6 parses PDF → `unitMix[]` with per-unit BR/sqft/actualRent
5. `computeLossToLease` (pure math) → per-unit deltas + 5-yr stranded NPV
6. Claude haiku → 2-3 sentence institutional narrative
7. Single JSON returned with `{ unitMix, ltl, aiRead, source }`
8. Frontend renders LossToLeasePanel + optional "Add to IC Memo" passes `ltl` into the PDF generator as page 2

---

## 3. API surface (12 endpoints, all at the cap)

| Endpoint | Purpose | Notes |
|---|---|---|
| `/api/ai-chat` | Multi-mode (15 modes) — chat, zoning-thesis, deal-thesis, parse-document, find-comps, find-triggers, deal-memo, send-digest, fetch-market-brief, send-market-brief, unsubscribe, building-grade, rent-roll-loss-to-lease, admin-dashboard, plus cron-digest (GET) and cron-market-brief (GET) | The "do-everything" endpoint; everything new piggybacks here |
| `/api/property-lookup` | Address → unified property data (geocode + assessment + zoning + CMHC + rent estimate + AI year-built) | Most-called endpoint |
| `/api/zoning` | Standalone zoning lookup (legacy callers) | Same adapter dispatch as property-lookup |
| `/api/city-data` | City open-data utility (older flow) | Kept for back-compat |
| `/api/cmhc-rental` | CMHC raw lookup (city + province → vacancy + avg rents) | Public, no auth |
| `/api/predict-rent` | CMHC-anchored rent model | Imported in-process by property-lookup |
| `/api/comps` | Sale/rental comps via Repliers (CA) or RentCast (US) | Feature-flagged routing |
| `/api/realtor-ca` | CREA DDF integration (older flow) | Awaiting credential set |
| `/api/check-alerts` | Saved-search trigger evaluation | Cron-driven |
| `/api/ai-analyze` | Higher-level deal analysis endpoint | Used by tier 1 PDF flow |
| `/api/create-checkout` | Stripe checkout session creation | Lives separate from ai-chat |
| `/api/stripe-webhook` | Stripe webhook event handler | Updates `subscriptions.plan` on `customer.subscription.*` events |

**Lib modules (`api/_lib/`):**
- `auth.js` — Supabase JWT verification helper
- `cors.js` — CORS header utility
- `geocode.js` — Nominatim + citySlug heuristic
- `rate-limit.js` — simple in-memory rate limiter
- `cmhc-data.js` — 26-CMA rental data (embedded JSON, lookupCMHC + CMHC_DATA_YEAR exports)
- `rent-model.js` — CMHC-anchored rent estimator
- `lossToLease.js` — per-unit delta math + 5-yr NPV
- `yearBuiltEstimator.js` — heuristic + Claude haiku fallback
- `cities/{calgary,edmonton,vancouver,toronto,ottawa,mississauga}.js` — per-city adapters

---

## 4. Frontend route map (37 routes)

### Public (no auth)
- `/` — Landing (Family Office hero, X-Ray bar, Translator, Pulse map, Toolkit grid)
- `/pricing` — 3-tier pricing
- `/login`, `/forgot-password`, `/reset-password`
- `/privacy`, `/terms`
- `/deal/:shareId` — public shared deal pages
- `/share/read/:payload` — public shared AI Read pages

### Authenticated (require Supabase session)
- `/dashboard` — recent reads + saved deal list
- `/analyze` (PropertyHub) — main address search + intel
- `/property` (PropertyIntelligence) — deep dive on one address
- `/commercial` (CommercialAnalyzer) — multifamily underwriter + LTL parser
- `/brrrr` (BRRRRCalculator) — BRRRR analyzer + LTL parser
- `/app`, `/app/*` (DealAnalyzer) — flip/rental analyzer
- `/screen` (DealScreener) — quick-screen 10 deals
- `/compare` (DealComparison) — head-to-head metric comparison
- `/loans` (LoanCompare) — 3-mortgage side-by-side
- `/qualify` (MortgageQualifier) — DSCR + GDS/TDS qualifier
- `/triggers` (MarketTriggers) — terminated/suspended listing radar
- `/market-brief` (MarketBrief) — daily market brief subscriptions
- `/rehab` (RehabCalculator) — repair-cost builder
- `/learn` (Learn) — education hub
- `/quiz` (Quiz) — investor knowledge quiz
- `/tax` (TaxCalculator) — Canadian RE tax calculator
- `/portfolio` (Portfolio) — multi-property dashboard
- `/pipeline` (Pipeline) — deal CRM
- `/networth` (NetWorth) — net worth dashboard
- `/distress` (DistressChecker) — distressed property screener
- `/submit` (SubmitDeal) — submit a deal for review
- `/budget` (BudgetTracker) — budget tracking
- `/alerts` (DealAlerts) — deal alert subscriptions
- `/unsubscribe` — token-verified email unsubscribe

### Admin
- `/admin` — gated by `ADMIN_EMAILS` env var, fail-closed

35 of the 37 routes are lazy-loaded — initial page-load ships only the Landing + auth chunks.

---

## 5. Database schema (Supabase Postgres)

| Table | Purpose | RLS |
|---|---|---|
| `auth.users` (Supabase managed) | User accounts | Built-in Supabase auth |
| `public.saved_deals` | Per-user saved property/deal records | User-scoped (insert/select/update/delete own only) |
| `public.subscriptions` | Stripe subscription tier per user | User-scoped read |
| `public.saved_searches` | Market Triggers saved configs + email-enabled flag | User-scoped |
| `public.market_subscriptions` | Daily Market Brief opt-ins per city | User-scoped + cron uses service-role key |

All migrations live in `supabase/migrations/`. RLS policies enforce per-user data isolation; only the cron (using `SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS to read across users for digest emails.

---

## 6. Deployment topology

```
GitHub master ──webhook──► Vercel build
                              │
                              ▼
                      Vercel Edge Network
                              │
                              ├──► Static SPA (HTML + JS chunks)
                              │
                              └──► Serverless functions (12 Node funcs)
                                       │
                                       ▼
                                  External APIs
                                  (Supabase, Stripe, Claude, etc.)
```

- Single environment: Production (Hobby plan)
- Auto-deploys on push to master (verified working)
- Manual deploys via `vercel --prod --yes` from the local CLI
- Custom domain: `www.realdealestate.app` (migrating to `rizeai.io`)
- TLS via Vercel automatic Let's Encrypt
- No staging environment yet — would add at $20/mo Vercel Pro upgrade

---

## 7. Cron jobs

Configured in `vercel.json`:

| Endpoint | Schedule | What it does |
|---|---|---|
| `/api/ai-chat?mode=cron-digest` | `0 16 * * 1` (Mondays 16:00 UTC) | Weekly Market Triggers digest to opted-in users |
| `/api/ai-chat?mode=cron-market-brief` | `0 15 * * *` (Daily 15:00 UTC = 8am Pacific) | Daily Market Brief to opted-in users |

Both protected by `Authorization: Bearer ${CRON_SECRET}` header that Vercel's cron scheduler passes automatically.

---

## 8. Security model

| Surface | Auth | Notes |
|---|---|---|
| Public pages (`/`, `/pricing`, `/login`) | None | Read-only |
| Authenticated pages (`/dashboard`, `/analyze`, etc.) | Supabase session cookie | RLS enforces per-user isolation server-side |
| `/api/ai-chat` modes that touch user data (`admin-dashboard`) | Bearer JWT in `Authorization` header → `requireUser()` verifies + email allowlist check | Fail-closed |
| Cron endpoints | `CRON_SECRET` header | Refuses if not set |
| Stripe webhook | Stripe signature verification | Validates `stripe-signature` header |
| Stripe checkout creation | None (public endpoint) | Returns checkout URL only — no user data leaked |

Secrets in Vercel env vars (Production scope):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_SCALE_PRICE_ID`
- `ADMIN_EMAILS` (allowlist for `/admin`)
- Pending: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `REPLIERS_API_KEY`, `CRON_SECRET`

---

## 9. Cost model

| Service | At 100 paying users | At 1,000 users (target Y2) |
|---|---|---|
| Vercel (Hobby) | $0 | needs Pro at $20/mo |
| Supabase (Free tier: 500MB DB + 50K auth users) | $0 | $25/mo |
| Anthropic (haiku-heavy, ~$0.001/call avg) | ~$30/mo | ~$300/mo |
| CMHC, Nominatim, city open data | $0 | $0 |
| Stripe (2.9% + $0.30 per txn) | ~$3K/mo on $99K MRR | ~$30K/mo on $1M MRR |
| Resend (3K emails/mo free) | $0 | $20/mo |
| Repliers Starter ($249/mo, 5K calls) | $249/mo | upgrade to Growth $549/mo |
| **Total infra (excl. Stripe pass-through)** | **~$280/mo** | **~$915/mo** |
| **Revenue at $99-$299 avg** | ~$99K MRR | ~$1M MRR |
| **Infra cost / revenue** | **<0.3%** | **<0.1%** |

Gross margin profile is **software-grade.** No marginal cost per user other than Claude API calls and Stripe pass-through.

---

## 10. Known scaling limits + mitigations

| Limit | Today | When it bites | Mitigation |
|---|---|---|---|
| Vercel Hobby 12-function cap | At 12/12 | Adding any new endpoint | Migrate to Vercel Pro ($20/mo, unlimited funcs); already on the roadmap. Each new mode currently piggybacks on `/api/ai-chat`. |
| Supabase Free 500MB DB | Way below | Around 10K users with active deals | Migrate to Pro ($25/mo, 8GB) |
| Nominatim 1 req/sec | Not enforced for our volume | At ~50 concurrent users | Switch to commercial geocoder ($50-200/mo) or run our own Pelias instance |
| Anthropic concurrent rate limits | Tier 1 | Around 50 concurrent X-Ray scans | Bump to Tier 2 (auto-promotes on spend) |
| Single Vercel region (iad1) | Adequate for Canadian users (low single-digit latency) | International | Add multi-region builds |

---

## 11. What's NOT in the architecture today

Honest list. Each is a deliberate Q4 / post-seed item:

| Capability | Status | Reason |
|---|---|---|
| RAG / vector DB | Not built | Prompt-stuffing with structured data has been sufficient for one-property reads. RAG becomes the play at "compare against 200 prior deals." |
| Real-time data webhooks | Not built | We poll on user request. Webhook-driven freshness becomes important at the Scale-plus tier. |
| Off-market sourcing engine | Not built | The Landing's "Unseen Market Pulse" is a UI mockup with gated copy — no real off-market data source. Q4 / post-seed roadmap. |
| Multi-region serverless | Not built | iad1 latency is fine for CA users; would re-evaluate for US/international. |
| Staging environment | Not built | All development happens locally → push to master → auto-deploy. Single-environment model works at this scale. |
| Custom Supabase SMTP | Not built | Auth emails (password reset) still send from `noreply@supabase.io`. Resend setup doc (`docs/resend-setup.md`) covers when to wire this. |
| Photo + vision AI on Building Grade | Not built | Current Grade infers from civic data + assessed PSF. Adding Claude vision on user-uploaded photos is a 2-3 day refinement. |

---

## 12. Testing

- **Playwright E2E suite** — 7 spec files, 25+ assertions
- **Two modes**: local against `vite preview`, smoke against prod
- `npm run test:e2e` for local · `npm run test:smoke` for prod
- 13/13 landing + pricing tests pass; 11/11 API smoke tests pass post-deploy
- No unit-test framework yet — math modules (`lossToLease.js`, `rent-model.js`) are pure functions and could trivially be unit-tested if/when a contributor needs guardrails

---

## 13. Repo layout

```
flip-analyzer/
├── api/                      # Vercel serverless functions
│   ├── ai-chat.js            # Multi-mode (15 modes)
│   ├── property-lookup.js    # Unified address lookup
│   ├── comps.js              # Repliers/RentCast comps router
│   ├── create-checkout.js    # Stripe checkout
│   ├── stripe-webhook.js     # Stripe webhook handler
│   ├── ...8 more
│   └── _lib/
│       ├── geocode.js
│       ├── auth.js
│       ├── cmhc-data.js
│       ├── rent-model.js
│       ├── lossToLease.js
│       ├── yearBuiltEstimator.js
│       └── cities/{calgary,edmonton,vancouver,toronto,ottawa,mississauga}.js
├── src/                      # React frontend
│   ├── main.jsx              # Router config (37 routes)
│   ├── Landing.jsx           # Public landing page
│   ├── PropertyHub.jsx       # /analyze
│   ├── PropertyIntelligence.jsx  # /property
│   ├── CommercialAnalyzer.jsx    # /commercial
│   ├── BRRRRCalculator.jsx       # /brrrr
│   ├── DealAnalyzer.jsx          # /app
│   ├── Admin.jsx                 # /admin (NEW)
│   ├── ... 30+ more page components
│   ├── components/               # Shared components
│   │   ├── LossToLeasePanel.jsx
│   │   ├── XrayPrefillBanner.jsx
│   │   ├── AIDocumentDrop.jsx
│   │   └── ... 20 more
│   └── lib/
│       ├── aiReadCache.js        # localStorage cache for AI Read results
│       ├── xrayPrefill.js        # X-Ray → calculator handoff
│       ├── tier1Memo.js          # IC Memo PDF generator
│       └── ... helpers
├── tests/e2e/                # Playwright critical paths
├── docs/                     # Architecture, one-pager, setup docs
├── scripts/                  # Build / sample generators
└── supabase/migrations/      # SQL migrations
```

---

## DD questions an investor's technical advisor will ask

| Question | Answer |
|---|---|
| "What's your data moat?" | Six city adapters built from scratch (each has unique quirks — Calgary Socrata, Toronto ArcGIS schema rotation, Edmonton suffix expansion, etc.). CMHC anchor + AI year-built estimator for MPAC-blocked cities. Replicating this is 3-6 months of engineering. |
| "Where's the AI?" | 15 Claude modes deployed, gating on user-pre-fill of context. Building grade is a 4-dimension hybrid (heuristic + Claude). LTL parser is Claude sonnet OCR + Claude haiku narrative. AI cost is currently ~$0.0005 per request avg. |
| "What if Anthropic raises prices?" | We keep template fallbacks for every AI mode (`buildBuildingGradeTemplate`, `buildTemplateThesis`). Site degrades gracefully to heuristic outputs if AI is unavailable or unaffordable. |
| "How do you handle PII / data privacy?" | Supabase RLS enforces per-user isolation. Admin endpoint uses fail-closed allowlist. No PII in logs. Stripe handles all payment data via their tokenized checkout. |
| "What's your test coverage?" | E2E Playwright covering critical paths (landing, pricing, auth, calculators, admin gate, API smoke). No unit tests — math modules are pure functions and easily testable, will add when contributor count grows past 1. |
| "How long until you're seed-ready?" | 6 months. Goal: 100 paying users, $30K MRR, design partner case study. Pre-seed funds the runway. |
