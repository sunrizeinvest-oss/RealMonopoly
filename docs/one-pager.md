# RizeAI — One-Pager

## The pitch in one sentence

**RizeAI is the AI underwriting layer for Canadian real estate investors — open-data first, AI translates city + CMHC data into institutional reads in under 60 seconds. Same data foundation CoStar charges $5K–$50K/mo for, tuned for the retail-to-emerging-shop market at $99–$299/mo.**

---

## The problem

Canadian real estate investors — independent operators, syndicators, brokers, developers — underwrite deals on Excel. Per deal:

- 3–5 hours rebuilding the same spreadsheet
- Cap rates calculated three different ways (none institutional)
- Sale comps pulled off Zillow with no real comp logic
- Loss-to-lease eyeballed, never quantified
- IC memo or lender package written from scratch every time
- Watching deals close around them while they validate spreadsheet formulas

CoStar, Altus Data Studio, CompStak solve this for institutional buyers paying $5K–$50K/mo. **Below that price ceiling, the market has nothing.**

## What we built

A live, deployed Canadian-first AI underwriting platform with five differentiated capabilities:

### 1. Live city + CMHC data foundation
- **6 cities at parcel-level zoning**: Calgary, Edmonton, Vancouver, Toronto, Ottawa, Mississauga — pulled from each city's open data ArcGIS API in real time
- **26 CMHC metros**: rent benchmarks + vacancy rates for every major Canadian market
- **AI year-built estimator** fills the Ontario MPAC gap (Toronto, Ottawa, Mississauga don't publish year built; we infer it)

### 2. The X-Ray bar — the "Aha" moment
- Type any Canadian address → 5-second institutional read
- Returns: address, year built, assessed value, zoning code + description, plus an **AI Building Grade across 4 institutional dimensions** (Architecture & Finishes, Structure & Systems, Amenities & Management, Site & Certifications)

### 3. Rent Roll → Loss-to-Lease parser (the moat)
- Drag a broker's PDF rent roll onto the page
- Claude Sonnet extracts every unit row (BR, sqft, actual rent, tenancy)
- Cross-references against CMHC market rent for the unit's bedroom count
- Returns: annual stranded upside, per-door $/mo, % below market, 5-year NPV @ 8%
- **Real demo on a 24-unit Calgary multifamily: $187K of stranded annual upside, surfaced in 5 seconds from a 47-page broker OM**

### 4. Institutional underwriting + IC Memo PDF
- 20+ calculators: Fix & Flip, BRRRR, Multifamily, Loan Compare, Risk Simulator, Deal Comparison
- Newton-Raphson IRR · DSCR stress testing · 5-year cash flow projections
- One-click 2-page IC Memo PDF — same deliverable a junior analyst would write, generated in 5 seconds with the loss-to-lease analysis on page 2

### 5. AI Read narrative across every surface
- 9 deployed Claude modes: zoning thesis, deal thesis, parse-document, find-comps, find-triggers, deal-memo, send-digest, fetch-market-brief, building-grade
- Cached via localStorage to keep costs negligible
- Shareable AI Read URLs for viral growth

---

## Current platform state — honest

| Capability | Status |
|---|---|
| Live in prod | ✅ Yes — `www.realdealestate.app` (DNS migration to `rizeai.io` pending) |
| Stripe billing | ✅ Live mode wired; both plans accepting payment |
| Supabase auth + saved deals | ✅ Live |
| 6-city parcel-level zoning | ✅ Live |
| 26 CMHC metros rent + vacancy | ✅ Live |
| AI Building Grade | ✅ Live |
| Rent Roll → LTL parser | ✅ Live |
| IC Memo PDF generation | ✅ Live |
| Address auto-populate across calculators | ✅ Live |
| In-app admin dashboard | ✅ Live |
| Playwright E2E test suite | ✅ Live |
| Real Canadian MLS comps | ⏳ Code shipped, feature-flagged on $249/mo Repliers subscription |
| Daily Market Brief emails | ⏳ Code shipped, awaiting Resend domain verification |
| US address coverage | ⏳ Code present, awaiting RentCast subscription reactivation |
| US off-market sourcing | ❌ Not yet — Q4 roadmap |
| Live MLS data webhook ingestion | ❌ Not yet — Q4 roadmap |

---

## The pricing model

| Tier | Price | Target |
|---|---|---|
| Free | $0 | Try the platform, 3 saved deals |
| Pro | $99/mo | Independent residential investors, BRRRR strategists |
| Scale | $299/mo | Commercial brokers, land developers, multifamily syndicators |

**Highest-yield customer: commercial brokers ($299/mo).** Use the LTL parser + IC Memo PDF daily. $299/mo is a rounding error against their $500K+ broker fees per deal.

---

## Use of funds — pre-seed ask

| Allocation | Cost | What it unlocks |
|---|---|---|
| **First-100-paying-users outbound** | $25K | LinkedIn outreach + content + small paid pilot. Target 100 paying users by month 6. |
| **Real-time MLS data** | $30K | Repliers Growth tier × 12 months ($549/mo) + buffer for Altus where Repliers doesn't reach |
| **3 more Canadian metros** | $10K | Engineering: Hamilton, Quebec City, Halifax parcel-level zoning + assessment workarounds |
| **First engineering hire** | $80K-120K | Senior full-stack to ship US coverage (RentCast + Mashvisor) and off-market sourcing layer |
| **Founder runway** | $30K | 6 months to build to seed-readiness |
| **Total** | **$175K–$215K** | **6-month runway to seed-readiness with paying user base** |

---

## Traction approach — first 100 paying users

1. **LinkedIn outbound to commercial brokers**: 30-second Loom of the rent-roll → $187K upside demo, sent to 50 brokers/week in Calgary, Vancouver, Toronto.
2. **CCIM + RECA events**: sponsor a tools demo at chapter meetings (Alberta + BC + Ontario).
3. **Content moat**: post the "before/after the rent roll" before/after on LinkedIn weekly. Each broker who shares is a multiplier.
4. **Direct enterprise pilot**: target 1 mid-sized multifamily syndicator for a $1K-$3K/mo seat-based pilot.

**Conversion math**: 50 brokers/week × 4 weeks × 5 demo conversion × 30% paid conversion = 30 paying users/month at $299/mo = ~$9K MRR added monthly. **100 paying users = ~$30K MRR by month 6.**

---

## What makes this defensible

| Moat | Why it sticks |
|---|---|
| **Rent Roll → Loss-to-Lease parser** | No competitor at retail price ships OCR + CMHC cross-reference. Closing this gap requires a CRE data team, not a feature sprint. |
| **6-city Canadian open-data adapter set** | Each city's open data has unique quirks. We've solved Calgary's Socrata schema, Edmonton's address normalization, Vancouver's CD-1 zoning, Toronto's MPAC workaround, Ottawa + Mississauga's ArcGIS spatial queries. Replicating this takes 3–6 months of engineering. |
| **AI Read narrative pattern** | 9 deployed Claude modes with per-surface caching. The pattern is more architectural than featural — competitors would need to redesign their entire UX to add it. |
| **Family Office brand positioning** | We don't look like other retail PropTech (Stessa, REI Hub). We look like a Bloomberg Terminal for Canadian RE. Brand defensibility = pricing power. |

---

## Risks we're honest about

1. **CoStar / Altus could move down-market.** Their TAM is institutional; ours is retail-to-emerging-shop. They've shown no interest in <$5K/mo customers in 10 years. Track record favors us.
2. **Repliers / MLS data licensing.** Currently feature-flagged. Once subscribed, single-source risk on CREA feed. Mitigation: add Trestle (CoreLogic) as fallback by month 9.
3. **CMHC data is annual.** Our rent benchmarks are October 2023. New release usually drops Q4. We're tied to their cadence.
4. **Single founder.** Working with AI co-pilot for engineering. Plan to hire first senior engineer with pre-seed proceeds.

---

## What we want from you

- **Pre-seed allocation**: $150K–$250K
- **Strategic intros**: especially CRE brokers willing to be design partners
- **Pricing model feedback**: $99 / $299 vs. $149 / $399 vs. seat-based

---

## Try it now — 60 seconds

`https://www.realdealestate.app/` *(rebranding to `rizeai.co` Q3)*

1. Hero page loads
2. Click any of the 4 preset addresses on the X-Ray bar
3. Watch the institutional read render — public record, zoning, Building Grade
4. Sign up free, search any AB / BC / Toronto / Ottawa / Mississauga address
5. Drag a rent roll PDF (or your own broker OM) onto `/commercial`
6. Watch the Loss-to-Lease panel quantify the stranded upside
7. Hit "Save Memo" → 2-page institutional PDF lands in Downloads

**The demo IS the pitch.**

---

## Contact

Sunni Yaremchuk
Founder, RizeAI
[email]
[LinkedIn]
[Calendly]
