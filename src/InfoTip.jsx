import { useState } from "react";

// ─── All investing metric definitions ────────────────────────────────────────
export const TIPS = {
  arv: {
    term: "After Repair Value (ARV)",
    def: "The estimated market value of the property after all renovations are complete. This is your target exit price for a flip, or your refinance baseline for a BRRRR.",
    good: "Calculate using recent sold comps of similar fully-updated homes within 0.5 miles.",
    tip: "70% Rule: Max Offer = (ARV × 0.70) − Repair Costs",
  },
  purchasePrice: {
    term: "Purchase Price",
    def: "What you pay to acquire the property, including any seller concessions. This is typically your biggest lever — buying right is everything.",
    good: "For flips: should be below 70% of (ARV − repairs). For rentals: should support cash flow at market rent.",
    tip: "Every $10k less you pay is $10k more profit. Negotiate hard.",
  },
  repairCosts: {
    term: "Repair / Rehab Costs",
    def: "Total cost to renovate the property to its target condition. Includes materials, labour, permits, and a contingency buffer.",
    good: "Add 15-20% contingency to your contractor estimate. Surprises happen in every rehab.",
    tip: "Rule of thumb: Cosmetic = $10-20/sqft · Light reno = $25-45/sqft · Full gut = $80-140/sqft",
  },
  holdingCosts: {
    term: "Holding Costs",
    def: "All expenses incurred while you own the property before selling — mortgage interest, taxes, insurance, utilities, and property management.",
    good: "Typically $800–2,000/month depending on the property and market. Every extra month costs you.",
    tip: "Speed is profit on a flip. A 4-month reno beats a 7-month reno even if the work is the same.",
  },
  mao: {
    term: "Maximum Allowable Offer (MAO)",
    def: "The highest price you can pay and still hit your profit target. The flip investor's most important number.",
    good: "Standard formula: MAO = (ARV × 0.70) − Repair Costs",
    tip: "If the seller won't go below MAO, walk away. The deal makes money at purchase — not at sale.",
  },
  netProfit: {
    term: "Net Profit",
    def: "Your take-home after purchase, repairs, holding costs, financing, selling costs, and all other expenses. The bottom line.",
    good: "Most flippers target $25,000+ minimum, or 15%+ of ARV as a margin of safety.",
    tip: "Thin margins get wiped out by surprises. Target 15-20%+ of ARV as a buffer.",
  },
  roi: {
    term: "Return on Investment (ROI)",
    def: "Net profit divided by total cash invested, expressed as a percentage. Measures how efficiently your capital worked.",
    good: "Target 15%+ annualized for flip deals. Compare to stock market ~10%/yr to justify the effort.",
    tip: "Annualize it: a 20% ROI in 6 months = 40% annualized — much better than it looks.",
  },
  profitMargin: {
    term: "Profit Margin",
    def: "Net profit as a percentage of ARV (sale price). Measures how much of each sale dollar you keep.",
    good: "Target 15%+ margin. Below 10% is risky — one cost overrun wipes the deal.",
    tip: "Margin is your safety net. The bigger it is, the more mistakes you can survive.",
  },
  dealScore: {
    term: "Deal Score / Grade",
    def: "A composite score based on profit margin, ROI, and deal safety metrics. A quick gut-check for deal quality.",
    good: "A+ or A = strong deal. B = acceptable. C or below = needs renegotiation or pass.",
    tip: "Score reflects risk-adjusted returns. A great market doesn't make a bad deal good.",
  },
  seventyRule: {
    term: "The 70% Rule",
    def: "A quick screen for flip deals: don't pay more than 70% of ARV minus repair costs. Leaves room for all costs and profit.",
    good: "MAX OFFER = (ARV × 0.70) − Repairs. This is the most widely used rule in wholesaling and flipping.",
    tip: "In hot markets some investors use 75-80%, but that compresses your margin significantly.",
  },
  dscr: {
    term: "Debt Service Coverage Ratio (DSCR)",
    def: "Net Operating Income divided by annual debt service (mortgage payments). Measures if the property pays for itself.",
    good: "1.0 = break even. Most lenders require 1.20-1.25+. Aim for 1.30+ for safety.",
    tip: "Below 1.0 means you pay out of pocket every month. Red flag for any rental.",
  },
  cashOnCash: {
    term: "Cash-on-Cash Return (CoC)",
    def: "Annual pre-tax cash flow divided by total cash invested. The true return on YOUR money, ignoring leverage effects.",
    good: "Target 8-12%+ for rentals. Above 12% is strong. Below 6% is weak vs alternatives.",
    tip: "CoC ignores appreciation and equity paydown — add those for total return picture.",
  },
  noi: {
    term: "Net Operating Income (NOI)",
    def: "Gross rental income minus all operating expenses (vacany, taxes, insurance, maintenance, management). Does NOT include mortgage.",
    good: "Higher is better. NOI is what lenders use to size commercial loans. It's the property's true earning power.",
    tip: "NOI ÷ Purchase Price = Cap Rate. NOI ÷ Annual Rent = Expense Ratio check.",
  },
  capRate: {
    term: "Capitalization Rate (Cap Rate)",
    def: "NOI divided by property value, expressed as a percentage. Measures yield independent of financing.",
    good: "4-5% = safe low-yield market. 6-8% = solid. 9%+ = high yield (higher risk area).",
    tip: "Cap rate is a market metric — compare to local norms. A 6% cap in Dallas ≠ a 6% cap in Detroit.",
  },
  grm: {
    term: "Gross Rent Multiplier (GRM)",
    def: "Purchase price divided by annual gross rent. Quick valuation screen — how many years of rent to pay off the building.",
    good: "Lower is better. Under 10 = strong cash flow. 10-15 = moderate. Over 20 = likely appreciation play.",
    tip: "GRM ignores expenses — two properties with the same GRM can have very different NOIs.",
  },
  vacancy: {
    term: "Vacancy Rate",
    def: "The percentage of time the unit(s) are expected to be unoccupied. A realistic assumption — no property is 100% occupied forever.",
    good: "Use 5-8% for stable markets, 8-10% for transitional areas, 10%+ for high-turnover markets.",
    tip: "Most beginners underestimate vacancy. Always model at least 5% even in strong markets.",
  },
  cashFlow: {
    term: "Monthly Cash Flow",
    def: "Rent collected minus ALL expenses including mortgage, taxes, insurance, vacancy, maintenance, and management. What hits your account.",
    good: "Target $100-200+ per door minimum. $300+ is solid. Negative cash flow = you subsidize tenants.",
    tip: "Use the 50% Rule: assume 50% of gross rent goes to expenses (not mortgage). What's left covers debt service.",
  },
  cashLeftIn: {
    term: "Cash Left In Deal",
    def: "How much of your original investment remains in the property after the refinance. Core BRRRR metric.",
    good: "BRRRR goal is $0 left in — all cash recycled. Under $10k is a strong BRRRR. Over $30k means capital is tied up.",
    tip: "Cash left in ÷ Original investment = your capital efficiency. Lower = better for BRRRR.",
  },
  cashRecycled: {
    term: "Cash Recycled %",
    def: "Percentage of your original cash you pulled back out via the refinance. 100% = perfect BRRRR — all money returned.",
    good: "85%+ is a solid BRRRR. 100% = full recycle. Above 100% = you pulled MORE out than you put in.",
    tip: "Recycled cash goes into your next deal. This is how investors build large portfolios with limited capital.",
  },
  refinanceLTV: {
    term: "Refinance LTV (Loan-to-Value)",
    def: "The percentage of the property's ARV that a lender will loan on the cash-out refinance.",
    good: "Most DSCR/conventional lenders go 70-75% LTV on investment properties. 80% requires strong credit.",
    tip: "Higher LTV = more cash out, but higher monthly payment. Model at 70% to be conservative.",
  },
  ltv: {
    term: "Loan-to-Value (LTV)",
    def: "The loan balance divided by the property value. Shows how leveraged you are.",
    good: "Under 75% is safe for rentals. Under 80% avoids PMI on conventional loans. Under 65% = conservative.",
    tip: "High LTV = more leverage = more amplified gains AND losses. Know your risk.",
  },
  depreciation: {
    term: "Depreciation",
    def: "The IRS allows you to deduct 1/27.5th of your building's value each year as a paper loss — even if the property is gaining in value.",
    good: "On a $300k building: $300k ÷ 27.5 = $10,909/yr deduction. At 32% tax bracket = $3,491/yr tax savings.",
    tip: "Depreciation is one of the biggest tax advantages of real estate over stocks. It shelters other income.",
  },
  gpr: {
    term: "Gross Potential Rent (GPR)",
    def: "The maximum rent the property could generate if 100% occupied at full market rents. The ceiling, before vacancy and concessions.",
    good: "Use market comps to validate. Don't use wishful numbers — use what similar units actually rent for.",
    tip: "GPR × (1 − Vacancy Rate) = Effective Gross Income (EGI). That's your realistic income.",
  },
  egi: {
    term: "Effective Gross Income (EGI)",
    def: "GPR minus vacancy and credit loss, plus other income (laundry, parking, etc). Your realistic expected annual income.",
    good: "This is the number lenders use, not GPR. Model vacancy conservatively.",
    tip: "EGI − Operating Expenses = NOI. The most important income number for any rental.",
  },
  operatingExpenses: {
    term: "Operating Expenses",
    def: "All costs of running the property excluding debt service: taxes, insurance, maintenance, management, utilities, landscaping, etc.",
    good: "50% Rule: assume operating expenses ≈ 50% of gross rent for a quick screen.",
    tip: "New investors almost always underestimate operating expenses. Use 40-50% for SFH, 35-45% for multifamily.",
  },
  annualDebtService: {
    term: "Annual Debt Service (ADS)",
    def: "Total principal and interest payments made on the mortgage in one year. The fixed cost your NOI must cover.",
    good: "NOI ÷ ADS = DSCR. You need DSCR above 1.25 for most lenders and true safety.",
    tip: "Higher interest rates raise ADS, which lowers DSCR and cash flow. Always model rate sensitivity.",
  },
  equityCreated: {
    term: "Equity Created",
    def: "The difference between ARV and your all-in cost (purchase + rehab). Value you manufactured through the renovation.",
    good: "This is the engine of the BRRRR — you force appreciation, then pull it out via refi.",
    tip: "Equity created = forced appreciation. You controlled this outcome, unlike market appreciation.",
  },
};

