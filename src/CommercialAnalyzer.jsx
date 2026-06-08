import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { exportMFPDF } from "./pdfExport";
import { useAuth } from "./AuthContext";
import { irr as solveIRR, withCumulative } from "./lib/finance";
import { useDocMeta } from "./lib/seo";
import { celebrateFirstSave } from "./lib/celebrate";
import DealCoach from "./components/DealCoach";

// Lazy-load charts (recharts is the heavy dep)
const CommercialCharts = lazy(() => import("./components/CommercialCharts"));

const num = v => parseFloat(String(v).replace(/,/g,"")) || 0;
const fmt  = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n||0);
const fmtPct = n => (isNaN(n)||!isFinite(n)) ? "—" : `${(n*100).toFixed(1)}%`;
const fmtX   = n => (isNaN(n)||!isFinite(n)||Math.abs(n)>999) ? "—" : `${n.toFixed(2)}x`;
const safe   = (n,d="—") => (isNaN(n)||!isFinite(n)) ? d : n;

function pmt(principal, annualRate, amortYears) {
  const p=num(principal), r=num(annualRate)/100/12, n=num(amortYears)*12;
  if(!p||!r||!n) return 0;
  return p*(r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1);
}

function loanBalance(principal, annualRate, amortYears, yearsElapsed) {
  const p=num(principal), r=num(annualRate)/100/12;
  const n=num(amortYears)*12, k=num(yearsElapsed)*12;
  if(!p||!r||!n) return p;
  return p*(Math.pow(1+r,n)-Math.pow(1+r,k))/(Math.pow(1+r,n)-1);
}

const DEFAULT_UNITS = [
  {type:"Bachelor / Studio", units:4, sqft:550, currentRent:1100, marketRent:1200},
  {type:"1 Bed / 1 Bath",    units:8, sqft:700, currentRent:1400, marketRent:1550},
  {type:"2 Bed / 1 Bath",    units:6, sqft:900, currentRent:1750, marketRent:1900},
  {type:"2 Bed / 2 Bath",    units:4, sqft:950, currentRent:1950, marketRent:2100},
  {type:"3 Bed / 2 Bath",    units:2, sqft:1150,currentRent:2200, marketRent:2400},
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Fira+Code:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
  input,select{font-family:'DM Sans',sans-serif}

  .mf-wrap{min-height:100vh;background:var(--bg)}
  .mf-nav{position:sticky;top:0;z-index:100;background:rgba(7,9,15,0.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .mf-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none}.mf-logo span{color:var(--blue)}
  .mf-nav-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .mf-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 11px;border-radius:7px}.mf-nav-link:hover{color:var(--text)}
  .mf-nav-ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:7px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}.mf-nav-ghost:hover{color:var(--text)}
  .mf-nav-primary{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none;display:inline-flex;align-items:center}

  .mf-page{max-width:1040px;margin:0 auto;padding:32px 20px 100px}
  .mf-hero{text-align:center;padding:36px 24px 28px;position:relative;overflow:hidden}
  .mf-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(59,158,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(59,158,255,0.02) 1px,transparent 1px);background-size:56px 56px;pointer-events:none}
  .mf-glow{position:absolute;top:-20%;left:50%;transform:translateX(-50%);width:700px;height:360px;background:radial-gradient(ellipse,rgba(59,158,255,0.07) 0%,transparent 65%);pointer-events:none}
  .mf-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(59,158,255,0.08);border:1px solid rgba(59,158,255,0.2);border-radius:99px;padding:5px 14px;font-size:11px;font-weight:700;color:var(--blue);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:14px;position:relative;z-index:1}
  .mf-hero h1{font-size:clamp(22px,4vw,34px);font-weight:800;letter-spacing:-1.5px;color:var(--text);margin-bottom:8px;position:relative;z-index:1}
  .mf-hero p{font-size:14px;color:var(--sub);max-width:500px;margin:0 auto;line-height:1.6;position:relative;z-index:1}

  /* Cards */
  .mf-card{background:var(--card);border:1px solid var(--borderf);border-radius:14px;margin-bottom:16px;overflow:hidden}
  .mf-card-head{padding:14px 20px;border-bottom:1px solid var(--borderf);display:flex;align-items:center;gap:10px}
  .mf-card-title{font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--sub)}
  .mf-card-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:rgba(59,158,255,0.1);color:var(--blue)}

  /* Inputs grid */
  .mf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding:16px 20px}
  .mf-field{display:flex;flex-direction:column;gap:4px}
  .mf-label{font-size:11px;font-weight:600;color:var(--dim);text-transform:uppercase;letter-spacing:0.4px}
  .mf-input{background:rgba(59,158,255,0.05);border:1px solid rgba(59,158,255,0.15);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);outline:none;width:100%;font-family:'Fira Code',monospace}
  .mf-input:focus{border-color:rgba(59,158,255,0.4)}
  .mf-input-text{background:rgba(255,255,255,0.03);border:1px solid var(--borderf);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);outline:none;width:100%;font-family:'DM Sans',sans-serif}
  .mf-input-text:focus{border-color:rgba(59,158,255,0.3)}

  /* Unit mix table */
  .mf-unit-table{width:100%;border-collapse:collapse}
  .mf-unit-table th{font-size:10px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.5px;padding:10px 12px;text-align:right;border-bottom:1px solid var(--borderf);background:rgba(255,255,255,0.02)}
  .mf-unit-table th:first-child{text-align:left}
  .mf-unit-table td{padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.03);font-size:13px;vertical-align:middle}
  .mf-unit-table tr:last-child td{border-bottom:none}
  .mf-unit-table .unit-input{background:rgba(59,158,255,0.06);border:1px solid rgba(59,158,255,0.15);border-radius:6px;padding:5px 8px;font-size:12px;color:var(--text);outline:none;width:80px;font-family:'Fira Code',monospace;text-align:right}
  .mf-unit-table .unit-input:focus{border-color:rgba(59,158,255,0.4)}
  .mf-unit-val{font-family:'Fira Code',monospace;font-size:13px;text-align:right;display:block}
  .mf-unit-total{background:rgba(255,255,255,0.03);font-weight:700}
  .mf-add-row{background:transparent;border:1px dashed var(--borderf);color:var(--dim);border-radius:8px;padding:8px;font-size:12px;cursor:pointer;width:100%;margin:8px 0;font-family:'DM Sans',sans-serif}
  .mf-add-row:hover{border-color:var(--blue);color:var(--blue)}
  .mf-del-btn{background:transparent;border:none;color:var(--dim);cursor:pointer;font-size:14px;padding:2px 6px}.mf-del-btn:hover{color:var(--red)}

  /* Metrics rows */
  .mf-metric-row{display:grid;grid-template-columns:1fr auto auto auto;gap:0;padding:11px 20px;border-bottom:1px solid rgba(255,255,255,0.03);align-items:center}
  .mf-metric-row:last-child{border-bottom:none}
  .mf-metric-row.total{background:rgba(255,255,255,0.03)}
  .mf-metric-row.section{background:rgba(59,158,255,0.04);border-bottom:1px solid var(--borderf)}
  .mf-metric-label{font-size:13px;color:var(--sub)}
  .mf-metric-label.bold{font-weight:700;color:var(--text)}
  .mf-metric-label.indent{padding-left:16px;font-size:12.5px}
  .mf-metric-label.formula{padding-left:16px;font-size:12px;color:var(--dim)}
  .mf-metric-val{font-family:'Fira Code',monospace;font-size:14px;color:var(--text);text-align:right;min-width:120px}
  .mf-metric-val.pos{color:var(--green)}
  .mf-metric-val.neg{color:var(--red)}
  .mf-metric-val.bold{font-weight:700}
  .mf-metric-val.blue{color:var(--blue)}
  .mf-metric-bench{font-size:11px;color:var(--dim);text-align:right;min-width:160px;padding-left:12px;font-style:italic}
  .mf-metric-status{min-width:80px;text-align:right;padding-left:8px}
  .mf-badge{display:inline-flex;align-items:center;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px}
  .mf-badge.good{background:rgba(52,217,138,0.1);color:var(--green)}
  .mf-badge.warn{background:rgba(240,160,48,0.1);color:var(--amber)}
  .mf-badge.bad{background:rgba(242,92,92,0.1);color:var(--red)}

  /* 5-year table */
  .mf-proj-table{width:100%;border-collapse:collapse;font-size:12.5px}
  .mf-proj-table th{padding:10px 14px;text-align:right;font-size:10px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.5px;background:rgba(255,255,255,0.02);border-bottom:1px solid var(--borderf)}
  .mf-proj-table th:first-child{text-align:left}
  .mf-proj-table td{padding:9px 14px;border-bottom:1px solid rgba(255,255,255,0.03);font-family:'Fira Code',monospace;text-align:right}
  .mf-proj-table td:first-child{font-family:'DM Sans',sans-serif;text-align:left;color:var(--sub);font-size:12px}
  .mf-proj-table tr.proj-total td{background:rgba(255,255,255,0.03);font-weight:700;color:var(--text)}
  .mf-proj-table tr.proj-noi td{color:var(--green)}
  .mf-proj-table tr.proj-noi td:first-child{color:var(--sub)}
  .mf-proj-table tr.proj-btcf td{color:var(--blue)}
  .mf-proj-table tr.proj-btcf td:first-child{color:var(--sub)}
  .mf-proj-table tr.proj-section td{background:rgba(59,158,255,0.04);border-top:1px solid var(--borderf);color:var(--text);font-family:'DM Sans',sans-serif;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}

  /* Sensitivity grid */
  .mf-sens-table{width:100%;border-collapse:collapse;font-size:12px}
  .mf-sens-table th{padding:8px 12px;text-align:center;font-size:10px;font-weight:700;color:var(--dim);text-transform:uppercase;background:rgba(255,255,255,0.02);border:1px solid var(--borderf)}
  .mf-sens-table td{padding:8px 12px;text-align:center;border:1px solid rgba(255,255,255,0.04);font-family:'Fira Code',monospace;font-size:12px}
  .mf-sens-table td.sens-label{text-align:left;font-family:'DM Sans',sans-serif;color:var(--sub);font-size:11px;font-weight:600;background:rgba(255,255,255,0.02)}
  .mf-sens-good{background:rgba(52,217,138,0.08);color:var(--green)}
  .mf-sens-warn{background:rgba(240,160,48,0.08);color:var(--amber)}
  .mf-sens-bad{background:rgba(242,92,92,0.08);color:var(--red)}

  /* Scorecard */
  .mf-scorecard{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px 20px}
  .mf-score-tile{background:rgba(255,255,255,0.03);border-radius:10px;padding:14px 16px;border:1px solid var(--borderf)}
  .mf-score-val{font-size:22px;font-weight:800;font-family:'Fira Code',monospace;line-height:1;margin-bottom:4px}
  .mf-score-lbl{font-size:10px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px}
  .mf-score-bench{font-size:10px;color:var(--dim);font-style:italic}

  /* Pro gate */
  .mf-gate{max-width:480px;margin:60px auto;background:var(--card);border:1px solid var(--borderf);border-radius:20px;padding:40px 36px;text-align:center}

  @media(max-width:700px){
    .mf-nav{padding:0 14px}
    .mf-page{padding:20px 12px 80px}
    .mf-scorecard{grid-template-columns:1fr 1fr}
    .mf-metric-bench{display:none}
    .mf-grid{grid-template-columns:1fr 1fr}
  }
  @media(max-width:480px){
    .mf-scorecard{grid-template-columns:1fr 1fr}
    .mf-metric-row{grid-template-columns:1fr auto auto}
    .mf-metric-status{display:none}
  }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────
