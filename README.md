# RizeAI — flip-analyzer

Institutional-grade real estate underwriting for Canadian brokers and investors. Type any address; get a four-strategy verdict, dimensional zoning, CMHC-anchored rent, comps, and an AI investment thesis in seconds.

Production: **https://realdealestate.app**
Repo: **github.com/sunrizeinvest-oss/RealMonopoly**

---

## Tech stack

- **Frontend:** React 19 + Vite 7 + React Router 7 (~100 routes, all lazy-loaded)
- **Backend:** Vercel serverless functions (`api/`), 12 handlers
- **DB + Auth:** Supabase (Postgres + Auth + Storage)
- **Payments:** Stripe (Pro $99/mo, Scale $299/mo)
- **Email:** Resend
- **AI:** Anthropic (Sonnet 4.6 for memos, Haiku 4.5 for chat)
- **Analytics:** Vercel Analytics + Speed Insights

---

## Data sources wired

| Source | Purpose | Cost | Status |
|---|---|---|---|
| Nominatim (OSM) | Address geocoding + reverse | Free | Live |
| Photon (OSM) | Address autocomplete | Free | Live |
| Socrata open data | Zoning + assessment + permits (Edmonton, Calgary, Vancouver, Toronto) | Free | Live |
| ArcGIS Feature Services | Zoning (Ottawa, Hamilton, Mississauga) | Free | Live |
| CKAN | Toronto permits | Free | Live |
| CMHC RMS 2023 | Rental anchors (26 CMAs, inflated to current year at 4.5%/yr compound) | Free | Live |
| Wikipedia REST | Neighborhood profiles | Free | Live |
| OSM Overpass | Nearby amenities (schools, transit, grocery, restaurants, parks) | Free | Live |
| Bank of Canada Valet | Prime / 5yr conventional / overnight rates | Free | Live |
| Google Street View Static | Property hero image | Free tier (28k/mo) | Waiting on `GOOGLE_MAPS_API_KEY` |
| Anthropic | AI thesis, deal memo, PDF OCR | Pay-per-use | Live |
| RentCast | US property AVM + rent | Paid | Live |
| Realtor.ca (scrape) | Canadian MLS active listings | Free (fragile) | Live, degraded gracefully |
| REPLIERS | Canadian MLS comps (CREA feed) | $500+/mo | Not wired |
| Statistics Canada | Demographics by DA/CSD | Free | Not wired (redirect issues) |

---

## Supported Canadian cities (open-data adapters)

| City | Zoning | Assessment | Permits |
|---|---|---|---|
| Edmonton | ✅ Socrata | ✅ | ✅ |
| Calgary | ✅ Socrata | ✅ | Partial |
| Vancouver | ✅ Socrata | ✅ | ✅ |
| Toronto | ✅ ArcGIS | ⚠️ MPAC-restricted nudge | ✅ CKAN |
| Ottawa | ✅ ArcGIS | ⚠️ MPAC-restricted nudge | ✅ Dev applications |
| Mississauga | ✅ ArcGIS | ⚠️ MPAC-restricted nudge | ✅ |
| Hamilton | ✅ ArcGIS | ⚠️ MPAC-restricted nudge | ✅ |

MPAC (provincial assessor) blocks per-property values across all Ontario cities in open data — the nudge card directs users to aboutmyproperty.ca.

---

## Local dev

```bash
npm install
npm run dev              # frontend only, /api routes 404 in dev
vercel dev               # frontend + serverless functions (requires `vercel login`)
```

Env: copy `.env.example` → `.env.local`, fill in what you need. See table below for which keys unlock which features.

## Deploy

Push to `master` → Vercel auto-deploys to production at `realdealestate.app`. Preview URLs are auto-generated per feature branch.

Manual: `vercel --prod --yes`.

---

## Env vars

**Required for core features (already set in Vercel):**
- `ANTHROPIC_API_KEY` — AI thesis, deal memo, all AI features
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — auth + database
- `STRIPE_SECRET_KEY` + `STRIPE_PRO_PRICE_ID` + `STRIPE_SCALE_PRICE_ID` + `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY` — transactional email
- `RENTCAST_API_KEY` — US property lookups
- `CRON_SECRET` — Vercel cron auth (auto-set)

**Missing (not yet configured):**
- `GOOGLE_MAPS_API_KEY` — Street View card
- `REPLIERS_API_KEY` — real Canadian MLS comps
- `RESEND_FROM_EMAIL` — sender identity for transactional email
- `ADMIN_EMAILS` — comma-separated allowlist for `/admin`

**Optional (free-tier of Socrata is usually enough):**
- `EDMONTON_APP_TOKEN`, `CALGARY_APP_TOKEN`

---

## Server-side subscription gating

Pro-tier features enforced server-side via `api/_lib/auth.js` → `requireTier(req, "pro" | "scale")`:

| Endpoint | Tier required |
|---|---|
| `mode=rent-roll-loss-to-lease` | Scale |
| `mode=verdict-memo` | Pro |
| `mode=deal-memo` | Pro |
| `mode=parse-document` | Pro |
| `mode=find-triggers` | Pro |
| `mode=admin-dashboard` | Admin (email allowlist) |

Client callers use `src/lib/authedFetch.js` which attaches the Supabase session JWT. Anonymous / free-tier callers get 402 Payment Required with an upgrade prompt.

**Kept intentionally open (free-tier funnel):**
- `mode=building-grade` — fires on Landing X-Ray bar for anon visitors
- `mode=deal-thesis`, `zoning-thesis`, `find-comps` — free-tier teasers

---

## Cron jobs

Defined in `vercel.json`:

| Path | Schedule | Purpose |
|---|---|---|
| `cron-digest` | Mon 16:00 UTC | Weekly saved-search digest |
| `cron-market-brief` | Daily 15:00 UTC | Market brief email |
| `cron-daily-alerts` | Daily 13:00 UTC | Deal alerts to subscribers |
| `cron-monthly-brief` | 1st of month 13:00 UTC | Monthly market summary |
| `cron-onboarding` | Daily 10:00 UTC | New-user onboarding sequence |
| `cron-weekly-buybox-digest` | Mon 09:00 UTC | Buy box match summary |

All 6 handlers verify `Authorization: Bearer $CRON_SECRET` before recording a run.

---

## Bundle strategy

- Route-level code splitting via `React.lazy` in `main.jsx`
- Vendor chunks split by `manualChunks` in `vite.config.js`: `vendor-react`, `vendor-router`, `vendor-supabase`, `vendor-stripe`, `vendor-charts`
- XLSX (429 KB) + jsPDF (352 KB) dynamically imported per-use — don't ship in main bundle
- Recharts (`vendor-charts`, 393 KB) only fetches when a chart-rendering route mounts

Initial bundle for a Landing visitor: ~460 KB (down from ~700 KB before session Aug 24).

---

## Documentation

- `docs/architecture.md` — full technical architecture
- `docs/vs-costar.md` — competitive positioning
- `docs/deck.md`, `docs/one-pager.md` — investor materials
- `START_HERE.md` — quick onboarding for maintainers
