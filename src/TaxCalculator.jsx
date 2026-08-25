import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/TopNav";
import MetricTip from "./components/MetricTip";
import QuickAutoFillWidget from "./components/QuickAutoFillWidget";

// ─── Utilities ────────────────────────────────────────────────────────────────
const num = (v) => parseFloat(v) || 0;
const fmt = (n, decimals = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n || 0);
const fmtShort = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${n < 0 ? "-" : ""}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${n < 0 ? "-" : ""}$${(abs / 1_000).toFixed(1)}K`;
  return fmt(n);
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text);font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased}
  input,select,button{font-family:'Geist',sans-serif}

  /* Nav */
  .tc-nav{position:sticky;top:0;z-index:200;background:rgba(255,255,255,0.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 20px;height:52px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
  .tc-logo{font-size:15px;font-weight:800;color:var(--text);text-decoration:none;letter-spacing:-0.5px}
  .tc-logo span{color:var(--blue)}
  .tc-nav-links{display:flex;align-items:center;gap:4px}
  .tc-nav-link{font-size:13px;font-weight:500;color:var(--sub);text-decoration:none;padding:5px 11px;border-radius:7px;border:1px solid transparent;transition:all 0.15s}
  .tc-nav-link:hover{color:var(--text);background:rgba(15,23,42,0.05)}
  .tc-nav-link.active{color:var(--blue);background:rgba(59,158,255,0.1);border-color:rgba(59,158,255,0.2)}

  /* Layout */
  .tc-wrap{min-height:100vh;background:var(--bg)}
  .tc-hero{text-align:center;padding:44px 24px 32px;position:relative;overflow:hidden}
  .tc-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(52,217,138,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(52,217,138,0.02) 1px,transparent 1px);background-size:56px 56px;pointer-events:none}
  .tc-hero-glow{position:absolute;top:-20%;left:50%;transform:translateX(-50%);width:700px;height:400px;background:radial-gradient(ellipse,rgba(52,217,138,0.07) 0%,transparent 65%);pointer-events:none}
  .tc-hero-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(52,217,138,0.08);border:1px solid rgba(52,217,138,0.2);border-radius:3px;padding:5px 14px;font-size:11px;font-weight:700;color:var(--green);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:18px;position:relative;z-index:1}
  .tc-hero h1{font-size:clamp(24px,4.5vw,40px);font-weight:800;letter-spacing:-1.5px;color:var(--text);line-height:1.1;margin-bottom:10px;position:relative;z-index:1}
  .tc-hero h1 span{color:var(--green)}
  .tc-hero p{font-size:15px;color:var(--sub);max-width:560px;margin:0 auto;line-height:1.65;position:relative;z-index:1}

  .tc-body{max-width:1160px;margin:0 auto;padding:28px 20px 80px;display:grid;grid-template-columns:420px 1fr;gap:24px;align-items:start}
  @media(max-width:900px){.tc-body{grid-template-columns:1fr}}
  @media(max-width:520px){.tc-body{padding:14px 12px 60px}.tc-hero{padding:28px 16px 20px}}

  /* Cards */
  .tc-card{background:var(--card);border:1px solid var(--border);border-radius:6px;overflow:hidden;margin-bottom:16px}
  .tc-card-head{padding:14px 18px;border-bottom:1px solid var(--borderf);background:var(--card2);display:flex;align-items:center;gap:10px}
  .tc-card-icon{width:28px;height:28px;border-radius: 6px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
  .tc-card-title{font-size:13.5px;font-weight:700;color:var(--text)}
  .tc-card-sub{font-size:11px;color:var(--sub);margin-top:1px}
  .tc-card-body{padding:16px 18px;display:flex;flex-direction:column;gap:12px}

  /* Fields */
  .tc-field{display:flex;flex-direction:column;gap:4px}
  .tc-label{font-size:11px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.4px}
  .tc-input{background:rgba(15,23,42,0.04);border:1px solid var(--borderf);border-radius: 10px;padding:10px 13px;font-size:14px;color:var(--text);outline:none;width:100%;transition:border 0.15s}
  .tc-input:focus{border-color:rgba(52,217,138,0.4);background:rgba(52,217,138,0.03)}
  .tc-input::placeholder{color:var(--dim)}
  .tc-input-prefix{position:relative}
  .tc-input-prefix .pfx{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--sub);font-size:13px;pointer-events:none}
  .tc-input-prefix input{padding-left:24px}
  .tc-input-suffix{position:relative}
  .tc-input-suffix .sfx{position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--sub);font-size:12px;pointer-events:none}
  .tc-input-suffix input{padding-right:30px}
  .tc-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .tc-hint{font-size:10.5px;color:var(--sub);margin-top:2px}
  .tc-divider{height:1px;background:var(--borderf);margin:4px 0}

  /* Toggle */
  .tc-toggle-wrap{display:flex;background:rgba(15,23,42,0.04);border:1px solid var(--borderf);border-radius: 10px;overflow:hidden}
  .tc-toggle-btn{flex:1;padding:9px 10px;font-size:13px;font-weight:600;border:none;cursor:pointer;transition:all 0.15s;background:transparent;color:var(--sub)}
  .tc-toggle-btn.active{background:var(--green);color:#ffffff}
  .tc-toggle-btn.active-passive{background:var(--amber)}
  .tc-toggle-btn.active-yes{background:var(--blue)}

  /* Summary Cards */
  .tc-summary-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px}
  @media(max-width:600px){.tc-summary-grid{grid-template-columns:1fr}}
  .tc-metric{background:var(--card2);border:1px solid var(--borderf);border-radius:6px;padding:16px 18px}
  .tc-metric-label{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px}
  .tc-metric-val{font-family:'Geist Mono',ui-monospace,monospace;font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px;line-height:1}
  .tc-metric-sub{font-size:10.5px;color:var(--dim);margin-top:5px}
  .tc-metric.green{border-color:rgba(52,217,138,0.22);background:rgba(52,217,138,0.05)}.tc-metric.green .tc-metric-val{font-family:'Geist Mono',ui-monospace,monospace;color:var(--green)}
  .tc-metric.blue{border-color:rgba(59,158,255,0.22);background:rgba(59,158,255,0.05)}.tc-metric.blue .tc-metric-val{font-family:'Geist Mono',ui-monospace,monospace;color:var(--blue)}
  .tc-metric.amber{border-color:rgba(240,160,48,0.22);background:rgba(240,160,48,0.05)}.tc-metric.amber .tc-metric-val{font-family:'Geist Mono',ui-monospace,monospace;color:var(--amber)}
  .tc-metric.purple{border-color:rgba(167,130,255,0.22);background:rgba(167,130,255,0.05)}.tc-metric.purple .tc-metric-val{font-family:'Geist Mono',ui-monospace,monospace;color:var(--purple)}

  /* Status Banner */
  .tc-status{border-radius:6px;padding:16px 18px;margin-bottom:16px;display:flex;align-items:flex-start;gap:12px}
  .tc-status.s-green{background:rgba(52,217,138,0.07);border:1px solid rgba(52,217,138,0.25)}
  .tc-status.s-amber{background:rgba(240,160,48,0.07);border:1px solid rgba(240,160,48,0.25)}
  .tc-status.s-red{background:rgba(242,92,92,0.07);border:1px solid rgba(242,92,92,0.25)}
  .tc-status-icon{font-size:20px;flex-shrink:0;margin-top:1px}
  .tc-status-title{font-size:13.5px;font-weight:700;color:var(--text);margin-bottom:4px}
  .tc-status-body{font-size:12.5px;color:var(--sub);line-height:1.6}

  /* Info Callout */
  .tc-info{background:rgba(59,158,255,0.05);border:1px solid rgba(59,158,255,0.18);border-radius:6px;padding:16px 18px;margin-bottom:14px}
  .tc-info-title{font-size:12px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:7px}
  .tc-info-body{font-size:12.5px;color:var(--sub);line-height:1.65}
  .tc-info-body strong{color:var(--text);font-weight:600}

  /* Table */
  .tc-table-wrap{overflow-x:auto;border-radius:6px;border:1px solid var(--borderf)}
  .tc-table{width:100%;border-collapse:collapse;font-size:12.5px}
  .tc-table thead th{background:var(--card2);color:var(--sub);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:10px 12px;text-align:right;border-bottom:1px solid var(--borderf);white-space:nowrap}
  .tc-table thead th:first-child{text-align:left}
  .tc-table tbody td{padding:10px 12px;color:var(--text);border-bottom:1px solid rgba(15,23,42,0.04);text-align:right}
  .tc-table tbody td:first-child{text-align:left;color:var(--sub);font-weight:600}
  .tc-table tbody tr:last-child td{border-bottom:none}
  .tc-table tbody tr:hover td{background:rgba(255,255,255,0.02)}

  /* Cost Seg Comparison */
  .tc-compare{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px}
  @media(max-width:480px){.tc-compare{grid-template-columns:1fr}}
  .tc-compare-box{border-radius:6px;padding:16px;border:1px solid var(--borderf)}
  .tc-compare-box.std{background:rgba(107,125,150,0.08)}
  .tc-compare-box.costseg{background:rgba(52,217,138,0.06);border-color:rgba(52,217,138,0.2)}
  .tc-compare-label{font-size:10px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px}
  .tc-compare-val{font-size:22px;font-weight:800;letter-spacing:-0.5px}

  /* Disclaimer */
  .tc-disclaimer{text-align:center;font-size:11.5px;color:var(--dim);line-height:1.65;padding:24px 20px 40px;max-width:760px;margin:0 auto;border-top:1px solid var(--borderf);margin-top:16px}
`;

