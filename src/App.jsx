import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { useAuth } from "./AuthContext";
import { exportFlipPDF } from "./pdfExport";
import { useIntercom } from "./IntercomProvider";
import TopNav from "./components/TopNav";

// ─── Utilities ──────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = (n) => isNaN(n) || !isFinite(n) ? "—" : `${(n * 100).toFixed(2)}%`;
const num = (v) => parseFloat(v) || 0;

// ─── Defaults ───────────────────────────────────────────────────────────────
const DEFAULTS = {
  address: "123 Main St", city: "Los Angeles, CA 90001", sqft: 2000, units: 1, occupied: "No",
  evaluator: "", description: "", notes: "",
  arv: 310000, asIsValue: 180000, repairCosts: 55000, purchasePrice: 180000, holdMonths: 6, miscPropertyCosts: 0,
  loan1Amount: 200000, loan1Points: 2, loan1Rate: 8,
  loan2Amount: 0, loan2Points: 0, loan2Rate: 0,
  loanMiscAmount: 0, loanMiscPoints: 0, loanMiscRate: 0, miscFinancingCosts: 0,
  buyEscrowFees: 900, buyTitlePct: 0.5, buyMiscCosts: 0,
  propTaxAnnual: 4800, hoaMonthly: 0, insuranceAnnual: 1800,
  utilGas: 75, utilWater: 75, utilElec: 50, utilOther: 0, miscHoldingMonthly: 0,
  sellEscrowFees: 900, sellRecordingFees: 500, realtorPct: 5, realtorTiered: false, realtorTier1Pct: 7, realtorTier1Cap: 100000, realtorTier2Pct: 3, transferPct: 0.12,
  homeWarranty: 500, stagingCosts: 2500, marketingCosts: 500, miscSellingCosts: 0,
  myCash: 40000,
};

// ─── Calculations ────────────────────────────────────────────────────────────
function calcAll(v) {
  const loan1Interest = num(v.loan1Amount) * (num(v.loan1Rate) / 100) / 12 * num(v.holdMonths);
  const loan1PointsAmt = num(v.loan1Points) / 100 * num(v.loan1Amount);
  const loan2Interest = num(v.loan2Amount) * (num(v.loan2Rate) / 100) / 12 * num(v.holdMonths);
  const loan2PointsAmt = num(v.loan2Points) / 100 * num(v.loan2Amount);
  const loanMiscInterest = num(v.loanMiscAmount) * (num(v.loanMiscRate) / 100) / 12 * num(v.holdMonths);
  const loanMiscPointsAmt = num(v.loanMiscPoints) / 100 * num(v.loanMiscAmount);
  const totalFinancing = loan1PointsAmt + loan1Interest + loan2PointsAmt + loan2Interest + loanMiscPointsAmt + loanMiscInterest + num(v.miscFinancingCosts);
  const buyTitle = 500 + (num(v.buyTitlePct) / 100) * num(v.repairCosts);
  const totalBuying = num(v.buyEscrowFees) + buyTitle + num(v.buyMiscCosts);
  const propTaxMonthly = num(v.propTaxAnnual) / 12;
  const insuranceMonthly = num(v.insuranceAnnual) / 12;
  const totalUtilMonthly = num(v.utilGas) + num(v.utilWater) + num(v.utilElec) + num(v.utilOther);
  const totalMonthlyHolding = propTaxMonthly + num(v.hoaMonthly) + insuranceMonthly + totalUtilMonthly + num(v.miscHoldingMonthly);
  const totalHolding = totalMonthlyHolding * num(v.holdMonths);
  // Tiered realtor commission calculation
  const realtorFees = (() => {
    const salePrice = num(v.arv);
    if (v.realtorTiered) {
      const tier1Cap = num(v.realtorTier1Cap) || 100000;
      const tier1Pct = num(v.realtorTier1Pct) / 100;
      const tier2Pct = num(v.realtorTier2Pct) / 100;
      if (salePrice <= tier1Cap) return salePrice * tier1Pct;
      return (tier1Cap * tier1Pct) + ((salePrice - tier1Cap) * tier2Pct);
    }
    return (num(v.realtorPct) / 100) * salePrice;
  })();
  const transferFees = (num(v.transferPct) / 100) * num(v.arv);
  const totalSelling = num(v.sellEscrowFees) + num(v.sellRecordingFees) + realtorFees + transferFees + num(v.homeWarranty) + num(v.stagingCosts) + num(v.marketingCosts) + num(v.miscSellingCosts);
  const totalCosts = num(v.purchasePrice) + num(v.repairCosts) + totalFinancing + totalHolding + totalBuying + totalSelling + num(v.miscPropertyCosts);
  const netProfit = num(v.arv) - totalCosts;
  const roiTotal = totalCosts > 0 ? netProfit / totalCosts : 0;
  const roiPurchaseRehab = (num(v.purchasePrice) + num(v.repairCosts)) > 0 ? netProfit / (num(v.purchasePrice) + num(v.repairCosts)) : 0;
  const costPerSqft = num(v.sqft) > 0 ? (num(v.purchasePrice) + num(v.repairCosts)) / num(v.sqft) : 0;
  const annualizedCoC = (num(v.myCash) > 0 && num(v.holdMonths) > 0) ? (netProfit / num(v.myCash)) * (12 / num(v.holdMonths)) : 0;
  const annualizedTotal = num(v.holdMonths) > 0 ? roiTotal * (12 / num(v.holdMonths)) : 0;
  const carryingSelling = totalHolding + totalSelling;
  const closingMAO = totalBuying + totalFinancing;
  const targetProfit = (num(v.purchasePrice) + num(v.repairCosts) + closingMAO + carryingSelling) * 0.10;
  const mao = num(v.arv) - num(v.repairCosts) - closingMAO - carryingSelling - targetProfit;
  const profitMargin = num(v.arv) > 0 ? netProfit / num(v.arv) : 0;

  // Deal Health Score (A–F)
  let score = 0;
  if (roiTotal > 0.15) score += 30; else if (roiTotal > 0.10) score += 20; else if (roiTotal > 0.05) score += 10;
  if (profitMargin > 0.20) score += 25; else if (profitMargin > 0.15) score += 18; else if (profitMargin > 0.08) score += 10;
  if (num(v.purchasePrice) <= mao) score += 25; else if (num(v.purchasePrice) <= mao * 1.05) score += 12;
  if (annualizedCoC > 0.20) score += 20; else if (annualizedCoC > 0.12) score += 14; else if (annualizedCoC > 0.06) score += 8;
  const grade = score >= 85 ? "A" : score >= 68 ? "B" : score >= 50 ? "C" : score >= 30 ? "D" : "F";
  const gradeColor = score >= 85 ? "var(--green)" : score >= 68 ? "var(--blue)" : score >= 50 ? "var(--amber)" : score >= 30 ? "var(--amber)" : "var(--red)";
  const gradeBg = score >= 85 ? "#f0fdf4" : score >= 68 ? "#f0fdfa" : score >= 50 ? "#fffbeb" : score >= 30 ? "#fff7ed" : "#fef2f2";

  return { loan1Interest, loan1PointsAmt, loan2Interest, loan2PointsAmt, loanMiscInterest, loanMiscPointsAmt, totalFinancing, buyTitle, totalBuying, propTaxMonthly, insuranceMonthly, totalUtilMonthly, totalMonthlyHolding, totalHolding, realtorFees, transferFees, totalSelling, totalCosts, netProfit, roiTotal, roiPurchaseRehab, costPerSqft, annualizedCoC, annualizedTotal, mao, targetProfit, closingMAO, carryingSelling, profitMargin, score, grade, gradeColor, gradeBg };
}

// ─── Definitions Data ────────────────────────────────────────────────────────
const DEFINITIONS = [
  { section: "Property Values", items: [
    { term: "After Repair Value (ARV)", def: "The estimated market value of the property after all repairs and renovations are completed. Also known as Fair Market Value (FMV). This is your expected sale price and the foundation of every other calculation." },
    { term: "Current 'As Is' Value", def: "The value of the property in its current condition, without any repairs. Useful for understanding the value-add gap between purchase state and post-rehab state." },
    { term: "Estimated Repair Costs", def: "Total dollar amount for all repairs, renovations, and improvements needed to bring the property to ARV condition. Should come from a detailed construction cost estimate." },
    { term: "Purchase Price", def: "The agreed-upon price you will pay to acquire the property. Used in ROI, MAO, and profit calculations." },
    { term: "Hold Time (Months)", def: "The number of months you expect to own the property from purchase date to close of escrow on the sale. Drives all time-based costs like holding and interest." },
    { term: "Miscellaneous Property Costs", def: "Any additional property-related costs not captured in other categories. Use this as a catch-all for unique deal expenses." },
  ]},
  { section: "Financing Costs", items: [
    { term: "Mortgage / Lien Amount", def: "The dollar amount borrowed from a lender (hard money, private, or conventional) to fund the purchase and/or rehab. You can enter up to three separate loan positions." },
    { term: "Mortgage Points", def: "Upfront fees charged by the lender as a percentage of the loan amount. 1 point = 1% of the loan. For example, 2 points on a $200,000 loan = $4,000 in fees paid at closing." },
    { term: "Annual Interest Rate", def: "The yearly interest rate on the loan. The calculator converts this to a monthly rate and multiplies by your hold time to get total interest paid." },
    { term: "Miscellaneous Financing Costs", def: "Any other lender fees not captured above — origination fees, underwriting, processing, wire fees, etc." },
  ]},
  { section: "Buying Transaction Costs", items: [
    { term: "Escrow / Attorney Fees (Buy)", def: "Fees paid to the escrow company or closing attorney to facilitate the purchase transaction. These vary by state — attorney states (e.g. NY, FL) use attorneys; escrow states (e.g. CA, AZ) use escrow companies." },
    { term: "Title Insurance / Title Search", def: "A policy that protects against title defects or ownership disputes. Calculated as a base fee ($500) plus a percentage of repair costs. Research your local underwriter rates for accuracy." },
    { term: "Miscellaneous Buying Costs", def: "Any other costs associated with buying the property — inspections, appraisals, environmental reports, HOA transfer fees, etc." },
  ]},
  { section: "Holding Costs", items: [
    { term: "Property Taxes", def: "Annual property taxes as assessed by the county tax assessor. Entered annually and divided by 12 to get the monthly amount, then multiplied by hold months." },
    { term: "HOA / Condo Fees", def: "Monthly fees charged by a Homeowner's Association. If fees are quarterly, divide by 3 to get the monthly equivalent." },
    { term: "Insurance Costs", def: "Vacant property insurance premium. Vacant properties typically cost more to insure than occupied ones. Enter the annual premium — it will be divided by 12 for monthly cost." },
    { term: "Utility Costs", def: "Combined monthly costs for gas, water, electricity, and other utilities. These are ongoing costs during the rehab and hold period before sale." },
    { term: "Total Monthly Holding Costs", def: "The sum of all monthly holding expenses. Multiplied by hold time to get total holding costs for the project." },
  ]},
  { section: "Selling Transaction Costs", items: [
    { term: "Escrow / Attorney Fees (Sell)", def: "Fees paid to the escrow company or closing attorney at the time of sale. Similar to buy-side fees but for the selling transaction." },
    { term: "Recording Fees", def: "County recorder fees for officially documenting the transfer of ownership. Typically a flat fee found on the HUD-1 settlement statement." },
    { term: "Realtor Commission", def: "Total commission paid to real estate agents involved in the sale. Typically 5–6% covering both the listing agent and buyer's agent. Calculated as a % of ARV." },
    { term: "Transfer / Conveyance Fees", def: "County or municipal fees for transferring land ownership. Highly variable by location — research your specific county rate as this can significantly impact profit." },
    { term: "Home Warranty", def: "A service contract protecting mechanical systems and appliances for the buyer for a set period. Often offered by sellers to attract buyers and reduce negotiation friction." },
    { term: "Staging Costs", def: "Cost to furnish and decorate the property to maximize its visual appeal for buyers. Staged homes typically sell faster and for higher prices." },
    { term: "Marketing Costs", def: "Costs for advertising the property including photography, virtual tours, print materials, online promotion, and any other marketing expenses." },
  ]},
  { section: "Returns & Analysis", items: [
    { term: "Net Profit", def: "The difference between the sale price (ARV) and all costs (purchase, repair, financing, holding, buying costs, selling costs). This is your bottom-line profit before income taxes." },
    { term: "Maximum Allowable Offer (MAO)", def: "The maximum price you can offer to buy the property and still achieve your target profit (default: 10%). Formula: ARV − Repairs − Closing Costs − Carrying/Selling Costs − Target Profit. Never offer above MAO unless you have a compelling reason." },
    { term: "Total Costs ROI", def: "Return on Investment based on total project costs. Formula: Net Profit ÷ Total Investment × 100. Measures efficiency of every dollar deployed in the project." },
    { term: "Purchase + Rehab ROI", def: "ROI calculated using only purchase price plus repair costs — ignoring financing, holding, and transaction costs. Useful for quick deal screening before detailed analysis." },
    { term: "Cash-on-Cash Return (CoC)", def: "Measures the return on your actual out-of-pocket cash. Formula: Net Profit ÷ My Cash Invested. Annualized by multiplying by (12 ÷ Hold Months). A strong flip typically targets 20%+ annualized CoC." },
    { term: "My Committed Capital", def: "The actual cash you personally invest in the deal — your down payment, cash for repairs not covered by loans, and any other out-of-pocket expenses. Used to calculate your personal cash-on-cash return." },
    { term: "Cost Per Square Foot", def: "Total purchase and rehab costs divided by total square footage. A useful market benchmark to compare your all-in basis against comparable sales on a per-sqft basis." },
  ]},
];

// ─── Tooltip Component ───────────────────────────────────────────────────────
function Tooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 15, height: 15, borderRadius: "50%", background: "rgba(255,255,255,0.08)", color: "var(--sub)", fontSize: 9, fontWeight: 800, cursor: "help", flexShrink: 0, marginLeft: 5 }}
      >?</span>
      {show && (
        <span style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#0d1119", color: "rgba(255,255,255,0.08)", fontSize: 11, padding: "8px 12px", borderRadius: 8, width: 220, lineHeight: 1.55, zIndex: 9999, pointerEvents: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.3)", "nowrap": "normal" }}>
          {text}
          <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1e293b" }} />
        </span>
      )}
    </span>
  );
}

// ─── Field Component ─────────────────────────────────────────────────────────
function Field({ label, value, onChange, prefix, suffix, type = "number", hint, tooltip, span }) {
  const iStyle = {
    width: "100%", background: "#0d1119", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
    padding: `9px ${suffix ? "36px" : "11px"} 9px ${prefix ? "24px" : "11px"}`,
    fontSize: 13, color: "var(--text)", fontFamily: "'Fira Code', monospace", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: span ? `span ${span}` : undefined }}>
      {label && (
        <label style={{ fontSize: 11, color: "var(--sub)", fontWeight: 600, letterSpacing: 0.3, display: "flex", alignItems: "center" }}>
          {label}{tooltip && <Tooltip text={tooltip} />}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--sub)", fontSize: 12, fontWeight: 600, pointerEvents: "none", fontFamily: "'Fira Code', monospace" }}>{prefix}</span>}
        {type === "select" ? (
          <select value={value} onChange={e => onChange(e.target.value)} style={iStyle}>
            <option>Yes</option><option>No</option>
          </select>
        ) : type === "textarea" ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
            style={{ ...iStyle, padding: "9px 11px", resize: "vertical", fontFamily: "inherit", fontSize: 13 }} />
        ) : (
          <input
            type={type === "text" ? "text" : "number"} value={value}
            onChange={e => onChange(e.target.value)} style={iStyle}
            onFocus={e => { e.target.style.borderColor = "var(--blue)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,158,255,0.1)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
          />
        )}
        {suffix && <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "var(--sub)", fontSize: 11, pointerEvents: "none", fontFamily: "'Fira Code', monospace" }}>{suffix}</span>}
      </div>
      {hint && <span style={{ fontSize: 10.5, color: "var(--blue)", fontWeight: 500 }}>{hint}</span>}
    </div>
  );
}

const Grid = ({ cols = 2, children, gap = "12px 16px" }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>{children}</div>
);

// ─── Section Card ─────────────────────────────────────────────────────────────
function Card({ step, title, subtitle, accent = "var(--blue)", children }) {
  return (
    <div style={{ background: "#0d1119", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: 24 }}>
      <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 12, background: "#0d1119" }}>
        {step && (
          <span style={{ background: accent, color: "#fff", borderRadius: 6, padding: "3px 9px", fontSize: 10, fontWeight: 800, letterSpacing: 0.8, "nowrap": "nowrap" }}>
            STEP {step}
          </span>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0d1119", letterSpacing: -0.2 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ padding: "22px 22px" }}>{children}</div>
    </div>
  );
}

