/**
 * MetricTip — hover-to-explain helper that drops next to any metric label.
 *
 * Replaces silent jargon with one-line plain-English explainers + the
 * benchmark for that metric. Keeps the calculator surfaces dense without
 * leaving new users lost.
 *
 * Usage:
 *   <span>DSCR <MetricTip metric="dscr" /></span>
 *   <span>Cap rate <MetricTip metric="capRate" city="calgary" /></span>
 *
 * Built-in explainers cover the canonical metrics. Pass `text` to override
 * with a custom explanation.
 */

import { useState } from "react";
import { getDscrThresholds, getCapRateBenchmark, getCoCThresholds, getIrrThresholds, getFlipMarginBenchmark } from "../lib/benchmarks";

function buildText(metric, ctx = {}) {
  switch (metric) {
    case "dscr": {
      const t = getDscrThresholds();
      return `Debt Service Coverage Ratio = annual NOI ÷ annual mortgage payment. Canadian lenders want ${t.competitive.toFixed(2)}+; below ${t.lenderFloor.toFixed(2)} fails underwriting.`;
    }
    case "capRate": {
      const b = getCapRateBenchmark(ctx.city, ctx.propertyType || "multifamily");
      return `Cap rate = NOI ÷ purchase price. Strips out financing. ${ctx.city && ctx.city !== "default" ? `${ctx.city.charAt(0).toUpperCase() + ctx.city.slice(1)} ${ctx.propertyType || "multi"} trades at ${(b.low * 100).toFixed(1)}-${(b.high * 100).toFixed(1)}%.` : `Canadian multi trades 3.5-6.5% depending on metro.`}`;
    }
    case "coc": {
      const t = getCoCThresholds(ctx.strategy || "rental");
      return `Cash-on-Cash = year-1 cash flow ÷ cash invested. What you earn on the money you actually put down. Target ${(t.target * 100).toFixed(0)}%+ for ${ctx.strategy || "rental"}.`;
    }
    case "irr": {
      const t = getIrrThresholds(ctx.strategy || "multifamily");
      return `Internal Rate of Return = annualized return over the full hold including exit. Bakes in cap compression + rent growth. Target ${(t.target * 100).toFixed(0)}%+ for ${ctx.strategy || "multifamily"}.`;
    }
    case "flipMargin": {
      const b = getFlipMarginBenchmark(ctx.city);
      return `Margin on ARV = net profit ÷ after-repair value. ${ctx.city && ctx.city !== "default" ? `${ctx.city.charAt(0).toUpperCase() + ctx.city.slice(1)} flips need ${(b.target * 100).toFixed(0)}%+ to clear the timeline + hold-cost risk.` : `Target 18%+ for a Canadian flip; below 12% is thin.`}`;
    }
    case "noi":
      return "Net Operating Income = (rent × occupancy) − operating expenses (property tax, insurance, maintenance, mgmt, utilities). Excludes mortgage and capex.";
    case "egi":
      return "Effective Gross Income = gross potential rent − vacancy loss + other income (parking, laundry, storage). What actually shows up.";
    case "ltv":
      return "Loan-to-Value = loan amount ÷ property value. Canadian portfolio lenders cap at 75% LTV on investment property refis. 80% needs CMHC insurance.";
    case "gds":
      return "Gross Debt Service ratio = housing costs ÷ gross income. Canadian banks cap at 39%. Includes mortgage P&I, property tax, heat, 50% of condo fees.";
    case "tds":
      return "Total Debt Service ratio = all debt ÷ gross income. Canadian banks cap at 44%. Adds car loans, lines of credit, other mortgages to GDS.";
    case "mao":
      return "Maximum Allowable Offer = ARV × 70% − repair costs. The 70% Rule's mechanical version. If you're paying more than MAO, you're betting on appreciation.";
    case "arv":
      return "After Repair Value = what the property will sell for after the rehab. Pull from active and recently-sold comps within 1 mile, similar bed/bath/sqft.";
    case "dscr_stress":
      return "Stress-tested DSCR = NOI ÷ debt service at the qualifying rate (OSFI B-20: contract rate + 2% OR 5.25%, whichever's higher). The number lenders actually underwrite to.";
    // ── Canadian tax terms ──────────────────────────────────────────────
    case "cca":
      return "Capital Cost Allowance = the Canadian equivalent of depreciation. Class 1 buildings depreciate at 4% declining balance. Reduces taxable rental income but triggers recapture on sale.";
    case "ccaRecapture":
      return "CCA Recapture = the tax you owe on past CCA claims when you sell. If you claimed $80K of CCA over 10 years and sell, that $80K is added back to taxable income at your marginal rate. CCA defers tax, doesn't eliminate it.";
    case "pal":
      return "Passive Activity Loss = rental losses you can't deduct against employment income. Carried forward to offset future rental profits or sale gains. Note: PAL rules are US-style; Canada's CRA treats rental losses as fully deductible against other income (with some restrictions for soft costs).";
    case "paperLoss":
      return "Paper Loss = the negative number on your tax return after CCA depreciation, even though cash flow is positive. Reduces taxable income. Deductible against other income in Canada (with restrictions); creates a Passive Activity Loss in the US.";
    case "capitalGains":
      return "Canadian capital gain on sale = (sale price − adjusted cost base − selling costs) × 50% inclusion rate. So a $200K gain adds $100K to taxable income, taxed at your marginal rate.";
    case "principalResidence":
      return "Principal Residence Exemption = capital gains are tax-free on the home you've lived in. One residence per family per year. If you flipped a property you lived in for 12 months, the gain may qualify — verify with your accountant.";
    case "adjustedCostBase":
      return "Adjusted Cost Base = original purchase price + closing costs + capital improvements (not repairs). The starting point for calculating capital gain on sale. Track receipts carefully.";
    case "costSeg":
      return "Cost Segregation = accelerating depreciation by classifying components (carpet, appliances, land improvements) into shorter-life CCA classes. US-style strategy; less impact in Canada due to lower depreciation rates and recapture rules.";
    // ── Rehab line-item explainers ──────────────────────────────────────
    case "contingency":
      return "Contingency = a 10-15% buffer on the entire rehab budget to absorb surprises (rotted joists, asbestos, hidden water damage, permit delays). Real-world Canadian rehabs come in 15-20% over budget more often than not — pad the number from day one.";
    case "permits":
      return "Permits = building permit fees + plan-review costs from the city. Calgary multifamily renovation permits run $1.5K-$5K depending on scope. Always add this — flips that skip permits get caught at sale during inspection.";
    case "rehabPerSqft":
      return "Cost per square foot = total rehab ÷ finished sqft. Canadian benchmark: $60-90/sqft for a cosmetic refresh, $90-130/sqft for a kitchen+bath gut, $150-200/sqft for a structural reno with new electrical/plumbing.";
    case "structuralReserve":
      return "Structural reserve = buffer for foundation, roof, framing surprises. Pre-1960 buildings should reserve 5-10% of purchase price; pre-1980 should reserve 3-5%. If the inspection report doesn't mention these systems, budget anyway.";
    case "kitchenBudget":
      return "Mid-range Canadian kitchen reno: $18K-$32K (cabinets + counters + appliances + plumbing + electrical + paint). Builder-grade IKEA-style runs $12K-$18K. High-end with quartz + integrated appliances: $40K-$60K+. Per-sqft varies wildly with finishes tier.";
    case "bathroomBudget":
      return "Standard Canadian bathroom reno: $9K-$15K (vanity + toilet + tile + paint + ventilation). Master ensuite with double vanity + standalone tub: $18K-$28K. Hidden costs: re-routing drains, GFCI updates, ventilation to exterior — always allow $1-2K extra per bathroom.";
    case "rehabHoldingCost":
      return "Monthly holding cost during rehab = mortgage P&I + property tax + insurance + utilities + landscaping. On a $500K Canadian property you should budget $3-4K/month. Critical: holding costs eat margin fast — every extra week of rehab costs ~$800-1,200.";
    default:
      return null;
  }
}