// ─── Tooltip component ────────────────────────────────────────────────────────
export default function InfoTip({ id, style = {} }) {
  const [show, setShow] = useState(false);
  const d = TIPS[id];
  if (!d) return null;

  return (
    <span style={{ position: "relative", display: "inline-block", verticalAlign: "middle", marginLeft: 5, ...style }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(s => !s)}
        style={{
          cursor: "help", color: "var(--sub)", fontSize: 10, fontWeight: 800,
          background: "rgba(15,23,42,0.06)", borderRadius: "50%",
          width: 15, height: 15, display: "inline-flex", alignItems: "center", justifyContent: "center",
          border: "1px solid rgba(255,255,255,0.12)", userSelect: "none", flexShrink: 0,
        }}
      >?</span>

      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          background: "#111827", border: "1px solid rgba(59,158,255,0.25)", borderRadius: 10,
          padding: "13px 15px", width: 270, zIndex: 9999,
          boxShadow: "0 12px 40px rgba(0,0,0,0.7)", pointerEvents: "none",
        }}>
          {/* Arrow */}
          <div style={{
            position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
            width: 10, height: 10, background: "#111827",
            border: "1px solid rgba(59,158,255,0.25)", borderTop: "none", borderLeft: "none",
            transform: "translateX(-50%) rotate(45deg)",
          }} />

          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", marginBottom: 7 }}>{d.term}</div>
          <div style={{ fontSize: 11.5, color: "var(--sub)", lineHeight: 1.55, marginBottom: 8 }}>{d.def}</div>

          {d.good && (
            <div style={{
              fontSize: 11, color: "#5aadff", lineHeight: 1.45,
              padding: "6px 9px", background: "rgba(59,158,255,0.08)",
              borderRadius: 7, marginBottom: d.tip ? 6 : 0,
            }}>
              📌 {d.good}
            </div>
          )}
          {d.tip && (
            <div style={{
              fontSize: 11, color: "var(--amber)", lineHeight: 1.45,
              padding: "5px 9px", background: "rgba(240,160,48,0.08)", borderRadius: 7,
            }}>
              💡 {d.tip}
            </div>
          )}
        </div>
      )}
    </span>
  );
}