// ─── Cost Subtotal Bar ────────────────────────────────────────────────────────
function SubtotalBar({ label, value, accent = "var(--blue)" }) {
  return (
    <div style={{ marginTop: 14, background: "rgba(255,255,255,0.03)", border: `1px solid ${accent}22`, borderLeft: `3px solid ${accent}`, borderRadius: "0 8px 8px 0", padding: "9px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--sub)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: accent, fontFamily: "'Fira Code', monospace" }}>{value}</span>
    </div>
  );
}

// ─── Summary Row ──────────────────────────────────────────────────────────────
function SRow({ label, value, bold, green, red, indent, divider, sub }) {
  return (
    <>
      {divider && <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "8px 0" }} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", paddingLeft: indent ? 16 : 0 }}>
        <span style={{ fontSize: 12.5, color: indent ? "var(--sub)" : "var(--sub)", fontWeight: bold ? 700 : 400, fontStyle: sub ? "italic" : "normal" }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: bold ? 800 : 500, color: green ? "var(--green)" : red ? "var(--red)" : "var(--text)", fontFamily: "'Fira Code', monospace" }}>{value}</span>
      </div>
    </>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, accent, tooltip }) {
  return (
    <div style={{ background: "#0d1119", border: "1px solid rgba(255,255,255,0.08)", borderTop: `3px solid ${accent}`, borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 10, color: "var(--sub)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 7, display: "flex", alignItems: "center" }}>
        {label}{tooltip && <Tooltip text={tooltip} />}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", fontFamily: "'Fira Code', monospace", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: "var(--sub)", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function FlipCalc() {
  const { user, signOut, getAccessToken } = useAuth();
  const { trackEvent } = useIntercom();
  const [v, setV] = useState(DEFAULTS);
  const [tab, setTab] = useState("inputs");
  const [defSearch, setDefSearch] = useState("");
  const [country, setCountry] = useState("US");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerCompany, setBuyerCompany] = useState("Real Deal Investments");

  // ── AI Deal Analyst state ─────────────────────────────────────────────────
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult,  setAiResult]  = useState(null);
  const [aiOpen,    setAiOpen]    = useState(false);

  async function runAiAnalysis() {
    const cc = calcAll(v);
    setAiLoading(true);
    setAiOpen(true);
    setAiResult(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/ai-analyze", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          address:       v.address,
          city:          v.city,
          strategy:      "Fix & Flip",
          purchasePrice: num(v.purchasePrice),
          arv:           num(v.arv),
          repairCosts:   num(v.repairCosts),
          holdMonths:    num(v.holdMonths),
          myCash:        num(v.myCash),
          netProfit:     cc.netProfit,
          roiTotal:      cc.roiTotal,
          profitMargin:  cc.profitMargin,
          annualizedCoC: cc.annualizedCoC,
          mao:           cc.mao,
          totalCosts:    cc.totalCosts,
          grade:         cc.grade,
          score:         cc.score,
        }),
      });
      const data = await res.json();
      setAiResult(data);
      trackEvent("ai_analysis_run", { grade: cc.grade, verdict: data.parsed?.verdict });
    } catch (e) {
      setAiResult({ error: e.message });
    }
    setAiLoading(false);
  }

  // Country-specific labels and defaults
  const isCA = country === "CA";
  const L = {
    cityState:     isCA ? "City / Province / Postal Code" : "City / State / Zip",
    escrowBuy:     isCA ? "Legal / Lawyer Fees (Buy)"     : "Escrow / Attorney Fees (Buy)",
    escrowSell:    isCA ? "Legal / Lawyer Fees (Sell)"    : "Escrow / Attorney Fees (Sell)",
    transfer:      isCA ? "Land Transfer Tax (%)"         : "Transfer / Conveyance (%)",
    transferShort: isCA ? "Land Transfer Tax"             : "Transfer / Conveyance",
    realtor:       isCA ? "Realtor Commission (%)"        : "Realtor Commission (%)",
    currency:      isCA ? "CAD"                           : "USD",
  };
  const switchCountry = (c) => {
    setCountry(c);
    // Swap only the defaults that differ meaningfully
    setV(prev => ({
      ...prev,
      realtorPct:       c === "CA" ? 4    : 5,
      transferPct:      c === "CA" ? 1.5  : 0.12,
      realtorTiered:    c === "CA" ? true : false,
      realtorTier1Pct:  c === "CA" ? 7    : 3,
      realtorTier1Cap:  100000,
      realtorTier2Pct:  c === "CA" ? 3    : 1.5,
    }));
  };
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);
  const importRef = useState(null);
  const [mode, setMode] = useState("advanced");

  // ── Generate Offer Letter ─────────────────────────────────────────────────
  function generateOfferLetter() {
    const cc = calcAll(v);
    const today = new Date();
    const fmtDate = (d) => d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const closingDate = new Date(today); closingDate.setDate(closingDate.getDate() + 30);
    const expiryDate = new Date(today); expiryDate.setDate(expiryDate.getDate() + 5);
    const pp = num(v.purchasePrice);
    const earnest = Math.max(5000, Math.round((pp * 0.05) / 100) * 100);

    const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
    const W = doc.internal.pageSize.getWidth();
    const margin = 56;
    let y = margin;

    // ── Header logo area ──────────────────────────────────────────────────
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 158, 255);
    doc.text("REAL DEAL", margin, y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 125, 150);
    doc.text("realdealestate.app", margin, y + 16);

    // Date aligned right
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(fmtDate(today), W - margin, y, { align: "right" });

    y += 40;

    // ── Divider ───────────────────────────────────────────────────────────
    doc.setDrawColor(59, 158, 255);
    doc.setLineWidth(2);
    doc.line(margin, y, W - margin, y);
    y += 18;

    // ── Title ─────────────────────────────────────────────────────────────
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 40);
    doc.text("REAL ESTATE PURCHASE OFFER", W / 2, y, { align: "center" });
    y += 28;

    // ── To / Re ───────────────────────────────────────────────────────────
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text("TO:", margin, y);
    doc.setFont("helvetica", "bold");
    doc.text("Property Owner / Seller", margin + 26, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.text("RE:", margin, y);
    doc.setFont("helvetica", "bold");
    const propLine = [v.address, v.city].filter(Boolean).join(", ") || "Property Address Not Specified";
    doc.text(propLine, margin + 26, y);
    y += 26;

    // ── Salutation ────────────────────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("Dear Property Owner,", margin, y);
    y += 16;
    const introLines = doc.splitTextToSize(
      "We are pleased to submit this offer to purchase the above-referenced property. " +
      "This offer is subject to the following terms and conditions:",
      W - margin * 2
    );
    doc.text(introLines, margin, y);
    y += introLines.length * 14 + 10;

    // ── Purchase Price highlight ──────────────────────────────────────────
    doc.setFillColor(240, 248, 255);
    doc.setDrawColor(59, 158, 255);
    doc.roundedRect(margin, y, W - margin * 2, 34, 4, 4, "FD");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 40);
    doc.text("PURCHASE PRICE:", margin + 14, y + 13);
    doc.setFontSize(14);
    doc.setTextColor(59, 158, 255);
    doc.text(fmt(pp), margin + 14, y + 28);
    y += 48;

    // ── Terms section header ──────────────────────────────────────────────
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 40);
    doc.text("TERMS AND CONDITIONS", margin, y);
    y += 6;
    doc.setDrawColor(220, 220, 230);
    doc.setLineWidth(0.5);
    doc.line(margin, y, W - margin, y);
    y += 14;

    const terms = [
      ["1. PURCHASE PRICE:", fmt(pp)],
      ["2. EARNEST MONEY DEPOSIT:", `${fmt(earnest)} (approx. 5% of purchase price, minimum $5,000)`],
      ["3. CLOSING DATE:", fmtDate(closingDate) + " (approximately 30 days from acceptance)"],
      ["4. INSPECTION PERIOD:", "10 business days from acceptance"],
      ["5. FINANCING CONDITION:", "This offer is contingent upon buyer securing financing satisfactory to buyer within 21 days of acceptance."],
      ["6. PROPERTY CONDITION:", "Seller to convey property in \"as-is\" condition."],
      ["7. INCLUSIONS:", "All existing fixtures and built-ins unless otherwise noted."],
      ["8. POSSESSION:", "At closing."],
    ];

    doc.setFontSize(9.5);
    for (const [label, detail] of terms) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 20, 40);
      const labelWidth = doc.getTextWidth(label) + 6;
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 70, 80);
      const detailLines = doc.splitTextToSize(detail, W - margin * 2 - labelWidth);
      doc.text(detailLines, margin + labelWidth, y);
      y += Math.max(detailLines.length * 13, 13) + 5;
    }

    y += 6;

    // ── Property Analysis Summary ─────────────────────────────────────────
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 40);
    doc.text("PROPERTY ANALYSIS SUMMARY", margin, y);
    y += 6;
    doc.setDrawColor(220, 220, 230);
    doc.setLineWidth(0.5);
    doc.line(margin, y, W - margin, y);
    y += 14;

    const summaryItems = [
      ["After Repair Value (ARV):", fmt(num(v.arv)), "var(--blue)"],
      ["Estimated Repair Costs:", fmt(num(v.repairCosts)), "#60, 60, 80"],
      ["Maximum Allowable Offer (MAO):", fmt(cc.mao), "var(--green)"],
      ["Deal Grade:", cc.grade + "  (Score: " + cc.score + "/100)", cc.gradeColor],
    ];

    for (const [label, val, color] of summaryItems) {
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 80);
      doc.text("• " + label, margin, y);
      const lw = doc.getTextWidth("• " + label) + 8;
      doc.setFont("helvetica", "bold");
      // Parse color string like "var(--blue)"
      if (color && color.startsWith("#") && color.length === 7) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        doc.setTextColor(r, g, b);
      } else {
        doc.setTextColor(30, 30, 50);
      }
      doc.text(val, margin + lw, y);
      doc.setTextColor(60, 60, 80);
      y += 15;
    }

    y += 10;

    // ── Expiry ────────────────────────────────────────────────────────────
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 120);
    doc.text("This offer expires " + fmtDate(expiryDate) + ".", margin, y);
    y += 20;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 80);
    doc.text("We look forward to working with you.", margin, y);
    y += 20;
    doc.text("Respectfully submitted,", margin, y);
    y += 28;

    // ── Signature blocks ──────────────────────────────────────────────────
    const sigLine = () => {
      doc.setDrawColor(150, 150, 170);
      doc.setLineWidth(0.75);
      doc.line(margin, y, margin + 240, y);
      y += 4;
    };

    // Buyer block
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 40);
    doc.text("BUYER", margin, y);
    y += 16;
    sigLine();
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 90);
    doc.text("Buyer Signature", margin, y + 10);
    y += 20;
    sigLine();
    doc.text("Buyer Name: " + (buyerName || "___________________________"), margin, y + 10);
    y += 20;
    sigLine();
    doc.text("Company: " + (buyerCompany || "___________________________"), margin, y + 10);
    y += 20;
    sigLine();
    doc.text("Phone: " + (buyerPhone || "___________________________"), margin, y + 10);
    y += 20;
    sigLine();
    doc.text("Date: ___________________________", margin, y + 10);
    y += 32;

    // Seller block
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 40);
    doc.text("SELLER ACCEPTANCE", margin, y);
    y += 16;
    sigLine();
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 90);
    doc.text("Seller Signature (Acceptance)", margin, y + 10);
    y += 20;
    sigLine();
    doc.text("Seller Name: ___________________________", margin, y + 10);
    y += 20;
    sigLine();
    doc.text("Date: ___________________________", margin, y + 10);
    y += 20;

    // ── Footer ────────────────────────────────────────────────────────────
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(59, 158, 255);
    doc.setLineWidth(1);
    doc.line(margin, pageH - 36, W - margin, pageH - 36);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 160, 180);
    doc.text("Generated by realdealestate.app  ·  This document is for offer purposes only and does not constitute legal advice.", W / 2, pageH - 20, { align: "center" });

    // Save
    const fname = v.address ? v.address.replace(/[^a-z0-9]/gi, "_").toLowerCase() : "property";
    doc.save(`OfferLetter_${fname}_${today.toISOString().slice(0, 10)}.pdf`);
  }

  // ── Generate Lender Package ───────────────────────────────────────────────
  function generateLenderPackage() {
    const cc = calcAll(v);
    const today = new Date();
    const fmtDate = (d) => d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 56;

    // ── Color helpers ─────────────────────────────────────────────────────
    const setColor = (hex) => {
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      doc.setTextColor(r, g, b);
    };
    const setFill = (hex) => {
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      doc.setFillColor(r, g, b);
    };
    const setDraw = (hex) => {
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      doc.setDrawColor(r, g, b);
    };

    // ── Footer helper ─────────────────────────────────────────────────────
    const drawFooter = (pageLabel) => {
      setDraw("var(--blue)");
      doc.setLineWidth(0.75);
      doc.line(margin, H - 38, W - margin, H - 38);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      setColor("var(--sub)");
      const company = buyerCompany || "Real Deal Investments";
      doc.text(
        `Prepared by ${company}  ·  realdealestate.app  ·  CONFIDENTIAL  ·  ${pageLabel}`,
        W / 2, H - 22, { align: "center" }
      );
    };

    // ── Section header helper ─────────────────────────────────────────────
    const drawSectionHeader = (label, y) => {
      setFill("var(--blue)");
      doc.setFillColor(59, 158, 255);
      doc.rect(margin, y, W - margin * 2, 22, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(label, margin + 10, y + 14.5);
      return y + 22 + 12;
    };

    // ── Table row helper ─────────────────────────────────────────────────
    const drawTableRow = (label, value, yPos, boldVal = false, highlight = null) => {
      if (highlight) {
        const hr = parseInt(highlight.slice(1,3), 16);
        const hg = parseInt(highlight.slice(3,5), 16);
        const hb = parseInt(highlight.slice(5,7), 16);
        doc.setFillColor(hr, hg, hb, 0.08);
        doc.setFillColor(hr, hg, hb);
        doc.setGState(doc.GState({ opacity: 0.08 }));
        doc.rect(margin, yPos - 10, W - margin * 2, 18, "F");
        doc.setGState(doc.GState({ opacity: 1 }));
      }
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 70, 80);
      doc.text(label, margin + 8, yPos);
      doc.setFont("helvetica", boldVal ? "bold" : "normal");
      doc.setTextColor(boldVal ? 20 : 70, boldVal ? 20 : 70, boldVal ? 40 : 80);
      doc.text(value, W - margin - 8, yPos, { align: "right" });
      return yPos + 18;
    };

    const drawDivider = (yPos) => {
      doc.setDrawColor(220, 220, 230);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, W - margin, yPos);
      return yPos + 6;
    };

    // ════════════════════════════════════════════════════════════════════
    // PAGE 1 — EXECUTIVE SUMMARY
    // ════════════════════════════════════════════════════════════════════
    let y = margin;

    // ── Header bar ────────────────────────────────────────────────────
    setFill("#07090f");
    doc.setFillColor(7, 9, 15);
    doc.rect(0, 0, W, 64, "F");

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    setColor("var(--blue)");
    doc.text("REAL DEAL", margin, y + 8);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor("var(--sub)");
    doc.text("INVESTMENT PACKAGE", margin, y + 22);

    doc.setFontSize(9);
    setColor("var(--sub)");
    doc.text(fmtDate(today), W - margin, y + 8, { align: "right" });
    doc.text("CONFIDENTIAL", W - margin, y + 22, { align: "right" });

    y = 78;

    // ── Blue accent line ──────────────────────────────────────────────
    setDraw("var(--blue)");
    doc.setLineWidth(2);
    doc.line(margin, y, W - margin, y);
    y += 18;

    // ── Property Overview section ─────────────────────────────────────
    y = drawSectionHeader("PROPERTY OVERVIEW", y);

    const propLine = [v.address, v.city].filter(Boolean).join(", ") || "Property Address Not Specified";
    const description = v.description || "Fix & Flip Opportunity";

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 40);
    doc.text(propLine, margin + 8, y);
    y += 16;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 100);
    doc.text(description, margin + 8, y);
    y += 12;

    // Deal grade badge
    const gradeColors = { A: "var(--green)", B: "var(--blue)", C: "var(--amber)", D: "var(--amber)", F: "var(--red)" };
    const gradeColor = gradeColors[cc.grade] || "var(--sub)";
    const gr = parseInt(gradeColor.slice(1,3),16), gg = parseInt(gradeColor.slice(3,5),16), gb = parseInt(gradeColor.slice(5,7),16);
    doc.setFillColor(gr, gg, gb);
    doc.roundedRect(margin + 8, y, 60, 22, 4, 4, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`GRADE  ${cc.grade}`, margin + 12, y + 14.5);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 100);
    doc.text(`Score: ${cc.score}/100`, margin + 76, y + 14.5);
    y += 32;

    // ── Key Metrics grid (4 boxes) ────────────────────────────────────
    y = drawSectionHeader("KEY METRICS", y);

    const boxW = (W - margin * 2 - 12) / 4;
    const metrics = [
      { label: "Purchase Price", val: fmt(num(v.purchasePrice)), color: "#374151" },
      { label: "After Repair Value", val: fmt(num(v.arv)), color: "var(--blue)" },
      { label: "Repair Budget", val: fmt(num(v.repairCosts)), color: "#374151" },
      { label: "Est. Net Profit", val: fmt(cc.netProfit), color: cc.netProfit >= 0 ? "var(--green)" : "var(--red)" },
    ];
    metrics.forEach((m, i) => {
      const bx = margin + i * (boxW + 4);
      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(220, 220, 230);
      doc.setLineWidth(0.5);
      doc.roundedRect(bx, y, boxW, 46, 4, 4, "FD");
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 110, 130);
      doc.text(m.label.toUpperCase(), bx + 8, y + 13);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const vr = parseInt(m.color.slice(1,3),16), vg = parseInt(m.color.slice(3,5),16), vb = parseInt(m.color.slice(5,7),16);
      doc.setTextColor(vr, vg, vb);
      doc.text(m.val, bx + 8, y + 34);
    });
    y += 60;

    // ── Loan Request section ──────────────────────────────────────────
    y = drawSectionHeader("LOAN REQUEST", y);

    const loanToARV = num(v.arv) > 0 ? ((num(v.loan1Amount) / num(v.arv)) * 100).toFixed(1) + "%" : "—";
    const loanToCost = (num(v.purchasePrice) + num(v.repairCosts)) > 0
      ? ((num(v.loan1Amount) / (num(v.purchasePrice) + num(v.repairCosts))) * 100).toFixed(1) + "%"
      : "—";

    const loanRows = [
      ["Loan Amount Requested", fmt(num(v.loan1Amount))],
      ["Loan-to-ARV (LTV)", loanToARV],
      ["Loan-to-Cost (LTC)", loanToCost],
      ["Interest Rate", num(v.loan1Rate) + "%"],
      ["Origination Points", num(v.loan1Points) + " point" + (num(v.loan1Points) !== 1 ? "s" : "")],
      ["Requested Hold Period", num(v.holdMonths) + " months"],
    ];
    loanRows.forEach(([lbl, val]) => {
      y = drawTableRow(lbl, val, y);
      y = drawDivider(y);
    });

    drawFooter("Page 1 of 3");

    // ════════════════════════════════════════════════════════════════════
    // PAGE 2 — FINANCIAL ANALYSIS
    // ════════════════════════════════════════════════════════════════════
    doc.addPage();
    y = margin;

    // Header
    setFill("#07090f");
    doc.setFillColor(7, 9, 15);
    doc.rect(0, 0, W, 50, "F");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    setColor("#ffffff");
    doc.text("FINANCIAL ANALYSIS", margin, y + 8);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor("var(--sub)");
    doc.text(propLine, margin, y + 22);
    setDraw("var(--blue)");
    doc.setLineWidth(2);
    doc.line(margin, 54, W - margin, 54);
    y = 70;

    // Cost Breakdown
    y = drawSectionHeader("COST BREAKDOWN", y);
    const costRows = [
      ["Purchase Price", fmt(num(v.purchasePrice)), false],
      ["Estimated Repair Costs", fmt(num(v.repairCosts)), false],
      ["Total Financing Costs", fmt(cc.totalFinancing), false],
      ["  — Loan Points", fmt(cc.loan1PointsAmt + cc.loan2PointsAmt + cc.loanMiscPointsAmt), false],
      ["  — Loan Interest", fmt(cc.loan1Interest + cc.loan2Interest + cc.loanMiscInterest), false],
      ["  — Misc. Financing", fmt(num(v.miscFinancingCosts)), false],
      ["Total Holding Costs", fmt(cc.totalHolding), false],
      ["  — " + fmt(cc.totalMonthlyHolding) + "/mo × " + num(v.holdMonths) + " months", "", false],
      ["Total Buying Transaction Costs", fmt(cc.totalBuying), false],
      ["Total Selling Transaction Costs", fmt(cc.totalSelling), false],
      ["  — Realtor Fees", fmt(cc.realtorFees), false],
      ["  — Transfer / Conveyance", fmt(cc.transferFees), false],
    ];
    if (num(v.miscPropertyCosts) > 0) {
      costRows.push(["Misc. Property Costs", fmt(num(v.miscPropertyCosts)), false]);
    }
    costRows.forEach(([lbl, val, bold]) => {
      y = drawTableRow(lbl, val, y, bold);
      if (!lbl.startsWith("  ")) y = drawDivider(y);
      else y += 2;
    });
    // Bold total row
    setFill("var(--blue)");
    doc.setFillColor(59, 158, 255, 0.08);
    doc.setFillColor(240, 248, 255);
    doc.setDrawColor(59, 158, 255);
    doc.setLineWidth(0.5);
    doc.rect(margin, y - 10, W - margin * 2, 20, "FD");
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 40);
    doc.text("TOTAL ALL-IN COST", margin + 8, y + 4);
    setColor("var(--blue)");
    doc.setFont("helvetica", "bold");
    doc.text(fmt(cc.totalCosts), W - margin - 8, y + 4, { align: "right" });
    y += 26;

    // Returns section
    y = drawSectionHeader("RETURN ANALYSIS", y);

    const returnRows = [
      ["Net Profit (ARV − All Costs)", fmt(cc.netProfit), cc.netProfit >= 0 ? "var(--green)" : "var(--red)"],
      ["Profit Margin", fmtPct(cc.profitMargin), cc.profitMargin >= 0.15 ? "var(--green)" : "var(--amber)"],
      ["Total Return on Investment", fmtPct(cc.roiTotal), "var(--blue)"],
      ["Annualized Cash-on-Cash Return", fmtPct(cc.annualizedCoC), "var(--blue)"],
      ["Maximum Allowable Offer (MAO)", fmt(cc.mao), "#374151"],
    ];
    returnRows.forEach(([lbl, val, col]) => {
      const vr2 = parseInt(col.slice(1,3),16), vg2 = parseInt(col.slice(3,5),16), vb2 = parseInt(col.slice(5,7),16);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 70, 80);
      doc.text(lbl, margin + 8, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(vr2, vg2, vb2);
      doc.text(val, W - margin - 8, y, { align: "right" });
      y += 18;
      y = drawDivider(y);
    });

    y += 6;
    // Exit strategy note
    y = drawSectionHeader("EXIT STRATEGY", y);
    const exitText = `Sale of renovated property at ARV of ${fmt(num(v.arv))} within ${num(v.holdMonths)} months. ` +
      `The property will be fully renovated and listed on the open market. ` +
      `Estimated days on market: 30–60 days. Net to borrower after sale and all costs: ${fmt(cc.netProfit)}.`;
    const exitLines = doc.splitTextToSize(exitText, W - margin * 2 - 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 80);
    doc.text(exitLines, margin + 8, y);
    y += exitLines.length * 14 + 10;

    // Risk factors
    y = drawSectionHeader("RISK FACTORS", y);
    const riskText =
      "Market Conditions: Property values are subject to fluctuation based on local economic conditions, interest rate changes, and buyer demand. " +
      "Renovation Risk: Repair costs may exceed budget due to unforeseen structural or mechanical issues; a 10–15% contingency is recommended. " +
      "Timeline Risk: Delays in permitting, contractor scheduling, or sale closing can extend the hold period, increasing carrying costs. " +
      "All financial projections are estimates based on current market data and are not guaranteed.";
    const riskLines = doc.splitTextToSize(riskText, W - margin * 2 - 16);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 90);
    doc.text(riskLines, margin + 8, y);

    drawFooter("Page 2 of 3");

    // ════════════════════════════════════════════════════════════════════
    // PAGE 3 — RENOVATION PLAN & EXIT STRATEGY
    // ════════════════════════════════════════════════════════════════════
    doc.addPage();
    y = margin;

    // Header
    setFill("#07090f");
    doc.setFillColor(7, 9, 15);
    doc.rect(0, 0, W, 50, "F");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    setColor("#ffffff");
    doc.text("RENOVATION PLAN & EXIT STRATEGY", margin, y + 8);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor("var(--sub)");
    doc.text(propLine, margin, y + 22);
    setDraw("var(--blue)");
    doc.setLineWidth(2);
    doc.line(margin, 54, W - margin, 54);
    y = 70;

    // Renovation Budget box
    y = drawSectionHeader("RENOVATION BUDGET", y);
    const costPerSqft = num(v.sqft) > 0 ? fmt(num(v.repairCosts) / num(v.sqft)) + "/sqft" : "N/A";
    const renovRows = [
      ["Total Repair & Renovation Budget", fmt(num(v.repairCosts))],
      ["Estimated Cost per Sq Ft", costPerSqft],
      ["Renovation Timeline", num(v.holdMonths) + " months (incl. listing & closing)"],
      ["Square Footage", num(v.sqft) > 0 ? num(v.sqft).toLocaleString() + " sqft" : "Not specified"],
    ];
    renovRows.forEach(([lbl, val]) => {
      y = drawTableRow(lbl, val, y);
      y = drawDivider(y);
    });
    y += 6;

    // Exit Strategy details
    y = drawSectionHeader("EXIT STRATEGY — SALE DETAILS", y);
    const exitRows = [
      ["Target Sale Price (ARV)", fmt(num(v.arv))],
      ["Estimated Days on Market", "30–60 days"],
      ["Total Selling Costs", fmt(cc.totalSelling)],
      ["  — Realtor Commission", fmt(cc.realtorFees)],
      ["  — Transfer Fees", fmt(cc.transferFees)],
      ["  — Escrow & Recording", fmt(num(v.sellEscrowFees) + num(v.sellRecordingFees))],
      ["Net Profit After Sale & All Costs", fmt(cc.netProfit)],
    ];
    exitRows.forEach(([lbl, val]) => {
      const isBold = lbl.startsWith("Net");
      y = drawTableRow(lbl, val, y, isBold);
      if (!lbl.startsWith("  ")) y = drawDivider(y);
      else y += 2;
    });
    y += 8;

    // Borrower / Sponsor info
    y = drawSectionHeader("BORROWER / SPONSOR", y);
    const sponsorRows = [
      ["Name", buyerName || "—"],
      ["Company", buyerCompany || "—"],
      ["Phone", buyerPhone || "—"],
      ["Deal Type", "Fix & Flip"],
      ["Property Address", propLine],
    ];
    sponsorRows.forEach(([lbl, val]) => {
      y = drawTableRow(lbl, val, y);
      y = drawDivider(y);
    });
    y += 16;

    // Certification / signature line
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 40);
    doc.text("CERTIFICATION", margin, y);
    y += 6;
    doc.setDrawColor(180, 180, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, W - margin, y);
    y += 14;
    const certText =
      "I/We certify that the information contained in this investment package is true and accurate to the best of my/our knowledge. " +
      "All financial projections are based on current market data and reasonable assumptions. " +
      "This document is prepared for financing purposes only.";
    const certLines = doc.splitTextToSize(certText, W - margin * 2);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 90);
    doc.text(certLines, margin, y);
    y += certLines.length * 13 + 20;

    // Signature lines
    const sigY = Math.min(y, H - 120);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 40);
    doc.text("Borrower Signature:", margin, sigY);
    doc.setDrawColor(150, 160, 180);
    doc.setLineWidth(0.75);
    doc.line(margin + 120, sigY, margin + 360, sigY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 100);
    doc.text("Date:", W - margin - 180, sigY);
    doc.line(W - margin - 140, sigY, W - margin, sigY);

    // Disclaimer footer box
    const disclaimerY = H - 76;
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(200, 210, 220);
    doc.setLineWidth(0.5);
    doc.rect(margin, disclaimerY, W - margin * 2, 38, "FD");
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 110, 130);
    const disclaimer = "This document is prepared for financing purposes. All projections are estimates based on market conditions at time of preparation. " +
      "This is not a legal document and does not constitute financial or investment advice. " +
      "Real estate investments involve risk and past performance does not guarantee future results.";
    const discLines = doc.splitTextToSize(disclaimer, W - margin * 2 - 16);
    doc.text(discLines, margin + 8, disclaimerY + 12);

    drawFooter("Page 3 of 3");

    // Save
    const fname = v.address ? v.address.replace(/[^a-z0-9]/gi, "_").toLowerCase() : "property";
    doc.save(`LenderPackage_${fname}_${today.toISOString().slice(0, 10)}.pdf`);
  }

  // ── Save Deal ──────────────────────────────────────────────────────────────
  const [dealSaved, setDealSaved] = useState(false);
  function saveFlipDeal() {
    const cc = calcAll(v);
    const deal = {
      id: Date.now(),
      type: "flip",
      name: v.address || "Untitled Flip",
      address: v.address,
      savedAt: new Date().toISOString(),
      inputs: { ...v },
      results: {
        netProfit: cc.netProfit,
        roiTotal: cc.roiTotal,
        annualizedCoC: cc.annualizedCoC,
        profitMargin: cc.profitMargin,
        mao: cc.mao,
        totalCosts: cc.totalCosts,
        grade: cc.grade,
        score: cc.score,
      },
      verdict: `Grade ${cc.grade} — ${cc.netProfit >= 0 ? "Profitable" : "Unprofitable"}`,
    };
    const existing = JSON.parse(localStorage.getItem("rde_brrrr_deals") || "[]");
    existing.unshift(deal);
    localStorage.setItem("rde_brrrr_deals", JSON.stringify(existing.slice(0, 20)));
    setDealSaved(true);
    setTimeout(() => setDealSaved(false), 5000);
    // Track in Intercom so you can see your most active users
    trackEvent("deal_saved", {
      type: "flip",
      address: v.address || "Unknown",
      net_profit: Math.round(cc.netProfit),
      grade: cc.grade,
    });
  }

  // ── Inline BRRRR (Refinance) section ─────────────────────────────────────
  // ── Property Lookup ───────────────────────────────────────────────────────
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupData,    setLookupData]    = useState(null);
  const [lookupError,   setLookupError]   = useState("");
  const [lookupFilled,  setLookupFilled]  = useState(false);

  async function lookupProperty() {
    const address = (v.address + " " + v.city).trim();
    if (!address) return;
    setLookupLoading(true); setLookupError(""); setLookupData(null);
    try {
      const res = await fetch(`/api/property-lookup?address=${encodeURIComponent(address)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lookup failed");
      setLookupData(json);
    } catch(e) { setLookupError(e.message); }
    finally { setLookupLoading(false); }
  }

  function autoFillFromLookup() {
    if (!lookupData) return;
    setV(p => ({
      ...p,
      // ARV = AVM estimate; as-is = 85% of that (distressed assumption)
      ...(lookupData.estimatedValue  && { arv: Math.round(lookupData.estimatedValue), asIsValue: Math.round(lookupData.estimatedValue * 0.85) }),
      // Square footage
      ...(lookupData.squareFootage   && { sqft: lookupData.squareFootage }),
      // Annual property taxes
      ...(lookupData.propertyTaxes   && { propTaxAnnual: lookupData.propertyTaxes }),
      // Units (bedrooms as proxy for SFH vs multi)
      ...(lookupData.bedrooms        && { units: lookupData.bedrooms <= 1 ? 1 : lookupData.bedrooms }),
      // Description auto-populated with beds/baths/type/year
      ...(lookupData.bedrooms && lookupData.bathrooms && {
        description: [
          lookupData.bedrooms && `${lookupData.bedrooms} bed`,
          lookupData.bathrooms && `${lookupData.bathrooms} bath`,
          lookupData.propertyType && lookupData.propertyType,
          lookupData.yearBuilt && `built ${lookupData.yearBuilt}`,
        ].filter(Boolean).join(' / '),
      }),
      // Last sale price → seed the purchase price field (user will override)
      ...(lookupData.lastSalePrice   && { purchasePrice: Math.round(lookupData.lastSalePrice) }),
    }));
    setLookupFilled(true);
    setTimeout(() => setLookupFilled(false), 3000);
  }

  const [brrrrForm, setBrrrrForm] = useState({ ltv: "80", rate: "5.5", amort: "25", closingPct: "1.5" });
  const setB = (k,val) => setBrrrrForm(p => ({...p, [k]: val}));

  // ── Pre-fill from PropertyHub ─────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rde_prefill");
      if (!raw) return;
      const pf = JSON.parse(raw);
      // Only consume if recent (< 5 min) and strategy matches flip
      if (Date.now() - pf.timestamp > 5 * 60 * 1000) return;
      if (pf.strategy && pf.strategy !== "flip") return;
      localStorage.removeItem("rde_prefill");
      setV(prev => ({
        ...prev,
        ...(pf.address        && { address: pf.address }),
        ...(pf.estimatedValue && { arv: Math.round(pf.estimatedValue), asIsValue: Math.round(pf.estimatedValue * 0.85) }),
        ...(pf.squareFootage  && { sqft: pf.squareFootage }),
        ...(pf.bedrooms       && { units: pf.bedrooms }),
        ...(pf.propertyTaxes  && { propTaxAnnual: pf.propertyTaxes }),
      }));
    } catch {}
  }, []);

  const calcBRRRR = useMemo(() => {
    const arv = num(v.arv);
    if (!arv) return null;
    const cc = calcAll(v); // compute independently — avoids referencing c before it's declared
    const ltv = num(brrrrForm.ltv)/100;
    const rate = num(brrrrForm.rate)/100/12;
    const n = num(brrrrForm.amort)*12;
    const loanAmt = arv * ltv;
    const closingCosts = loanAmt * (num(brrrrForm.closingPct)/100);
    const netProceeds = loanAmt - closingCosts;
    const totalCashIn = num(v.purchasePrice) + num(v.repairCosts) + cc.totalFinancing + cc.totalHolding + cc.totalBuying;
    const cashPulledOut = Math.max(0, netProceeds - totalCashIn);
    const cashLeftIn = Math.max(0, totalCashIn - netProceeds);
    const isTrueBRRRR = netProceeds >= totalCashIn;
    const monthlyPmt = (loanAmt && rate && n) ? loanAmt*(rate*Math.pow(1+rate,n))/(Math.pow(1+rate,n)-1) : 0;
    return { arv, loanAmt, closingCosts, netProceeds, totalCashIn, cashPulledOut, cashLeftIn, isTrueBRRRR, monthlyPmt };
  }, [v, brrrrForm]);

  const EXAMPLE_DEAL = {
    arv: 385000, purchasePrice: 210000, repairCosts: 65000, holdMonths: 6,
    loan1Amount: 220000, loan1Points: 2, loan1Rate: 9,
    loan2Amount: 0, loan2Points: 0, loan2Rate: 0,
    loanMiscAmount: 0, loanMiscPoints: 0, loanMiscRate: 0, miscFinancingCosts: 0,
    propTaxAnnual: 3600, hoaMonthly: 0, insuranceAnnual: 1800,
    utilGas: 80, utilWater: 60, utilElec: 50, utilOther: 0, miscHoldingMonthly: 0,
    buyEscrowFees: 900, buyTitlePct: 0.5, buyMiscCosts: 500,
    sellEscrowFees: 900, sellRecordingFees: 400, realtorPct: 5, transferPct: 0.12,
    homeWarranty: 500, stagingCosts: 2500, marketingCosts: 500, miscSellingCosts: 0,
    myCash: 55000, miscPropertyCosts: 0,
    address: "847 Oak Ave", city: "Calgary, AB", sqft: 1850, units: 1, occupied: "No",
    evaluator: "", description: "3 bed / 2 bath bungalow. Kitchen and bathrooms need full reno.", notes: "",
    asIsValue: 210000,
  };
  const loadExample = () => setV(EXAMPLE_DEAL);
  const clearAll = () => setV({ ...DEFAULTS, arv: "", purchasePrice: "", repairCosts: "", holdMonths: 6 });

  const c = useMemo(() => calcAll(v), [v]);
  const set = (k) => (val) => setV(p => ({ ...p, [k]: val }));
  const reset = () => setV(DEFAULTS);
  const isProfit = c.netProfit >= 0;

  const exportDeal = () => {
    const dealName = v.address ? v.address.replace(/[^a-z0-9]/gi, "_").toLowerCase() : "deal";
    const cc = calcAll(v);

    // Helper to build a row
    const r = (label, value, isBold, isHeader) => ({ label, value, isBold, isHeader });

    const inputRows = [
      r("PROPERTY DETAILS", null, true, true),
      r("Address", v.address),
      r("City / State / Zip", v.city),
      r("Square Footage", v.sqft),
      r("# of Units", v.units),
      r("Occupied", v.occupied),
      r("Evaluator", v.evaluator),
      r("Description", v.description),
      r("", null),
      r("PROPERTY VALUES & PRICING", null, true, true),
      r("After Repair Value (ARV)", num(v.arv)),
      r("Current 'As Is' Value", num(v.asIsValue)),
      r("Estimated Repair Costs", num(v.repairCosts)),
      r("Purchase Price", num(v.purchasePrice)),
      r("Hold Time (Months)", num(v.holdMonths)),
      r("Misc. Property Costs", num(v.miscPropertyCosts)),
      r("", null),
      r("FINANCING COSTS", null, true, true),
      r("1st Mortgage Amount", num(v.loan1Amount)),
      r("1st Mortgage Points (%)", num(v.loan1Points)),
      r("1st Mortgage Annual Rate (%)", num(v.loan1Rate)),
      r("1st Mortgage Interest (calculated)", cc.loan1Interest),
      r("2nd Mortgage Amount", num(v.loan2Amount)),
      r("2nd Mortgage Points (%)", num(v.loan2Points)),
      r("2nd Mortgage Annual Rate (%)", num(v.loan2Rate)),
      r("2nd Mortgage Interest (calculated)", cc.loan2Interest),
      r("Misc. Mortgage Amount", num(v.loanMiscAmount)),
      r("Misc. Mortgage Points (%)", num(v.loanMiscPoints)),
      r("Misc. Mortgage Annual Rate (%)", num(v.loanMiscRate)),
      r("Misc. Mortgage Interest (calculated)", cc.loanMiscInterest),
      r("Misc. Financing Costs", num(v.miscFinancingCosts)),
      r("TOTAL FINANCING COSTS", cc.totalFinancing, true),
      r("", null),
      r("BUYING TRANSACTION COSTS", null, true, true),
      r("Escrow / Attorney Fees (Buy)", num(v.buyEscrowFees)),
      r("Title Insurance % of Repairs", num(v.buyTitlePct)),
      r("Title Insurance (calculated)", cc.buyTitle),
      r("Misc. Buying Costs", num(v.buyMiscCosts)),
      r("TOTAL BUYING COSTS", cc.totalBuying, true),
      r("", null),
      r("HOLDING COSTS", null, true, true),
      r("Property Taxes (Annual)", num(v.propTaxAnnual)),
      r("Property Taxes (Monthly, calculated)", cc.propTaxMonthly),
      r("HOA / Condo Fees (Monthly)", num(v.hoaMonthly)),
      r("Insurance (Annual)", num(v.insuranceAnnual)),
      r("Insurance (Monthly, calculated)", cc.insuranceMonthly),
      r("Gas (Monthly)", num(v.utilGas)),
      r("Water (Monthly)", num(v.utilWater)),
      r("Electricity (Monthly)", num(v.utilElec)),
      r("Other Utilities (Monthly)", num(v.utilOther)),
      r("Misc. Holding Costs (Monthly)", num(v.miscHoldingMonthly)),
      r("Total Monthly Holding Costs", cc.totalMonthlyHolding, true),
      r("TOTAL HOLDING COSTS", cc.totalHolding, true),
      r("", null),
      r("SELLING TRANSACTION COSTS", null, true, true),
      r("Escrow / Attorney Fees (Sell)", num(v.sellEscrowFees)),
      r("Recording Fees", num(v.sellRecordingFees)),
      r("Realtor Commission (%)", num(v.realtorPct)),
      r("Realtor Fees (calculated)", cc.realtorFees),
      r("Transfer / Conveyance (%)", num(v.transferPct)),
      r("Transfer Fees (calculated)", cc.transferFees),
      r("Home Warranty", num(v.homeWarranty)),
      r("Staging Costs", num(v.stagingCosts)),
      r("Marketing Costs", num(v.marketingCosts)),
      r("Misc. Selling Costs", num(v.miscSellingCosts)),
      r("TOTAL SELLING COSTS", cc.totalSelling, true),
    ];

    const summaryRows = [
      r("DEAL SUMMARY", null, true, true),
      r("After Repair Value (ARV)", num(v.arv)),
      r("Purchase Price", num(v.purchasePrice)),
      r("Estimated Repair Costs", num(v.repairCosts)),
      r("Total Financing Costs", cc.totalFinancing),
      r("Total Holding Costs", cc.totalHolding),
      r("Total Buying Transaction Costs", cc.totalBuying),
      r("Total Selling Transaction Costs", cc.totalSelling),
      r("Misc. Property Costs", num(v.miscPropertyCosts)),
      r("TOTAL ALL-IN COSTS", cc.totalCosts, true),
      r("ESTIMATED NET PROFIT", cc.netProfit, true),
      r("Profit Margin", cc.profitMargin),
      r("", null),
      r("RETURN ANALYSIS", null, true, true),
      r("My Committed Capital", num(v.myCash)),
      r("Total Cost ROI", cc.roiTotal),
      r("Purchase + Rehab ROI", cc.roiPurchaseRehab),
      r("Annualized Total Cash-on-Cash", cc.annualizedTotal),
      r("My Annualized Cash-on-Cash", cc.annualizedCoC),
      r("Cost Per Square Foot", cc.costPerSqft),
      r("", null),
      r("MAXIMUM ALLOWABLE OFFER (MAO)", null, true, true),
      r("ARV", num(v.arv)),
      r("Less: Repair Costs", num(v.repairCosts)),
      r("Less: Closing & Financing Costs", cc.closingMAO),
      r("Less: Carrying & Selling Costs", cc.carryingSelling),
      r("Less: Target Profit (10%)", cc.targetProfit),
      r("MAXIMUM ALLOWABLE OFFER", cc.mao, true),
      r("Your Purchase Price", num(v.purchasePrice)),
      r("Purchase vs MAO", num(v.purchasePrice) <= cc.mao ? "Within MAO ✓" : "Above MAO ✗"),
      r("", null),
      r("DEAL GRADE", null, true, true),
      r("Grade", cc.grade),
      r("Score", cc.score + " / 100"),
    ];

    const isCurrency = (label) => {
      const keywords = ["Amount","Costs","Cost","Fees","Profit","Value","Price","ARV","MAO","Interest","Capital","Warranty","Staging","Marketing","Taxes","Insurance","Utilities","Gas","Water","Electricity","Monthly","Annual","Offer"];
      return keywords.some(k => label.includes(k));
    };
    const isPct = (label) => label.includes("(%)") || label.includes("ROI") || label.includes("Cash-on-Cash") || label.includes("Margin") || label.includes("Return");

    const buildSheet = (rows) => {
      const data = rows.map(row => {
        if (!row.label) return ["", ""];
        if (row.isHeader) return [row.label, ""];
        return [row.label, row.value ?? ""];
      });
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!cols"] = [{ wch: 42 }, { wch: 22 }];

      rows.forEach((row, i) => {
        const cellRef = XLSX.utils.encode_cell({ r: i, c: 1 });
        if (!ws[cellRef] || row.value === null || row.value === undefined || row.value === "") return;
        if (row.isHeader) return;
        const label = row.label || "";
        if (isPct(label) && typeof row.value === "number") {
          ws[cellRef].z = "0.00%";
          ws[cellRef].t = "n";
        } else if (isCurrency(label) && typeof row.value === "number") {
          ws[cellRef].z = '"$"#,##0';
          ws[cellRef].t = "n";
        }
      });

      return ws;
    };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, buildSheet(summaryRows), "Deal Summary");
    XLSX.utils.book_append_sheet(wb, buildSheet(inputRows), "Full Inputs");

    XLSX.writeFile(wb, `FlipAnalyzer_${dealName}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const importDeal = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array" });
        const ws = wb.Sheets["Full Inputs"];
        if (!ws) {
          setImportError("This doesn't look like a FlipAnalyzer export file.");
          return;
        }
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const map = {};
        rows.forEach(([label, value]) => { if (label) map[label.trim()] = value; });

        const loaded = {
          address: map["Address"] ?? DEFAULTS.address,
          city: map["City / State / Zip"] ?? DEFAULTS.city,
          sqft: map["Square Footage"] ?? DEFAULTS.sqft,
          units: map["# of Units"] ?? DEFAULTS.units,
          occupied: map["Occupied"] ?? DEFAULTS.occupied,
          evaluator: map["Evaluator"] ?? "",
          description: map["Description"] ?? "",
          arv: map["After Repair Value (ARV)"] ?? DEFAULTS.arv,
          asIsValue: map["Current 'As Is' Value"] ?? DEFAULTS.asIsValue,
          repairCosts: map["Estimated Repair Costs"] ?? DEFAULTS.repairCosts,
          purchasePrice: map["Purchase Price"] ?? DEFAULTS.purchasePrice,
          holdMonths: map["Hold Time (Months)"] ?? DEFAULTS.holdMonths,
          miscPropertyCosts: map["Misc. Property Costs"] ?? 0,
          loan1Amount: map["1st Mortgage Amount"] ?? DEFAULTS.loan1Amount,
          loan1Points: map["1st Mortgage Points (%)"] ?? DEFAULTS.loan1Points,
          loan1Rate: map["1st Mortgage Annual Rate (%)"] ?? DEFAULTS.loan1Rate,
          loan2Amount: map["2nd Mortgage Amount"] ?? 0,
          loan2Points: map["2nd Mortgage Points (%)"] ?? 0,
          loan2Rate: map["2nd Mortgage Annual Rate (%)"] ?? 0,
          loanMiscAmount: map["Misc. Mortgage Amount"] ?? 0,
          loanMiscPoints: map["Misc. Mortgage Points (%)"] ?? 0,
          loanMiscRate: map["Misc. Mortgage Annual Rate (%)"] ?? 0,
          miscFinancingCosts: map["Misc. Financing Costs"] ?? 0,
          buyEscrowFees: map["Escrow / Attorney Fees (Buy)"] ?? DEFAULTS.buyEscrowFees,
          buyTitlePct: map["Title Insurance % of Repairs"] ?? DEFAULTS.buyTitlePct,
          buyMiscCosts: map["Misc. Buying Costs"] ?? 0,
          propTaxAnnual: map["Property Taxes (Annual)"] ?? DEFAULTS.propTaxAnnual,
          hoaMonthly: map["HOA / Condo Fees (Monthly)"] ?? 0,
          insuranceAnnual: map["Insurance (Annual)"] ?? DEFAULTS.insuranceAnnual,
          utilGas: map["Gas (Monthly)"] ?? DEFAULTS.utilGas,
          utilWater: map["Water (Monthly)"] ?? DEFAULTS.utilWater,
          utilElec: map["Electricity (Monthly)"] ?? DEFAULTS.utilElec,
          utilOther: map["Other Utilities (Monthly)"] ?? 0,
          miscHoldingMonthly: map["Misc. Holding Costs (Monthly)"] ?? 0,
          sellEscrowFees: map["Escrow / Attorney Fees (Sell)"] ?? DEFAULTS.sellEscrowFees,
          sellRecordingFees: map["Recording Fees"] ?? DEFAULTS.sellRecordingFees,
          realtorPct: map["Realtor Commission (%)"] ?? DEFAULTS.realtorPct,
          transferPct: map["Transfer / Conveyance (%)"] ?? DEFAULTS.transferPct,
          homeWarranty: map["Home Warranty"] ?? DEFAULTS.homeWarranty,
          stagingCosts: map["Staging Costs"] ?? DEFAULTS.stagingCosts,
          marketingCosts: map["Marketing Costs"] ?? DEFAULTS.marketingCosts,
          miscSellingCosts: map["Misc. Selling Costs"] ?? 0,
          myCash: map["My Committed Capital"] ?? DEFAULTS.myCash,
          notes: map["Notes"] ?? "",
        };
        setV(loaded);
        setImportSuccess(true);
        setTab("inputs");
        setTimeout(() => setImportSuccess(false), 3000);
      } catch {
        setImportError("Could not read file. Please use a FlipAnalyzer .xlsx export.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const navItems = [
    { id: "inputs", label: "Deal Inputs", icon: "📋" },
    { id: "summary", label: "Summary & Returns", icon: "📊" },
    { id: "definitions", label: "Reference Guide", icon: "📖" },
  ];

  const filteredDefs = DEFINITIONS.map(section => ({
    ...section,
    items: section.items.filter(
      i => !defSearch || i.term.toLowerCase().includes(defSearch.toLowerCase()) || i.def.toLowerCase().includes(defSearch.toLowerCase())
    )
  })).filter(s => s.items.length > 0);

  // ── BEGINNER MODE ────────────────────────────────────────────────────────
  if (mode === "beginner") {
    const bSteps = [
      { num: 1, label: "What could you sell it for after repairs?", sub: "This is called the ARV — After Repair Value", key: "arv", prefix: "$", placeholder: "e.g. 385000" },
      { num: 2, label: "What will the repairs cost?", sub: "Your renovation budget — be honest, add 10% buffer", key: "repairCosts", prefix: "$", placeholder: "e.g. 65000" },
      { num: 3, label: "What is the purchase price?", sub: "What you're paying to buy the property", key: "purchasePrice", prefix: "$", placeholder: "e.g. 210000" },
      { num: 4, label: "How long will it take? (months)", sub: "From purchase to sold — include renovation + time on market", key: "holdMonths", prefix: "", suffix: "months", placeholder: "e.g. 6" },
    ];
    const bResult = calcAll(v);
    const isGood = bResult.netProfit > 0 && bResult.profitMargin > 0.15;
    const isOk = bResult.netProfit > 0 && bResult.profitMargin >= 0.08;
    const verdict = isGood ? { label: "Looks like a GO", color: "var(--green)", bg: "#f0fdf4", border: "#bbf7d0", icon: "✅" }
      : isOk ? { label: "Proceed with Caution", color: "var(--amber)", bg: "#fffbeb", border: "#fde68a", icon: "⚠️" }
      : { label: "Risky — Check Your Numbers", color: "var(--red)", bg: "#fef2f2", border: "#fecaca", icon: "🚫" };
    const hasResult = num(v.arv) > 0 && num(v.purchasePrice) > 0 && num(v.repairCosts) > 0;

    return (
      <div style={{ minHeight: "100vh", background: "rgba(255,255,255,0.03)", fontFamily: "'DM Sans', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />

        {/* Header */}
        <div style={{ background: "#0d1119", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
              <span style={{ color: "var(--blue)" }}>Real</span> Deal
            </div>
            <div style={{ fontSize: 10, color: "var(--sub)", letterSpacing: 1, textTransform: "uppercase", marginTop: 1 }}>Property Analyzer</div>
          </div>
          <button onClick={() => setMode("advanced")} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 16px", color: "var(--sub)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Advanced Mode →
          </button>
        </div>

        <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px 60px" }}>

          {/* Intro */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 8 }}>
              Is this a good deal?
            </div>
            <div style={{ fontSize: 15, color: "var(--sub)", lineHeight: 1.6 }}>
              Answer 4 simple questions and we'll tell you if it's worth pursuing.
            </div>
          </div>

          {/* Example button */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 28 }}>
            <button onClick={loadExample} style={{ background: "rgba(52,217,138,0.06)", border: "1px solid #99f6e4", borderRadius: 8, padding: "8px 18px", color: "var(--blue)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              📋 Show me an example deal
            </button>
            <button onClick={clearAll} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 16px", color: "var(--sub)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Clear
            </button>
          </div>

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
            {bSteps.map((step) => (
              <div key={step.key} style={{ background: "#0d1119", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--blue)", color: "#fff", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{step.num}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>{step.label}</div>
                    <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 2 }}>{step.sub}</div>
                  </div>
                </div>
                <div style={{ position: "relative" }}>
                  {step.prefix && <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--sub)", fontSize: 16, fontWeight: 600, pointerEvents: "none", fontFamily: "'Fira Code', monospace" }}>{step.prefix}</span>}
                  <input
                    type="number"
                    value={v[step.key]}
                    onChange={e => set(step.key)(e.target.value)}
                    placeholder={step.placeholder}
                    style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "2px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: `14px ${step.suffix ? "70px" : "14px"} 14px ${step.prefix ? "30px" : "14px"}`, fontSize: 18, fontWeight: 700, color: "var(--text)", fontFamily: "'Fira Code', monospace", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                    onFocus={e => e.target.style.borderColor = "var(--blue)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                  {step.suffix && <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--sub)", fontSize: 13, pointerEvents: "none" }}>{step.suffix}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Result */}
          {hasResult && (
            <div style={{ background: verdict.bg, border: `2px solid ${verdict.border}`, borderRadius: 16, padding: "24px 26px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <span style={{ fontSize: 28 }}>{verdict.icon}</span>
                <div style={{ fontSize: 22, fontWeight: 800, color: verdict.color, letterSpacing: -0.5 }}>{verdict.label}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Estimated Profit", val: fmt(bResult.netProfit), color: bResult.netProfit > 0 ? "var(--green)" : "var(--red)" },
                  { label: "Profit Margin", val: fmtPct(bResult.profitMargin), color: bResult.profitMargin > 0.15 ? "var(--green)" : bResult.profitMargin > 0 ? "var(--amber)" : "var(--red)" },
                  { label: "Max You Should Pay", val: fmt(bResult.mao), color: "var(--blue)" },
                  { label: "Your Price vs Max", val: num(v.purchasePrice) <= bResult.mao ? "✅ Good" : "⚠️ Too High", color: num(v.purchasePrice) <= bResult.mao ? "var(--green)" : "var(--red)" },
                ].map(m => (
                  <div key={m.label} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 10, color: "var(--sub)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>{m.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: m.color, fontFamily: "'Fira Code', monospace" }}>{m.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--sub)", lineHeight: 1.65, borderTop: `1px solid ${verdict.border}`, paddingTop: 14 }}>
                💡 <strong>These are estimates</strong> — they include typical loan costs, holding costs, and realtor fees. For a precise analysis with your exact numbers, use Advanced Mode.
              </div>
            </div>
          )}

          {/* What these numbers mean */}
          <div style={{ background: "#0d1119", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "20px 22px", marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>What do these numbers mean?</div>
            {[
              { term: "ARV (After Repair Value)", def: "The price you expect to sell the property for after all renovations are done. This is the most important number — get comparable sales from your area to estimate it." },
              { term: "Repair Costs", def: "Everything it costs to fix up the property — materials, labour, permits. Always get quotes from contractors and add 10-15% for surprises." },
              { term: "Purchase Price", def: "What you're paying to buy the property. The lower the better. Our calculator tells you the maximum you should pay (MAO) to still make a profit." },
              { term: "Hold Time", def: "How long you'll own the property — from purchase to when the sale closes. Every month costs money in taxes, insurance, and loan interest." },
            ].map((item, i, arr) => (
              <div key={item.term} style={{ paddingBottom: i < arr.length - 1 ? 12 : 0, marginBottom: i < arr.length - 1 ? 12 : 0, borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--blue)", marginBottom: 3 }}>{item.term}</div>
                <div style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.6 }}>{item.def}</div>
              </div>
            ))}
          </div>

          {/* Upgrade prompt */}
          <div style={{ background: "#0d1119", borderRadius: 14, padding: "20px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Want the full picture?</div>
            <div style={{ fontSize: 13, color: "var(--sub)", marginBottom: 16, lineHeight: 1.6 }}>Advanced Mode adds your exact loan terms, all closing costs, holding costs, and gives you a full deal grade with detailed breakdown.</div>
            <button onClick={() => setMode("advanced")} style={{ background: "var(--blue)", border: "none", borderRadius: 9, padding: "12px 28px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Open Full Analysis →
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07090f", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @media (max-width: 768px) {
          .flip-sidebar { display: none !important; }
          .flip-content { padding: 16px !important; }
          .flip-nav-links { display: none !important; }
          .flip-grid-4 { grid-template-columns: 1fr 1fr !important; }
          .flip-grid-2 { grid-template-columns: 1fr !important; }
          .flip-proj-table { font-size: 11px !important; }
          .flip-proj-table th, .flip-proj-table td { padding: 6px 6px !important; }
        }
        @media (max-width: 480px) {
          .flip-grid-4 { grid-template-columns: 1fr !important; }
        }
        input, select { font-size: 16px !important; }
      `}</style>

      <TopNav />

      {/* ── Body row (sidebar + content) ── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

      {/* ── Sidebar ── */}
      <div className="flip-sidebar" style={{ width: 230, background: "#0d1119", flexShrink: 0, display: "flex", flexDirection: "column", position: "sticky", top: 50, height: "calc(100vh - 50px)", overflowY: "auto" }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
            <span style={{ color: "var(--blue)" }}>Flip</span>Analyzer
          </div>
          <div style={{ fontSize: 10, color: "var(--dim)", letterSpacing: 1.2, marginTop: 3, textTransform: "uppercase" }}>Real Estate Deal Calculator</div>
          {/* Country Toggle */}
          <div style={{ display: "flex", marginTop: 12, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 3, gap: 2 }}>
            {["US", "CA"].map(c => (
              <button key={c} onClick={() => switchCountry(c)} style={{
                flex: 1, padding: "5px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, transition: "all 0.15s",
                background: country === c ? "var(--blue)" : "transparent",
                color: country === c ? "#fff" : "var(--sub)",
              }}>{c === "US" ? "🇺🇸 US" : "🇨🇦 CA"}</button>
            ))}
          </div>
        </div>

        {/* Property Quick ID */}
        {v.address && (
          <div style={{ padding: "12px 16px", background: "rgba(59,158,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.05)", margin: "0" }}>
            <div style={{ fontSize: 11, color: "var(--blue)", fontWeight: 600, marginBottom: 2 }}>Current Deal</div>
            <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500, lineHeight: 1.4 }}>{v.address}</div>
            {v.city && <div style={{ fontSize: 10, color: "var(--sub)" }}>{v.city}</div>}
          </div>
        )}

        {/* Nav */}
        <nav style={{ padding: "14px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
          {navItems.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? "rgba(59,158,255,0.15)" : "transparent",
              border: `1px solid ${tab === t.id ? "rgba(59,158,255,0.35)" : "transparent"}`,
              borderRadius: 8, padding: "10px 13px", color: tab === t.id ? "#93c5fd" : "var(--sub)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: 9, transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>

        {/* Deal Actions */}
        <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={exportDeal} style={{ width: "100%", background: "rgba(59,158,255,0.12)", border: "1px solid rgba(59,158,255,0.25)", borderRadius: 8, padding: "8px 13px", color: "#93c5fd", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(59,158,255,0.2)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(59,158,255,0.12)"}>
            <span>📊</span> Export Excel
          </button>
          <button onClick={() => exportFlipPDF(v, c)} style={{ width: "100%", background: "rgba(242,92,92,0.1)", border: "1px solid rgba(242,92,92,0.25)", borderRadius: 8, padding: "8px 13px", color: "var(--red)", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(242,92,92,0.2)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(242,92,92,0.1)"}>
            <span>📄</span> Export PDF
          </button>
          <label style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 13px", color: "var(--sub)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxSizing: "border-box", transition: "all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
            <span>⬆</span> Import Deal
            <input type="file" accept=".xlsx" onChange={importDeal} style={{ display: "none" }} />
          </label>
          <button onClick={reset} style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 13px", color: "var(--dim)", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
            <span>↺</span> Reset to Defaults
          </button>
          <button onClick={() => setMode("beginner")} style={{ width: "100%", background: "rgba(59,158,255,0.07)", border: "1px solid rgba(59,158,255,0.2)", borderRadius: 8, padding: "8px 13px", color: "var(--blue)", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
            <span>🏠</span> Beginner Mode
          </button>
        </div>

        {/* Other Tools */}
        <div style={{ padding: "12px 10px 0", borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: 12 }}>
          <div style={{ fontSize: 10, color: "var(--dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, paddingLeft: 6 }}>Other Tools</div>
          {[
            { href: "/commercial", icon: "🏢", label: "Multifamily Underwriter" },
            { href: "/brrrr",     icon: "🔄", label: "BRRRR Calculator" },
            { href: "/compare",   icon: "⚡", label: "Deal Comparison" },
            { href: "/analyze",   icon: "🏠", label: "All Tools" },
          ].map(t => (
            <a key={t.href} href={t.href} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "var(--sub)", textDecoration: "none", marginBottom: 2, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--sub)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--sub)"; }}>
              <span>{t.icon}</span>{t.label}
            </a>
          ))}
        </div>

        {/* Deal Snapshot */}
        <div style={{ marginTop: "auto", padding: "16px 16px 22px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {/* Deal Grade */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", background: c.gradeBg, border: `1px solid ${c.gradeColor}33`, borderRadius: 10 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.gradeColor, fontFamily: "'Fira Code', monospace", lineHeight: 1 }}>{c.grade}</div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: c.gradeColor, textTransform: "uppercase", letterSpacing: 0.5 }}>Deal Grade</div>
              <div style={{ fontSize: 10, color: "var(--sub)" }}>Score: {c.score}/100</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "var(--dim)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Live Snapshot <span style={{ color: "var(--sub)", fontWeight: 400 }}>({L.currency})</span></div>
          {[
            { label: "ARV", val: fmt(v.arv) },
            { label: "Net Profit", val: fmt(c.netProfit), color: isProfit ? "#34d399" : "#f87171" },
            { label: "Total Costs", val: fmt(c.totalCosts) },
            { label: "ROI", val: fmtPct(c.roiTotal) },
            { label: "MAO", val: fmt(c.mao), color: num(v.purchasePrice) <= c.mao ? "#34d399" : "#f87171" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--sub)" }}>{item.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Fira Code', monospace", color: item.color || "var(--sub)" }}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, padding: "30px 30px 50px", overflowY: "auto", maxWidth: "calc(100vw - 230px)" }}>

        {/* Toast notifications */}
        {(importSuccess || importError) && (
          <div style={{ position: "fixed", top: 20, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
            {importSuccess && (
              <div style={{ background: "rgba(52,217,138,0.08)", border: "1px solid #86efac", borderRadius: 10, padding: "12px 18px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 280 }}>
                <span style={{ fontSize: 16 }}>✅</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>Deal loaded successfully</div>
                  <div style={{ fontSize: 11, color: "#4ade80" }}>All fields have been restored from your Excel file</div>
                </div>
              </div>
            )}
            {importError && (
              <div style={{ background: "rgba(242,92,92,0.08)", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 18px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 280 }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c" }}>Import failed</div>
                  <div style={{ fontSize: 11, color: "#f87171" }}>{importError}</div>
                </div>
                <button onClick={() => setImportError("")} style={{ marginLeft: "auto", background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            )}
          </div>
        )}
        {/* Page Header */}
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: -0.5 }}>
              {tab === "inputs" && "Deal Inputs"}
              {tab === "summary" && "Summary & Returns"}
              {tab === "definitions" && "Reference Guide"}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--sub)" }}>
              {tab === "inputs" && "Complete all 7 steps to generate your full deal analysis"}
              {tab === "summary" && "Full profit breakdown, MAO analysis, and return metrics"}
              {tab === "definitions" && "Methodology, workflow guidance, and definitions for every term in the calculator"}
            </p>
          </div>
          {tab === "inputs" && (
            <button onClick={() => setTab("summary")} style={{ background: "var(--blue)", color: "#fff", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, boxShadow: "0 2px 8px rgba(59,158,255,0.3)" }}>
              View Summary →
            </button>
          )}
        </div>

        {/* ── INPUTS TAB ── */}
        {tab === "inputs" && (
          <div>
            {/* Quick Analyze */}
            <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #134e4a 100%)", borderRadius: 14, padding: "22px 24px", marginBottom: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ background: "var(--blue)", color: "#fff", borderRadius: 6, padding: "3px 9px", fontSize: 10, fontWeight: 800, letterSpacing: 0.8 }}>QUICK ANALYZE</span>
                <span style={{ fontSize: 12, color: "var(--sub)" }}>Enter just 4 numbers for an instant deal snapshot — fill in the full steps below for a precise analysis</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0 14px", marginBottom: 16, alignItems: "end" }}>
                {[
                  { label: "After Repair Value (ARV)", key: "arv", prefix: "$", tooltip: "Your expected sale price after all repairs are done." },
                  { label: "Purchase Price", key: "purchasePrice", prefix: "$", tooltip: "The price you're paying to acquire the property." },
                  { label: "Estimated Repair Costs", key: "repairCosts", prefix: "$", tooltip: "Total rehab budget." },
                  { label: "Hold Time", key: "holdMonths", suffix: "months", tooltip: "Months from purchase to sale closing." },
                ].map(f => (
                  <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 10, color: "var(--sub)", fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", display: "flex", alignItems: "center", minHeight: 28 }}>
                      {f.label}{f.tooltip && <Tooltip text={f.tooltip} />}
                    </label>
                    <div style={{ position: "relative" }}>
                      {f.prefix && <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--sub)", fontSize: 12, fontFamily: "'Fira Code', monospace", pointerEvents: "none" }}>{f.prefix}</span>}
                      <input type="number" value={v[f.key]} onChange={e => set(f.key)(e.target.value)}
                        style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: `9px ${f.suffix ? "52px" : "10px"} 9px ${f.prefix ? "22px" : "10px"}`, fontSize: 14, color: "rgba(255,255,255,0.04)", fontFamily: "'Fira Code', monospace", outline: "none", boxSizing: "border-box" }} />
                      {f.suffix && <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "var(--sub)", fontSize: 11, pointerEvents: "none" }}>{f.suffix}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {/* Quick results strip */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                {[
                  { label: "Net Profit", val: fmt(c.netProfit), color: c.netProfit >= 0 ? "#34d399" : "#f87171" },
                  { label: "Total Cost ROI", val: fmtPct(c.roiTotal), color: "#93c5fd" },
                  { label: "Max Allowable Offer", val: fmt(c.mao), color: "#fcd34d" },
                  { label: "Purchase vs MAO", val: num(v.purchasePrice) <= c.mao ? "✅ Within MAO" : "⚠️ Above MAO", color: num(v.purchasePrice) <= c.mao ? "#34d399" : "#f87171" },
                  { label: "Deal Grade", val: c.grade, color: c.gradeColor },
                ].map(item => (
                  <div key={item.label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 9, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "var(--sub)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>{item.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: item.color, fontFamily: "'Fira Code', monospace", lineHeight: 1 }}>{item.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1 */}
            <Card step="1" title="Property Details" subtitle="Basic property information and identification">
              <Grid cols={3} gap="14px 18px">
                <Field label="Property Address" value={v.address} onChange={set("address")} type="text" span={2}
                  tooltip="Full street address of the subject property." />
                <Field label={L.cityState} value={v.city} onChange={set("city")} type="text"
                  tooltip="City, state, and zip code." />
                <Field label="Total Square Footage" value={v.sqft} onChange={set("sqft")} suffix="sqft"
                  tooltip="Total interior square footage. Used to calculate cost per square foot as a market benchmark." />
                <Field label="# of Units" value={v.units} onChange={set("units")}
                  tooltip="Number of residential units. Enter 1 for a single family home." />
                <Field label="Currently Occupied?" value={v.occupied} onChange={set("occupied")} type="select"
                  tooltip="Whether the property is currently occupied by tenants or the owner. Affects insurance type." />
              </Grid>
              <div style={{ marginTop: 18, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16 }}>
                <Grid cols={2} gap="14px 18px">
                  <Field label="Evaluator Name" value={v.evaluator} onChange={set("evaluator")} type="text"
                    tooltip="Name of the person analyzing this deal." />
                  <Field label="Property Description" value={v.description} onChange={set("description")} type="text"
                    tooltip="Key details: property type, layout, condition highlights, # of beds/baths, garage, etc." />
                </Grid>
              </div>
              <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Buyer Info (for Offer Letter)</div>
                <Grid cols={3} gap="14px 18px">
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, color: "var(--sub)", fontWeight: 600, letterSpacing: 0.3 }}>Buyer Name</label>
                    <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Your full name"
                      style={{ width: "100%", background: "#0d1119", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 11px", fontSize: 13, color: "var(--text)", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                      onFocus={e => { e.target.style.borderColor = "var(--blue)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,158,255,0.1)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, color: "var(--sub)", fontWeight: 600, letterSpacing: 0.3 }}>Buyer Phone</label>
                    <input type="text" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="(555) 555-5555"
                      style={{ width: "100%", background: "#0d1119", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 11px", fontSize: 13, color: "var(--text)", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                      onFocus={e => { e.target.style.borderColor = "var(--blue)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,158,255,0.1)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, color: "var(--sub)", fontWeight: 600, letterSpacing: 0.3 }}>Company Name</label>
                    <input type="text" value={buyerCompany} onChange={e => setBuyerCompany(e.target.value)} placeholder="Your company"
                      style={{ width: "100%", background: "#0d1119", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "9px 11px", fontSize: 13, color: "var(--text)", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                      onFocus={e => { e.target.style.borderColor = "var(--blue)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,158,255,0.1)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }} />
                  </div>
                </Grid>
              </div>
            </Card>

            {/* Property Map & Lookup */}
            {(v.address || v.city) && (() => {
              const fullAddr = encodeURIComponent((v.address + " " + v.city).trim());
              const mapsUrl  = `https://maps.google.com/maps?q=${fullAddr}&output=embed&z=17&t=k`;
              const openUrl  = `https://www.google.com/maps/search/${fullAddr}`;
              const svUrl    = `https://www.google.com/maps?q=${fullAddr}&layer=c`;
              return (
                <Card step="" title="📍 Property Map & Lookup" subtitle="Satellite view + auto-fill property data from public records">
                  {/* Map embed */}
                  <div style={{borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)",marginBottom:14,position:"relative"}}>
                    <iframe
                      title="property-map"
                      src={mapsUrl}
                      width="100%" height="260"
                      style={{display:"block",border:"none"}}
                      loading="lazy"
                      allowFullScreen
                    />
                  </div>

                  {/* Map action buttons */}
                  <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
                    <a href={openUrl} target="_blank" rel="noopener noreferrer"
                      style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(59,158,255,0.1)",border:"1px solid rgba(59,158,255,0.2)",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:600,color:"var(--blue)",textDecoration:"none"}}>
                      🗺️ Open in Google Maps
                    </a>
                    <a href={svUrl} target="_blank" rel="noopener noreferrer"
                      style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(52,217,138,0.08)",border:"1px solid rgba(52,217,138,0.2)",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:600,color:"var(--green)",textDecoration:"none"}}>
                      🚶 Street View
                    </a>
                    <a href={`https://www.realtor.ca/map#view=list&Sort=6-D&PropertyTypeGroupID=1&TransactionTypeId=2&Currency=CAD&SearchId=${fullAddr}`} target="_blank" rel="noopener noreferrer"
                      style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(240,160,48,0.08)",border:"1px solid rgba(240,160,48,0.2)",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:600,color:"var(--amber)",textDecoration:"none"}}>
                      🏠 Realtor.ca
                    </a>
                    <a href={`https://www.zillow.com/homes/${fullAddr}_rb/`} target="_blank" rel="noopener noreferrer"
                      style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(167,130,255,0.08)",border:"1px solid rgba(167,130,255,0.2)",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:600,color:"var(--purple)",textDecoration:"none"}}>
                      🔵 Zillow
                    </a>
                    <a href={`https://www.redfin.com/search#location=${fullAddr}`} target="_blank" rel="noopener noreferrer"
                      style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(242,92,92,0.08)",border:"1px solid rgba(242,92,92,0.2)",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:600,color:"var(--red)",textDecoration:"none"}}>
                      🔴 Redfin
                    </a>
                    <a href={`https://www.realtor.com/realestateandhomes-search/${fullAddr}`} target="_blank" rel="noopener noreferrer"
                      style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(52,217,138,0.07)",border:"1px solid rgba(52,217,138,0.2)",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:600,color:"var(--green)",textDecoration:"none"}}>
                      🟢 Realtor.com
                    </a>
                  </div>

                  {/* Rentcast Lookup */}
                  <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:14}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:10}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>Auto-fill from property records</div>
                        <div style={{fontSize:11.5,color:"var(--sub)",marginTop:2}}>Pulls estimated value, sq ft, taxes from public data (US addresses)</div>
                      </div>
                      <button
                        onClick={lookupProperty}
                        disabled={lookupLoading}
                        style={{background:lookupLoading?"rgba(59,158,255,0.05)":"rgba(59,158,255,0.12)",border:"1px solid rgba(59,158,255,0.3)",borderRadius:9,padding:"9px 18px",fontSize:13,fontWeight:700,color:"var(--blue)",cursor:lookupLoading?"not-allowed":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}>
                        {lookupLoading ? "⏳ Looking up…" : "🔍 Look Up Property Data →"}
                      </button>
                    </div>

                    {lookupError && (
                      <div style={{background:"rgba(242,92,92,0.08)",border:"1px solid rgba(242,92,92,0.2)",borderRadius:9,padding:"10px 14px",fontSize:12.5,color:"var(--red)"}}>
                        ⚠️ {lookupError}
                      </div>
                    )}

                    {lookupData && (
                      <div style={{background:"rgba(52,217,138,0.05)",border:"1px solid rgba(52,217,138,0.2)",borderRadius:12,padding:"14px 16px"}}>
                        <div style={{fontSize:11,fontWeight:700,color:"var(--green)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>✅ Property Found — Public Records</div>

                        {/* Property facts row */}
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8,marginBottom:12}}>
                          {[
                            {label:"Beds / Baths",    val: lookupData.bedrooms && lookupData.bathrooms ? `${lookupData.bedrooms} bd / ${lookupData.bathrooms} ba` : lookupData.bedrooms ? `${lookupData.bedrooms} bed` : "—"},
                            {label:"Sq Footage",       val: lookupData.squareFootage ? (lookupData.squareFootage).toLocaleString() + " sqft" : "—"},
                            {label:"Year Built",       val: lookupData.yearBuilt     || "—"},
                            {label:"Property Type",    val: lookupData.propertyType  || "—"},
                            {label:"Last Sale Price",  val: lookupData.lastSalePrice ? fmt(lookupData.lastSalePrice) : "—"},
                            {label:"Last Sale Date",   val: lookupData.lastSaleDate  ? new Date(lookupData.lastSaleDate).toLocaleDateString('en-US',{year:'numeric',month:'short'}) : "—"},
                          ].map(item => (
                            <div key={item.label} style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"8px 10px"}}>
                              <div style={{fontSize:9.5,color:"var(--sub)",fontWeight:600,marginBottom:3,textTransform:"uppercase"}}>{item.label}</div>
                              <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{item.val}</div>
                            </div>
                          ))}
                        </div>

                        {/* AVM + Rent estimates — highlighted */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                          <div style={{background:"rgba(59,158,255,0.08)",border:"1px solid rgba(59,158,255,0.2)",borderRadius:10,padding:"10px 13px"}}>
                            <div style={{fontSize:9.5,color:"var(--sub)",fontWeight:600,marginBottom:4,textTransform:"uppercase"}}>🏠 Estimated Value (AVM)</div>
                            <div style={{fontSize:18,fontWeight:800,color:"var(--blue)",fontFamily:"'Fira Code',monospace"}}>{lookupData.estimatedValue ? fmt(lookupData.estimatedValue) : "—"}</div>
                            {lookupData.estimatedValueLow && lookupData.estimatedValueHigh && (
                              <div style={{fontSize:10.5,color:"var(--sub)",marginTop:3}}>Range: {fmt(lookupData.estimatedValueLow)} – {fmt(lookupData.estimatedValueHigh)}</div>
                            )}
                          </div>
                          <div style={{background:"rgba(52,217,138,0.08)",border:"1px solid rgba(52,217,138,0.2)",borderRadius:10,padding:"10px 13px"}}>
                            <div style={{fontSize:9.5,color:"var(--sub)",fontWeight:600,marginBottom:4,textTransform:"uppercase"}}>💰 Rent Estimate / mo</div>
                            <div style={{fontSize:18,fontWeight:800,color:"var(--green)",fontFamily:"'Fira Code',monospace"}}>{lookupData.rentEstimate ? fmt(lookupData.rentEstimate) : "—"}</div>
                            {lookupData.rentEstimateLow && lookupData.rentEstimateHigh && (
                              <div style={{fontSize:10.5,color:"var(--sub)",marginTop:3}}>Range: {fmt(lookupData.rentEstimateLow)} – {fmt(lookupData.rentEstimateHigh)}</div>
                            )}
                          </div>
                        </div>

                        {lookupData.propertyTaxes && (
                          <div style={{fontSize:11.5,color:"var(--sub)",marginBottom:10}}>
                            📋 Annual property taxes on record: <strong style={{color:"var(--text)"}}>{fmt(lookupData.propertyTaxes)}/yr</strong>
                          </div>
                        )}

                        <button
                          onClick={autoFillFromLookup}
                          style={{width:"100%",background:lookupFilled?"rgba(52,217,138,0.15)":"rgba(52,217,138,0.1)",border:"1px solid rgba(52,217,138,0.3)",borderRadius:9,padding:"11px",fontSize:13,fontWeight:700,color:"var(--green)",cursor:"pointer",fontFamily:"inherit"}}>
                          {lookupFilled ? "✅ Fields updated!" : "⬇️ Auto-fill ARV, sq ft, taxes, description, last sale price →"}
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}

            {/* Step 2 */}
            <Card step="2" title="Property Values & Pricing" subtitle="Enter ARV, repair estimate, purchase price, and hold time">
              <Grid cols={3} gap="14px 18px">
                <Field label="After Repair Value (ARV)" value={v.arv} onChange={set("arv")} prefix="$"
                  tooltip="The estimated market value after all repairs. This is your projected sale price — the single most important number in the deal." />
                <Field label="Current 'As Is' Value" value={v.asIsValue} onChange={set("asIsValue")} prefix="$"
                  tooltip="Property value in current condition without any repairs. Helps measure value-add opportunity." />
                <Field label="Estimated Repair Costs" value={v.repairCosts} onChange={set("repairCosts")} prefix="$"
                  tooltip="Total rehab budget. Should come from a detailed line-item construction estimate for accuracy." />
                <Field label="Purchase Price" value={v.purchasePrice} onChange={set("purchasePrice")} prefix="$"
                  tooltip="The price you're paying to acquire the property. Compare against the MAO below." />
                <Field label="Estimated Hold Time" value={v.holdMonths} onChange={set("holdMonths")} suffix="months"
                  tooltip="Number of months from purchase closing to sale closing. This drives all time-based costs." />
                <Field label="Misc. Property Costs" value={v.miscPropertyCosts} onChange={set("miscPropertyCosts")} prefix="$"
                  tooltip="Any unusual deal-specific costs not captured elsewhere." />
              </Grid>
              {/* Quick indicators */}
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  { label: "Cost Per Sqft", val: fmt(c.costPerSqft), icon: "📐" },
                  { label: "Max Allowable Offer", val: fmt(c.mao), icon: "🎯" },
                  { label: "Purchase vs MAO", val: num(v.purchasePrice) <= c.mao ? "✅ Within MAO" : "⚠️ Above MAO", color: num(v.purchasePrice) <= c.mao ? "var(--green)" : "var(--red)" },
                ].map(item => (
                  <div key={item.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, color: "var(--sub)", fontWeight: 600, marginBottom: 4 }}>{item.icon && item.icon + " "}{item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: item.color || "var(--blue)", fontFamily: "'Fira Code', monospace" }}>{item.val}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Step 4 – Financing */}
            <Card step="4" title="Financing Costs" subtitle="Enter loan details for up to 3 positions (1st, 2nd, Misc)">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "1st Mortgage / Lien", ak: "loan1Amount", pk: "loan1Points", rk: "loan1Rate", intAmt: c.loan1Interest, ptsAmt: c.loan1PointsAmt },
                  { label: "2nd Mortgage / Lien", ak: "loan2Amount", pk: "loan2Points", rk: "loan2Rate", intAmt: c.loan2Interest, ptsAmt: c.loan2PointsAmt },
                  { label: "Misc. Mortgage / Lien", ak: "loanMiscAmount", pk: "loanMiscPoints", rk: "loanMiscRate", intAmt: c.loanMiscInterest, ptsAmt: c.loanMiscPointsAmt },
                ].map((l, i) => (
                  <div key={l.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>{l.label}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 14px" }}>
                      <Field label="Loan Amount" value={v[l.ak]} onChange={set(l.ak)} prefix="$"
                        tooltip="Dollar amount borrowed for this position." />
                      <Field label="Points (%)" value={v[l.pk]} onChange={set(l.pk)} suffix="%"
                        tooltip="Upfront lender fee as % of loan. 1 point = 1%." hint={`Fee: ${fmt(l.ptsAmt)}`} />
                      <Field label="Annual Interest Rate" value={v[l.rk]} onChange={set(l.rk)} suffix="%"
                        tooltip="Yearly interest rate. Calculated over your hold period." hint={`Total interest: ${fmt(l.intAmt)}`} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14 }}>
                <Grid cols={3} gap="10px 14px">
                  <Field label="Misc. Financing Costs" value={v.miscFinancingCosts} onChange={set("miscFinancingCosts")} prefix="$"
                    tooltip="Other lender fees: origination, underwriting, wire fees, etc." />
                </Grid>
              </div>
              <SubtotalBar label="Total Financing Costs" value={fmt(c.totalFinancing)} />
            </Card>

            {/* Step 5 – Buying */}
            <Card step="5" title="Buying Transaction Costs" subtitle="Costs paid at closing when you purchase the property">
              <Grid cols={3} gap="14px 18px">
                <Field label={L.escrowBuy} value={v.buyEscrowFees} onChange={set("buyEscrowFees")} prefix="$"
                  tooltip={isCA ? "Fees paid to the real estate lawyer for facilitating the purchase transaction." : "Fees to the escrow company or closing attorney for facilitating the purchase transaction."} />
                <Field label="Title Insurance (% of repairs)" value={v.buyTitlePct} onChange={set("buyTitlePct")} suffix="%"
                  tooltip="Title policy cost = $500 base + this % of repair costs. Research your local underwriter rate." hint={`Total: $500 + ${v.buyTitlePct}% of repairs = ${fmt(c.buyTitle)}`} />
                <Field label="Misc. Buying Costs" value={v.buyMiscCosts} onChange={set("buyMiscCosts")} prefix="$"
                  tooltip="Inspections, appraisals, environmental reports, HOA transfer fees, etc." />
              </Grid>
              <SubtotalBar label="Total Buying Transaction Costs" value={fmt(c.totalBuying)} />
            </Card>

            {/* Step 6 – Holding */}
            <Card step="6" title="Holding Costs (Monthly)" subtitle="Recurring monthly expenses during the rehab and hold period">
              <Grid cols={4} gap="12px 16px">
                <Field label="Property Taxes (Annual)" value={v.propTaxAnnual} onChange={set("propTaxAnnual")} prefix="$"
                  tooltip="Annual property tax from county assessor. Divided by 12 for monthly cost." hint={`${fmt(c.propTaxMonthly)}/mo`} />
                <Field label="HOA / Condo Fees" value={v.hoaMonthly} onChange={set("hoaMonthly")} prefix="$" suffix="/mo"
                  tooltip="Monthly HOA fees. If quarterly, divide by 3." />
                <Field label="Insurance (Annual)" value={v.insuranceAnnual} onChange={set("insuranceAnnual")} prefix="$"
                  tooltip="Annual vacant property insurance premium. Divided by 12 for monthly." hint={`${fmt(c.insuranceMonthly)}/mo`} />
                <Field label="Misc. Holding Costs" value={v.miscHoldingMonthly} onChange={set("miscHoldingMonthly")} prefix="$" suffix="/mo"
                  tooltip="Any other recurring monthly costs not listed above." />
              </Grid>
              <div style={{ marginTop: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sub)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Utility Costs (Monthly)</div>
                <Grid cols={4} gap="10px 14px">
                  <Field label="Gas" value={v.utilGas} onChange={set("utilGas")} prefix="$" suffix="/mo" tooltip="Monthly gas utility." />
                  <Field label="Water" value={v.utilWater} onChange={set("utilWater")} prefix="$" suffix="/mo" tooltip="Monthly water utility." />
                  <Field label="Electricity" value={v.utilElec} onChange={set("utilElec")} prefix="$" suffix="/mo" tooltip="Monthly electricity utility." />
                  <Field label="Other" value={v.utilOther} onChange={set("utilOther")} prefix="$" suffix="/mo" tooltip="Any other utilities." />
                </Grid>
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(52,217,138,0.06)", border: "1px solid #99f6e4", borderRadius: 9 }}>
                <span style={{ fontSize: 12, color: "#0f766e" }}>
                  <strong>{fmt(c.totalMonthlyHolding)}/mo</strong> × {num(v.holdMonths)} months
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--blue)", fontFamily: "'Fira Code', monospace" }}>
                  Total: {fmt(c.totalHolding)}
                </span>
              </div>
            </Card>

            {/* Step 7 – Selling */}
            <Card step="7" title="Selling Transaction Costs" subtitle="All costs incurred when you sell the property">
              <Grid cols={4} gap="12px 16px">
                <Field label={L.escrowSell} value={v.sellEscrowFees} onChange={set("sellEscrowFees")} prefix="$"
                  tooltip={isCA ? "Fees paid to the real estate lawyer at the time of sale." : "Escrow or closing attorney fees on the sell side."} />
                <Field label="Recording Fees" value={v.sellRecordingFees} onChange={set("sellRecordingFees")} prefix="$"
                  tooltip="County recorder fees for documenting the transfer of ownership." />
                {/* ── Tiered Realtor Commission ── */}
                <div style={{ gridColumn: "span 4", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0d1119" }}>Realtor Commission</div>
                      <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 2 }}>
                        {v.realtorTiered ? `Tiered: ${v.realtorTier1Pct}% on first ${fmt(v.realtorTier1Cap)}, ${v.realtorTier2Pct}% on remainder` : "Flat percentage of sale price"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 0, background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: 3 }}>
                      {[{ label: "Flat %", val: false }, { label: "Tiered", val: true }].map(opt => (
                        <button key={String(opt.val)} onClick={() => set("realtorTiered")(opt.val)}
                          style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                            background: v.realtorTiered === opt.val ? "var(--blue)" : "transparent",
                            color: v.realtorTiered === opt.val ? "#fff" : "var(--sub)" }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!v.realtorTiered ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", alignItems: "end" }}>
                      <Field label="Commission Rate" value={v.realtorPct} onChange={set("realtorPct")} suffix="%"
                        tooltip="Total commission paid to both agents. Typically 5–6% in the US, 3–5% in Canada." hint={`= ${fmt(c.realtorFees)}`} />
                      <div style={{ background: "#0d1119", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "10px 14px" }}>
                        <div style={{ fontSize: 10, color: "var(--sub)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Total Commission</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--blue)", fontFamily: "'Fira Code', monospace" }}>{fmt(c.realtorFees)}</div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 14px", marginBottom: 12 }}>
                        <Field label="Tier 1 Rate" value={v.realtorTier1Pct} onChange={set("realtorTier1Pct")} suffix="%"
                          tooltip="Commission rate applied to the first portion of the sale price." />
                        <Field label="Tier 1 Up To" value={v.realtorTier1Cap} onChange={set("realtorTier1Cap")} prefix="$"
                          tooltip="The sale price threshold where Tier 1 ends and Tier 2 begins. Standard in Alberta is $100,000." />
                        <Field label="Tier 2 Rate" value={v.realtorTier2Pct} onChange={set("realtorTier2Pct")} suffix="%"
                          tooltip="Commission rate applied to everything above the Tier 1 threshold." />
                      </div>
                      {/* Live breakdown */}
                      <div style={{ background: "#0d1119", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "12px 14px" }}>
                        <div style={{ fontSize: 10, color: "var(--sub)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Commission Breakdown</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--sub)" }}>
                            <span>{v.realtorTier1Pct}% on first {fmt(Math.min(num(v.arv), num(v.realtorTier1Cap)))}</span>
                            <span style={{ fontFamily: "'Fira Code', monospace", fontWeight: 600 }}>{fmt(Math.min(num(v.arv), num(v.realtorTier1Cap)) * (num(v.realtorTier1Pct)/100))}</span>
                          </div>
                          {num(v.arv) > num(v.realtorTier1Cap) && (
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--sub)" }}>
                              <span>{v.realtorTier2Pct}% on remaining {fmt(num(v.arv) - num(v.realtorTier1Cap))}</span>
                              <span style={{ fontFamily: "'Fira Code', monospace", fontWeight: 600 }}>{fmt((num(v.arv) - num(v.realtorTier1Cap)) * (num(v.realtorTier2Pct)/100))}</span>
                            </div>
                          )}
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--blue)", fontWeight: 800, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 6, marginTop: 2 }}>
                            <span>Total Commission</span>
                            <span style={{ fontFamily: "'Fira Code', monospace" }}>{fmt(c.realtorFees)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <Field label={L.transfer} value={v.transferPct} onChange={set("transferPct")} suffix="%"
                  tooltip={isCA ? "Land Transfer Tax varies by province — Ontario up to 2.5%, BC up to 3%. Toronto adds a municipal layer on top." : "County transfer tax — varies significantly by location. Research your specific county rate."} hint={`= ${fmt(c.transferFees)}`} />
                <Field label="Home Warranty" value={v.homeWarranty} onChange={set("homeWarranty")} prefix="$"
                  tooltip="1-year warranty on mechanical systems offered to buyer. Typically $400–$600." />
                <Field label="Staging Costs" value={v.stagingCosts} onChange={set("stagingCosts")} prefix="$"
                  tooltip="Cost to furnish the property for showings. Staged homes sell faster and at higher prices." />
                <Field label="Marketing Costs" value={v.marketingCosts} onChange={set("marketingCosts")} prefix="$"
                  tooltip="Photography, virtual tours, online listings, print materials, signage." />
                <Field label="Misc. Selling Costs" value={v.miscSellingCosts} onChange={set("miscSellingCosts")} prefix="$"
                  tooltip="Any other costs related to selling the property." />
              </Grid>
              <SubtotalBar label="Total Selling Transaction Costs" value={fmt(c.totalSelling)} />
            </Card>

            {/* Committed Capital */}
            <Card title="My Committed Capital" subtitle="Used to calculate your personal Cash-on-Cash return">
              <Grid cols={3} gap="14px 18px">
                <Field label="My Cash Out of Pocket" value={v.myCash} onChange={set("myCash")} prefix="$"
                  tooltip="The actual cash you personally invest: down payment, out-of-pocket repair costs, and any other funds you bring to the deal. Used to calculate your personal Cash-on-Cash Return." />
              </Grid>
            </Card>

            {/* Deal Notes */}
            <Card title="Deal Notes" subtitle="Save observations, red flags, or key details about this property">
              <Field label="" value={v.notes} onChange={set("notes")} type="textarea"
                tooltip="Free-form notes about the deal — comparable sales, neighborhood observations, contractor quotes, risks, etc." />
            </Card>

            {/* ── BRRRR / Refinance Strategy ── */}
            <Card title="🔄 BRRRR / Refinance Strategy" subtitle="Model this deal as a hold — see if you can pull all your cash out at refinance">
              <div style={{background:"rgba(167,130,255,0.05)",border:"1px solid rgba(167,130,255,0.18)",borderRadius:10,padding:"10px 14px",marginBottom:14}}>
                <div style={{fontSize:11.5,color:"var(--sub, var(--sub))",lineHeight:1.6}}>
                  Instead of selling, refinance at ARV to recycle your capital. Enter the bank's terms below to see how much cash you get back. All cash-in numbers are pulled from your inputs above.
                  {" "}<a href="https://www.bankofcanada.ca/rates/interest-rates/canadian-interest-rates/" target="_blank" rel="noopener noreferrer" style={{color:"var(--purple)",fontWeight:600}}>View current bank rates →</a>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <div style={{fontSize:11,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:"0.4px"}}>Refinance LTV %</div>
                  <input style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:9,padding:"10px 13px",fontSize:14,color:"var(--text)",outline:"none",width:"100%"}}
                    type="number" placeholder="80" value={brrrrForm.ltv} onChange={e=>setB("ltv",e.target.value)} />
                  {calcBRRRR && <span style={{fontSize:11,color:"var(--purple)",fontWeight:600}}>→ {fmt(calcBRRRR.loanAmt)} loan</span>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <div style={{fontSize:11,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:"0.4px"}}>Refi Rate %</div>
                  <input style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:9,padding:"10px 13px",fontSize:14,color:"var(--text)",outline:"none",width:"100%"}}
                    type="number" placeholder="5.5" value={brrrrForm.rate} onChange={e=>setB("rate",e.target.value)} />
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <div style={{fontSize:11,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:"0.4px"}}>Amortization (yrs)</div>
                  <input style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:9,padding:"10px 13px",fontSize:14,color:"var(--text)",outline:"none",width:"100%"}}
                    type="number" placeholder="25" value={brrrrForm.amort} onChange={e=>setB("amort",e.target.value)} />
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <div style={{fontSize:11,fontWeight:600,color:"var(--sub)",textTransform:"uppercase",letterSpacing:"0.4px"}}>Refi Closing Costs %</div>
                  <input style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:9,padding:"10px 13px",fontSize:14,color:"var(--text)",outline:"none",width:"100%"}}
                    type="number" placeholder="1.5" value={brrrrForm.closingPct} onChange={e=>setB("closingPct",e.target.value)} />
                  {calcBRRRR && <span style={{fontSize:11,color:"var(--amber)",fontWeight:600}}>→ {fmt(calcBRRRR.closingCosts)} cost</span>}
                </div>
              </div>
              {calcBRRRR && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:4}}>
                  <div style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
                    <div style={{fontSize:11,color:"var(--sub)",fontWeight:600,marginBottom:4}}>TOTAL CASH IN</div>
                    <div style={{fontSize:17,fontWeight:800,color:"var(--text)"}}>{fmt(calcBRRRR.totalCashIn)}</div>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
                    <div style={{fontSize:11,color:"var(--sub)",fontWeight:600,marginBottom:4}}>NET REFI PROCEEDS</div>
                    <div style={{fontSize:17,fontWeight:800,color:"var(--purple)"}}>{fmt(calcBRRRR.netProceeds)}</div>
                  </div>
                  <div style={{background:calcBRRRR.isTrueBRRRR?"rgba(52,217,138,0.07)":"rgba(59,158,255,0.06)",border:`1px solid ${calcBRRRR.isTrueBRRRR?"rgba(52,217,138,0.25)":"rgba(59,158,255,0.2)"}`,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
                    <div style={{fontSize:11,color:"var(--sub)",fontWeight:600,marginBottom:4}}>{calcBRRRR.isTrueBRRRR?"CASH PULLED OUT":"CASH LEFT IN"}</div>
                    <div style={{fontSize:17,fontWeight:800,color:calcBRRRR.isTrueBRRRR?"var(--green)":"var(--blue)"}}>{fmt(calcBRRRR.isTrueBRRRR?calcBRRRR.cashPulledOut:calcBRRRR.cashLeftIn)}</div>
                    <div style={{fontSize:10,color:"var(--sub)",marginTop:3}}>{calcBRRRR.isTrueBRRRR?"✅ True BRRRR":"Partial BRRRR"}</div>
                  </div>
                </div>
              )}
              {calcBRRRR && calcBRRRR.monthlyPmt > 0 && (
                <div style={{marginTop:10,background:"rgba(255,255,255,0.03)",borderRadius:9,padding:"9px 14px",display:"flex",justifyContent:"space-between",fontSize:12.5,color:"var(--sub)"}}>
                  <span>New monthly mortgage payment</span>
                  <span style={{fontWeight:700,color:"var(--text)"}}>{fmt(calcBRRRR.monthlyPmt)}/mo</span>
                </div>
              )}
            </Card>

            {/* Save Deal */}
            <div style={{marginTop:4}}>
              {dealSaved ? (
                <div style={{background:"rgba(52,217,138,0.08)",border:"1px solid rgba(52,217,138,0.25)",borderRadius:11,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:20}}>✅</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--green)"}}>Deal saved!</div>
                      <div style={{fontSize:11.5,color:"var(--sub)",marginTop:1}}>{v.address || "Flip Deal"}</div>
                    </div>
                  </div>
                  <a href="/compare" style={{background:"var(--green)",color:"#07090f",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:800,textDecoration:"none",flexShrink:0}}>View Saved Deals →</a>
                </div>
              ) : (
                <button onClick={saveFlipDeal} style={{width:"100%",background:"rgba(59,158,255,0.1)",border:"1px solid rgba(59,158,255,0.25)",borderRadius:11,padding:"14px 18px",color:"var(--text)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                  <span style={{fontSize:18}}>💾</span> Save This Deal · Compare with others →
                </button>
              )}
            </div>

            {/* Generate Offer Letter */}
            <div style={{marginTop:8}}>
              <button
                onClick={generateOfferLetter}
                style={{width:"100%",background:"rgba(52,217,138,0.08)",border:"1px solid rgba(52,217,138,0.2)",borderRadius:11,padding:"11px 18px",color:"var(--green)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:0}}
              >
                <span style={{fontSize:16}}>📄</span> Generate Offer Letter PDF
              </button>
            </div>

            {/* Generate Lender Package */}
            <div style={{marginTop:8}}>
              <button
                onClick={generateLenderPackage}
                style={{
                  width:"100%",
                  background:"rgba(59,158,255,0.08)",
                  border:"1px solid rgba(59,158,255,0.2)",
                  borderRadius:11,
                  padding:"11px 18px",
                  color:"var(--blue)",
                  fontSize:13,
                  fontWeight:700,
                  cursor:"pointer",
                  fontFamily:"inherit",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  gap:8,
                  marginBottom:8
                }}
              >
                <span style={{fontSize:16}}>🏦</span> Generate Lender Package PDF
              </button>
            </div>

            {/* Add to Pipeline */}
            <div style={{marginTop:8}}>
              <button
                onClick={() => {
                  const pipeline = JSON.parse(localStorage.getItem("rde_pipeline_v1") || "[]");
                  const newDeal = {
                    id: Date.now(),
                    address: v.address || "Untitled Deal",
                    city: v.city || "",
                    type: "flip",
                    stage: "analyzing",
                    source: "",
                    askingPrice: String(num(v.purchasePrice)),
                    purchasePrice: String(num(v.purchasePrice)),
                    arv: String(num(v.arv)),
                    repairCosts: String(num(v.repairCosts)),
                    projectedProfit: String(Math.round(c.netProfit)),
                    projectedROI: String((c.roiTotal * 100).toFixed(1)),
                    grade: c.grade,
                    notes: `Grade ${c.grade} · ${c.netProfit >= 0 ? "Profitable" : "Unprofitable"} · Added from Flip Analyzer`,
                    addedDate: new Date().toISOString().slice(0,10),
                    stageDate: new Date().toISOString().slice(0,10),
                  };
                  pipeline.unshift(newDeal);
                  localStorage.setItem("rde_pipeline_v1", JSON.stringify(pipeline));
                  window.location.href = "/pipeline";
                }}
                style={{width:"100%",background:"rgba(167,130,255,0.08)",border:"1px solid rgba(167,130,255,0.2)",borderRadius:11,padding:"11px 18px",color:"var(--purple)",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
              >
                <span style={{fontSize:16}}>🗂️</span> Add to Deal Pipeline →
              </button>
            </div>
          </div>
        )}

        {/* ── SUMMARY TAB ── */}
        {tab === "summary" && (
          <div>
            {/* ── AI Deal Analyst Button ─────────────────────────────── */}
            <button
              onClick={runAiAnalysis}
              disabled={aiLoading || !num(v.arv)}
              style={{
                width:"100%", marginBottom:16, padding:"14px 20px",
                background:"linear-gradient(135deg,rgba(167,130,255,0.15),rgba(59,158,255,0.1))",
                border:"1px solid rgba(167,130,255,0.35)", borderRadius:13,
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                cursor: aiLoading || !num(v.arv) ? "not-allowed" : "pointer",
                opacity: !num(v.arv) ? 0.5 : 1,
                transition:"all 0.15s", fontFamily:"inherit",
              }}
            >
              <span style={{fontSize:22}}>{aiLoading ? "⏳" : "🤖"}</span>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:14,fontWeight:800,color:"var(--purple)"}}>
                  {aiLoading ? "Analyzing deal…" : "Get AI Deal Analysis"}
                </div>
                <div style={{fontSize:11,color:"var(--sub)"}}>
                  {aiLoading ? "Claude is reviewing your numbers…" : "Plain-English verdict, risks, strengths & price recommendation"}
                </div>
              </div>
              {!aiLoading && <span style={{fontSize:18,marginLeft:"auto",color:"var(--purple)"}}>→</span>}
            </button>

            {/* Deal Grade Banner */}
            <div style={{ background: c.gradeBg, border: `1px solid ${c.gradeColor}33`, borderRadius: 14, padding: "18px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ fontSize: 52, fontWeight: 900, color: c.gradeColor, fontFamily: "'Fira Code', monospace", lineHeight: 1 }}>{c.grade}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: c.gradeColor }}>Deal Grade — Score {c.score}/100</div>
                <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 3 }}>
                  Based on Total ROI, Profit Margin, MAO compliance, and Annualized Cash-on-Cash Return
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {num(v.purchasePrice) <= c.mao && <span style={{ background: "#dcfce7", color: "#15803d", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>✅ Within MAO</span>}
                  {isProfit && <span style={{ background: "#dcfce7", color: "#15803d", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>✅ Profitable Deal</span>}
                  {c.roiTotal > 0.10 && <span style={{ background: "#dcfce7", color: "#15803d", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>✅ ROI &gt; 10%</span>}
                  {!isProfit && <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>⚠️ Deal is Unprofitable</span>}
                  {num(v.purchasePrice) > c.mao && <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20 }}>⚠️ Above MAO</span>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--sub)" }}>{v.address}</div>
                <div style={{ fontSize: 11, color: "var(--sub)" }}>{v.city}</div>
              </div>
            </div>

            {/* ── Deal Red Flags ─────────────────────────────────── */}
            {(() => {
              const flags = [];
              if (c.netProfit < 0)
                flags.push({ sev: "critical", msg: "Deal is unprofitable — ARV minus all costs is negative." });
              if (num(v.purchasePrice) > c.mao)
                flags.push({ sev: "critical", msg: `Purchase price is $${Math.round(num(v.purchasePrice) - c.mao).toLocaleString()} above MAO. Reduce offer or cut costs.` });
              if (c.profitMargin < 0.08 && c.profitMargin >= 0)
                flags.push({ sev: "warning", msg: `Profit margin is ${(c.profitMargin * 100).toFixed(1)}% — below the 8% minimum target for a viable flip.` });
              if (num(v.repairCosts) > num(v.arv) * 0.5)
                flags.push({ sev: "warning", msg: "Repair costs exceed 50% of ARV. Verify your contractor bids — this is a heavy lift." });
              if (num(v.holdMonths) > 12)
                flags.push({ sev: "warning", msg: `${num(v.holdMonths)}-month hold is above average. Every extra month adds holding costs and market risk.` });
              if (num(v.arv) <= 0)
                flags.push({ sev: "critical", msg: "ARV is $0. Enter the estimated after-repair value to get accurate results." });
              if (num(v.loan1Amount) > num(v.arv) * 0.90)
                flags.push({ sev: "warning", msg: "Loan amount exceeds 90% of ARV. Most hard money lenders cap at 70–80% of ARV." });
              if (c.annualizedCoC < 0.12 && c.annualizedCoC >= 0 && num(v.myCash) > 0)
                flags.push({ sev: "warning", msg: `Annualized cash-on-cash return is ${(c.annualizedCoC * 100).toFixed(1)}% — below the 12% minimum for a strong flip.` });
              if (!flags.length) return null;
              return (
                <div style={{marginBottom:20,borderRadius:14,overflow:"hidden",border:"1px solid rgba(242,92,92,0.2)",background:"rgba(242,92,92,0.03)"}}>
                  <div style={{padding:"12px 18px",borderBottom:"1px solid rgba(242,92,92,0.12)",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:16}}>⚠️</span>
                    <span style={{fontSize:13,fontWeight:800,color:"var(--red)"}}>Deal Red Flags — {flags.length} issue{flags.length > 1 ? "s" : ""} detected</span>
                  </div>
                  {flags.map((f, i) => (
                    <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 18px",borderBottom:i<flags.length-1?"1px solid rgba(255,255,255,0.04)":"none"}}>
                      <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{f.sev === "critical" ? "🚨" : "⚠️"}</span>
                      <span style={{fontSize:13,color:f.sev === "critical" ? "var(--red)" : "var(--amber)",lineHeight:1.5}}>{f.msg}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Top Metrics */}
            <div className="flip-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
              <MetricCard label="Estimated Net Profit" value={fmt(c.netProfit)} sub="ARV minus all project costs"
                accent={isProfit ? "var(--blue)" : "var(--red)"}
                tooltip="ARV minus every cost category: purchase, repairs, financing, holding, buying, and selling costs." />
              <MetricCard label="Total Cost ROI" value={fmtPct(c.roiTotal)} sub="Net Profit ÷ Total Investment"
                accent="#3b82f6"
                tooltip="Return on Investment using every dollar deployed. A strong flip targets 10–15%+." />
              <MetricCard label="Purchase + Rehab ROI" value={fmtPct(c.roiPurchaseRehab)} sub="Profit ÷ (Purchase + Repair)"
                accent="#8b5cf6"
                tooltip="Quick-screen metric. Ignores time-based costs. Useful for comparing deals before full analysis." />
              <MetricCard label="Annualized Cash-on-Cash" value={fmtPct(c.annualizedCoC)} sub={`On ${fmt(num(v.myCash))} invested`}
                accent="#f59e0b"
                tooltip="Your personal return on out-of-pocket cash, annualized. Targets 20%+ for a strong flip." />
            </div>

            <div className="flip-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Left Column */}
              <div>
                <Card title="Deal Summary & Profit Breakdown">
                  <SRow label="After Repair Value (ARV)" value={fmt(v.arv)} bold />
                  <SRow label="— Purchase Price" value={`(${fmt(v.purchasePrice)})`} />
                  <SRow label="— Estimated Repair Costs" value={`(${fmt(v.repairCosts)})`} />
                  <SRow label="— Total Financing Costs" value={`(${fmt(c.totalFinancing)})`} />
                  <SRow label="— Total Holding Costs" value={`(${fmt(c.totalHolding)})`} />
                  <SRow label="— Total Buying Transaction Costs" value={`(${fmt(c.totalBuying)})`} />
                  <SRow label="— Total Selling Transaction Costs" value={`(${fmt(c.totalSelling)})`} />
                  {num(v.miscPropertyCosts) > 0 && <SRow label="— Misc. Property Costs" value={`(${fmt(v.miscPropertyCosts)})`} />}
                  <SRow label="ESTIMATED NET PROFIT" value={fmt(c.netProfit)} bold green={isProfit} red={!isProfit} divider />
                  <SRow label="Total All-In Investment" value={fmt(c.totalCosts)} bold />
                  <SRow label="Profit Margin" value={fmtPct(c.profitMargin)} green={c.profitMargin > 0} />
                </Card>

                <Card step="3" title="Maximum Allowable Offer (MAO)" subtitle="The highest price you can pay and still hit 10% target profit">
                  <SRow label="After Repair Value (ARV)" value={fmt(v.arv)} />
                  <SRow label="— Estimated Repair Costs" value={`(${fmt(v.repairCosts)})`} />
                  <SRow label="— Closing & Financing Costs" value={`(${fmt(c.closingMAO)})`} />
                  <SRow label="— Carrying & Selling Costs" value={`(${fmt(c.carryingSelling)})`} />
                  <SRow label="— Target Profit (10%)" value={`(${fmt(c.targetProfit)})`} />
                  <SRow label="MAXIMUM ALLOWABLE OFFER" value={fmt(c.mao)} bold green={c.mao > 0} red={c.mao <= 0} divider />
                  <SRow label="Your Purchase Price" value={fmt(v.purchasePrice)} bold />
                  <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 9, background: num(v.purchasePrice) <= c.mao ? "#f0fdf4" : "#fef2f2", border: `1px solid ${num(v.purchasePrice) <= c.mao ? "#bbf7d0" : "#fecaca"}` }}>
                    <span style={{ fontSize: 12.5, color: num(v.purchasePrice) <= c.mao ? "#15803d" : "#b91c1c", fontWeight: 700 }}>
                      {num(v.purchasePrice) <= c.mao
                        ? `✅ Purchase is ${fmt(c.mao - num(v.purchasePrice))} under MAO — good headroom`
                        : `⚠️ Purchase exceeds MAO by ${fmt(num(v.purchasePrice) - c.mao)} — review deal terms`}
                    </span>
                  </div>
                </Card>
              </div>

              {/* Right Column */}
              <div>
                <Card title="Full Cost Breakdown">
                  <SRow label="Purchase Price" value={fmt(v.purchasePrice)} />
                  <SRow label="Repair / Renovation Costs" value={fmt(v.repairCosts)} />
                  <SRow label="Financing Costs" value={fmt(c.totalFinancing)} bold divider />
                  <SRow label="1st Mortgage Points" value={fmt(c.loan1PointsAmt)} indent />
                  <SRow label="1st Mortgage Interest" value={fmt(c.loan1Interest)} indent />
                  {num(v.loan2Amount) > 0 && <>
                    <SRow label="2nd Mortgage Points" value={fmt(c.loan2PointsAmt)} indent />
                    <SRow label="2nd Mortgage Interest" value={fmt(c.loan2Interest)} indent />
                  </>}
                  <SRow label="Misc. Financing" value={fmt(num(v.miscFinancingCosts))} indent />
                  <SRow label="Holding Costs" value={fmt(c.totalHolding)} bold divider />
                  <SRow label={`${fmt(c.totalMonthlyHolding)}/mo × ${num(v.holdMonths)} months`} value="" indent sub />
                  <SRow label="Buying Transaction Costs" value={fmt(c.totalBuying)} bold divider />
                  <SRow label="Selling Transaction Costs" value={fmt(c.totalSelling)} bold divider />
                  <SRow label="Realtor Fees" value={fmt(c.realtorFees)} indent />
                  <SRow label={L.transferShort} value={fmt(c.transferFees)} indent />
                  {num(v.miscPropertyCosts) > 0 && <SRow label="Misc. Property Costs" value={fmt(num(v.miscPropertyCosts))} />}
                  <SRow label="TOTAL ALL-IN COSTS" value={fmt(c.totalCosts)} bold divider />
                </Card>

                <Card title="Return & Profit Analysis">
                  <SRow label="Purchase + Rehab Cost/Sqft" value={fmt(c.costPerSqft)} />
                  <SRow label="Purchase + Rehab ROI" value={fmtPct(c.roiPurchaseRehab)} />
                  <SRow label="Total Costs ROI" value={fmtPct(c.roiTotal)} bold />
                  <SRow label="Annualized Total CoC Return" value={fmtPct(c.annualizedTotal)} divider />
                  <SRow label="My Committed Capital" value={fmt(num(v.myCash))} />
                  <SRow label="My Annualized Cash-on-Cash" value={fmtPct(c.annualizedCoC)} bold green={c.annualizedCoC > 0} />
                </Card>

                {/* Notes display */}
                {v.notes && (
                  <Card title="Deal Notes">
                    <p style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.7, margin: 0, "nowrap": "pre-wrap" }}>{v.notes}</p>
                  </Card>
                )}
              </div>
            </div>

            {/* ── Offer Letter Button ── */}
            <div style={{ marginTop: 20, marginBottom: 4 }}>
              <button
                onClick={generateOfferLetter}
                style={{width:"100%",background:"rgba(52,217,138,0.08)",border:"1px solid rgba(52,217,138,0.2)",borderRadius:11,padding:"13px 18px",color:"var(--green)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:"0 1px 4px rgba(52,217,138,0.08)"}}
              >
                <span style={{fontSize:18}}>📄</span> Generate Offer Letter PDF
              </button>
            </div>

            {/* ── Lender Package Button ── */}
            <div style={{ marginTop: 8, marginBottom: 4 }}>
              <button
                onClick={generateLenderPackage}
                style={{
                  width:"100%",
                  background:"rgba(59,158,255,0.08)",
                  border:"1px solid rgba(59,158,255,0.2)",
                  borderRadius:11,
                  padding:"13px 18px",
                  color:"var(--blue)",
                  fontSize:14,
                  fontWeight:700,
                  cursor:"pointer",
                  fontFamily:"inherit",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  gap:10,
                  boxShadow:"0 1px 4px rgba(59,158,255,0.08)"
                }}
              >
                <span style={{fontSize:18}}>🏦</span> Generate Lender Package PDF
              </button>
            </div>

            {/* ── 5-YEAR PROJECTION ── */}
            <div style={{ marginTop: 24 }}>
              <div style={{ background: "#0d1119", border: "1px solid rgba(59,158,255,0.12)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0a0e18", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 18 }}>📈</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>5-Year Appreciation Projection</div>
                    <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 2 }}>What if you held this property instead of flipping it? Assumes 4% annual appreciation on ARV.</div>
                  </div>
                </div>
                <div style={{ padding: "20px 22px", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        {["Year", "Property Value", "Equity (20% down)", "Cumulative Appreciation", "vs. Flip Profit"].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: h === "Year" ? "left" : "right", color: "var(--sub)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5].map(yr => {
                        const propVal = num(v.arv) * Math.pow(1.04, yr);
                        const downPay = num(v.arv) * 0.20;
                        const equity = propVal - (num(v.arv) * 0.80);
                        const cumAppreciation = propVal - num(v.arv);
                        const vsFlip = cumAppreciation - c.netProfit;
                        return (
                          <tr key={yr} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td style={{ padding: "10px 12px", color: "var(--text)", fontWeight: 700 }}>Year {yr}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text)", fontFamily: "monospace" }}>{fmt(propVal)}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--blue)", fontFamily: "monospace" }}>{fmt(equity)}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--green)", fontFamily: "monospace" }}>{fmt(cumAppreciation)}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "monospace", color: vsFlip > 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                              {vsFlip > 0 ? "+" : ""}{fmt(vsFlip)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(59,158,255,0.06)", border: "1px solid rgba(59,158,255,0.15)", borderRadius: 9, fontSize: 12, color: "var(--sub)", lineHeight: 1.6 }}>
                    💡 <strong style={{ color: "var(--text)" }}>Flip vs. Hold:</strong> The "vs. Flip Profit" column shows whether appreciation gain would exceed your flip profit. Green = holding longer beats flipping. Assumes 4% annual appreciation, 20% down, no rental income included.
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── REFERENCE GUIDE TAB ── */}
        {tab === "definitions" && (
          <div>
            {/* How to Use This Calculator */}
            <div style={{ background: "#0d1119", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: 22 }}>
              <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0d1119", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ background: "var(--blue)", color: "#fff", borderRadius: 6, padding: "3px 9px", fontSize: 10, fontWeight: 800, letterSpacing: 0.8 }}>METHODOLOGY</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#0d1119" }}>How to Use This Calculator</span>
              </div>
              <div style={{ padding: "22px 24px" }}>
                <p style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.75, margin: "0 0 20px" }}>
                  This calculator is designed to give you both a fast deal screen and a full investment-grade analysis. You don't need to complete every step to get useful numbers — the summary updates live as you enter data. Here's how to get the most out of it:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    {
                      phase: "Phase 1 — Quick Screen",
                      badge: "2 min",
                      badgeColor: "var(--blue)",
                      steps: ["Use the Quick Analyze bar at the top of Deal Inputs", "Enter ARV, Purchase Price, Repair Costs, and Hold Time", "Review Net Profit, ROI, MAO, and Deal Grade instantly", "If the deal looks promising, proceed to the full analysis"],
                      note: "These 4 numbers are the foundation of every calculation. Even without financing or selling costs, you'll get a directionally accurate read on the deal."
                    },
                    {
                      phase: "Phase 2 — Full Analysis",
                      badge: "10–15 min",
                      badgeColor: "#3b82f6",
                      steps: ["Step 4: Enter your financing terms (loan amounts, points, interest rates)", "Step 5: Add buying transaction costs (escrow, title, misc)", "Step 6: Enter monthly holding costs (taxes, insurance, utilities)", "Step 7: Fill in selling costs (realtor commission, transfer fees, staging)", "Add your committed cash to calculate personal Cash-on-Cash Return"],
                      note: "Realtor commission (Step 7) alone is typically 5–6% of ARV — don't skip it. Financing costs (Step 4) are also high-impact if you're borrowing."
                    },
                    {
                      phase: "Phase 3 — Review & Decide",
                      badge: "Summary tab",
                      badgeColor: "#8b5cf6",
                      steps: ["Navigate to the Summary & Returns tab", "Review the Deal Grade (A–F) and all key metrics", "Check the MAO — your purchase price should be at or below it", "Read the deal flags to identify any red flags", "Save your Deal Notes before moving on to the next property"],
                      note: "A deal grading B or higher with a purchase price within MAO is generally worth pursuing. Always verify local transfer and conveyance rates as they vary significantly by county."
                    },
                  ].map((phase, pi) => (
                    <div key={phase.phase} style={{ padding: "18px 0", borderBottom: pi < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: phase.badgeColor, color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{pi + 1}</div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0d1119" }}>{phase.phase}</span>
                        <span style={{ background: phase.badgeColor + "18", color: phase.badgeColor, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, letterSpacing: 0.3 }}>{phase.badge}</span>
                      </div>
                      <div style={{ paddingLeft: 32 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
                          {phase.steps.map((step, si) => (
                            <div key={si} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                              <span style={{ color: phase.badgeColor, fontWeight: 800, fontSize: 12, marginTop: 1, flexShrink: 0 }}>→</span>
                              <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{step}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${phase.badgeColor}22`, borderLeft: `3px solid ${phase.badgeColor}`, borderRadius: "0 8px 8px 0", padding: "8px 12px" }}>
                          <span style={{ fontSize: 12, color: "var(--sub)", lineHeight: 1.55 }}>💡 {phase.note}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* What drives the Deal Grade */}
                <div style={{ marginTop: 22, padding: "16px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0d1119", marginBottom: 10 }}>How the Deal Grade (A–F) is Calculated</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
                    {[
                      { factor: "Total Cost ROI", weight: "30 pts", detail: ">15% = full points, >10% = partial" },
                      { factor: "Profit Margin (Net Profit / ARV)", weight: "25 pts", detail: ">20% = full points, >15% = partial" },
                      { factor: "MAO Compliance", weight: "25 pts", detail: "At or below MAO = full points" },
                      { factor: "Annualized Cash-on-Cash Return", weight: "20 pts", detail: ">20% = full points, >12% = partial" },
                    ].map(f => (
                      <div key={f.factor} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ background: "var(--blue)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, "nowrap": "nowrap", marginTop: 1 }}>{f.weight}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{f.factor}</div>
                          <div style={{ fontSize: 11, color: "var(--sub)" }}>{f.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[{ g: "A", r: "85–100", c: "var(--green)" }, { g: "B", r: "68–84", c: "var(--blue)" }, { g: "C", r: "50–67", c: "var(--amber)" }, { g: "D", r: "30–49", c: "var(--amber)" }, { g: "F", r: "0–29", c: "var(--red)" }].map(g => (
                      <span key={g.g} style={{ background: g.c + "18", color: g.c, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{g.g}: {g.r} pts</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>Term Glossary</div>
              <div style={{ fontSize: 12.5, color: "var(--sub)", marginBottom: 14 }}>Plain-English definitions for every field and metric in the calculator</div>
            </div>
            <div style={{ marginBottom: 22, position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--sub)", fontSize: 15 }}>🔍</span>
              <input
                type="text" placeholder="Search terms..." value={defSearch}
                onChange={e => setDefSearch(e.target.value)}
                style={{ width: "100%", background: "#0d1119", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 16px 12px 40px", fontSize: 14, color: "var(--text)", outline: "none", boxSizing: "border-box", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
              />
            </div>

            {filteredDefs.map(section => (
              <Card key={section.section} title={section.section}>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {section.items.map((item, i) => (
                    <div key={item.term} style={{ padding: "14px 0", borderBottom: i < section.items.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none", display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--blue)" }}>{item.term}</div>
                      <div style={{ fontSize: 13, color: "var(--sub)", lineHeight: 1.65 }}>{item.def}</div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            {filteredDefs.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--sub)" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>No terms found for "{defSearch}"</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Try a different search term</div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>{/* end body row */}

      {/* ── AI Deal Analyst Modal ─────────────────────────────────────────── */}
      {aiOpen && (
        <div
          onClick={e => e.target === e.currentTarget && setAiOpen(false)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(6px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
        >
          <div style={{background:"#0d1119",border:"1px solid rgba(167,130,255,0.25)",borderRadius:20,padding:32,width:"100%",maxWidth:580,maxHeight:"88vh",overflowY:"auto",position:"relative"}}>

            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <span style={{fontSize:28}}>🤖</span>
              <div>
                <div style={{fontSize:18,fontWeight:800,color:"var(--text)",letterSpacing:"-0.5px"}}>AI Deal Analysis</div>
                <div style={{fontSize:12,color:"var(--sub)"}}>{v.address || "Your deal"} · Powered by Claude AI</div>
              </div>
              <button onClick={() => setAiOpen(false)} style={{marginLeft:"auto",background:"transparent",border:"none",color:"var(--sub)",fontSize:18,cursor:"pointer",padding:"4px 8px",borderRadius:6}}>✕</button>
            </div>

            {aiLoading && (
              <div style={{textAlign:"center",padding:"40px 0"}}>
                <div style={{width:40,height:40,border:"3px solid rgba(167,130,255,0.2)",borderTopColor:"var(--purple)",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px"}} />
                <div style={{fontSize:14,color:"var(--sub)",fontWeight:600}}>Claude is analyzing your deal…</div>
                <div style={{fontSize:12,color:"var(--dim)",marginTop:4}}>Checking numbers, comps, and market context</div>
              </div>
            )}

            {aiResult?.error && (
              <div style={{background:"rgba(242,92,92,0.08)",border:"1px solid rgba(242,92,92,0.2)",borderRadius:12,padding:"14px 18px",color:"var(--red)",fontSize:13}}>
                ⚠️ {aiResult.error}. Check your API key in Vercel settings.
              </div>
            )}

            {aiResult && !aiResult.error && aiResult.parsed && (() => {
              const p = aiResult.parsed;
              const vColor = p.verdict === "strong_go" ? "var(--green)" : p.verdict === "conditional" ? "var(--amber)" : "var(--red)";
              const vBg    = p.verdict === "strong_go" ? "rgba(52,217,138,0.08)" : p.verdict === "conditional" ? "rgba(240,160,48,0.08)" : "rgba(242,92,92,0.08)";
              const vBorder= p.verdict === "strong_go" ? "rgba(52,217,138,0.25)" : p.verdict === "conditional" ? "rgba(240,160,48,0.25)" : "rgba(242,92,92,0.25)";

              return (
                <div>
                  {/* Verdict banner */}
                  <div style={{background:vBg,border:`1px solid ${vBorder}`,borderRadius:12,padding:"14px 18px",marginBottom:20,textAlign:"center"}}>
                    <div style={{fontSize:22,fontWeight:900,color:vColor,letterSpacing:"-0.5px"}}>{p.verdictLabel}</div>
                    {p.bottomLine && <div style={{fontSize:13,color:"var(--text)",marginTop:6,lineHeight:1.6}}>{p.bottomLine}</div>}
                  </div>

                  {/* Sections */}
                  {[
                    { icon:"💪", label:"Strengths",           text:p.strengths,           color:"var(--green)" },
                    { icon:"⚠️", label:"Risks",               text:p.risks,               color:"var(--red)" },
                    { icon:"💰", label:"Price Recommendation", text:p.priceRecommendation, color:"var(--blue)" },
                    { icon:"🔧", label:"How to Improve",       text:p.improvements,        color:"var(--purple)" },
                  ].filter(s => s.text).map(s => (
                    <div key={s.label} style={{marginBottom:16}}>
                      <div style={{fontSize:11,fontWeight:700,color:s.color,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                        <span>{s.icon}</span>{s.label}
                      </div>
                      <div style={{fontSize:13,color:"var(--text)",lineHeight:1.7,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:"12px 14px",whiteSpace:"pre-line"}}>
                        {s.text}
                      </div>
                    </div>
                  ))}

                  {aiResult.note && (
                    <div style={{fontSize:11,color:"var(--dim)",marginTop:12,padding:"8px 12px",background:"rgba(255,255,255,0.02)",borderRadius:8,lineHeight:1.5}}>
                      💡 {aiResult.note}
                    </div>
                  )}

                  <div style={{fontSize:11,color:"var(--dim)",marginTop:12,textAlign:"center"}}>
                    {aiResult.source === "claude" ? "Analysis by Claude AI (Anthropic)" : "Rule-based analysis — add ANTHROPIC_API_KEY for Claude AI"}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
