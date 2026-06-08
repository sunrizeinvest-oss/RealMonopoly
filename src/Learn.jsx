import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Fira+Code:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: #07090f; color: var(--text); font-family: 'DM Sans', sans-serif; }

  .learn-page {
    min-height: 100vh;
    background: #07090f;
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
  }

  /* ── Nav ── */
  .learn-nav {
    position: sticky;
    top: 0;
    z-index: 200;
    background: rgba(7,9,15,0.97);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    padding: 0 24px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .learn-nav-logo {
    font-size: 16px;
    font-weight: 800;
    color: #fff;
    text-decoration: none;
    letter-spacing: -0.5px;
  }
  .learn-nav-logo span { color: var(--blue); }
  .learn-nav-links {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .learn-nav-link {
    font-size: 13px;
    font-weight: 500;
    color: var(--sub);
    text-decoration: none;
    padding: 5px 11px;
    border-radius: 7px;
    border: 1px solid transparent;
    transition: all 0.15s;
    cursor: pointer;
    background: transparent;
    font-family: 'DM Sans', sans-serif;
  }
  .learn-nav-link:hover { color: var(--text); background: rgba(255,255,255,0.05); }
  .learn-nav-link.active {
    color: var(--blue);
    background: rgba(59,158,255,0.1);
    border-color: rgba(59,158,255,0.2);
    font-weight: 700;
  }

  /* ── Anchor bar ── */
  .learn-anchor-bar {
    position: sticky;
    top: 50px;
    z-index: 100;
    background: rgba(13,17,25,0.97);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 24px;
    height: 44px;
    overflow-x: auto;
    white-space: nowrap;
  }
  .learn-anchor-bar::-webkit-scrollbar { height: 3px; }
  .learn-anchor-bar::-webkit-scrollbar-track { background: transparent; }
  .learn-anchor-bar::-webkit-scrollbar-thumb { background: rgba(59,158,255,0.3); border-radius: 2px; }
  .anchor-pill {
    font-size: 11px;
    font-weight: 600;
    color: var(--sub);
    text-decoration: none;
    padding: 4px 12px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.08);
    background: transparent;
    transition: all 0.15s;
    white-space: nowrap;
    letter-spacing: 0.2px;
  }
  .anchor-pill:hover {
    color: var(--blue);
    border-color: rgba(59,158,255,0.3);
    background: rgba(59,158,255,0.06);
  }

  /* ── Main content ── */
  .learn-body {
    max-width: 1080px;
    margin: 0 auto;
    padding: 48px 24px 80px;
  }

  .page-header {
    margin-bottom: 56px;
    text-align: center;
  }
  .page-header-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--blue);
    margin-bottom: 12px;
  }
  .page-header h1 {
    font-size: 36px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -1px;
    line-height: 1.15;
    margin-bottom: 14px;
  }
  .page-header p {
    font-size: 16px;
    color: var(--sub);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.65;
  }

  /* ── Section ── */
  .learn-section {
    margin-bottom: 72px;
    scroll-margin-top: 110px;
  }
  .section-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 24px;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(59,158,255,0.12);
  }
  .section-number {
    font-size: 11px;
    font-weight: 800;
    color: var(--blue);
    letter-spacing: 1px;
    text-transform: uppercase;
    background: rgba(59,158,255,0.1);
    border: 1px solid rgba(59,158,255,0.2);
    padding: 3px 8px;
    border-radius: 5px;
    white-space: nowrap;
  }
  .section-title {
    font-size: 22px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.5px;
  }
  .section-sub {
    font-size: 14px;
    color: var(--sub);
    margin-top: 4px;
  }

  /* ── Strategy cards ── */
  .strategy-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 28px;
  }
  .strategy-card {
    background: #0d1119;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 24px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .strategy-card:hover {
    border-color: rgba(59,158,255,0.25);
    box-shadow: 0 4px 24px rgba(0,0,0,0.15);
  }
  .strategy-card-accent {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    border-radius: 14px 14px 0 0;
  }
  .strategy-icon {
    font-size: 28px;
    margin-bottom: 14px;
    display: block;
  }
  .strategy-card h3 {
    font-size: 17px;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 8px;
    letter-spacing: -0.3px;
  }
  .strategy-desc {
    font-size: 13.5px;
    color: var(--sub);
    line-height: 1.65;
    margin-bottom: 18px;
  }
  .strategy-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .strategy-meta-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
  }
  .strategy-meta-label {
    color: var(--dim);
    font-weight: 600;
    letter-spacing: 0.3px;
    white-space: nowrap;
    min-width: 72px;
  }
  .strategy-meta-val {
    color: var(--sub);
    line-height: 1.5;
  }
  .strategy-meta-val.green { color: var(--green); }
  .strategy-meta-val.amber { color: var(--amber); }
  .strategy-meta-val.red { color: var(--red); }
  .strategy-meta-val.blue { color: var(--blue); }
  .strategy-meta-val.purple { color: var(--purple); }

  /* ── Glossary ── */
  .search-bar-wrap {
    margin-bottom: 24px;
    position: relative;
  }
  .search-bar-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--dim);
    font-size: 15px;
    pointer-events: none;
  }
  .search-bar {
    width: 100%;
    background: #0d1119;
    border: 1px solid rgba(59,158,255,0.12);
    border-radius: 10px;
    padding: 12px 16px 12px 42px;
    font-size: 14px;
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .search-bar::placeholder { color: var(--dim); }
  .search-bar:focus {
    border-color: rgba(59,158,255,0.4);
    box-shadow: 0 0 0 3px rgba(59,158,255,0.08);
  }
  .search-count {
    font-size: 12px;
    color: var(--dim);
    margin-bottom: 20px;
    padding: 0 2px;
  }

  .glossary-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  .glossary-card {
    background: #0d1119;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    padding: 20px 20px 18px;
    transition: border-color 0.15s;
  }
  .glossary-card:hover { border-color: rgba(59,158,255,0.2); }
  .glossary-term {
    font-size: 17px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.3px;
    margin-bottom: 6px;
  }
  .glossary-def {
    font-size: 13px;
    color: var(--sub);
    line-height: 1.65;
    margin-bottom: 12px;
  }
  .glossary-formula {
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    color: var(--green);
    background: rgba(52,217,138,0.06);
    border: 1px solid rgba(52,217,138,0.15);
    border-left: 3px solid var(--green);
    border-radius: 0 6px 6px 0;
    padding: 8px 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .glossary-no-formula {
    display: none;
  }
  .no-results {
    text-align: center;
    color: var(--dim);
    font-size: 14px;
    padding: 40px 0;
    grid-column: 1 / -1;
  }

  /* ── Quick Rules ── */
  .rules-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }
  .rule-card {
    background: #0a0e18;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.15s, background 0.15s;
  }
  .rule-card:hover {
    border-color: rgba(59,158,255,0.2);
    background: #0d1119;
  }
  .rule-name {
    font-size: 15px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.2px;
  }
  .rule-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 4px;
    margin-bottom: 4px;
    width: fit-content;
  }
  .rule-formula {
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    color: var(--blue);
    background: rgba(59,158,255,0.07);
    border: 1px solid rgba(59,158,255,0.15);
    border-radius: 6px;
    padding: 8px 10px;
    line-height: 1.5;
  }
  .rule-desc {
    font-size: 12.5px;
    color: var(--sub);
    line-height: 1.6;
  }

  /* ── Red Flags ── */
  .redflags-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 28px;
  }
  .redflag-item {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    background: #0d1119;
    border: 1px solid rgba(242,92,92,0.12);
    border-left: 3px solid var(--red);
    border-radius: 0 10px 10px 0;
    padding: 14px 16px;
    transition: border-color 0.15s, background 0.15s;
  }
  .redflag-item:hover {
    background: rgba(242,92,92,0.04);
    border-color: rgba(242,92,92,0.25);
    border-left-color: var(--red);
  }
  .redflag-icon {
    font-size: 16px;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .redflag-text {
    font-size: 14px;
    color: var(--text);
    font-weight: 500;
    line-height: 1.5;
  }
  .redflag-sub {
    font-size: 12px;
    color: var(--sub);
    margin-top: 3px;
    line-height: 1.5;
  }

  /* ── Market Timing ── */
  .timing-grid {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 28px;
  }
  .timing-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    background: #0d1119;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    padding: 18px 20px;
    transition: border-color 0.15s;
  }
  .timing-item:hover { border-color: rgba(59,158,255,0.2); }
  .timing-signal {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }
  .timing-content h4 {
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 5px;
    letter-spacing: -0.2px;
  }
  .timing-content p {
    font-size: 13px;
    color: var(--sub);
    line-height: 1.65;
  }
  .timing-content .timing-warn {
    font-size: 12px;
    color: var(--amber);
    font-weight: 600;
    margin-top: 5px;
  }

  /* ── CTA button ── */
  .section-cta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--blue);
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    padding: 11px 22px;
    border-radius: 9px;
    border: none;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    text-decoration: none;
    transition: background 0.15s, transform 0.1s;
    margin-top: 8px;
  }
  .section-cta:hover { background: #5aaeff; transform: translateY(-1px); }
  .section-cta.green { background: var(--green); color: #03291a; }
  .section-cta.green:hover { background: #4de9a0; }
  .section-cta.purple { background: var(--purple); color: #1a0d40; }
  .section-cta.purple:hover { background: #b89bff; }
  .section-cta.amber { background: var(--amber); color: #2a1800; }
  .section-cta.amber:hover { background: #f5b050; }

  /* ── Back to top ── */
  .back-to-top {
    position: fixed;
    bottom: 28px;
    right: 24px;
    z-index: 300;
    background: #0d1119;
    border: 1px solid rgba(59,158,255,0.25);
    color: var(--blue);
    font-size: 12px;
    font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    padding: 8px 14px;
    border-radius: 20px;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 5px;
    opacity: 0;
    pointer-events: none;
  }
  .back-to-top.visible {
    opacity: 1;
    pointer-events: auto;
  }
  .back-to-top:hover {
    background: rgba(59,158,255,0.12);
    border-color: rgba(59,158,255,0.5);
  }

  /* ── Divider ── */
  .section-divider {
    height: 1px;
    background: rgba(255,255,255,0.05);
    margin: 64px 0;
  }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .strategy-grid { grid-template-columns: 1fr; }
    .rules-grid { grid-template-columns: repeat(2, 1fr); }
    .glossary-grid { grid-template-columns: 1fr; }
    .page-header h1 { font-size: 28px; }
    .learn-nav-links { display: none; }
  }
  @media (max-width: 600px) {
    .rules-grid { grid-template-columns: 1fr; }
    .learn-body { padding: 32px 16px 80px; }
    .learn-anchor-bar { padding: 0 16px; }
    .page-header h1 { font-size: 24px; }
    .page-header p { font-size: 14px; }
  }
`;

const GLOSSARY_TERMS = [
  {
    term: "ARV",
    fullName: "After Repair Value",
    def: "What the property is worth after full renovation — your expected sale price. This is the foundation of every calculation and must be based on comparable closed sales, not wishful thinking. Pull median comps within 0.5 miles, same bed/bath count, similar square footage, sold within 90 days.",
    formula: "Comp-based estimate (median of recent closed sales in same area/condition)",
  },
  {
    term: "MAO",
    fullName: "Maximum Allowable Offer",
    def: "The most you can pay for a property and still hit your profit target. This is your ceiling offer price — never go above it without a compelling, documented reason. Plug in your actual costs to get an accurate MAO.",
    formula: "MAO = ARV − Repairs − All Transaction Costs − Target Profit",
  },
  {
    term: "NOI",
    fullName: "Net Operating Income",
    def: "Annual rental income after all operating expenses, before financing costs (mortgage). NOI is the core of rental property valuation. A higher NOI means a more valuable asset — this is what Cap Rate and DSCR are built on.",
    formula: "NOI = Gross Rent Income − Operating Expenses\n(Operating Exp: taxes, insurance, management, maintenance, vacancy)",
  },
  {
    term: "Cap Rate",
    fullName: "Capitalization Rate",
    def: "The return on a property if purchased entirely with cash — no mortgage. Used to compare income properties regardless of financing. A higher cap rate means more income relative to purchase price, but often signals higher risk or a weaker market.",
    formula: "Cap Rate = (NOI ÷ Purchase Price) × 100",
  },
  {
    term: "DSCR",
    fullName: "Debt Service Coverage Ratio",
    def: "Measures whether rental income is sufficient to cover the mortgage. Most lenders require a minimum DSCR of 1.25 — meaning rent covers 125% of your debt payment. Below 1.0 means the property can't pay for itself.",
    formula: "DSCR = NOI ÷ Annual Debt Service\n(Debt Service = 12 × monthly mortgage payment)",
  },
  {
    term: "CoC",
    fullName: "Cash-on-Cash Return",
    def: "The return on the actual cash you invested — your down payment plus out-of-pocket costs. Unlike ROI, CoC focuses on your real money at risk, not total project cost. A strong flip typically targets 20%+ annualized CoC.",
    formula: "CoC = (Annual Cash Flow ÷ Total Cash Invested) × 100",
  },
  {
    term: "GRM",
    fullName: "Gross Rent Multiplier",
    def: "A fast, rough valuation shortcut for rental properties. Divide the asking price by annual gross rent. The lower the GRM, the better the deal relative to rent. Use it for quick screening — not final underwriting.",
    formula: "GRM = Property Price ÷ Annual Gross Rent\n(Lower = better value; typical range 4–12x depending on market)",
  },
  {
    term: "ROI",
    fullName: "Return on Investment",
    def: "The classic measure of investment efficiency — net profit as a percentage of total capital deployed. For flips, ROI tells you how efficiently every dollar invested generated profit. For rentals, use annualized CoC instead.",
    formula: "ROI = (Net Profit ÷ Total Investment) × 100",
  },
  {
    term: "Profit Margin",
    fullName: "Profit Margin",
    def: "Net profit expressed as a percentage of the sale price (ARV). A healthy fix-and-flip targets 15–20%+ margin. Below 10% leaves little room for cost overruns. Below 0% means you lost money on the deal.",
    formula: "Profit Margin = (Net Profit ÷ ARV) × 100",
  },
  {
    term: "Equity",
    fullName: "Equity",
    def: "Your ownership stake — the value of the property minus everything owed against it. Equity can be built through appreciation, paying down debt, or forced appreciation via renovation. Equity is not cash until you sell or refinance.",
    formula: "Equity = Market Value − All Liens (mortgages, HELOCs, etc.)",
  },
  {
    term: "LTV",
    fullName: "Loan to Value",
    def: "The ratio of your loan amount to the appraised property value. Lenders use LTV to assess risk — the higher the LTV, the more leveraged (and risky) the loan. Hard money lenders typically cap LTV at 65–75% of ARV.",
    formula: "LTV = (Loan Amount ÷ Property Value) × 100",
  },
  {
    term: "DTI",
    fullName: "Debt to Income",
    def: "Your total monthly debt payments as a percentage of gross monthly income. Conventional lenders look at DTI to qualify borrowers. Most conventional loans require DTI below 43–45%. DSCR loans bypass personal DTI by qualifying on property income.",
    formula: "DTI = (Monthly Debt Payments ÷ Monthly Gross Income) × 100",
  },
  {
    term: "Hard Money Loan",
    fullName: "Hard Money Loan",
    def: "A short-term, asset-based loan from a private lender — used primarily by investors for acquisitions and rehabs. Hard money lenders move fast (close in 5–10 days) and care about the deal, not your W2. Expect higher rates and points as the trade-off for speed and flexibility.",
    formula: "Typical terms: 10–15% rate, 2–4 points, 6–18 month term, 65–75% LTV",
  },
  {
    term: "Points",
    fullName: "Loan Points (Origination Fee)",
    def: "Upfront lender fees charged as a percentage of the loan amount. 1 point = 1% of the loan. Points are paid at closing and reduce the lender's risk. They are a real cost that must be included in your deal analysis — not optional overhead.",
    formula: "Points Cost = (Points % ÷ 100) × Loan Amount\nEx: 2 pts on $200,000 loan = $4,000",
  },
  {
    term: "70% Rule",
    fullName: "The 70% Rule",
    def: "The most widely used fix-and-flip screening rule. Your offer (including closing costs) should be no more than 70% of ARV, minus repair costs. It is a rule of thumb, not a substitute for real analysis — use it to quickly filter deals, then model the numbers in detail.",
    formula: "Max Offer ≤ (ARV × 0.70) − Repair Costs",
  },
  {
    term: "1% Rule",
    fullName: "The 1% Rule",
    def: "A quick rental property screening test: monthly rent should be at least 1% of the purchase price. Helps identify properties that can generate sufficient cash flow relative to price. Harder to achieve in high-cost markets; more realistic in Midwest and Southeast markets.",
    formula: "(Monthly Rent ÷ Purchase Price) × 100 ≥ 1%\nEx: $200,000 home should rent for ≥ $2,000/mo",
  },
  {
    term: "50% Rule",
    fullName: "The 50% Rule",
    def: "A rough estimating rule that assumes operating expenses equal about 50% of gross rental income. Includes taxes, insurance, maintenance, vacancies, management — but NOT mortgage payments. Use it to estimate NOI quickly: NOI ≈ 50% × Gross Rent.",
    formula: "Operating Expenses ≈ 50% × Gross Rent\nNOI ≈ Gross Rent × 0.50",
  },
  {
    term: "Cash Flow",
    fullName: "Cash Flow",
    def: "The money left in your pocket each month after collecting rent and paying all expenses including the mortgage. Positive cash flow means the property pays you. Negative cash flow means you're feeding it. Never rely on 'future appreciation' to justify negative Day 1 cash flow.",
    formula: "Cash Flow = Gross Rent − Vacancy − Operating Expenses − Debt Service",
  },
  {
    term: "Vacancy Rate",
    fullName: "Vacancy Rate",
    def: "The percentage of time a rental unit sits unoccupied. Always factor in vacancy — even the best properties have tenant turnover. A conservative underwrite uses 5–10% vacancy. In C-class markets or student housing, use 8–12%.",
    formula: "Typical assumption: 5–10% of gross rent\nEx: $2,000 rent × 8% vacancy = $160/mo vacancy loss",
  },
  {
    term: "Depreciation",
    fullName: "Depreciation (Tax Deduction)",
    def: "The IRS allows residential rental property owners to deduct the building value (not land) over 27.5 years. This is a non-cash deduction that reduces taxable income — often creating a 'paper loss' even on cash-flow-positive properties. A major tax advantage of real estate investing.",
    formula: "(Purchase Price − Land Value) ÷ 27.5 = Annual Depreciation\nEx: ($300,000 − $50,000) ÷ 27.5 = $9,090/yr deduction",
  },
  {
    term: "Cost Segregation",
    fullName: "Cost Segregation",
    def: "A tax strategy that accelerates depreciation by reclassifying property components into shorter recovery periods (5, 7, or 15 years) instead of 27.5. A cost segregation study is performed by an engineer. This creates larger upfront deductions, reducing tax liability in early years.",
    formula: "Components reclassified to 5-yr, 7-yr, or 15-yr depreciation\n(vs standard 27.5-yr for residential real property)",
  },
  {
    term: "1031 Exchange",
    fullName: "1031 Exchange",
    def: "An IRS provision that lets you defer capital gains tax when you sell an investment property and reinvest the proceeds into a 'like-kind' replacement property. Strict timelines apply: identify replacement within 45 days, close within 180 days. Works for investment properties — not your primary residence.",
    formula: "Must identify replacement within 45 days of sale\nMust close replacement within 180 days of sale\nNo capital gains tax until you eventually cash out",
  },
];

const RULES = [
  {
    name: "70% Rule",
    badge: "Flip Screening",
    badgeColor: "var(--blue)",
    badgeBg: "rgba(59,158,255,0.1)",
    formula: "Offer ≤ (ARV × 0.70) − Repairs",
    desc: "Classic investor shortcut to quickly screen flip deals. If the math doesn't work at 70%, it rarely pencils out once you add all your real costs.",
  },
  {
    name: "1% Rule",
    badge: "Rental Screening",
    badgeColor: "var(--green)",
    badgeBg: "rgba(52,217,138,0.1)",
    formula: "(Rent ÷ Price) × 100 ≥ 1%",
    desc: "Monthly rent should be at least 1% of purchase price. Harder to hit in expensive markets, but a fast way to filter rental opportunities.",
  },
  {
    name: "50% Rule",
    badge: "Expense Estimation",
    badgeColor: "var(--purple)",
    badgeBg: "rgba(167,130,255,0.1)",
    formula: "Op. Expenses ≈ Gross Rent × 0.50",
    desc: "Estimate operating expenses as 50% of gross rent to get a fast NOI approximation. Does not include mortgage payments.",
  },
  {
    name: "DSCR > 1.25",
    badge: "Lender Minimum",
    badgeColor: "var(--amber)",
    badgeBg: "rgba(240,160,48,0.1)",
    formula: "NOI ÷ Debt Service > 1.25",
    desc: "Most lenders require rent to cover at least 125% of the mortgage payment. Below 1.0 means the property can't service its own debt.",
  },
  {
    name: "Cap Rate 6–10%",
    badge: "Healthy Range",
    badgeColor: "var(--green)",
    badgeBg: "rgba(52,217,138,0.1)",
    formula: "Cap Rate = NOI ÷ Price × 100",
    desc: "A healthy cap rate depends on market class. A-class urban = 4–6%. B-class suburban = 6–8%. C-class = 8–12%. Below 5% in a B/C market is a warning sign.",
  },
  {
    name: "6-Month Reserve",
    badge: "Before Deal #1",
    badgeColor: "var(--red)",
    badgeBg: "rgba(242,92,92,0.1)",
    formula: "6 × Monthly Expenses = Safety Net",
    desc: "Before closing your first deal, have 6 months of property expenses in liquid reserves. Surprises happen — furnaces die, tenants skip, markets slow.",
  },
];

const RED_FLAGS = [
  {
    icon: "🚫",
    text: "Purchase price exceeds your MAO",
    sub: "If you're over the Maximum Allowable Offer, you've already eroded your margin before the work starts.",
  },
  {
    icon: "🚫",
    text: "Repair costs based on estimates, not contractor bids",
    sub: "\"Ballpark\" repair estimates routinely run 20–40% low. Never underwrite without at least 2 contractor walk-throughs.",
  },
  {
    icon: "🚫",
    text: "Cap rate below 5% in a B or C class market",
    sub: "Low cap rates in tertiary markets mean you're paying a premium that the local rental income doesn't justify.",
  },
  {
    icon: "🚫",
    text: "DSCR below 1.0",
    sub: "The property cannot pay its own mortgage from rent. You'll be covering the shortfall out of pocket every month.",
  },
  {
    icon: "🚫",
    text: "Negative cash flow on Day 1",
    sub: "Do not bank on future appreciation to bail out a deal that bleeds cash from the start. Cash flow is your lifeline.",
  },
  {
    icon: "🚫",
    text: "ARV based on \"best case\" instead of median comps",
    sub: "Cherry-picking the highest recent sales inflates your ARV. Use median comps from the last 90 days within 0.5 miles.",
  },
  {
    icon: "🚫",
    text: "No comparable sales within 0.5 miles",
    sub: "Without nearby closed comps, ARV is speculative. A hard money lender's appraisal may come in much lower than expected.",
  },
  {
    icon: "🚫",
    text: "Seller financing with a balloon payment due within 2 years",
    sub: "Short balloon notes are a refinancing trap — if rates rise or your deal takes longer, you could face forced sale or default.",
  },
  {
    icon: "🚫",
    text: "No title search completed",
    sub: "Hidden liens, back taxes, or ownership disputes can kill a deal at closing or follow you after. Always run title before closing.",
  },
  {
    icon: "🚫",
    text: "Environmental issues present (oil tanks, asbestos, mold)",
    sub: "Environmental remediation costs are wildly unpredictable and can exceed renovation budgets. Always order an environmental inspection on older properties.",
  },
];

const TIMING_SIGNALS = [
  {
    icon: "📉",
    bg: "rgba(59,158,255,0.1)",
    title: "Fed Rate Changes → Financing Cost Shifts",
    desc: "When the Federal Reserve raises rates, mortgage rates follow — increasing your monthly carrying costs and potentially reducing the pool of end buyers. Falling rates have the opposite effect. Monitor Fed meeting decisions and the 10-year Treasury yield as leading indicators.",
    warn: "When rates rise quickly, underwrite at current rates + 0.5% buffer for safety.",
  },
  {
    icon: "⚖️",
    bg: "rgba(242,92,92,0.08)",
    title: "Cap Rate vs. Mortgage Rate: Negative Leverage Warning",
    desc: "When the prevailing mortgage rate exceeds the market cap rate, you have negative leverage — financing is eating into your returns rather than amplifying them. This is common in gateway markets (NYC, LA, SF) and signals that all-cash buyers have a structural advantage.",
    warn: "If mortgage rate > cap rate: every dollar borrowed reduces your yield. Consider waiting or targeting higher-cap markets.",
  },
  {
    icon: "📅",
    bg: "rgba(52,217,138,0.08)",
    title: "Days on Market (DOM) Trends",
    desc: "Rising DOM means buyers are becoming more selective — a buyer's market where you have negotiating power. Falling DOM means properties are selling fast — a seller's market where competition is fierce. Track local MLS DOM over 3-month rolling averages.",
    warn: "DOM increasing 30%+ YoY in your target market = leverage opportunity for investors.",
  },
  {
    icon: "💰",
    bg: "rgba(240,160,48,0.08)",
    title: "Price Reduction Frequency",
    desc: "Track the percentage of active listings with recent price reductions. High reduction frequency (15%+) signals demand is weakening and sellers are overpriced. Low reduction frequency in a heated market means original list prices are being met or exceeded.",
    warn: "High price reductions can be a buying opportunity — sellers are motivated.",
  },
  {
    icon: "📦",
    bg: "rgba(167,130,255,0.08)",
    title: "Months of Inventory (Supply Signal)",
    desc: "Months of inventory = active listings ÷ monthly sales rate. Under 3 months is a strong seller's market (prices rise). 3–6 months is balanced. Over 6 months favors buyers. Rising inventory is a leading indicator of softening prices — often appearing 6–12 months before price drops.",
    warn: "Under 2 months inventory: expect bidding wars. Over 6 months: negotiate hard on price and terms.",
  },
];

export default function Learn() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filtered = search.trim()
    ? GLOSSARY_TERMS.filter(
        (t) =>
          t.term.toLowerCase().includes(search.toLowerCase()) ||
          (t.fullName && t.fullName.toLowerCase().includes(search.toLowerCase())) ||
          t.def.toLowerCase().includes(search.toLowerCase()) ||
          (t.formula && t.formula.toLowerCase().includes(search.toLowerCase()))
      )
    : GLOSSARY_TERMS;

  const navLinks = [
    { href: "/analyze", label: "Tools" },
    { href: "/app", label: "Flip Analyzer" },
    { href: "/brrrr", label: "BRRRR" },
    { href: "/commercial", label: "Multifamily" },
  ];

  return (
    <div className="learn-page">
      <style>{CSS}</style>

      {/* ── Nav ── */}
      <nav className="learn-nav">
        <a href="/" className="learn-nav-logo">
          <span>Real</span> Deal
        </a>
        <div className="learn-nav-links">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="learn-nav-link"
            >
              {l.label}
            </a>
          ))}
          <a href="/learn" className="learn-nav-link active">
            Learn
          </a>
        </div>
      </nav>

      {/* ── Anchor bar ── */}
      <div className="learn-anchor-bar">
        <a className="anchor-pill" href="#strategies">Strategies</a>
        <a className="anchor-pill" href="#glossary">Glossary</a>
        <a className="anchor-pill" href="#rules">Quick Rules</a>
        <a className="anchor-pill" href="#redflags">Red Flags</a>
        <a className="anchor-pill" href="#timing">Market Timing</a>
      </div>

      {/* ── Body ── */}
      <div className="learn-body">

        {/* ── Page Header ── */}
        <div className="page-header" id="top">
          <div className="page-header-label">Investor Education Hub</div>
          <h1>The Real Estate Investor<br />Cheat Sheet</h1>
          <p>
            Everything you need to analyze deals, understand the math, and avoid costly mistakes —
            organized in one place for both new and experienced investors.
          </p>
        </div>

        {/* ══════════════════════════════════════════════
            SECTION 1: Strategy Overviews
        ══════════════════════════════════════════════ */}
        <section className="learn-section" id="strategies">
          <div className="section-header">
            <span className="section-number">01</span>
            <div>
              <div className="section-title">Strategy Overviews</div>
              <div className="section-sub">Three core real estate investing strategies — what they are, when to use them, and what drives returns</div>
            </div>
          </div>

          <div className="strategy-grid">

            {/* Fix & Flip */}
            <div className="strategy-card">
              <div className="strategy-card-accent" style={{ background: "var(--blue)" }} />
              <span className="strategy-icon">🏚️</span>
              <h3>Fix &amp; Flip</h3>
              <p className="strategy-desc">
                Buy a distressed property below market value, renovate it to maximize its appeal,
                then sell it for a profit. The entire lifecycle is typically 6–12 months from
                purchase to closing on the sale.
              </p>
              <div className="strategy-meta">
                <div className="strategy-meta-row">
                  <span className="strategy-meta-label">Best for</span>
                  <span className="strategy-meta-val blue">Active investors, hands-on operators, those building contractor relationships</span>
                </div>
                <div className="strategy-meta-row">
                  <span className="strategy-meta-label">Timeline</span>
                  <span className="strategy-meta-val">6–12 months per project</span>
                </div>
                <div className="strategy-meta-row">
                  <span className="strategy-meta-label">Key risks</span>
                  <span className="strategy-meta-val red">Renovation cost overruns, market timing, carrying cost creep</span>
                </div>
                <div className="strategy-meta-row">
                  <span className="strategy-meta-label">Key metrics</span>
                  <span className="strategy-meta-val">Profit margin, ROI, MAO, annualized CoC</span>
                </div>
              </div>
            </div>

            {/* BRRRR */}
            <div className="strategy-card">
              <div className="strategy-card-accent" style={{ background: "var(--green)" }} />
              <span className="strategy-icon">🔄</span>
              <h3>BRRRR</h3>
              <p className="strategy-desc">
                Buy, Rehab, Rent, Refinance, Repeat. Fix a distressed property, place a tenant,
                then do a cash-out refinance to pull your invested capital back out — recycling it
                into the next deal while keeping the rental.
              </p>
              <div className="strategy-meta">
                <div className="strategy-meta-row">
                  <span className="strategy-meta-label">Best for</span>
                  <span className="strategy-meta-val green">Investors building a rental portfolio without tying up capital</span>
                </div>
                <div className="strategy-meta-row">
                  <span className="strategy-meta-label">Timeline</span>
                  <span className="strategy-meta-val">6–18 months (rehab + seasoning + refi)</span>
                </div>
                <div className="strategy-meta-row">
                  <span className="strategy-meta-label">Key risks</span>
                  <span className="strategy-meta-val red">Appraisal comes in low, can't pull cash out; rising rates hurt refi</span>
                </div>
                <div className="strategy-meta-row">
                  <span className="strategy-meta-label">Key metrics</span>
                  <span className="strategy-meta-val">DSCR, cash recycled, LTV after refi, cash-on-cash</span>
                </div>
              </div>
            </div>

            {/* Multifamily / Rental */}
            <div className="strategy-card">
              <div className="strategy-card-accent" style={{ background: "var(--purple)" }} />
              <span className="strategy-icon">🏢</span>
              <h3>Multifamily / Rental</h3>
              <p className="strategy-desc">
                Buy income-producing residential property (2–100+ units) for long-term cash flow
                and appreciation. The asset is valued based on the income it generates, not just
                comparable sales — giving skilled operators the ability to manufacture value through
                rent increases and expense reduction.
              </p>
              <div className="strategy-meta">
                <div className="strategy-meta-row">
                  <span className="strategy-meta-label">Best for</span>
                  <span className="strategy-meta-val purple">Passive income seekers, wealth builders, those wanting appreciation + cash flow</span>
                </div>
                <div className="strategy-meta-row">
                  <span className="strategy-meta-label">Timeline</span>
                  <span className="strategy-meta-val">Long-term hold (5–20+ years) or value-add exit</span>
                </div>
                <div className="strategy-meta-row">
                  <span className="strategy-meta-label">Key risks</span>
                  <span className="strategy-meta-val red">Vacancy, tenant quality, rising OpEx, refi risk on balloon notes</span>
                </div>
                <div className="strategy-meta-row">
                  <span className="strategy-meta-label">Key metrics</span>
                  <span className="strategy-meta-val">Cap Rate, NOI, CoC, DSCR, GRM, 5-year IRR</span>
                </div>
              </div>
            </div>

          </div>

          <button className="section-cta" onClick={() => navigate("/app")}>
            Try the Flip Analyzer →
          </button>
          <button className="section-cta green" onClick={() => navigate("/brrrr")} style={{ marginLeft: 12 }}>
            Try the BRRRR Calculator →
          </button>
          <button className="section-cta purple" onClick={() => navigate("/commercial")} style={{ marginLeft: 12 }}>
            Try the Multifamily Analyzer →
          </button>
        </section>

        <div className="section-divider" />

        {/* ══════════════════════════════════════════════
            SECTION 2: Glossary
        ══════════════════════════════════════════════ */}
        <section className="learn-section" id="glossary">
          <div className="section-header">
            <span className="section-number">02</span>
            <div>
              <div className="section-title">Key Metrics Glossary</div>
              <div className="section-sub">Every term you'll encounter in real estate analysis — with definitions and formulas</div>
            </div>
          </div>

          <div className="search-bar-wrap">
            <span className="search-bar-icon">🔍</span>
            <input
              className="search-bar"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search terms, definitions, formulas…"
            />
          </div>

          {search.trim() && (
            <div className="search-count">
              {filtered.length === 0
                ? "No results found"
                : `${filtered.length} of ${GLOSSARY_TERMS.length} terms`}
            </div>
          )}

          <div className="glossary-grid">
            {filtered.length === 0 ? (
              <div className="no-results">
                No terms matched "{search}" — try a shorter keyword.
              </div>
            ) : (
              filtered.map((item) => (
                <div className="glossary-card" key={item.term}>
                  <div className="glossary-term">
                    {item.term}
                    {item.fullName && item.fullName !== item.term && (
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dim)", marginLeft: 8 }}>
                        — {item.fullName}
                      </span>
                    )}
                  </div>
                  <p className="glossary-def">{item.def}</p>
                  {item.formula && (
                    <div className="glossary-formula">{item.formula}</div>
                  )}
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 28 }}>
            <button className="section-cta" onClick={() => navigate("/app")}>
              Put These Metrics to Work →
            </button>
          </div>
        </section>

        <div className="section-divider" />

        {/* ══════════════════════════════════════════════
            SECTION 3: Quick Reference Rules
        ══════════════════════════════════════════════ */}
        <section className="learn-section" id="rules">
          <div className="section-header">
            <span className="section-number">03</span>
            <div>
              <div className="section-title">Quick Reference Rules</div>
              <div className="section-sub">Industry rules of thumb — useful for fast screening, not for final underwriting</div>
            </div>
          </div>

          <div className="rules-grid">
            {RULES.map((rule) => (
              <div className="rule-card" key={rule.name}>
                <span
                  className="rule-badge"
                  style={{ color: rule.badgeColor, background: rule.badgeBg, border: `1px solid ${rule.badgeColor}33` }}
                >
                  {rule.badge}
                </span>
                <div className="rule-name">{rule.name}</div>
                <div className="rule-formula">{rule.formula}</div>
                <p className="rule-desc">{rule.desc}</p>
              </div>
            ))}
          </div>

          <button className="section-cta" onClick={() => navigate("/app")}>
            Apply the 70% Rule to a Real Deal →
          </button>
        </section>

        <div className="section-divider" />

        {/* ══════════════════════════════════════════════
            SECTION 4: Red Flags
        ══════════════════════════════════════════════ */}
        <section className="learn-section" id="redflags">
          <div className="section-header">
            <span className="section-number">04</span>
            <div>
              <div className="section-title">Red Flags to Watch</div>
              <div className="section-sub">Warning signs that a deal may not survive contact with reality — know them before you close</div>
            </div>
          </div>

          <div className="redflags-list">
            {RED_FLAGS.map((flag, i) => (
              <div className="redflag-item" key={i}>
                <span className="redflag-icon">{flag.icon}</span>
                <div>
                  <div className="redflag-text">{flag.text}</div>
                  {flag.sub && <div className="redflag-sub">{flag.sub}</div>}
                </div>
              </div>
            ))}
          </div>

          <button className="section-cta amber" onClick={() => navigate("/app")}>
            Analyze a Deal for Red Flags →
          </button>
        </section>

        <div className="section-divider" />

        {/* ══════════════════════════════════════════════
            SECTION 5: Market Timing
        ══════════════════════════════════════════════ */}
        <section className="learn-section" id="timing">
          <div className="section-header">
            <span className="section-number">05</span>
            <div>
              <div className="section-title">Market Timing Signals</div>
              <div className="section-sub">How to read macroeconomic and local market indicators to time your deals smarter</div>
            </div>
          </div>

          <div className="timing-grid">
            {TIMING_SIGNALS.map((signal, i) => (
              <div className="timing-item" key={i}>
                <div className="timing-signal" style={{ background: signal.bg }}>
                  {signal.icon}
                </div>
                <div className="timing-content">
                  <h4>{signal.title}</h4>
                  <p>{signal.desc}</p>
                  {signal.warn && (
                    <div className="timing-warn">💡 {signal.warn}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button className="section-cta" onClick={() => navigate("/app")}>
            Run the Numbers on Your Next Deal →
          </button>
        </section>

      </div>

      {/* ── Back to top ── */}
      <button
        className={`back-to-top${showBackToTop ? " visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
      >
        ↑ Top
      </button>
    </div>
  );
}