export default function MetricTip({ metric, text, city, propertyType, strategy }) {
  const [open, setOpen] = useState(false);
  const explanation = text || buildText(metric, { city, propertyType, strategy });
  if (!explanation) return null;

  return (
    <span style={{position:"relative",display:"inline-block",marginLeft:5,verticalAlign:"middle",lineHeight:1}}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => { e.preventDefault(); setOpen(v => !v); }}
        aria-label={`Explain ${metric}`}
        style={{
          width:14,height:14,borderRadius:"50%",
          background:"rgba(148,163,184,0.12)",
          border:"1px solid rgba(148,163,184,0.35)",
          color:"#94a3b8",
          fontSize:9.5,fontWeight:800,
          fontFamily:"'Geist Mono',ui-monospace,monospace",
          cursor:"help",padding:0,
          display:"inline-flex",alignItems:"center",justifyContent:"center",
          transition:"all 0.15s",
        }}
        onMouseOver={e => { e.currentTarget.style.background = "rgba(212,175,55,0.12)"; e.currentTarget.style.borderColor = "#d4af37"; e.currentTarget.style.color = "#d4af37"; }}
        onMouseOut={e => { e.currentTarget.style.background = "rgba(148,163,184,0.12)"; e.currentTarget.style.borderColor = "rgba(148,163,184,0.35)"; e.currentTarget.style.color = "#94a3b8"; }}
      >?</button>
      {open && (
        <span style={{
          position:"absolute",left:"50%",top:"calc(100% + 8px)",transform:"translateX(-50%)",
          minWidth:220,maxWidth:300,zIndex:9999,
          background:"rgba(10,17,40,0.96)",
          color:"#f0f0f0",
          border:"1px solid rgba(212,175,55,0.5)",
          borderRadius:5,
          padding:"10px 12px",
          fontSize:11.5,lineHeight:1.55,
          fontFamily:"'Geist',sans-serif",fontWeight:400,
          letterSpacing:0,textTransform:"none",textAlign:"left",
          boxShadow:"0 12px 28px rgba(0,0,0,0.45)",
          pointerEvents:"none",
        }}>
          <span style={{
            position:"absolute",left:"50%",top:-6,transform:"translateX(-50%) rotate(45deg)",
            width:10,height:10,background:"rgba(10,17,40,0.96)",
            border:"1px solid rgba(212,175,55,0.5)",
            borderRight:"none",borderBottom:"none",
          }} />
          {explanation}
        </span>
      )}
    </span>
  );
}