// ─── Default State ────────────────────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear();

const DEFAULTS = {
  propertyType: "residential",
  purchasePrice: "",
  landValue: "",
  improvementCosts: "",
  yearPurchased: CURRENT_YEAR,
  federalBracket: 24,
  stateRate: 0,
  investorType: "active",
  grossRentalIncome: "",
  operatingExpenses: "",
  costSegEnabled: false,
};

// ─── Calculation Engine ───────────────────────────────────────────────────────
function calcDepreciation(v) {
  const purchasePrice = num(v.purchasePrice);
  const landValue = num(v.landValue);
  const improvementCosts = num(v.improvementCosts);
  const federalRate = num(v.federalBracket) / 100;
  const stateRate = num(v.stateRate) / 100;
  const combinedRate = federalRate + stateRate;
  const schedule = v.propertyType === "residential" ? 27.5 : 39;

  const depreciableBasis = purchasePrice - landValue + improvementCosts;
  const annualDepreciation = depreciableBasis > 0 ? depreciableBasis / schedule : 0;
  const monthlyDepreciation = annualDepreciation / 12;
  const annualTaxSavings = annualDepreciation * combinedRate;
  const monthlyTaxSavings = annualTaxSavings / 12;

  // NOI / Taxable Income
  const grossRentalIncome = num(v.grossRentalIncome);
  const operatingExpenses = num(v.operatingExpenses);
  const noi = grossRentalIncome - operatingExpenses;
  const taxableIncome = noi - annualDepreciation;
  const hasPaperLoss = taxableIncome < 0;
  const paperLoss = Math.abs(Math.min(taxableIncome, 0));

  // Active investor deductibility rules
  // Full deduction if income (approximated by NOI here, per PAL rules) < $100K
  // Phases out between $100K–$150K
  // For this calculator, we use NOI as a proxy for income context
  let deductiblePaperLoss = 0;
  let palStatus = "none";
  if (hasPaperLoss) {
    if (v.investorType === "passive") {
      deductiblePaperLoss = 0;
      palStatus = "passive";
    } else {
      // Active: $25K max, phase-out $100K–$150K using gross income (NOI as proxy)
      const maxActive = 25_000;
      if (noi <= 100_000) {
        deductiblePaperLoss = Math.min(paperLoss, maxActive);
        palStatus = "active-full";
      } else if (noi >= 150_000) {
        deductiblePaperLoss = 0;
        palStatus = "active-phased-out";
      } else {
        const phaseOutFraction = (noi - 100_000) / 50_000;
        deductiblePaperLoss = Math.min(paperLoss, maxActive * (1 - phaseOutFraction));
        palStatus = "active-partial";
      }
    }
  }

  const taxOnTaxableIncome = taxableIncome >= 0 ? taxableIncome * combinedRate : 0;
  const taxSavingsFromPaperLoss = deductiblePaperLoss * combinedRate;
  const afterTaxNOI = noi - taxOnTaxableIncome + taxSavingsFromPaperLoss;

  // 10-year table
  const yearlyTable = Array.from({ length: 10 }, (_, i) => {
    const year = i + 1;
    const cumDepr = annualDepreciation * year;
    const annualSavings = annualTaxSavings;
    const cumSavings = annualSavings * year;
    return { year, annualDepreciation, cumDepr, annualSavings, cumSavings };
  });

  const tenYearCumSavings = annualTaxSavings * 10;

  // Cost Segregation
  const buildingValue = depreciableBasis; // excludes land
  const costseg5yr = buildingValue * 0.25;   // 25% on 5-yr schedule
  const costseg15yr = buildingValue * 0.12;  // 12% on 15-yr schedule
  const costsegStd = buildingValue - costseg5yr - costseg15yr; // remainder on 27.5/39yr

  // Bonus depreciation rate for 2024+: 60%
  const bonusRate = 0.60;
  const year1Bonus5yr = costseg5yr * bonusRate;
  const year1Bonus15yr = costseg15yr * bonusRate;
  const year1StdDepr = costsegStd / schedule;

  // Remaining balance on 5-yr and 15-yr after bonus (spread over remaining schedule)
  const remaining5yr = costseg5yr * (1 - bonusRate);
  const remaining15yr = costseg15yr * (1 - bonusRate);
  const year1Regular5yr = remaining5yr / 5;
  const year1Regular15yr = remaining15yr / 15;

  const year1CostSegDepr = year1Bonus5yr + year1Bonus15yr + year1StdDepr + year1Regular5yr + year1Regular15yr;
  const year1StandardDepr = annualDepreciation;
  const year1CostSegExtra = year1CostSegDepr - year1StandardDepr;
  const year1CostSegTaxSavings = year1CostSegDepr * combinedRate;
  const year1StandardTaxSavings = year1StandardDepr * combinedRate;
  const year1CostSegBenefit = year1CostSegTaxSavings - year1StandardTaxSavings;

  return {
    depreciableBasis, annualDepreciation, monthlyDepreciation,
    annualTaxSavings, monthlyTaxSavings, combinedRate,
    noi, taxableIncome, hasPaperLoss, paperLoss,
    palStatus, deductiblePaperLoss, taxSavingsFromPaperLoss,
    afterTaxNOI, yearlyTable, tenYearCumSavings, schedule,
    costseg5yr, costseg15yr, costsegStd,
    year1CostSegDepr, year1StandardDepr, year1CostSegExtra,
    year1CostSegTaxSavings, year1StandardTaxSavings, year1CostSegBenefit,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div className="tc-field">
      <label className="tc-label">{label}</label>
      {children}
      {hint && <span className="tc-hint">{hint}</span>}
    </div>
  );
}

