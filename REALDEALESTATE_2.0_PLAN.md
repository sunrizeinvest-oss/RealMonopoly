# 🚀 RealDealEstate.app 2.0 — 4-Week Incremental Build Plan

**Philosophy:** You already built 70-80% of "2.0" — what you need is sharpening, not rebuilding. This plan upgrades your existing codebase with AI-leveraged work in 4 focused weeks.

**Total cost:** ~$200-500 (Vercel Pro + API credits for AI/data) vs. the $50-100K rebuild path.
**Total time:** 4 weeks of focused sessions.
**Goal end-state:** A product worth $99/mo with 10-50 paying users by end of Week 4.

---

## 🎯 SUCCESS METRICS (track weekly)

| Metric | Week 0 (now) | Week 4 (target) |
|---|---|---|
| Paying users on rizeai.co | ? — check Stripe | 10-50 |
| MRR | ? | $1K-$5K |
| Free → Paid conversion rate | ? | >5% |
| AI thesis output quality (1-10) | 6 | 9 |
| PDF report look (1-10) | 5 | 9 |

**First task:** Open Stripe and check current user count + MRR. Tell me what it says, that becomes Week 0 baseline.

---

## 📅 WEEK 1 — Revenue layer (the AI thesis + PDF polish)

**Why first:** These are the two things that turn a $29/mo subscriber into a $99/mo subscriber. The technical work is small. The revenue impact is huge.

### Deliverables (5 days)
- **D1: AI Investment Thesis upgrade** — rewrite `api/ai-analyze.js` prompt to produce institutional-grade output:
  - Executive summary (1 paragraph)
  - Market analysis (rent trends, cap rate, supply)
  - Risk assessment (3 named risks + mitigations)
  - Opportunity scoring (1-10 with rationale)
  - Comparable transactions
  - Exit strategy (3 options ranked)
- **D2: PDF report design upgrade** — rewrite `src/pdfExport.js` / `generatePDF.js`:
  - Cover page with property hero image + key metrics
  - Branded header/footer
  - Professional tables (not raw text)
  - Charts using existing canvg/jspdf
- **D3: Pricing tier UI** — update `Pricing.jsx`:
  - Free → 3 deals/month, basic analysis
  - Pro $29 → unlimited deals, AI thesis
  - Premium $99 → AI thesis + PDF reports + comp database
- **D4: Stripe wire-up for tiers** — `create-checkout.js` already exists, add price IDs for each tier
- **D5: QA + deploy + screenshot announcement** for soft launch

### Friday demo
A polished investor PDF for one real Edmonton property (you pick — Allendale 6-Plex?). Use this in the launch email Week 4.

---

## 📅 WEEK 2 — Data depth (smarter inputs = smarter outputs)

**Why second:** Better data feeds the better thesis. Without this, the Week 1 work is producing eloquent garbage.

### Deliverables (5 days)
- **D1-D2: AB property tax + zoning integration** — write `api/ab-municipal.js` that hits Edmonton's open data API for:
  - Assessed value (current + historical)
  - Zoning classification
  - Lot dimensions
  - Last sale + price
- **D3: Tighten `api/realtor-ca.js`** — it's currently fragile, make it robust:
  - Better error handling
  - Cache layer (avoid re-scraping)
  - Fallback to Estated when Realtor.ca blocks
- **D4: Comparable transactions feed** — `api/sale-comps.js` upgrade:
  - Pull last 24 months of sales within 1km
  - Cap-rate-comparable filter
  - Bedroom-count match for MF
- **D5: Test pipeline end-to-end** — paste an Edmonton MLS link, get back full thesis + comps + risks in one report

### Friday demo
Same Edmonton property as Week 1, now with 3x more data points feeding the analysis.

---

## 📅 WEEK 3 — Marketplace seed (the syndication play)

**Why third:** Most real estate platforms have data + analysis but no community. The marketplace turns rizeai.co from a tool into a network — and that's defensible.

### Deliverables (5 days)
- **D1-D2: "List a Deal" flow** — extend `SubmitDeal.jsx`:
  - Sponsor profile (your projects, track record)
  - Deal terms (LP pref, GP economics, hold period)
  - Documents (auto-pulled from your `~/RealEstate_Organized/` if logged in)
- **D3: "Browse Deals" flow** — new `Marketplace.jsx`:
  - Card grid of active syndications
  - Filter by market / asset class / min check
- **D4: Expression-of-interest** — replace "Invest" button with "Request More Info" → sends to sponsor's email
  - (Real LP onboarding requires KYC/AML — defer to legal Phase 2)
- **D5: Seed with 3 deals** — your Allendale 5-plex, 6-plex, and Verum. You're the first sponsor.

### Friday demo
You can see your own deals listed on `rizeai.co/marketplace`. So can your warm contacts when you launch Week 4.

---

## 📅 WEEK 4 — Launch + iterate

**Why last:** All previous weeks are necessary infrastructure. Now you have something worth shouting about.

### Deliverables (5 days)
- **D1: Pricing page polish + comparison table** — make the $29 vs $99 difference obvious
- **D2: Onboarding email sequence** — 3 emails over 7 days for new signups (welcome → first deal walkthrough → upgrade nudge)
- **D3: Launch email to warm list** — use `outreach/segments/seg0_WARM_your_own_network.csv` (2,974 contacts)
  - Pre-filter to ~200 closest contacts (manual selection)
  - Personalize subject lines
  - Send via Gmail or a service like Beehiiv / Buttondown
- **D4: LinkedIn launch post + 1-pager PDF** — using the polished thesis from Week 1
- **D5: Monitor signups + start support / iterate based on first 24h feedback**

### Friday demo
- 100+ visits to the site from your launch
- 5-20 signups
- 1-5 paying customers
- A list of "first 10 things to fix in Week 5" from real user feedback

---

## 🛠 TOOLS WE'LL USE EACH WEEK

| Need | Tool |
|---|---|
| Code generation | Claude (this conversation) — paste a file, describe the change, I write it |
| Code execution | `vercel --prod` (already installed) |
| Data scraping | Your existing `realtor-ca.js` + new APIs |
| AI thesis | Anthropic Claude API (already in `ai-analyze.js`) |
| Payments | Stripe (already wired) |
| Email send | Gmail manually for Week 4, or Beehiiv for scale |
| Analytics | Vercel Analytics (free) + Google Analytics 4 |

---

## ❓ DECISIONS YOU NEED TO MAKE (before Week 1 starts)

1. **What are the 3 pricing tiers, exact dollar amounts?** Suggested: Free / $29 / $99 — but could be $0 / $49 / $149 if you want to position premium.
2. **What's the one "wow" feature you want the AI thesis to nail?** (e.g., "tells me if this is a value-add play or a yield play in one sentence")
3. **Do you have a logo + brand colors for the PDF reports?** If not, Week 1 also includes building one.
4. **Email send method for Week 4 launch?** Gmail (free, manual) or a service like Beehiiv (~$50/mo)?

---

## 🚀 KICKOFF — WHAT WE DO TOMORROW

**Tomorrow morning (Week 1 Day 1):**
1. Open Stripe dashboard → tell me current user count + MRR
2. Open `rizeai.co` → use the AI thesis on a real property → show me the current output
3. We rewrite the AI prompt together (30 min)
4. Deploy
5. Re-run the thesis on the same property → see the upgrade

Send a one-line reply when ready: **"Let's do Week 1 Day 1"**

— And we go.