function Badge({val, good, warn}) {
  if (val === null || val === undefined) return null;
  const cls = val >= good ? "good" : val >= warn ? "warn" : "bad";
  const label = val >= good ? "✓ Good" : val >= warn ? "⚠ OK" : "✗ Weak";
  return <span className={`mf-badge ${cls}`}>{label}</span>;
}

function MetricRow({label, value, bench, badge, indent, bold, formula, color, isNeg}) {
  const labelCls = `mf-metric-label${bold?" bold":""}${indent?" indent":""}${formula?" formula":""}`;
  const valCls   = `mf-metric-val${bold?" bold":""}${color?` ${color}`:""}${isNeg?" neg":""}`;
  return (
    <div className={`mf-metric-row${bold?" total":""}`}>
      <span className={labelCls}>{label}</span>
      <span className={valCls}>{value}</span>
      <span className="mf-metric-bench">{bench||""}</span>
      <span className="mf-metric-status">{badge}</span>
    </div>
  );
}

function SectionHead({title, sub}) {
  return (
    <div className="mf-card-head">
      <span className="mf-card-title">{title}</span>
      {sub && <span className="mf-card-badge">{sub}</span>}
    </div>
  );
}

function Field({label, value, onChange, type="number", prefix}) {
  return (
    <div className="mf-field">
      <label className="mf-label">{label}</label>
      <div style={{display:"flex",alignItems:"center",position:"relative"}}>
        {prefix && <span style={{position:"absolute",left:10,fontSize:13,color:"var(--dim)"}}>{prefix}</span>}
        <input
          className="mf-input"
          type={type}
          value={value}
          onChange={e=>onChange(e.target.value)}
          style={prefix?{paddingLeft:22}:{}}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CommercialAnalyzer() {
  useDocMeta({
    title: "Multifamily Underwriter",
    description: "Institutional multifamily underwriting: NOI, cap rate, DSCR, true IRR, year-by-year cash flow, sensitivity grids, and AI thesis hint.",
  });
  const { user, signOut, getSubscription } = useAuth();
  const [isPro, setIsPro]       = useState(false);
  const [proChecked, setProChecked] = useState(false);
  const [mfSaved, setMfSaved] = useState(false);
  const [aiThesis, setAiThesis] = useState(null);

  useEffect(() => {
    async function check() {
      if (!user) { setIsPro(false); setProChecked(true); return; }
      const { data } = await getSubscription();
      setIsPro(data?.status==="active" && data?.plan==="pro");
      setProChecked(true);
    }
    check();
  }, [user]);

  // ── Pre-fill from PropertyHub ─────────────────────────────────────────────
  const [propertyAddress, setPropertyAddress] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rde_prefill");
      if (!raw) return;
      const pf = JSON.parse(raw);
      if (Date.now() - pf.timestamp > 5 * 60 * 1000) return;
      if (pf.strategy && pf.strategy !== "multifamily") return;
      localStorage.removeItem("rde_prefill");
      if (pf.address) setPropertyAddress(pf.address);
      if (pf.estimatedValue) setPurchasePrice(Math.round(pf.estimatedValue));
      if (pf.propertyTaxes) setPropTax(Math.round(pf.propertyTaxes));
    } catch {}
  }, []);

  // ── Inputs ─────────────────────────────────────────────────────────────────
  const [unitMix, setUnitMix] = useState(DEFAULT_UNITS);

  // Assumptions
  const [purchasePrice, setPurchasePrice] = useState(4500000);
  const [downPct,       setDownPct]       = useState(25);
  const [renoBudget,    setRenoBudget]    = useState(150000);
  const [vacancyPct,    setVacancyPct]    = useState(7);
  const [otherIncome,   setOtherIncome]   = useState(6000);
  const [holdYears,     setHoldYears]     = useState(5);
  const [rentGrowth,    setRentGrowth]    = useState(3);
  const [opexGrowth,    setOpexGrowth]    = useState(2);
  const [entryCap,      setEntryCap]      = useState(5.5);
  const [exitCap,       setExitCap]       = useState(5.75);
  const [interestRate,  setInterestRate]  = useState(6.5);
  const [amortYears,    setAmortYears]    = useState(25);
  const [closingBuyPct, setClosingBuyPct] = useState(1.5);
  const [closingSellPct,setClosingSellPct]= useState(4.0);

  // OpEx inputs
  const [propTax,     setPropTax]     = useState(18000);
  const [insurance,   setInsurance]   = useState(8000);
  const [mgmtPct,     setMgmtPct]     = useState(9);
  const [maintPerUnit,setMaintPerUnit] = useState(1000);
  const [utilities,   setUtilities]   = useState(6000);
  const [landscape,   setLandscape]   = useState(4500);
  const [advertising, setAdvertising] = useState(2400);
  const [admin,       setAdmin]       = useState(3600);
  const [resPerUnit,  setResPerUnit]  = useState(400);

  // Unit mix handlers
  function updateUnit(i, field, val) {
    setUnitMix(prev => prev.map((u,idx) => idx===i ? {...u,[field]:num(val)||0} : u));
  }
  function addUnit() {
    setUnitMix(prev => [...prev, {type:"New Unit Type",units:1,sqft:800,currentRent:1500,marketRent:1600}]);
  }
  function removeUnit(i) {
    setUnitMix(prev => prev.filter((_,idx) => idx!==i));
  }

  // ── Calculations ────────────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const totalUnits = unitMix.reduce((a,u) => a + num(u.units), 0);
    const gprCurrent = unitMix.reduce((a,u) => a + num(u.units)*num(u.currentRent)*12, 0);
    const gprMarket  = unitMix.reduce((a,u) => a + num(u.units)*num(u.marketRent)*12, 0);
    const rentUpside = gprMarket - gprCurrent;

    // Use current rent as GPR
    const GPR        = gprCurrent;
    const vacancyLoss= -GPR * (num(vacancyPct)/100);
    const other      = num(otherIncome) * 12;
    const EGI        = GPR + vacancyLoss + other;

    // OpEx
    const taxAmt   = num(propTax);
    const insAmt   = num(insurance);
    const mgmtAmt  = EGI * (num(mgmtPct)/100);
    const maintAmt = totalUnits * num(maintPerUnit);
    const utilAmt  = num(utilities);
    const landAmt  = num(landscape);
    const advAmt   = num(advertising);
    const adminAmt = num(admin);
    const resAmt   = totalUnits * num(resPerUnit);
    const totalOpex= taxAmt+insAmt+mgmtAmt+maintAmt+utilAmt+landAmt+advAmt+adminAmt+resAmt;
    const OER      = EGI > 0 ? totalOpex/EGI : 0;

    // NOI
    const NOI = EGI - totalOpex;

    // Valuation
    const PP         = num(purchasePrice);
    const impliedVal = entryCap > 0 ? NOI / (num(entryCap)/100) : 0;
    const actualCap  = PP > 0 ? NOI/PP : 0;
    const GRM        = GPR > 0 ? PP/GPR : 0;
    const priceUnit  = totalUnits > 0 ? PP/totalUnits : 0;

    // Financing
    const downAmt    = PP * (num(downPct)/100);
    const closingBuy = PP * (num(closingBuyPct)/100);
    const reno       = num(renoBudget);
    const totalCost  = PP + closingBuy + reno;
    const loanAmt    = PP - downAmt;
    const LTV        = PP > 0 ? loanAmt/PP : 0;
    const LTC        = totalCost > 0 ? loanAmt/totalCost : 0;
    const monthlyPMT = pmt(loanAmt, num(interestRate), num(amortYears));
    const ADS        = monthlyPMT * 12;
    const DSCR       = ADS > 0 ? NOI/ADS : 0;

    // Cash flow
    const totalCashIn= downAmt + closingBuy + reno;
    const BTCF       = NOI - ADS;
    const CoC        = totalCashIn > 0 ? BTCF/totalCashIn : 0;
    const cfPerUnit  = totalUnits > 0 ? BTCF/totalUnits/12 : 0;
    const BER        = GPR > 0 ? (totalOpex+ADS)/GPR : 0;
    const yieldOnCost= totalCost > 0 ? NOI/totalCost : 0;

    // Exit
    const hold       = num(holdYears);
    const rg         = num(rentGrowth)/100;
    const og         = num(opexGrowth)/100;
    const yr5NOI     = NOI * Math.pow(1+rg, hold);
    const exitCapR   = num(exitCap)/100;
    const exitVal    = exitCapR > 0 ? yr5NOI/exitCapR : 0;
    const sellCosts  = exitVal * (num(closingSellPct)/100);
    const loanBal    = loanBalance(loanAmt, num(interestRate), num(amortYears), hold);
    const netProceeds= exitVal - sellCosts - loanBal;

    // Year-by-year projection — length follows holdYears (was hardcoded to 5).
    const years = Array.from({length: Math.max(1, hold)}, (_, i) => i + 1);
    const projBase = years.map(yr => {
      const gprYr   = GPR * Math.pow(1+rg, yr-1);
      const vacYr   = -gprYr * (num(vacancyPct)/100);
      const egiYr   = gprYr + vacYr + other;
      const opexYr  = totalOpex * Math.pow(1+og, yr-1);
      const noiYr   = egiYr - opexYr;
      const btcfYr  = noiYr - ADS;
      const dscrYr  = ADS > 0 ? noiYr/ADS : 0;
      const cocYr   = totalCashIn > 0 ? btcfYr/totalCashIn : 0;
      return {yr, gprYr, vacYr, egiYr, opexYr, noiYr, btcfYr, dscrYr, cocYr};
    });
    const proj = withCumulative(projBase, "btcfYr", "cumBtcf");

    // Use REAL summed BTCF (was BTCF × hold — Yr1 amount × years, ignoring growth).
    const totalCF    = proj.reduce((a, p) => a + p.btcfYr, 0);
    const totalReturn= netProceeds + totalCF;
    const eqMultiple = totalCashIn > 0 ? totalReturn/totalCashIn : 0;
    // CAGR — kept for backwards-compat comparison. NOT the same as IRR.
    const annReturn  = eqMultiple > 0 ? Math.pow(eqMultiple, 1/hold) - 1 : 0;

    // True IRR — solve NPV = 0 across actual yearly cash flows.
    //   Year 0:    -totalCashIn (equity in)
    //   Year 1..N: +BTCF_yr
    //   Year N also gets +netProceeds (lumped into the exit year)
    const irrFlows = [-totalCashIn, ...proj.map((p,i) =>
      i === proj.length - 1 ? p.btcfYr + netProceeds : p.btcfYr
    )];
    const irrValue = solveIRR(irrFlows);

    // Cumulative cash-out-of-pocket curve for the equity-buildup area chart.
    // At year 0 the investor is -totalCashIn; each year adds BTCF; exit
    // year also adds netProceeds. Crossing zero = capital recovered.
    const equityCurve = [{ yr: 0, cum: -totalCashIn }, ...proj.map((p, i) => ({
      yr: p.yr,
      cum: -totalCashIn + p.cumBtcf + (i === proj.length - 1 ? netProceeds : 0),
    }))];

    // Sensitivity: DSCR & CoC vs vacancy rates at different interest rates
    const vacRates = [3,5,7,10,12,15];
    const intRates = [4.5,5.5,6.5,7.5,8.5];
    const sensDSCR = intRates.map(ir => vacRates.map(vr => {
      const egi2 = GPR*(1-vr/100) + other;
      const noi2 = egi2 - totalOpex;
      const ads2 = pmt(loanAmt, ir, num(amortYears)) * 12;
      return ads2 > 0 ? noi2/ads2 : 0;
    }));
    const sensCoC = intRates.map(ir => vacRates.map(vr => {
      const egi2 = GPR*(1-vr/100) + other;
      const noi2 = egi2 - totalOpex;
      const ads2 = pmt(loanAmt, ir, num(amortYears)) * 12;
      return totalCashIn > 0 ? (noi2-ads2)/totalCashIn : 0;
    }));

    // ── Exit-driven sensitivity: IRR across rent growth × exit cap ────
    // Recomputes the full proj for each rent-growth value, then exit value
    // at each cap rate. This is the classic institutional grid that drives
    // the deal-or-no-deal call once leverage is decided.
    const rgValues = [0, 0.01, 0.02, 0.03, 0.04, 0.05];
    const ecValues = [0.045, 0.05, 0.055, 0.06, 0.065, 0.07];
    const sensIRR = rgValues.map(rgX => {
      // Build projection at this rent growth
      const projX = years.map(yr => {
        const gprYr  = GPR * Math.pow(1+rgX, yr-1);
        const vacYr  = -gprYr * (num(vacancyPct)/100);
        const egiYr  = gprYr + vacYr + other;
        const opexYr = totalOpex * Math.pow(1+og, yr-1);
        const noiYr  = egiYr - opexYr;
        return noiYr - ADS;
      });
      const yrNOI_X = NOI * Math.pow(1+rgX, hold);
      return ecValues.map(ecX => {
        const exitValX = ecX > 0 ? yrNOI_X / ecX : 0;
        const sellX = exitValX * (num(closingSellPct)/100);
        const netX = exitValX - sellX - loanBal;
        if (totalCashIn <= 0) return 0;
        // IRR over [-cashIn, ...btcf, +netProceeds at hold-end]
        const flows = [-totalCashIn, ...projX.map((b, i) => i === projX.length - 1 ? b + netX : b)];
        return solveIRR(flows) || 0;
      });
    });

    return {
      totalUnits, gprCurrent, gprMarket, rentUpside,
      GPR, vacancyLoss, other, EGI,
      taxAmt, insAmt, mgmtAmt, maintAmt, utilAmt, landAmt, advAmt, adminAmt, resAmt,
      totalOpex, OER,
      NOI, impliedVal, actualCap, GRM, priceUnit,
      downAmt, closingBuy, reno, totalCost, loanAmt, LTV, LTC,
      monthlyPMT, ADS, DSCR,
      totalCashIn, BTCF, CoC, cfPerUnit, BER, yieldOnCost,
      yr5NOI, exitVal, sellCosts, loanBal, netProceeds, totalCF, totalReturn, eqMultiple, annReturn,
      irr: irrValue, equityCurve,
      proj, sensDSCR, sensCoC, vacRates, intRates,
      sensIRR, rgValues, ecValues,
    };
  }, [unitMix, purchasePrice, downPct, renoBudget, vacancyPct, otherIncome,
      holdYears, rentGrowth, opexGrowth, entryCap, exitCap, interestRate, amortYears,
      closingBuyPct, closingSellPct, propTax, insurance, mgmtPct, maintPerUnit,
      utilities, landscape, advertising, admin, resPerUnit]);

  const c = calc;

  // ── Deal Thesis Hint (Haiku) — debounced fetch on metrics change ───────
  useEffect(() => {
    if (!c) return;
    const handle = setTimeout(() => {
      fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "deal-thesis",
          strategy: "Multifamily",
          address: propertyAddress,
          metrics: {
            totalUnits:   c.totalUnits,
            NOI:          c.NOI,
            capRate:      c.actualCap,
            DSCR:         c.DSCR,
            coc:          c.CoC,
            GRM:          c.GRM,
            OER:          c.OER,
            yieldOnCost:  c.yieldOnCost,
            irr:          c.irr,
            eqMultiple:   c.eqMultiple,
            annReturn:    c.annReturn,
            BTCF:         c.BTCF,
            exitVal:      c.exitVal,
            netProceeds:  c.netProceeds,
          },
        }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(t => { if (t?.thesis) setAiThesis(t); })
        .catch(() => {});
    }, 600);
    return () => clearTimeout(handle);
  }, [c?.NOI, c?.DSCR, c?.CoC, c?.irr, c?.eqMultiple, propertyAddress]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="mf-wrap">
      <style>{CSS}</style>

      {/* Nav */}
      <nav className="mf-nav">
        <a href="/" className="mf-logo"><span>Real</span> Deal</a>
        <div className="mf-nav-right">
          <a href="/analyze" className="mf-nav-link">Tools</a>
          <a href="/app"     className="mf-nav-link">Flip</a>
          <a href="/commercial" className="mf-nav-link" style={{color:"var(--blue)"}}>Multifamily</a>
          <a href="/brrrr"   className="mf-nav-link">BRRRR</a>
          <a href="/compare" className="mf-nav-link">Compare</a>
          {user && <a href="/dashboard" className="mf-nav-link">My Deals</a>}
          <a href="/pricing" className="mf-nav-link" style={{color:"var(--amber)"}}>Pricing</a>
          {user ? <button className="mf-nav-ghost" onClick={signOut}>Sign out</button>
                : <a href="/login" className="mf-nav-primary">Sign in</a>}
        </div>
      </nav>

      {/* Launch Banner — free access */}
      {!user && (
        <div style={{background:"rgba(52,217,138,0.08)",borderBottom:"1px solid rgba(52,217,138,0.2)",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"center",gap:12,flexWrap:"wrap"}}>
          <span style={{fontSize:18}}>🎉</span>
          <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>Free during launch — <span style={{color:"var(--green)"}}>sign in to access all tools at no cost.</span></span>
          <a href="/login" style={{background:"var(--green)",color:"#07090f",borderRadius:8,padding:"6px 16px",fontSize:13,fontWeight:800,textDecoration:"none"}}>Sign in free →</a>
        </div>
      )}

      <div className="mf-page">

        {/* Hero */}
        <div className="mf-hero">
          <div className="mf-glow"/>
          <div className="mf-tag">🎉 Free During Launch · Multifamily Underwriter</div>
          <h1>Commercial Deal Analysis</h1>
          <p>Full institutional underwriting — NOI, DSCR, cap rate, 5-year projections, sensitivity analysis. Everything a lender or investor wants to see.</p>

          {/* Try Sample Deal — activation primer */}
          <div style={{display:"inline-flex",alignItems:"center",gap:10,marginTop:14,padding:"8px 14px",background:"rgba(52,217,138,0.08)",border:"1px solid rgba(52,217,138,0.3)",borderRadius:"var(--r-sm,4px)"}}>
            <span style={{fontFamily:"'Fira Code',monospace",fontSize:10.5,color:"var(--green)",fontWeight:700,letterSpacing:"0.6px"}}>NEW HERE?</span>
            <button
              type="button"
              onClick={() => {
                setUnitMix([
                  {type:"Bachelor / Studio", units:6, sqft:560, currentRent:1100, marketRent:1250},
                  {type:"1 Bed / 1 Bath",    units:10,sqft:720, currentRent:1450, marketRent:1600},
                  {type:"2 Bed / 1 Bath",    units:6, sqft:920, currentRent:1800, marketRent:1950},
                  {type:"3 Bed / 2 Bath",    units:2, sqft:1180,currentRent:2200, marketRent:2400},
                ]);
                setPurchasePrice(4200000); setDownPct(25); setRenoBudget(180000);
                setVacancyPct(6); setOtherIncome(5500); setHoldYears(5);
                setRentGrowth(3); setOpexGrowth(2); setEntryCap(5.5); setExitCap(5.75);
                setInterestRate(6.25); setAmortYears(30);
                setClosingBuyPct(1.5); setClosingSellPct(4.0);
                setPropTax(22000); setInsurance(9500); setMgmtPct(8);
                setMaintPerUnit(950); setUtilities(7200); setLandscape(4800);
                setAdvertising(2400); setAdmin(3600); setResPerUnit(450);
                setPropertyAddress("8814 99 St NW, Edmonton, AB");
                setTimeout(() => window.scrollTo({top: window.scrollY + 500, behavior: "smooth"}), 80);
              }}
              style={{
                fontFamily:"'Fira Code',monospace",fontSize:11,fontWeight:700,letterSpacing:"0.6px",
                padding:"6px 14px",border:"1px solid var(--green)",borderRadius:"var(--r-sm,4px)",
                color:"#07090f",background:"var(--green)",cursor:"pointer"
              }}>
              ▶ LOAD EDMONTON 24-UNIT
            </button>
          </div>
        </div>

        {/* ── DEAL RED FLAGS ────────────────────────────────────────────────── */}
        {(() => {
          const flags = [];
          if (c.DSCR < 1.0 && c.DSCR > 0)
            flags.push({ sev:"critical", msg: `DSCR is ${fmtX(c.DSCR)} — below 1.0x means rent cannot cover the mortgage. Lenders require ≥ 1.25x.` });
          else if (c.DSCR < 1.25 && c.DSCR >= 1.0)
            flags.push({ sev:"warning", msg: `DSCR is ${fmtX(c.DSCR)} — below the typical lender minimum of 1.25x. May not qualify for conventional financing.` });
          if (c.NOI <= 0)
            flags.push({ sev:"critical", msg: "NOI is negative — operating expenses exceed gross income. Review rents and expense inputs." });
          if (c.actualCap < 0.05 && c.actualCap > 0)
            flags.push({ sev:"warning", msg: `Cap rate is ${fmtPct(c.actualCap)} — below 5.0%. Thin margin against rising rates or vacancy spikes.` });
          if (c.CoC < 0)
            flags.push({ sev:"critical", msg: "Cash-on-cash return is negative — the deal loses cash after debt service." });
          else if (c.CoC < 0.05 && c.CoC >= 0)
            flags.push({ sev:"warning", msg: `Cash-on-cash return is only ${fmtPct(c.CoC)} — below the 5% minimum for a viable rental investment.` });
          if (c.OER > 0.60)
            flags.push({ sev:"warning", msg: `Operating Expense Ratio is ${fmtPct(c.OER)} — above 60% signals high expense load or undermarket rents.` });
          if (!flags.length) return null;
          return (
            <div style={{marginBottom:20,borderRadius:14,overflow:"hidden",border:"1px solid rgba(242,92,92,0.2)",background:"rgba(242,92,92,0.03)"}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid rgba(242,92,92,0.12)",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>⚠️</span>
                <span style={{fontSize:13,fontWeight:800,color:"#f25c5c"}}>Deal Red Flags — {flags.length} issue{flags.length>1?"s":""} detected</span>
              </div>
              {flags.map((f,i) => (
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 18px",borderBottom:i<flags.length-1?"1px solid rgba(255,255,255,0.04)":"none"}}>
                  <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{f.sev==="critical"?"🚨":"⚠️"}</span>
                  <span style={{fontSize:13,color:f.sev==="critical"?"#f25c5c":"#f0a030",lineHeight:1.5}}>{f.msg}</span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── SCORECARD ─────────────────────────────────────────────────────── */}
        <div className="mf-card" style={{marginBottom:24}}>
          <SectionHead title="Deal Scorecard" sub="Live"/>
          {/* AI Thesis at the top — the insight is the headline, numbers are the proof */}
          {aiThesis?.thesis && (
            <div style={{
              margin:"14px 20px 4px",padding:"14px 16px",
              background:"linear-gradient(135deg, rgba(52,217,138,0.10), rgba(59,158,255,0.04))",
              border:"1px solid rgba(52,217,138,0.35)",
              borderLeft:"4px solid var(--green)",
              borderRadius:"var(--r-md,6px)",
              display:"flex",gap:12,alignItems:"flex-start"
            }}>
              <span style={{fontSize:18,lineHeight:1.4}}>🤖</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Fira Code',monospace",fontSize:10,fontWeight:700,color:"var(--green)",letterSpacing:"0.8px",marginBottom:5}}>
                  AI THESIS{aiThesis.source !== "template" && <span style={{color:"var(--dim)",fontWeight:500,marginLeft:8}}>· {aiThesis.source}</span>}
                </div>
                <div style={{fontSize:14,color:"var(--text)",lineHeight:1.55,letterSpacing:"-0.1px"}}>{aiThesis.thesis}</div>
              </div>
            </div>
          )}
          <div className="mf-scorecard">
            {[
              {lbl:"NOI",          val:fmt(c.NOI),         color:"var(--green)", bench:"Net Operating Income"},
              {lbl:"Cap Rate",     val:fmtPct(c.actualCap),color:c.actualCap>=0.05?"var(--green)":"var(--amber)", bench:"≥ 5.0% target"},
              {lbl:"DSCR",        val:fmtX(c.DSCR),        color:c.DSCR>=1.25?"var(--green)":c.DSCR>=1.0?"var(--amber)":"var(--red)", bench:"≥ 1.25x lender min"},
              {lbl:"Cash-on-Cash",val:fmtPct(c.CoC),       color:c.CoC>=0.07?"var(--green)":c.CoC>=0.05?"var(--amber)":"var(--red)", bench:"≥ 7% target"},
              {lbl:"GRM",         val:fmtX(c.GRM),         color:c.GRM<=12?"var(--green)":"var(--amber)", bench:"≤ 12x typical"},
              {lbl:"OER",         val:fmtPct(c.OER),       color:c.OER<=0.50?"var(--green)":"var(--amber)", bench:"< 50% target"},
              {lbl:"Eq. Multiple",val:fmtX(c.eqMultiple),  color:c.eqMultiple>=2?"var(--green)":c.eqMultiple>=1.5?"var(--amber)":"var(--red)", bench:"≥ 2.0x / 5 yr"},
              {lbl:"Ann. Return", val:fmtPct(c.annReturn),  color:c.annReturn>=0.15?"var(--green)":"var(--amber)", bench:"≥ 15% target"},
            ].map(({lbl,val,color,bench}) => (
              <div className="mf-score-tile" key={lbl}>
                <div className="mf-score-lbl">{lbl}</div>
                <div className="mf-score-val" style={{color}}>{val}</div>
                <div className="mf-score-bench">{bench}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── UNIT MIX ──────────────────────────────────────────────────────── */}
        <div className="mf-card">
          <SectionHead title="Unit Mix" sub={`${c.totalUnits} units`}/>
          <div style={{padding:"0 0 12px",overflowX:"auto"}}>
            <table className="mf-unit-table" style={{minWidth:680}}>
              <thead>
                <tr>
                  <th style={{textAlign:"left",paddingLeft:20}}>Unit Type</th>
                  <th># Units</th><th>Sq Ft</th>
                  <th>Current Rent/Mo</th><th>Market Rent/Mo</th>
                  <th>Annual GPR</th><th>Upside</th><th></th>
                </tr>
              </thead>
              <tbody>
                {unitMix.map((u,i) => {
                  const annGPR   = num(u.units)*num(u.currentRent)*12;
                  const annMkt   = num(u.units)*num(u.marketRent)*12;
                  const upside   = annMkt - annGPR;
                  return (
                    <tr key={i}>
                      <td style={{paddingLeft:20}}>
                        <input className="mf-input-text" value={u.type}
                          onChange={e=>updateUnit(i,"type",e.target.value)} style={{width:160}}/>
                      </td>
                      <td><input className="unit-input" type="number" value={u.units}       onChange={e=>updateUnit(i,"units",e.target.value)}/></td>
                      <td><input className="unit-input" type="number" value={u.sqft}        onChange={e=>updateUnit(i,"sqft",e.target.value)}/></td>
                      <td><input className="unit-input" type="number" value={u.currentRent} onChange={e=>updateUnit(i,"currentRent",e.target.value)}/></td>
                      <td><input className="unit-input" type="number" value={u.marketRent}  onChange={e=>updateUnit(i,"marketRent",e.target.value)}/></td>
                      <td><span className="mf-unit-val">{fmt(annGPR)}</span></td>
                      <td><span className="mf-unit-val" style={{color:"var(--green)"}}>{fmt(upside)}</span></td>
                      <td><button className="mf-del-btn" onClick={()=>removeUnit(i)}>✕</button></td>
                    </tr>
                  );
                })}
                <tr className="mf-unit-total">
                  <td style={{paddingLeft:20,fontWeight:700}}>TOTAL</td>
                  <td><span className="mf-unit-val" style={{fontWeight:700}}>{c.totalUnits}</span></td>
                  <td></td><td></td><td></td>
                  <td><span className="mf-unit-val" style={{fontWeight:700}}>{fmt(c.gprCurrent)}</span></td>
                  <td><span className="mf-unit-val" style={{fontWeight:700,color:"var(--green)"}}>{fmt(c.rentUpside)}</span></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
            <div style={{padding:"0 20px"}}>
              <button className="mf-add-row" onClick={addUnit}>+ Add unit type</button>
            </div>
          </div>
        </div>

        {/* ── ASSUMPTIONS ───────────────────────────────────────────────────── */}
        <div className="mf-card">
          <SectionHead title="Key Assumptions"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            {/* Left col */}
            <div style={{borderRight:"1px solid var(--borderf)"}}>
              <div style={{padding:"10px 20px",borderBottom:"1px solid rgba(255,255,255,0.03)",fontSize:11,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Acquisition</div>
              <div className="mf-grid" style={{gridTemplateColumns:"1fr 1fr"}}>
                <Field label="Purchase Price ($)" value={purchasePrice} onChange={setPurchasePrice}/>
                <Field label="Down Payment (%)"   value={downPct}       onChange={setDownPct}/>
                <Field label="Reno Budget ($)"    value={renoBudget}    onChange={setRenoBudget}/>
                <Field label="Closing Costs Buy (%)" value={closingBuyPct} onChange={setClosingBuyPct}/>
              </div>
              <div style={{padding:"10px 20px",borderTop:"1px solid var(--borderf)",borderBottom:"1px solid rgba(255,255,255,0.03)",fontSize:11,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Financing</div>
              <div className="mf-grid" style={{gridTemplateColumns:"1fr 1fr"}}>
                <Field label="Interest Rate (%)"  value={interestRate}  onChange={setInterestRate}/>
                <Field label="Amortization (yrs)" value={amortYears}    onChange={setAmortYears}/>
              </div>
              <div style={{padding:"10px 20px",borderTop:"1px solid var(--borderf)",borderBottom:"1px solid rgba(255,255,255,0.03)",fontSize:11,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Income</div>
              <div className="mf-grid" style={{gridTemplateColumns:"1fr 1fr"}}>
                <Field label="Vacancy Rate (%)"      value={vacancyPct}   onChange={setVacancyPct}/>
                <Field label="Other Income ($/mo)"   value={otherIncome}  onChange={setOtherIncome}/>
              </div>
            </div>
            {/* Right col */}
            <div>
              <div style={{padding:"10px 20px",borderBottom:"1px solid rgba(255,255,255,0.03)",fontSize:11,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Operating Expenses</div>
              <div className="mf-grid" style={{gridTemplateColumns:"1fr 1fr"}}>
                <Field label="Property Tax ($/yr)"   value={propTax}      onChange={setPropTax}/>
                <Field label="Insurance ($/yr)"      value={insurance}    onChange={setInsurance}/>
                <Field label="Mgmt Fee (% EGI)"      value={mgmtPct}      onChange={setMgmtPct}/>
                <Field label="Maint. $/unit/yr"      value={maintPerUnit} onChange={setMaintPerUnit}/>
                <Field label="Utilities ($/yr)"      value={utilities}    onChange={setUtilities}/>
                <Field label="Landscape ($/yr)"      value={landscape}    onChange={setLandscape}/>
                <Field label="Advertising ($/yr)"    value={advertising}  onChange={setAdvertising}/>
                <Field label="Admin ($/yr)"          value={admin}        onChange={setAdmin}/>
                <Field label="Reserves $/unit/yr"    value={resPerUnit}   onChange={setResPerUnit}/>
              </div>
              <div style={{padding:"10px 20px",borderTop:"1px solid var(--borderf)",borderBottom:"1px solid rgba(255,255,255,0.03)",fontSize:11,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Exit</div>
              <div className="mf-grid" style={{gridTemplateColumns:"1fr 1fr 1fr"}}>
                <Field label="Hold (yrs)"      value={holdYears}    onChange={setHoldYears}/>
                <Field label="Entry Cap (%)"   value={entryCap}     onChange={setEntryCap}/>
                <Field label="Exit Cap (%)"    value={exitCap}      onChange={setExitCap}/>
                <Field label="Rent Growth %/yr" value={rentGrowth}  onChange={setRentGrowth}/>
                <Field label="OpEx Growth %/yr" value={opexGrowth}  onChange={setOpexGrowth}/>
                <Field label="Sell Costs (%)"  value={closingSellPct} onChange={setClosingSellPct}/>
              </div>
            </div>
          </div>
        </div>

        {/* ── INCOME & NOI ──────────────────────────────────────────────────── */}
        <div className="mf-card">
          <SectionHead title="Income Statement — Year 1"/>
          {/* INCOME */}
          <MetricRow label="Gross Potential Rent (GPR)" value={fmt(c.GPR)} bench="100% occupancy at current rents" bold/>
          <MetricRow label="Less: Vacancy & Credit Loss" value={fmt(c.vacancyLoss)} bench={`${fmtPct(num(vacancyPct)/100)} — 5–10% stabilised`} indent color="neg" isNeg/>
          <MetricRow label="Other Income (parking, laundry)" value={fmt(c.other)} bench="Annual" indent/>
          <div className="mf-metric-row total" style={{background:"rgba(59,158,255,0.05)"}}>
            <span className="mf-metric-label bold">EFFECTIVE GROSS INCOME (EGI)</span>
            <span className="mf-metric-val bold blue">{fmt(c.EGI)}</span>
            <span className="mf-metric-bench">GPR − Vacancy + Other</span>
            <span className="mf-metric-status"/>
          </div>

          {/* OPEX */}
          <div className="mf-metric-row section"><span className="mf-metric-label bold" style={{color:"var(--sub)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.5px"}}>Operating Expenses</span><span/><span/><span/></div>
          <MetricRow label="Property Taxes"          value={fmt(c.taxAmt)}   bench={fmtPct(c.EGI?c.taxAmt/c.EGI:0)+" of EGI"} indent/>
          <MetricRow label="Insurance"               value={fmt(c.insAmt)}   bench={fmtPct(c.EGI?c.insAmt/c.EGI:0)+" of EGI"} indent/>
          <MetricRow label="Property Management ★"  value={fmt(c.mgmtAmt)}  bench={`${mgmtPct}% of EGI — formula`} indent formula/>
          <MetricRow label="Repairs & Maintenance ★" value={fmt(c.maintAmt)} bench={`$${maintPerUnit}/unit/yr — formula`} indent formula/>
          <MetricRow label="Utilities"               value={fmt(c.utilAmt)}  bench={fmtPct(c.EGI?c.utilAmt/c.EGI:0)+" of EGI"} indent/>
          <MetricRow label="Landscaping & Snow"      value={fmt(c.landAmt)}  bench={fmtPct(c.EGI?c.landAmt/c.EGI:0)+" of EGI"} indent/>
          <MetricRow label="Advertising & Leasing"   value={fmt(c.advAmt)}   bench={fmtPct(c.EGI?c.advAmt/c.EGI:0)+" of EGI"} indent/>
          <MetricRow label="Administrative"          value={fmt(c.adminAmt)} bench={fmtPct(c.EGI?c.adminAmt/c.EGI:0)+" of EGI"} indent/>
          <MetricRow label="Reserves for Replacement ★" value={fmt(c.resAmt)} bench={`$${resPerUnit}/unit/yr — formula`} indent formula/>
          <div className="mf-metric-row total">
            <span className="mf-metric-label bold">TOTAL OPERATING EXPENSES</span>
            <span className="mf-metric-val bold neg">{fmt(c.totalOpex)}</span>
            <span className="mf-metric-bench">OER: {fmtPct(c.OER)} — target &lt;50%</span>
            <span className="mf-metric-status">
              <Badge val={1-c.OER} good={0.5} warn={0.3}/>
            </span>
          </div>

          {/* NOI */}
          <div className="mf-metric-row total" style={{background:"rgba(52,217,138,0.05)",borderTop:"1px solid var(--borderf)"}}>
            <span className="mf-metric-label bold" style={{fontSize:15}}>NET OPERATING INCOME (NOI)</span>
            <span className="mf-metric-val bold" style={{fontSize:18,color:"var(--green)"}}>{fmt(c.NOI)}</span>
            <span className="mf-metric-bench">EGI − Total OpEx — core valuation input</span>
            <span className="mf-metric-status"><Badge val={c.NOI} good={1} warn={0}/></span>
          </div>
        </div>

        {/* ── VALUATION ─────────────────────────────────────────────────────── */}
        <div className="mf-card">
          <SectionHead title="Valuation"/>
          <MetricRow label="Implied Value at Entry Cap Rate" value={fmt(c.impliedVal)} bench={`NOI ÷ ${fmtPct(num(entryCap)/100)} cap`} bold/>
          <MetricRow label="Purchase Price" value={fmt(num(purchasePrice))} bench="Your offer / asking price" indent/>
          <MetricRow label="Actual Cap Rate (at purchase price)" value={fmtPct(c.actualCap)} bench="≥ market cap rate" indent
            badge={<Badge val={c.actualCap} good={num(entryCap)/100} warn={num(entryCap)/100*0.9}/>}/>
          <MetricRow label="Gross Rent Multiplier (GRM)" value={fmtX(c.GRM)} bench="8–12x typical MF — lower is better" indent
            badge={<Badge val={c.GRM>0?1/c.GRM:0} good={1/12} warn={1/15}/>}/>
          <MetricRow label="Price Per Unit" value={fmt(c.priceUnit)} bench="Compare to recent comparable sales" indent/>
          <MetricRow label="Rent Upside (current → market)" value={fmt(c.rentUpside)} bench="Annual GPR increase at market rents" indent color={c.rentUpside>0?"pos":""}/>
        </div>

        {/* ── FINANCING ─────────────────────────────────────────────────────── */}
        <div className="mf-card">
          <SectionHead title="Financing & Acquisition Costs"/>
          <MetricRow label="Down Payment" value={fmt(c.downAmt)} bench={fmtPct(num(downPct)/100)+" of purchase"} indent/>
          <MetricRow label="Closing Costs (Acquisition)" value={fmt(c.closingBuy)} bench={fmtPct(num(closingBuyPct)/100)} indent/>
          <MetricRow label="Renovation Budget" value={fmt(c.reno)} bench="Unit upgrades, systems, common areas" indent/>
          <MetricRow label="TOTAL PROJECT COST" value={fmt(c.totalCost)} bench="Purchase + closing + reno" bold/>
          <div style={{height:1,background:"var(--borderf)",margin:"4px 0"}}/>
          <MetricRow label="Loan Amount" value={fmt(c.loanAmt)} bench="Purchase × (1 − down %)" indent/>
          <MetricRow label="Loan-to-Value (LTV)" value={fmtPct(c.LTV)} bench="Most commercial lenders: 65–75% max" indent
            badge={<Badge val={1-c.LTV} good={0.30} warn={0.25}/>}/>
          <MetricRow label="Loan-to-Cost (LTC)" value={fmtPct(c.LTC)} bench="Used on value-add / construction deals" indent/>
          <MetricRow label="Monthly Payment (PMT)" value={fmt(c.monthlyPMT)} bench="Principal & interest — standard PMT formula" indent/>
          <MetricRow label="Annual Debt Service (ADS)" value={fmt(c.ADS)} bench="Monthly PMT × 12" indent bold/>
          <div className="mf-metric-row total" style={{background:c.DSCR>=1.25?"rgba(52,217,138,0.05)":c.DSCR>=1.0?"rgba(240,160,48,0.05)":"rgba(242,92,92,0.05)"}}>
            <span className="mf-metric-label bold" style={{fontSize:15}}>DSCR (Debt Service Coverage Ratio)</span>
            <span className="mf-metric-val bold" style={{fontSize:18,color:c.DSCR>=1.25?"var(--green)":c.DSCR>=1.0?"var(--amber)":"var(--red)"}}>{fmtX(c.DSCR)}</span>
            <span className="mf-metric-bench">Lender minimum 1.20x — target 1.30x+</span>
            <span className="mf-metric-status"><Badge val={c.DSCR} good={1.25} warn={1.0}/></span>
          </div>
        </div>

        {/* ── CASH FLOW & RETURNS ───────────────────────────────────────────── */}
        <div className="mf-card">
          <SectionHead title="Cash Flow & Returns"/>
          <MetricRow label="Total Cash Invested (Equity In)" value={fmt(c.totalCashIn)} bench="Down + closing + reno" bold/>
          <MetricRow label="Before-Tax Cash Flow (BTCF)" value={fmt(c.BTCF)} bench="NOI − Annual Debt Service" indent bold
            color={c.BTCF>0?"pos":"neg"} badge={<Badge val={c.BTCF} good={1} warn={0}/>}/>
          <MetricRow label="Cash-on-Cash Return (CoC)" value={fmtPct(c.CoC)} bench="BTCF ÷ Cash Invested — target 7%+" indent
            badge={<Badge val={c.CoC} good={0.08} warn={0.05}/>}/>
          <MetricRow label="Cash Flow / Unit / Month" value={fmt(c.cfPerUnit)} bench="Quick gut-check — $100+/unit target" indent/>
          <MetricRow label="Break-Even Ratio (BER)" value={fmtPct(c.BER)} bench="(OpEx+ADS)÷GPR — under 85% is healthy" indent
            badge={<Badge val={1-c.BER} good={0.20} warn={0.10}/>}/>
          <MetricRow label="Yield on Cost" value={fmtPct(c.yieldOnCost)} bench="Stabilised NOI ÷ Total Cost — must beat cap rate" indent
            badge={<Badge val={c.yieldOnCost} good={num(entryCap)/100} warn={num(entryCap)/100*0.9}/>}/>
        </div>

        {/* ── EXIT ANALYSIS ─────────────────────────────────────────────────── */}
        <div className="mf-card">
          <SectionHead title={`Exit Analysis — ${holdYears}-Year Hold`}/>
          <MetricRow label={`Year ${holdYears} NOI (at ${rentGrowth}% annual rent growth)`} value={fmt(c.yr5NOI)} bench="NOI compounded at rent growth rate" bold/>
          <MetricRow label="Projected Exit Value" value={fmt(c.exitVal)} bench={`Yr${holdYears} NOI ÷ ${exitCap}% exit cap`} indent bold/>
          <MetricRow label="Less: Selling Costs" value={fmt(-c.sellCosts)} bench={fmtPct(num(closingSellPct)/100)+" — agent, legal, title"} indent isNeg/>
          <MetricRow label="Less: Remaining Loan Balance" value={fmt(-c.loanBal)} bench="Remaining mortgage principal at sale" indent isNeg/>
          <MetricRow label="NET SALE PROCEEDS (Equity Out)" value={fmt(c.netProceeds)} bench="Exit value − costs − loan balance" bold color="pos"/>
          <div style={{height:1,background:"var(--borderf)",margin:"4px 0"}}/>
          <MetricRow label={`Total Cash Flow Over Hold (${holdYears} yrs)`} value={fmt(c.totalCF)} bench="Sum of year-by-year BTCF (with rent + opex growth)" indent/>
          <MetricRow label="Total Return" value={fmt(c.totalReturn)} bench="Net proceeds + total cash flow" indent bold/>
          <div className="mf-metric-row total" style={{background:"rgba(52,217,138,0.05)"}}>
            <span className="mf-metric-label bold" style={{fontSize:15}}>Equity Multiple</span>
            <span className="mf-metric-val bold" style={{fontSize:18,color:c.eqMultiple>=2?"var(--green)":c.eqMultiple>=1.5?"var(--amber)":"var(--red)"}}>{fmtX(c.eqMultiple)}</span>
            <span className="mf-metric-bench">2.0x over {holdYears}yr = strong / 1.5x = ok</span>
            <span className="mf-metric-status"><Badge val={c.eqMultiple} good={2.0} warn={1.5}/></span>
          </div>
          <div className="mf-metric-row total" style={{background:"rgba(59,158,255,0.05)"}}>
            <span className="mf-metric-label bold" style={{fontSize:15}}>IRR (true)</span>
            <span className="mf-metric-val bold" style={{fontSize:18,color:c.irr!=null && c.irr>=0.15?"var(--green)":c.irr!=null && c.irr>=0.10?"var(--amber)":"var(--red)"}}>{c.irr!=null?fmtPct(c.irr):"—"}</span>
            <span className="mf-metric-bench">NPV-solver across actual yearly CFs + exit. LP standard.</span>
            <span className="mf-metric-status">{c.irr!=null && <Badge val={c.irr} good={0.15} warn={0.10}/>}</span>
          </div>
          <MetricRow label="Annualised Return (CAGR)" value={fmtPct(c.annReturn)} bench={`Equity Multiple^(1/${holdYears}) − 1. Differs from IRR — IRR weights early CFs more.`} indent color="pos"/>
        </div>

        {/* ── YEAR-BY-YEAR PROJECTION ───────────────────────────────────────── */}
        <div className="mf-card">
          <SectionHead title={`${holdYears}-Year Cash Flow Projection`} sub={`${rentGrowth}% rent growth / ${opexGrowth}% OpEx growth`}/>
          <div style={{overflowX:"auto",padding:"0 0 12px"}}>
            <table className="mf-proj-table" style={{minWidth:Math.max(640, 160 + 90*c.proj.length)}}>
              <thead>
                <tr>
                  <th style={{textAlign:"left",paddingLeft:20}}>Line Item</th>
                  {c.proj.map(p=><th key={p.yr}>Year {p.yr}</th>)}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {lbl:"Gross Potential Rent", key:"gprYr", cls:""},
                  {lbl:"Vacancy Loss",          key:"vacYr", cls:"",neg:true},
                  {lbl:"Effective Gross Income",key:"egiYr", cls:"proj-total"},
                  {lbl:"Total Operating Expenses",key:"opexYr",cls:"",neg:true},
                  {lbl:"NET OPERATING INCOME",  key:"noiYr", cls:"proj-noi proj-total"},
                  {lbl:"Annual Debt Service",   key:"btcfCalc",cls:"",neg:true,adsRow:true},
                  {lbl:"BEFORE-TAX CASH FLOW",  key:"btcfYr", cls:"proj-btcf proj-total"},
                ].map(({lbl,key,cls,neg,adsRow}) => {
                  const vals = c.proj.map(p => adsRow ? c.ADS : p[key]);
                  const total= vals.reduce((a,v)=>a+v,0);
                  return (
                    <tr key={lbl} className={cls}>
                      <td style={{paddingLeft:20}}>{lbl}</td>
                      {vals.map((v,i)=><td key={i} style={neg?{color:"var(--red)"}:{}}>{fmt(neg?-v:v)}</td>)}
                      <td style={neg?{color:"var(--red)"}:{fontWeight:700}}>{fmt(neg?-total:total)}</td>
                    </tr>
                  );
                })}
                <tr className="proj-section"><td colSpan={c.proj.length + 2} style={{paddingLeft:20}}>Key Metrics by Year</td></tr>
                <tr>
                  <td style={{paddingLeft:20}}>DSCR</td>
                  {c.proj.map((p,i)=><td key={i} style={{color:p.dscrYr>=1.25?"var(--green)":p.dscrYr>=1.0?"var(--amber)":"var(--red)"}}>{fmtX(p.dscrYr)}</td>)}
                  <td>—</td>
                </tr>
                <tr>
                  <td style={{paddingLeft:20}}>Cash-on-Cash</td>
                  {c.proj.map((p,i)=><td key={i} style={{color:p.cocYr>=0.07?"var(--green)":p.cocYr>=0.05?"var(--amber)":"var(--red)"}}>{fmtPct(p.cocYr)}</td>)}
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── VISUAL ANALYTICS (lazy-loaded) ─────────────────────────────────── */}
        <Suspense fallback={
          <div className="mf-card" style={{borderRadius:6,padding:"40px 16px",textAlign:"center"}}>
            <div style={{fontFamily:"'Fira Code',monospace",fontSize:11,color:"var(--dim)",letterSpacing:"0.6px"}}>
              ▸ LOADING CHARTS…
            </div>
          </div>
        }>
          <CommercialCharts c={c} holdYears={holdYears}/>
        </Suspense>

        {/* ── SENSITIVITY ANALYSIS ──────────────────────────────────────────── */}
        <div className="mf-card">
          <SectionHead title="Sensitivity Analysis" sub="Stress Test"/>
          <div style={{padding:"16px 20px 8px",fontSize:13,color:"var(--sub)"}}>
            How DSCR and Cash-on-Cash hold up as vacancy and interest rates shift. <span style={{color:"var(--green)"}}>Green ≥ threshold</span> · <span style={{color:"var(--amber)"}}>Amber marginal</span> · <span style={{color:"var(--red)"}}>Red fails</span>
          </div>

          {/* DSCR Table */}
          <div style={{padding:"0 20px 16px"}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>DSCR by Vacancy Rate & Interest Rate</div>
            <div style={{overflowX:"auto"}}>
              <table className="mf-sens-table">
                <thead>
                  <tr>
                    <th>Int. Rate ↓ / Vacancy →</th>
                    {c.vacRates.map(v=><th key={v}>{v}%</th>)}
                  </tr>
                </thead>
                <tbody>
                  {c.sensDSCR.map((row,ri)=>(
                    <tr key={ri}>
                      <td className="sens-label">{c.intRates[ri]}% interest</td>
                      {row.map((val,ci)=>{
                        const cls = val>=1.25?"mf-sens-good":val>=1.0?"mf-sens-warn":"mf-sens-bad";
                        return <td key={ci} className={cls}>{fmtX(val)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CoC Table */}
          <div style={{padding:"0 20px 20px"}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Cash-on-Cash by Vacancy Rate & Interest Rate</div>
            <div style={{overflowX:"auto"}}>
              <table className="mf-sens-table">
                <thead>
                  <tr>
                    <th>Int. Rate ↓ / Vacancy →</th>
                    {c.vacRates.map(v=><th key={v}>{v}%</th>)}
                  </tr>
                </thead>
                <tbody>
                  {c.sensCoC.map((row,ri)=>(
                    <tr key={ri}>
                      <td className="sens-label">{c.intRates[ri]}% interest</td>
                      {row.map((val,ci)=>{
                        const cls = val>=0.07?"mf-sens-good":val>=0.04?"mf-sens-warn":"mf-sens-bad";
                        return <td key={ci} className={cls}>{fmtPct(val)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* IRR grid: rent growth × exit cap (the institutional exit-driven view) */}
          <div style={{padding:"0 20px 20px"}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8,fontFamily:"'Fira Code',monospace"}}>
              ▸ IRR · RENT GROWTH × EXIT CAP RATE
            </div>
            <div style={{overflowX:"auto"}}>
              <table className="mf-sens-table">
                <thead>
                  <tr>
                    <th>Rent Growth ↓ / Exit Cap →</th>
                    {c.ecValues.map(ec => <th key={ec}>{(ec*100).toFixed(2)}%</th>)}
                  </tr>
                </thead>
                <tbody>
                  {c.sensIRR.map((row, ri) => (
                    <tr key={ri}>
                      <td className="sens-label">{(c.rgValues[ri]*100).toFixed(0)}% rent / yr</td>
                      {row.map((val, ci) => {
                        const cls = val >= 0.15 ? "mf-sens-good" : val >= 0.10 ? "mf-sens-warn" : "mf-sens-bad";
                        return <td key={ci} className={cls}>{fmtPct(val)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{fontSize:10.5,color:"var(--dim)",marginTop:8,fontFamily:"'Fira Code',monospace"}}>
              Holds vacancy, opex growth, interest rate, hold years constant. Green ≥ 15% / Amber ≥ 10% / Red &lt; 10%.
            </div>
          </div>
        </div>

      {/* PDF Export */}
      <div style={{padding:"0 20px 12px"}}>
        <button
          onClick={() => {
            const inputs = { purchasePrice, downPct, address: propertyAddress };
            const calcData = {
              noi: c.NOI, capRate: c.actualCap, coc: c.CoC, dscr: c.DSCR,
              cashFlow: c.BTCF, egi: c.EGI, gprCurrent: c.GPR, vacancyLoss: c.vacancyLoss,
              otherAnnual: c.other, totalOpex: c.totalOpex, annualDebtService: c.ADS,
              grm: c.GRM, equity: c.totalCashIn, verdict: `Cap ${(c.actualCap*100).toFixed(2)}% · DSCR ${c.DSCR?.toFixed(2)}x · CoC ${(c.CoC*100).toFixed(2)}%`
            };
            exportMFPDF(inputs, calcData);
          }}
          style={{width:"100%",background:"rgba(242,92,92,0.1)",border:"1px solid rgba(242,92,92,0.25)",borderRadius:12,padding:"12px 18px",color:"#f25c5c",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"all 0.18s"}}
          onMouseOver={e=>e.currentTarget.style.background="rgba(242,92,92,0.18)"}
          onMouseOut={e=>e.currentTarget.style.background="rgba(242,92,92,0.1)"}
        >
          <span>📄</span> Export PDF Summary
        </button>
      </div>

      {/* Save Deal */}
      <div style={{padding:"0 20px 28px"}}>
        {mfSaved ? (
          <div style={{background:"rgba(52,217,138,0.08)",border:"1px solid rgba(52,217,138,0.25)",borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>✅</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"var(--green)"}}>Deal saved!</div>
                <div style={{fontSize:11.5,color:"var(--sub)",marginTop:1}}>Multifamily deal saved to your comparison board</div>
              </div>
            </div>
            <a href="/compare" style={{background:"var(--green)",color:"#07090f",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:800,textDecoration:"none",flexShrink:0}}>View Saved Deals →</a>
          </div>
        ) : (
          <button
            onClick={() => {
              const totalUnits = unitMix.reduce((s,r)=>s+num(r.units),0);
              const deal = {
                id: Date.now(),
                type: "multifamily",
                name: `${totalUnits}-unit Multifamily`,
                address: "",
                savedAt: new Date().toISOString(),
                results: {
                  noi: c.NOI,
                  monthlyCF: c.BTCF/12,
                  annualCF: c.BTCF,
                  dscr: c.DSCR,
                  coc: c.CoC,
                  capRate: c.capRate,
                  totalCashIn: c.totalCashIn,
                  equityCreated: 0,
                  netProfit: c.BTCF,
                },
                verdict: `Cap ${fmtPct(c.capRate)} · DSCR ${fmtX(c.DSCR)} · CoC ${fmtPct(c.CoC)}`,
              };
              const existing = JSON.parse(localStorage.getItem("rde_brrrr_deals") || "[]");
              existing.unshift(deal);
              localStorage.setItem("rde_brrrr_deals", JSON.stringify(existing.slice(0, 20)));
              setMfSaved(true);
              setTimeout(() => setMfSaved(false), 5000);
              celebrateFirstSave({ kind: "multifamily" });
            }}
            style={{width:"100%",background:"linear-gradient(135deg,rgba(52,217,138,0.12),rgba(59,158,255,0.08))",border:"1px solid rgba(52,217,138,0.25)",borderRadius:12,padding:"14px 18px",color:"var(--text)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}
          >
            <span style={{fontSize:18}}>💾</span> Save This Deal · Compare with others →
          </button>
        )}
      </div>

      </div>

      <DealCoach
        property={{ address: propertyAddress, propertyType: "Multifamily / commercial" }}
        calcs={{
          strategy: "Multifamily",
          purchasePrice: purchasePrice,
          capRate: c?.capRate,
          dscr: c?.DSCR,
          coc: c?.CoC,
          monthlyCF: c?.monthlyCF,
          irr: c?.irr,
          eqMultiple: c?.eqMultiple,
          netProfit: c?.netProceeds,
        }}
      />
    </div>
  );
}