function NumInput({ value, onChange, placeholder, prefix, suffix }) {
  const inner = (
    <input
      type="number"
      className="tc-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ fontSize: 16 }}
    />
  );
  if (prefix) {
    return (
      <div className="tc-input-prefix tc-input-suffix">
        <span className="pfx">{prefix}</span>
        {suffix ? (
          <>
            <span className="sfx">{suffix}</span>
            {inner}
          </>
        ) : inner}
      </div>
    );
  }
  if (suffix) {
    return (
      <div className="tc-input-suffix">
        <span className="sfx">{suffix}</span>
        {inner}
      </div>
    );
  }
  return inner;
}

function Toggle({ options, value, onChange, colorClass }) {
  return (
    <div className="tc-toggle-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`tc-toggle-btn ${value === opt.value ? (colorClass || "active") : ""}`}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Metric({ label, value, sub, color }) {
  return (
    <div className={`tc-metric ${color || ""}`}>
      <div className="tc-metric-label">{label}</div>
      <div className="tc-metric-val">{value}</div>
      {sub && <div className="tc-metric-sub">{sub}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TaxCalculator() {
  const navigate = useNavigate();
  const [v, setV] = useState(DEFAULTS);

  const set = (k) => (val) => setV((p) => ({ ...p, [k]: val }));

  // Prefill from localStorage OR URL params. PropertyHub writes the prefill
  // key as `estimatedValue` (not `purchasePrice`) — read both for back-compat.
  useEffect(() => {
    // Priority 0: Strategy Verdicts handoff — /property "Tools" chip → /tax
    try {
      const raw = sessionStorage.getItem("rde_strategy_prefill");
      if (raw) {
        const pf = JSON.parse(raw);
        const isFresh = pf.ts && Date.now() - pf.ts < 5 * 60 * 1000;
        if (isFresh && pf.strategy === "tax") {
          sessionStorage.removeItem("rde_strategy_prefill");
          setV((prev) => ({
            ...prev,
            ...(pf.purchasePrice && { purchasePrice: Number(pf.purchasePrice) }),
            ...(pf.monthlyRent   && { monthlyRent:   Number(pf.monthlyRent) }),
            ...(pf.propertyType  && { propertyType:  pf.propertyType === "commercial" ? "commercial" : "residential" }),
          }));
          return; // authoritative
        }
      }
    } catch {}

    try {
      const url = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const raw = localStorage.getItem("rde_prefill");
      const pf = raw ? JSON.parse(raw) : {};
      const fresh = pf.timestamp && (Date.now() - pf.timestamp <= 5 * 60 * 1000);

      const price = (fresh && (pf.estimatedValue || pf.purchasePrice))
        || (url.get("purchase") ? Number(url.get("purchase")) : null);
      const ptype = (fresh && pf.propertyType) || url.get("type");

      setV((prev) => ({
        ...prev,
        ...(price && { purchasePrice: price }),
        ...(ptype && { propertyType: ptype === "commercial" ? "commercial" : "residential" }),
      }));
    } catch {}
  }, []);

  const c = useMemo(() => calcDepreciation(v), [v]);

  // PAL status helpers
  const palInfo = useMemo(() => {
    if (!c.hasPaperLoss) return null;
    if (c.palStatus === "passive") {
      return {
        cls: "s-amber",
        icon: "⚠️",
        title: `${fmt(c.paperLoss)} Paper Loss — Passive Investor`,
        body: "As a passive investor, this paper loss can only be used to offset other passive income (e.g., gains from other rental properties). It cannot be deducted against W-2 wages or ordinary income. Unused passive losses carry forward indefinitely until you sell the property.",
      };
    }
    if (c.palStatus === "active-phased-out") {
      return {
        cls: "s-red",
        icon: "🚫",
        title: `${fmt(c.paperLoss)} Paper Loss — Phase-Out Applies`,
        body: `Your rental income exceeds $150,000, which fully phases out the $25,000 active participation exception. This paper loss can only offset other passive income. Consider cost segregation or other strategies to maximize the benefit.`,
      };
    }
    if (c.palStatus === "active-partial") {
      return {
        cls: "s-amber",
        icon: "⚠️",
        title: `${fmt(c.deductiblePaperLoss)} Deductible (Partially Phased Out)`,
        body: `Your income is between $100K–$150K, so the $25,000 active participation deduction phases out proportionally. You can deduct ${fmt(c.deductiblePaperLoss)} against ordinary income this year, saving an estimated ${fmt(c.taxSavingsFromPaperLoss)} in taxes.`,
      };
    }
    // active-full
    return {
      cls: "s-green",
      icon: "✅",
      title: `${fmt(c.deductiblePaperLoss)} Paper Loss Deductible Against Ordinary Income`,
      body: `As an active participant with income below $100,000, you can deduct up to $25,000 of this rental paper loss directly against your W-2 wages and other ordinary income. That saves you an estimated ${fmt(c.taxSavingsFromPaperLoss)} in taxes this year.`,
    };
  }, [c]);

  const noInputs = !num(v.purchasePrice) || !num(v.landValue);

  return (
    <div className="tc-wrap">
      <style>{CSS}</style>

      {/* Nav */}
      <TopNav />

      {/* Hero */}
      <div className="tc-hero">
        <div className="tc-hero-glow" />
        <div className="tc-hero-tag">Tax Benefit Calculator</div>
        <h1>Depreciation &amp; <span>Tax Savings</span> Analysis</h1>
        <p>Calculate your annual depreciation deduction, paper losses, and real dollar tax savings — including the impact of a cost segregation study.</p>
      </div>

      <div className="tc-body">
        {/* Quick auto-fill from address — fills purchase price */}
        <QuickAutoFillWidget
          hint="Paste an address and we'll fill in the purchase price from public records."
          computePatch={(d) => d.assessedValue && !num(v.purchasePrice) ? { purchasePrice: 1 } : {}}
          onFill={(d) => {
            if (d.assessedValue && !num(v.purchasePrice)) set("purchasePrice")(String(Math.round(d.assessedValue)));
          }}
        />
        {/* ── LEFT COLUMN: Inputs ── */}
        <div>

          {/* Property Info */}
          <div className="tc-card">
            <div className="tc-card-head">
              <div className="tc-card-icon" style={{ background: "rgba(59,158,255,0.12)" }}>🏠</div>
              <div>
                <div className="tc-card-title">Property Info</div>
                <div className="tc-card-sub">Cost basis and depreciation schedule</div>
              </div>
            </div>
            <div className="tc-card-body">

              <Field label="Property Type">
                <select
                  className="tc-input"
                  value={v.propertyType}
                  onChange={(e) => set("propertyType")(e.target.value)}
                  style={{ fontSize: 16 }}
                >
                  <option value="residential">Residential (27.5 years)</option>
                  <option value="commercial">Commercial (39 years)</option>
                </select>
              </Field>

              <Field label="Purchase Price" hint="The total price paid to acquire the property">
                <NumInput value={v.purchasePrice} onChange={set("purchasePrice")} placeholder="e.g. 450000" prefix="$" />
              </Field>

              <Field label="Land Value ($)" hint="Land is NOT depreciable — typically 15-25% of purchase price">
                <NumInput value={v.landValue} onChange={set("landValue")} placeholder="e.g. 67500" prefix="$" />
              </Field>

              <Field label="Improvement / Renovation Costs ($)" hint="Capital improvements added to your cost basis">
                <NumInput value={v.improvementCosts} onChange={set("improvementCosts")} placeholder="e.g. 25000" prefix="$" />
              </Field>

              <Field label="Year Purchased">
                <input
                  type="number"
                  className="tc-input"
                  value={v.yearPurchased}
                  onChange={(e) => set("yearPurchased")(e.target.value)}
                  min={1990}
                  max={2040}
                  style={{ fontSize: 16 }}
                />
              </Field>

              {/* Basis summary */}
              {num(v.purchasePrice) > 0 && (
                <div style={{
                  background: "rgba(59,158,255,0.06)", border: "1px solid rgba(59,158,255,0.15)",
                  borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--sub)" }}>Purchase Price</span>
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>{fmt(num(v.purchasePrice))}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--sub)" }}>Less: Land Value</span>
                    <span style={{ color: "var(--red)", fontWeight: 600 }}>-{fmt(num(v.landValue))}</span>
                  </div>
                  {num(v.improvementCosts) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "var(--sub)" }}>Plus: Improvements</span>
                      <span style={{ color: "var(--green)", fontWeight: 600 }}>+{fmt(num(v.improvementCosts))}</span>
                    </div>
                  )}
                  <div style={{ borderTop: "1px solid var(--borderf)", paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--text)", fontWeight: 700 }}>Depreciable Basis</span>
                    <span style={{ color: "var(--blue)", fontWeight: 800 }}>{fmt(c.depreciableBasis)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tax Info */}
          <div className="tc-card">
            <div className="tc-card-head">
              <div className="tc-card-icon" style={{ background: "rgba(240,160,48,0.12)" }}>📋</div>
              <div>
                <div className="tc-card-title">Tax Info</div>
                <div className="tc-card-sub">Your tax rates and investor classification</div>
              </div>
            </div>
            <div className="tc-card-body">

              <Field label="Federal Tax Bracket">
                <select
                  className="tc-input"
                  value={v.federalBracket}
                  onChange={(e) => set("federalBracket")(e.target.value)}
                  style={{ fontSize: 16 }}
                >
                  {[10, 12, 22, 24, 32, 35, 37].map((r) => (
                    <option key={r} value={r}>{r}% Federal Bracket</option>
                  ))}
                </select>
              </Field>

              <Field label="State Income Tax Rate" hint="Enter 0 if your state has no income tax">
                <NumInput value={v.stateRate} onChange={set("stateRate")} placeholder="e.g. 5.5" suffix="%" />
              </Field>

              <Field label="Investor Classification" hint="Determines how paper losses can be used (PAL rules)">
                <Toggle
                  options={[
                    { label: "Active Investor", value: "active" },
                    { label: "Passive Investor", value: "passive" },
                  ]}
                  value={v.investorType}
                  onChange={set("investorType")}
                  colorClass="active"
                />
              </Field>

              <div style={{ fontSize: 11.5, color: "var(--sub)", lineHeight: 1.6, padding: "10px 12px", background: "rgba(15,23,42,0.03)", borderRadius: 6, border: "1px solid var(--borderf)" }}>
                {v.investorType === "active"
                  ? "Active: You actively manage the property. Can deduct up to $25,000/yr in paper losses if your income is below $100K. Phases out $100K–$150K."
                  : "Passive: You do not materially participate. Paper losses can only offset other passive income — they cannot reduce W-2 or active business income."}
              </div>
            </div>
          </div>

          {/* Rental Income */}
          <div className="tc-card">
            <div className="tc-card-head">
              <div className="tc-card-icon" style={{ background: "rgba(52,217,138,0.12)" }}>💰</div>
              <div>
                <div className="tc-card-title">Rental Income (for context)</div>
                <div className="tc-card-sub">Used to calculate NOI and paper loss</div>
              </div>
            </div>
            <div className="tc-card-body">

              <Field label="Annual Gross Rental Income" hint="Total rents before any expenses">
                <NumInput value={v.grossRentalIncome} onChange={set("grossRentalIncome")} placeholder="e.g. 24000" prefix="$" />
              </Field>

              <Field label="Annual Operating Expenses" hint="Maintenance, management, taxes, insurance — exclude depreciation and mortgage">
                <NumInput value={v.operatingExpenses} onChange={set("operatingExpenses")} placeholder="e.g. 8400" prefix="$" />
              </Field>

              {num(v.grossRentalIncome) > 0 && (
                <div style={{
                  background: "rgba(52,217,138,0.06)", border: "1px solid rgba(52,217,138,0.15)",
                  borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--sub)" }}>Gross Rental Income</span>
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>{fmt(num(v.grossRentalIncome))}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--sub)" }}>Less: Operating Expenses</span>
                    <span style={{ color: "var(--red)", fontWeight: 600 }}>-{fmt(num(v.operatingExpenses))}</span>
                  </div>
                  <div style={{ borderTop: "1px solid var(--borderf)", paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--text)", fontWeight: 700 }}>Net Operating Income</span>
                    <span style={{ color: c.noi >= 0 ? "var(--green)" : "var(--red)", fontWeight: 800 }}>{fmt(c.noi)}</span>
                  </div>
                  {c.annualDepreciation > 0 && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "var(--sub)" }}>Less: Annual Depreciation</span>
                        <span style={{ color: "var(--amber)", fontWeight: 600 }}>-{fmt(c.annualDepreciation)}</span>
                      </div>
                      <div style={{ borderTop: "1px solid var(--borderf)", paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "var(--text)", fontWeight: 700 }}>Taxable Income</span>
                        <span style={{ color: c.taxableIncome >= 0 ? "var(--text)" : "var(--green)", fontWeight: 800 }}>
                          {c.taxableIncome >= 0 ? fmt(c.taxableIncome) : `(${fmt(Math.abs(c.taxableIncome))})`}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cost Segregation */}
          <div className="tc-card">
            <div className="tc-card-head">
              <div className="tc-card-icon" style={{ background: "rgba(167,130,255,0.12)" }}>🔬</div>
              <div>
                <div className="tc-card-title">Cost Segregation Study</div>
                <div className="tc-card-sub">Accelerate Year 1 depreciation deductions</div>
              </div>
            </div>
            <div className="tc-card-body">
              <Field label="Include Cost Segregation Analysis?" hint="Cost seg studies typically run $5,000–$15,000 for residential properties">
                <Toggle
                  options={[
                    { label: "No", value: false },
                    { label: "Yes, Show Analysis", value: true },
                  ]}
                  value={v.costSegEnabled}
                  onChange={(val) => set("costSegEnabled")(val === true || val === "true" ? true : val)}
                  colorClass="active-yes"
                />
              </Field>
              {v.costSegEnabled && (
                <div style={{ fontSize: 11.5, color: "var(--sub)", lineHeight: 1.6, padding: "10px 12px", background: "rgba(167,130,255,0.04)", borderRadius: 6, border: "1px solid rgba(167,130,255,0.15)" }}>
                  Cost segregation reclassifies 5-year (personal property) and 15-year (land improvements) components. With 60% bonus depreciation (2024+), these are mostly deducted in Year 1, dramatically front-loading your tax benefit.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN: Results ── */}
        <div>
          {noInputs ? (
            <div className="tc-card">
              <div className="tc-card-body" style={{ alignItems: "center", padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🏚️</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Enter your property details</div>
                <div style={{ fontSize: 13.5, color: "var(--sub)", lineHeight: 1.65, maxWidth: 380 }}>
                  Fill in the Purchase Price and Land Value on the left to calculate your annual depreciation deduction and tax savings.
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="tc-summary-grid">
                <Metric
                  label={<>Annual Depreciation <MetricTip metric="cca" /></>}
                  value={fmt(c.annualDepreciation)}
                  sub={`${fmt(c.monthlyDepreciation)}/month · over ${c.schedule} years`}
                  color="blue"
                />
                <Metric
                  label={<>Annual Tax Savings <MetricTip metric="paperLoss" /></>}
                  value={fmt(c.annualTaxSavings)}
                  sub={`Combined rate: ${(c.combinedRate * 100).toFixed(1)}%`}
                  color="green"
                />
                <Metric
                  label={<>Monthly Tax Savings <MetricTip metric="paperLoss" /></>}
                  value={fmt(c.monthlyTaxSavings)}
                  sub="Equivalent monthly benefit"
                  color="green"
                />
                <Metric
                  label={<>10-Year Cumulative Savings <MetricTip metric="ccaRecapture" /></>}
                  value={fmtShort(c.tenYearCumSavings)}
                  sub={`${fmt(c.annualTaxSavings)}/yr × 10 years`}
                  color="purple"
                />
              </div>

              {/* Paper Loss / Deduction Status */}
              {num(v.grossRentalIncome) > 0 && c.annualDepreciation > 0 && (
                <>
                  {!c.hasPaperLoss ? (
                    <div className="tc-status s-red" style={{ marginBottom: 16 }}>
                      <div className="tc-status-icon">📊</div>
                      <div>
                        <div className="tc-status-title">Fully Taxable — No Paper Loss This Year</div>
                        <div className="tc-status-body">
                          Your NOI ({fmt(c.noi)}) exceeds your depreciation ({fmt(c.annualDepreciation)}), so your taxable income is {fmt(c.taxableIncome)}. You owe tax on this amount, but depreciation is still reducing your tax bill by {fmt(c.annualTaxSavings)} compared to having no depreciation deduction.
                        </div>
                      </div>
                    </div>
                  ) : palInfo && (
                    <div className={`tc-status ${palInfo.cls}`} style={{ marginBottom: 16 }}>
                      <div className="tc-status-icon">{palInfo.icon}</div>
                      <div>
                        <div className="tc-status-title">{palInfo.title}</div>
                        <div className="tc-status-body">{palInfo.body}</div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Cost Segregation Comparison */}
              {v.costSegEnabled && c.depreciableBasis > 0 && (
                <div className="tc-card" style={{ marginBottom: 16 }}>
                  <div className="tc-card-head">
                    <div className="tc-card-icon" style={{ background: "rgba(52,217,138,0.12)" }}>⚡</div>
                    <div>
                      <div className="tc-card-title">Cost Segregation — Year 1 Comparison</div>
                      <div className="tc-card-sub">60% bonus depreciation on accelerated components (2024+)</div>
                    </div>
                  </div>
                  <div className="tc-card-body">
                    <div className="tc-compare">
                      <div className="tc-compare-box std">
                        <div className="tc-compare-label">Standard Depreciation</div>
                        <div className="tc-compare-val" style={{ color: "var(--text)" }}>{fmt(c.year1StandardDepr)}</div>
                        <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 6 }}>Year 1 Deduction</div>
                        <div style={{ marginTop: 12, fontSize: 12, color: "var(--sub)" }}>
                          Tax Savings: <strong style={{ color: "var(--text)" }}>{fmt(c.year1StandardTaxSavings)}</strong>
                        </div>
                      </div>
                      <div className="tc-compare-box costseg">
                        <div className="tc-compare-label" style={{ color: "var(--green)" }}>With Cost Segregation</div>
                        <div className="tc-compare-val" style={{ color: "var(--green)" }}>{fmt(c.year1CostSegDepr)}</div>
                        <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 6 }}>Year 1 Deduction</div>
                        <div style={{ marginTop: 12, fontSize: 12, color: "var(--sub)" }}>
                          Tax Savings: <strong style={{ color: "var(--green)" }}>{fmt(c.year1CostSegTaxSavings)}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{
                      background: "rgba(52,217,138,0.08)", border: "1px solid rgba(52,217,138,0.2)",
                      borderRadius: 10, padding: "14px 16px", marginTop: 4,
                    }}>
                      <div style={{ fontSize: 11, color: "var(--green)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                        Cost Segregation Advantage
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, color: "var(--sub)" }}>Extra Deduction Year 1</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{fmt(c.year1CostSegExtra)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 13, color: "var(--sub)" }}>Additional Tax Savings</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--green)" }}>{fmt(c.year1CostSegBenefit)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Component breakdown */}
                    <div style={{ fontSize: 12.5, color: "var(--sub)", lineHeight: 1.6, marginTop: 4 }}>
                      <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Component Breakdown (estimated)</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {[
                          { label: "5-year personal property (25%)", val: c.costseg5yr, sub: `60% bonus → ${fmt(c.costseg5yr * 0.6)} deducted Year 1` },
                          { label: "15-year land improvements (12%)", val: c.costseg15yr, sub: `60% bonus → ${fmt(c.costseg15yr * 0.6)} deducted Year 1` },
                          { label: `Remainder on ${c.schedule}-year schedule`, val: c.costsegStd, sub: `${fmt(c.costsegStd / c.schedule)}/yr standard` },
                        ].map((row) => (
                          <div key={row.label} style={{ padding: "8px 10px", background: "rgba(15,23,42,0.03)", borderRadius: 6 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--sub)" }}>{row.label}</span>
                              <span style={{ color: "var(--text)", fontWeight: 600 }}>{fmt(row.val)}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{row.sub}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 10-Year Depreciation Table */}
              <div className="tc-card" style={{ marginBottom: 16 }}>
                <div className="tc-card-head">
                  <div className="tc-card-icon" style={{ background: "rgba(59,158,255,0.12)" }}>📈</div>
                  <div>
                    <div className="tc-card-title">27.5-Year Depreciation Schedule</div>
                    <div className="tc-card-sub">Year-by-year tax benefit — Years 1–10</div>
                  </div>
                </div>
                <div className="tc-card-body" style={{ padding: "14px 0 0" }}>
                  <div className="tc-table-wrap" style={{ margin: "0 0 2px" }}>
                    <table className="tc-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Annual Depr.</th>
                          <th>Cumulative Depr.</th>
                          <th>Tax Savings</th>
                          <th>Cum. Tax Savings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.yearlyTable.map((row) => (
                          <tr key={row.year}>
                            <td style={{ color: "var(--sub)", fontWeight: 700 }}>{num(v.yearPurchased) + row.year - 1}</td>
                            <td>{fmt(row.annualDepreciation)}</td>
                            <td>{fmt(row.cumDepr)}</td>
                            <td style={{ color: "var(--green)", fontWeight: 600 }}>{fmt(row.annualSavings)}</td>
                            <td style={{ color: "var(--green)", fontWeight: 700 }}>{fmt(row.cumSavings)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding: "12px 18px", borderTop: "1px solid var(--borderf)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--sub)" }}>10-Year Total Tax Savings</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "var(--green)" }}>{fmt(c.tenYearCumSavings)}</span>
                  </div>
                </div>
              </div>

              {/* Educational Callouts */}
              <div className="tc-info">
                <div className="tc-info-title">What is Depreciation and Why is it Powerful?</div>
                <div className="tc-info-body">
                  Depreciation is a <strong>non-cash deduction</strong> the IRS allows you to take each year on the "wear and tear" of your rental property. You don't spend this money — it's a paper deduction that reduces your taxable rental income.<br /><br />
                  The result? Your property can generate positive cash flow that you collect tax-free (or at a much lower tax rate) because the depreciation deduction offsets it. In many cases, depreciation creates a <strong>paper loss</strong> — meaning your tax return shows a loss even though you're cash-flow positive. This is one of real estate's most powerful tax advantages over other investments.
                </div>
              </div>

              <div className="tc-info" style={{ borderColor: "rgba(240,160,48,0.18)", background: "rgba(240,160,48,0.04)" }}>
                <div className="tc-info-title" style={{ color: "var(--amber)" }}>Active vs. Passive Investor — PAL Rules</div>
                <div className="tc-info-body">
                  The IRS Passive Activity Loss (PAL) rules determine how you can use rental paper losses:<br /><br />
                  <strong>Active Participants</strong> — If you actively manage your rental (approve tenants, sign leases, set rents) and your adjusted gross income is below $100,000, you can deduct up to <strong>$25,000/year</strong> of rental losses against ordinary income (wages, salary). This benefit phases out between $100K–$150K AGI and is eliminated at $150K+.<br /><br />
                  <strong>Passive Investors</strong> — If you're a limited partner or don't materially participate, losses are "passive" and can only offset other passive income (other rental gains). Unused losses carry forward to future years and are released when you sell.
                </div>
              </div>

              <div className="tc-info" style={{ borderColor: "rgba(167,130,255,0.18)", background: "rgba(167,130,255,0.04)" }}>
                <div className="tc-info-title" style={{ color: "var(--purple)" }}>Cost Segregation: When Does It Make Sense?</div>
                <div className="tc-info-body">
                  A cost segregation study is an engineering analysis that reclassifies building components into shorter depreciation schedules — 5-year (appliances, carpeting, certain fixtures) and 15-year (parking lots, landscaping, exterior improvements). Combined with <strong>bonus depreciation</strong>, a large portion of these components can be deducted in Year 1.<br /><br />
                  <strong>Cost:</strong> Typically $5,000–$15,000 for residential properties; $10,000–$30,000+ for larger commercial properties.<br /><br />
                  <strong>When it's worth it:</strong> Generally makes sense on properties over $500,000 in value, or when your tax rate is high (24%+) and you need significant Year 1 deductions — for example, to offset a capital gains event or a high-income year. The tax savings in Year 1 typically pay for the study cost many times over.
                </div>
              </div>

            </>
          )}

          {/* Disclaimer */}
          <div className="tc-disclaimer">
            This calculator is for educational purposes only. Tax laws are complex and change frequently. The depreciation calculations, passive activity loss rules, and cost segregation estimates shown here are simplified for illustration purposes. Consult a CPA or qualified tax professional for advice specific to your situation, income level, and investment structure before making any tax or financial decisions.
          </div>
        </div>
      </div>
    </div>
  );
}
