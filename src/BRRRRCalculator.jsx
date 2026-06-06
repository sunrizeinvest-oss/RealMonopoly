import { useState, useMemo, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { exportBRRRRPDF } from "./pdfExport";

// ─── Utilities ───────────────────────────────────────────────────────────────
const num = v => parseFloat(v) || 0;
const fmt  = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n||0);
const fmtPct = n => (isNaN(n)||!isFinite(n)) ? "—" : `${(n*100).toFixed(2)}%`;
const fmtX   = n => (isNaN(n)||!isFinite(n)||Math.abs(n)>999) ? "—" : `${n.toFixed(2)}x`;

function calcMortgage(principal, annualRate, amortYears) {
  const p = num(principal), r = num(annualRate)/100/12, n = num(amortYears)*12;
  if (!p||!r||!n) return 0;
  return p*(r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1);
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Fira+Code:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#07090f;--card:#0d1119;--card2:#0a0e18;--border:rgba(59,158,255,0.12);--borderf:rgba(255,255,255,0.07);--text:#dde4ef;--sub:#6b7d96;--dim:#3a4a60;--blue:#3b9eff;--green:#34d98a;--red:#f25c5c;--amber:#f0a030;--purple:#a782ff}
  html,body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
  input,select{font-family:'DM Sans',sans-serif;font-size:14px!important}

  .br-wrap{min-height:100vh;background:var(--bg)}

  /* Nav */
  .br-nav{position:sticky;top:0;z-index:100;background:rgba(7,9,15,0.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .br-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none}.br-logo span{color:var(--blue)}
  .br-nav-right{display:flex;align-items:center;gap:10px}
  .br-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 12px;border-radius:7px}.br-nav-link:hover{color:var(--text)}.br-nav-link.active{color:var(--blue)}
  .br-nav-btn{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none}
  .br-nav-ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}.br-nav-ghost:hover{color:var(--text)}

  /* Hero */
  .br-hero{text-align:center;padding:44px 24px 32px;position:relative;overflow:hidden}
  .br-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(167,130,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(167,130,255,0.025) 1px,transparent 1px);background-size:56px 56px;pointer-events:none}
  .br-hero-glow{position:absolute;top:-20%;left:50%;transform:translateX(-50%);width:700px;height:400px;background:radial-gradient(ellipse,rgba(167,130,255,0.08) 0%,transparent 65%);pointer-events:none}
  .br-hero-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(167,130,255,0.08);border:1px solid rgba(167,130,255,0.2);border-radius:99px;padding:5px 14px;font-size:11px;font-weight:700;color:var(--purple);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:18px;position:relative;z-index:1}
  .br-hero h1{font-size:clamp(24px,4.5vw,40px);font-weight:800;letter-spacing:-1.5px;color:var(--text);line-height:1.1;margin-bottom:10px;position:relative;z-index:1}
  .br-hero h1 span{color:var(--purple)}
  .br-hero p{font-size:15px;color:var(--sub);max-width:520px;margin:0 auto;line-height:1.65;position:relative;z-index:1}
  .br-letters{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:16px;position:relative;z-index:1}
  .br-letter-pill{display:flex;align-items:center;gap:6px;background:rgba(167,130,255,0.07);border:1px solid rgba(167,130,255,0.15);border-radius:99px;padding:5px 14px;font-size:12px;color:var(--purple);font-weight:600}
  .br-letter-pill span{color:var(--sub);font-weight:400}

  /* Layout */
  .br-body{max-width:1120px;margin:0 auto;padding:28px 20px 80px;display:grid;grid-template-columns:400px 1fr;gap:24px;align-items:start}
  @media(max-width:840px){.br-body{grid-template-columns:1fr}}
  @media(max-width:520px){.br-body{padding:16px 14px 60px}}

  /* Cards */
  .br-card{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:16px}
  .br-card-header{padding:14px 18px;border-bottom:1px solid var(--borderf);background:var(--card2);display:flex;align-items:center;gap:10px}
  .br-card-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
  .br-card-title{font-size:13.5px;font-weight:700;color:var(--text)}
  .br-card-sub{font-size:11px;color:var(--sub);margin-top:1px}
  .br-card-body{padding:16px 18px;display:flex;flex-direction:column;gap:12px}

  /* Inputs */
  .br-field{display:flex;flex-direction:column;gap:4px}
  .br-label{font-size:11px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.4px;display:flex;justify-content:space-between;align-items:center}
  .br-hint{font-size:10.5px;color:var(--green);font-weight:600}
  .br-hint.amber{color:var(--amber)}
  .br-input{background:rgba(255,255,255,0.04);border:1px solid var(--borderf);border-radius:9px;padding:10px 13px;font-size:14px;color:var(--text);outline:none;width:100%;transition:border 0.15s}
  .br-input:focus{border-color:rgba(167,130,255,0.4);background:rgba(167,130,255,0.03)}
  .br-input::placeholder{color:var(--dim)}
  .br-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .br-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
  .br-divider{height:1px;background:var(--borderf)}

  /* Results */
  .br-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .br-metric{background:var(--card2);border-radius:11px;padding:14px;border:1px solid var(--borderf)}
  .br-metric-label{font-size:10px;font-weight:600;color:var(--sub);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
  .br-metric-val{font-size:21px;font-weight:800;color:var(--text);letter-spacing:-0.5px;line-height:1}
  .br-metric-sub{font-size:10px;color:var(--dim);margin-top:4px}
  .br-metric.green{border-color:rgba(52,217,138,0.2);background:rgba(52,217,138,0.05)}.br-metric.green .br-metric-val{color:var(--green)}
  .br-metric.blue{border-color:rgba(59,158,255,0.2);background:rgba(59,158,255,0.05)}.br-metric.blue .br-metric-val{color:var(--blue)}
  .br-metric.purple{border-color:rgba(167,130,255,0.2);background:rgba(167,130,255,0.05)}.br-metric.purple .br-metric-val{color:var(--purple)}
  .br-metric.amber{border-color:rgba(240,160,48,0.2);background:rgba(240,160,48,0.05)}.br-metric.amber .br-metric-val{color:var(--amber)}
  .br-metric.red{border-color:rgba(242,92,92,0.2);background:rgba(242,92,92,0.05)}.br-metric.red .br-metric-val{color:var(--red)}
  .br-metric.full{grid-column:1/-1}

  /* BRRRR verdict */
  .br-verdict{border-radius:14px;padding:20px;text-align:center;margin-bottom:4px}
  .br-verdict-icon{font-size:36px;margin-bottom:8px}
  .br-verdict-title{font-size:18px;font-weight:800;letter-spacing:-0.3px;margin-bottom:6px}
  .br-verdict-sub{font-size:13px;line-height:1.55;max-width:320px;margin:0 auto}

  /* Waterfall */
  .br-waterfall{background:var(--card2);border-radius:11px;padding:14px}
  .br-waterfall-title{font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px}
  .br-wf-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:12.5px}
  .br-wf-row:last-child{border-bottom:none;font-weight:700;font-size:13px;padding-top:9px;margin-top:2px}
  .br-wf-label{color:var(--sub)}.br-wf-val{font-family:'Fira Code',monospace;font-size:12px;font-weight:500}
  .br-wf-val.pos{color:var(--green)}.br-wf-val.neg{color:var(--red)}.br-wf-val.purple{color:var(--purple)}

  /* Placeholder */
  .br-placeholder{background:var(--card);border:1px dashed var(--borderf);border-radius:16px;padding:52px 24px;text-align:center}
  .br-placeholder-icon{font-size:36px;margin-bottom:12px}
  .br-placeholder-title{font-size:15px;font-weight:600;color:var(--sub);margin-bottom:6px}
  .br-placeholder-sub{font-size:13px;color:var(--dim);line-height:1.6}

  /* Phase labels */
  .br-phase{display:flex;align-items:center;gap:8px;margin-bottom:4px}
  .br-phase-dot{width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0}
  .br-phase-label{font-size:12px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px}
`;

export default function BRRRRCalculator() {
  const { user, signOut, getSubscription } = useAuth();
  const [isPro, setIsPro]         = useState(false);
  const [proChecked, setProChecked] = useState(false);

  useEffect(() => {
    async function check() {
      if (!user) { setIsPro(false); setProChecked(true); return; }
      const { data } = await getSubscription();
      setIsPro(data?.status === 'active' && data?.plan === 'pro');
      setProChecked(true);
    }
    check();
  }, [user]);

  const [saved, setSaved] = useState(false);

  // ── Pre-fill from PropertyHub ─────────────────────────────────────────────
  const [prefillApplied, setPrefillApplied] = useState(false);

  const [form, setForm] = useState(() => {
    // Check for prefill data on initial render
    try {
      const raw = localStorage.getItem("rde_prefill");
      if (raw) {
        const pf = JSON.parse(raw);
        if (Date.now() - pf.timestamp < 5 * 60 * 1000 && (!pf.strategy || pf.strategy === "brrrr")) {
          localStorage.removeItem("rde_prefill");
          return {
            dealName: "",
            address: pf.address || "",
            purchasePrice: pf.estimatedValue ? String(Math.round(pf.estimatedValue * 0.75)) : "",
            closingCostsPct: "2",
            rehabBudget: "",
            holdingMonths: "3",
            monthlyHoldingCost: "",
            monthlyRent: pf.rentEstimate ? String(Math.round(pf.rentEstimate)) : "",
            vacancyPct: "5",
            otherIncome: "0",
            propTax: pf.propertyTaxes ? String(Math.round(pf.propertyTaxes / 12)) : "",
            insurance: "",
            managementPct: "8",
            maintenancePct: "5",
            utilities: "0",
            arv: pf.estimatedValue ? String(Math.round(pf.estimatedValue)) : "",
            refinanceLTV: "80",
            refiRate: "5.75",
            refiAmort: "25",
            refiClosingCostsPct: "1.5",
          };
        }
      }
    } catch {}
    return {
    // Deal info
    dealName: "",
    address: "",
    // Phase 1: Buy
    purchasePrice: "",
    closingCostsPct: "2",
    // Phase 2: Rehab
    rehabBudget: "",
    holdingMonths: "3",
    monthlyHoldingCost: "",
    // Phase 3: Rent
    monthlyRent: "",
    vacancyPct: "5",
    otherIncome: "0",
    propTax: "",
    insurance: "",
    managementPct: "8",
    maintenancePct: "5",
    utilities: "0",
    // Phase 4: Refinance
    arv: "",
    refinanceLTV: "80",
    refiRate: "5.75",
    refiAmort: "25",
    refiClosingCostsPct: "1.5",
  };
  });

  function saveDeal() {
    const deal = {
      id: Date.now(),
      type: "brrrr",
      name: form.dealName || form.address || "Untitled BRRRR Deal",
      address: form.address,
      savedAt: new Date().toISOString(),
      inputs: { ...form },
      results: calc ? {
        totalCashIn: calc.totalCashIn,
        noi: calc.noi,
        annualCF: calc.annualCF,
        monthlyCF: calc.monthlyCF,
        dscr: calc.dscr,
        coc: calc.coc === Infinity ? 9999 : calc.coc,
        isTrueBRRRR: calc.isTrueBRRRR,
        cashLeftInDeal: calc.cashLeftInDeal,
        cashPulledOut: calc.cashPulledOut,
        equityCreated: calc.equityCreated,
        refiLoanAmount: calc.refiLoanAmount,
        refiMonthlyPayment: calc.refiMonthlyPayment,
        refiCap: calc.refiCap,
        equityOnCost: calc.equityOnCost,
      } : null,
      verdict: verdict ? verdict.title : null,
    };
    const existing = JSON.parse(localStorage.getItem("rde_brrrr_deals") || "[]");
    existing.unshift(deal);
    localStorage.setItem("rde_brrrr_deals", JSON.stringify(existing.slice(0, 20)));
    setSaved(true);
    setTimeout(() => setSaved(false), 5000);
  }

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const calc = useMemo(() => {
    const pp = num(form.purchasePrice);
    const rehab = num(form.rehabBudget);
    const arv = num(form.arv);
    if (!pp && !rehab && !arv) return null;

    // ── Phase 1 & 2: Total cash in
    const closingCostsBuy = pp * (num(form.closingCostsPct)/100);
    const holdingCost = num(form.holdingMonths) * num(form.monthlyHoldingCost);
    const totalCashIn = pp + rehab + closingCostsBuy + holdingCost;

    // ── Phase 3: Rental income & NOI
    const grossRent = num(form.monthlyRent) * 12;
    const vacancyLoss = grossRent * (num(form.vacancyPct)/100);
    const otherIncome = num(form.otherIncome) * 12;
    const egi = grossRent - vacancyLoss + otherIncome;
    const propTax = num(form.propTax);
    const insurance = num(form.insurance);
    const management = egi * (num(form.managementPct)/100);
    const maintenance = egi * (num(form.maintenancePct)/100);
    const utilities = num(form.utilities);
    const totalOpEx = propTax + insurance + management + maintenance + utilities;
    const noi = egi - totalOpEx;
    const entryCap = pp > 0 ? noi/pp : 0;

    // ── Phase 4: Refinance
    const refiLoanAmount = arv * (num(form.refinanceLTV)/100);
    const refiClosingCosts = refiLoanAmount * (num(form.refiClosingCostsPct)/100);
    const refiNetProceeds = refiLoanAmount - refiClosingCosts;
    const cashReturnedToInvestor = refiNetProceeds; // gross proceeds from refi
    const cashLeftInDeal = Math.max(0, totalCashIn - refiNetProceeds);
    const cashPulledOut = Math.max(0, refiNetProceeds - totalCashIn);
    const isTrueBRRRR = refiNetProceeds >= totalCashIn;

    // ── Phase 5: Post-refi returns
    const refiMonthlyPayment = calcMortgage(refiLoanAmount, form.refiRate, form.refiAmort);
    const annualDebtService = refiMonthlyPayment * 12;
    const annualCF = noi - annualDebtService;
    const monthlyCF = annualCF / 12;
    const dscr = annualDebtService > 0 ? noi/annualDebtService : 0;
    const coc = cashLeftInDeal > 0 ? annualCF/cashLeftInDeal : (isTrueBRRRR ? Infinity : 0);

    // ── Equity created
    const equityCreated = arv - totalCashIn;
    const equityOnCost = totalCashIn > 0 ? equityCreated/totalCashIn : 0;
    const arvOnCost = totalCashIn > 0 ? arv/totalCashIn : 0;
    const refiCap = arv > 0 ? noi/arv : 0;

    return {
      pp, rehab, arv,
      closingCostsBuy, holdingCost, totalCashIn,
      grossRent, vacancyLoss, otherIncome, egi,
      propTax, insurance, management, maintenance, utilities, totalOpEx,
      noi, entryCap,
      refiLoanAmount, refiClosingCosts, refiNetProceeds,
      cashLeftInDeal, cashPulledOut, isTrueBRRRR,
      refiMonthlyPayment, annualDebtService, annualCF, monthlyCF,
      dscr, coc, equityCreated, equityOnCost, arvOnCost, refiCap,
    };
  }, [form]);

  const hasData = calc && (calc.pp > 0 || calc.arv > 0);

  // Verdict
  const getVerdict = () => {
    if (!calc || !hasData) return null;
    if (calc.isTrueBRRRR && calc.annualCF > 0 && calc.dscr >= 1.2)
      return { icon:"🔄", title:"True BRRRR — Infinite Returns", sub:`You pull ${fmt(calc.cashPulledOut)} out at refi, own the property with none of your money left in, and it still cash flows ${fmt(calc.monthlyCF)}/mo. This is the holy grail.`, cls:"green", border:"rgba(52,217,138,0.2)", bg:"rgba(52,217,138,0.06)" };
    if (calc.isTrueBRRRR && calc.annualCF <= 0)
      return { icon:"⚠️", title:"Full Recycle — But Negative Cash Flow", sub:`You get all your money back at refi but the property doesn't cash flow. Improve rents or reduce expenses before pulling the trigger.`, cls:"amber", border:"rgba(240,160,48,0.2)", bg:"rgba(240,160,48,0.06)" };
    if (!calc.isTrueBRRRR && calc.annualCF > 0 && calc.cashLeftInDeal > 0)
      return { icon:"💼", title:"Partial BRRRR — Cash Left In", sub:`${fmt(calc.cashLeftInDeal)} stays in the deal. Still cash flows ${fmt(calc.monthlyCF)}/mo — solid return but not infinite. Negotiate harder or find a higher ARV.`, cls:"blue", border:"rgba(59,158,255,0.2)", bg:"rgba(59,158,255,0.06)" };
    return { icon:"🚫", title:"Doesn't Pencil as BRRRR", sub:`Negative cash flow after refi. Revisit the numbers — purchase price, rehab budget, rents, or exit cap.`, cls:"red", border:"rgba(242,92,92,0.2)", bg:"rgba(242,92,92,0.06)" };
  };
  const verdict = getVerdict();

  return (
    <div className="br-wrap">
      <style>{CSS}</style>

      {/* Nav */}
      <nav className="br-nav">
        <a href="/" className="br-logo"><span>Real</span> Deal</a>
        <div className="br-nav-right">
          <a href="/analyze" className="br-nav-link">Tools</a>
          <a href="/app" className="br-nav-link">Flip</a>
          <a href="/commercial" className="br-nav-link">Multifamily</a>
          <a href="/brrrr" className="br-nav-link active">BRRRR</a>
          <a href="/compare" className="br-nav-link">Compare</a>
          {user && <a href="/dashboard" className="br-nav-link">My Deals</a>}
          <a href="/pricing" className="br-nav-link" style={{color:"var(--amber)"}}>Pricing</a>
          {user
            ? <button className="br-nav-ghost" onClick={signOut}>Sign out</button>
            : <a href="/login" className="br-nav-btn">Sign in</a>}
        </div>
      </nav>

      {/* Hero */}
      <div className="br-hero">
        <div className="br-hero-glow" />
        <div className="br-hero-tag">Strategy Calculator</div>
        <h1>The <span>BRRRR</span> Calculator</h1>
        <p>Model your Buy, Rehab, Rent, Refinance, Repeat strategy. See if you get all your money back — and what the property cash flows after.</p>
        <div className="br-letters">
          {[["B","Buy"],["R","Rehab"],["R","Rent"],["R","Refinance"],["R","Repeat"]].map(([l,s])=>(
            <div key={s} className="br-letter-pill"><strong>{l}</strong><span>{s}</span></div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="br-body">

        {/* ── LEFT: Inputs ── */}
        <div>
          {/* Deal Info */}
          <div className="br-card">
            <div className="br-card-header">
              <div className="br-card-icon" style={{background:"rgba(59,158,255,0.12)",color:"var(--blue)"}}>📋</div>
              <div><div className="br-card-title">Deal Info</div><div className="br-card-sub">Name &amp; address for saving</div></div>
            </div>
            <div className="br-card-body">
              <div className="br-field">
                <div className="br-label">Deal Name</div>
                <input className="br-input" type="text" placeholder="e.g. 142 Birchwood — BRRRR" value={form.dealName} onChange={e=>setF("dealName",e.target.value)} />
              </div>
              <div className="br-field">
                <div className="br-label">Property Address</div>
                <input className="br-input" type="text" placeholder="142 Birchwood Dr, Calgary AB" value={form.address} onChange={e=>setF("address",e.target.value)} />
              </div>
            </div>
          </div>

          {/* Phase 1: Buy */}
          <div className="br-card">
            <div className="br-card-header">
              <div className="br-card-icon" style={{background:"rgba(59,158,255,0.12)",color:"var(--blue)"}}>1️⃣</div>
              <div><div className="br-card-title">Buy</div><div className="br-card-sub">Acquisition costs</div></div>
            </div>
            <div className="br-card-body">
              <div className="br-field">
                <div className="br-label">Purchase Price</div>
                <input className="br-input" type="number" placeholder="350,000" value={form.purchasePrice} onChange={e=>setF("purchasePrice",e.target.value)} />
              </div>
              <div className="br-field">
                <div className="br-label">
                  Closing Costs %
                  {calc && calc.pp > 0 && <span className="br-hint">→ {fmt(calc.closingCostsBuy)}</span>}
                </div>
                <input className="br-input" type="number" placeholder="2" value={form.closingCostsPct} onChange={e=>setF("closingCostsPct",e.target.value)} />
              </div>
            </div>
          </div>

          {/* Phase 2: Rehab */}
          <div className="br-card">
            <div className="br-card-header">
              <div className="br-card-icon" style={{background:"rgba(240,160,48,0.12)",color:"var(--amber)"}}>2️⃣</div>
              <div><div className="br-card-title">Rehab</div><div className="br-card-sub">Renovation + holding costs</div></div>
            </div>
            <div className="br-card-body">
              <div className="br-field">
                <div className="br-label">Rehab / Renovation Budget</div>
                <input className="br-input" type="number" placeholder="60,000" value={form.rehabBudget} onChange={e=>setF("rehabBudget",e.target.value)} />
              </div>
              <div className="br-row2">
                <div className="br-field">
                  <div className="br-label">Hold Period (months)</div>
                  <input className="br-input" type="number" placeholder="3" value={form.holdingMonths} onChange={e=>setF("holdingMonths",e.target.value)} />
                </div>
                <div className="br-field">
                  <div className="br-label">
                    Monthly Holding Cost
                    {calc && calc.holdingCost > 0 && <span className="br-hint amber">→ {fmt(calc.holdingCost)}</span>}
                  </div>
                  <input className="br-input" type="number" placeholder="1,200" value={form.monthlyHoldingCost} onChange={e=>setF("monthlyHoldingCost",e.target.value)} />
                </div>
              </div>
              {calc && calc.totalCashIn > 0 && (
                <div style={{background:"rgba(240,160,48,0.06)",border:"1px solid rgba(240,160,48,0.18)",borderRadius:9,padding:"9px 13px",fontSize:12,display:"flex",justifyContent:"space-between",color:"var(--amber)",fontWeight:600}}>
                  <span>Total cash into deal</span>
                  <span style={{fontFamily:"'Fira Code',monospace"}}>{fmt(calc.totalCashIn)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Phase 3: Rent */}
          <div className="br-card">
            <div className="br-card-header">
              <div className="br-card-icon" style={{background:"rgba(52,217,138,0.12)",color:"var(--green)"}}>3️⃣</div>
              <div><div className="br-card-title">Rent</div><div className="br-card-sub">Stabilized rental income &amp; expenses</div></div>
            </div>
            <div className="br-card-body">
              <div className="br-row2">
                <div className="br-field">
                  <div className="br-label">Monthly Rent</div>
                  <input className="br-input" type="number" placeholder="2,400" value={form.monthlyRent} onChange={e=>setF("monthlyRent",e.target.value)} />
                </div>
                <div className="br-field">
                  <div className="br-label">
                    Vacancy %
                    {calc && calc.vacancyLoss > 0 && <span className="br-hint amber">→ {fmt(calc.vacancyLoss)}/yr</span>}
                  </div>
                  <input className="br-input" type="number" placeholder="5" value={form.vacancyPct} onChange={e=>setF("vacancyPct",e.target.value)} />
                </div>
              </div>
              <div className="br-row2">
                <div className="br-field">
                  <div className="br-label">Property Tax/yr</div>
                  <input className="br-input" type="number" placeholder="4,200" value={form.propTax} onChange={e=>setF("propTax",e.target.value)} />
                </div>
                <div className="br-field">
                  <div className="br-label">Insurance/yr</div>
                  <input className="br-input" type="number" placeholder="2,400" value={form.insurance} onChange={e=>setF("insurance",e.target.value)} />
                </div>
              </div>
              <div className="br-row2">
                <div className="br-field">
                  <div className="br-label">
                    Management %
                    {calc && calc.management > 0 && <span className="br-hint">→ {fmt(calc.management)}/yr</span>}
                  </div>
                  <input className="br-input" type="number" placeholder="8" value={form.managementPct} onChange={e=>setF("managementPct",e.target.value)} />
                </div>
                <div className="br-field">
                  <div className="br-label">
                    Maintenance %
                    {calc && calc.maintenance > 0 && <span className="br-hint">→ {fmt(calc.maintenance)}/yr</span>}
                  </div>
                  <input className="br-input" type="number" placeholder="5" value={form.maintenancePct} onChange={e=>setF("maintenancePct",e.target.value)} />
                </div>
              </div>
              {calc && calc.noi !== 0 && (
                <div style={{background:"rgba(52,217,138,0.06)",border:"1px solid rgba(52,217,138,0.18)",borderRadius:9,padding:"9px 13px",fontSize:12,display:"flex",justifyContent:"space-between",color:"var(--green)",fontWeight:600}}>
                  <span>Stabilized NOI</span>
                  <span style={{fontFamily:"'Fira Code',monospace"}}>{fmt(calc.noi)}/yr · Cap {fmtPct(calc.entryCap)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Phase 4: Refinance */}
          <div className="br-card">
            <div className="br-card-header">
              <div className="br-card-icon" style={{background:"rgba(167,130,255,0.12)",color:"var(--purple)"}}>4️⃣</div>
              <div><div className="br-card-title">Refinance</div><div className="br-card-sub">After-repair value &amp; new mortgage</div></div>
            </div>
            <div className="br-card-body">
              {/* Bank Rate Banner */}
              <a href="https://www.bankofcanada.ca/rates/interest-rates/canadian-interest-rates/" target="_blank" rel="noopener noreferrer"
                style={{display:"flex",alignItems:"center",gap:10,background:"rgba(167,130,255,0.06)",border:"1px solid rgba(167,130,255,0.2)",borderRadius:9,padding:"9px 12px",textDecoration:"none",marginBottom:2}}>
                <span style={{fontSize:18}}>🏦</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:11.5,fontWeight:700,color:"var(--purple)"}}>Check current bank rates</div>
                  <div style={{fontSize:10.5,color:"var(--sub)"}}>Canadian 5-yr insured ~4.89% · Uninsured ~5.14% · Click to view Bank of Canada rates →</div>
                </div>
              </a>
              <div className="br-field">
                <div className="br-label">After-Repair Value (ARV)</div>
                <input className="br-input" type="number" placeholder="500,000" value={form.arv} onChange={e=>setF("arv",e.target.value)} />
              </div>
              <div className="br-row3">
                <div className="br-field">
                  <div className="br-label">
                    LTV %
                    {calc && calc.refiLoanAmount > 0 && <span className="br-hint">→ {fmt(calc.refiLoanAmount)}</span>}
                  </div>
                  <input className="br-input" type="number" placeholder="80" value={form.refinanceLTV} onChange={e=>setF("refinanceLTV",e.target.value)} />
                </div>
                <div className="br-field">
                  <div className="br-label">Rate %</div>
                  <input className="br-input" type="number" placeholder="5.75" value={form.refiRate} onChange={e=>setF("refiRate",e.target.value)} />
                </div>
                <div className="br-field">
                  <div className="br-label">Amort (yrs)</div>
                  <input className="br-input" type="number" placeholder="25" value={form.refiAmort} onChange={e=>setF("refiAmort",e.target.value)} />
                </div>
              </div>
              <div className="br-field">
                <div className="br-label">
                  Refi Closing Costs %
                  {calc && calc.refiClosingCosts > 0 && <span className="br-hint amber">→ {fmt(calc.refiClosingCosts)}</span>}
                </div>
                <input className="br-input" type="number" placeholder="1.5" value={form.refiClosingCostsPct} onChange={e=>setF("refiClosingCostsPct",e.target.value)} />
              </div>
              {calc && calc.refiNetProceeds > 0 && (
                <div style={{background:"rgba(167,130,255,0.06)",border:"1px solid rgba(167,130,255,0.2)",borderRadius:9,padding:"9px 13px",fontSize:12,display:"flex",justifyContent:"space-between",color:"var(--purple)",fontWeight:600}}>
                  <span>Net refi proceeds</span>
                  <span style={{fontFamily:"'Fira Code',monospace"}}>{fmt(calc.refiNetProceeds)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div>
          {!hasData ? (
            <div className="br-placeholder">
              <div className="br-placeholder-icon">🔄</div>
              <div className="br-placeholder-title">Results appear here</div>
              <div className="br-placeholder-sub">Fill in your purchase price, rehab budget, rents, and ARV to see whether this deal works as a BRRRR.</div>
            </div>
          ) : verdict && (<>

            {/* Verdict */}
            <div className="br-card">
              <div className="br-card-body">
                <div className="br-verdict" style={{background:verdict.bg,border:`1px solid ${verdict.border}`,borderRadius:14,padding:20,textAlign:"center"}}>
                  <div className="br-verdict-icon">{verdict.icon}</div>
                  <div className="br-verdict-title" style={{color:`var(--${verdict.cls})`}}>{verdict.title}</div>
                  <div className="br-verdict-sub" style={{color:"var(--sub)",fontSize:13,marginTop:6,lineHeight:1.55}}>{verdict.sub}</div>
                </div>
              </div>
            </div>

            {/* ── Deal Red Flags ─────────────────────────────────────────── */}
            {(() => {
              const flags = [];
              if (calc.monthlyCF < 0)
                flags.push({ sev:"critical", msg:`Monthly cash flow is negative (${fmt(calc.monthlyCF)}/mo) after refi. The rental income doesn't cover all expenses + mortgage.` });
              if (calc.dscr < 1.0 && calc.dscr > 0)
                flags.push({ sev:"critical", msg:`DSCR is ${fmtX(calc.dscr)} — below 1.0x. Rent can't cover the refi mortgage. Lenders require ≥ 1.25x.` });
              else if (calc.dscr < 1.25 && calc.dscr >= 1.0)
                flags.push({ sev:"warning", msg:`DSCR is ${fmtX(calc.dscr)} — below the typical lender minimum of 1.25x. May not qualify for a refi.` });
              if (!calc.isTrueBRRRR && calc.cashLeftInDeal > 0)
                flags.push({ sev:"warning", msg:`${fmt(calc.cashLeftInDeal)} left in the deal after refi. True BRRRR requires pulling all your cash back out.` });
              if (calc.refiCap < 0.05 && calc.refiCap > 0)
                flags.push({ sev:"warning", msg:`Cap rate on ARV is only ${fmtPct(calc.refiCap)} — below 5%. Thin margin against rising vacancies or expenses.` });
              if (!flags.length) return null;
              return (
                <div style={{marginBottom:16,borderRadius:14,overflow:"hidden",border:"1px solid rgba(242,92,92,0.2)",background:"rgba(242,92,92,0.03)"}}>
                  <div style={{padding:"11px 18px",borderBottom:"1px solid rgba(242,92,92,0.12)",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:15}}>⚠️</span>
                    <span style={{fontSize:13,fontWeight:800,color:"#f25c5c"}}>Deal Red Flags — {flags.length} issue{flags.length>1?"s":""} detected</span>
                  </div>
                  {flags.map((f,i) => (
                    <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 18px",borderBottom:i<flags.length-1?"1px solid rgba(255,255,255,0.04)":"none"}}>
                      <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{f.sev==="critical"?"🚨":"⚠️"}</span>
                      <span style={{fontSize:13,color:f.sev==="critical"?"#f25c5c":"#f0a030",lineHeight:1.5}}>{f.msg}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Key metrics */}
            <div className="br-card">
              <div className="br-card-header">
                <div className="br-card-icon" style={{background:"rgba(52,217,138,0.12)",color:"var(--green)"}}>📊</div>
                <div><div className="br-card-title">Post-Refi Performance</div></div>
              </div>
              <div className="br-card-body">
                <div className="br-result-grid">
                  <div className={`br-metric ${calc.monthlyCF>=0?"green":"red"}`}>
                    <div className="br-metric-label">Monthly Cash Flow</div>
                    <div className="br-metric-val">{fmt(calc.monthlyCF)}</div>
                    <div className="br-metric-sub">After all expenses + new mortgage</div>
                  </div>
                  <div className={`br-metric ${calc.dscr>=1.25?"green":calc.dscr>=1?"amber":"red"}`}>
                    <div className="br-metric-label">DSCR</div>
                    <div className="br-metric-val">{fmtX(calc.dscr)}</div>
                    <div className="br-metric-sub">NOI ÷ debt service · need ≥1.25</div>
                  </div>
                  <div className={`br-metric ${calc.isTrueBRRRR?"purple":"blue"}`}>
                    <div className="br-metric-label">{calc.isTrueBRRRR ? "Cash Pulled Out" : "Cash Left In Deal"}</div>
                    <div className="br-metric-val">{calc.isTrueBRRRR ? fmt(calc.cashPulledOut) : fmt(calc.cashLeftInDeal)}</div>
                    <div className="br-metric-sub">{calc.isTrueBRRRR ? "Recycled to next deal" : "Equity still in property"}</div>
                  </div>
                  <div className={`br-metric ${calc.coc===Infinity||calc.coc>=0.10?"green":calc.coc>=0.06?"amber":"red"}`}>
                    <div className="br-metric-label">Cash-on-Cash</div>
                    <div className="br-metric-val">{calc.coc===Infinity?"∞":fmtPct(calc.coc)}</div>
                    <div className="br-metric-sub">{calc.isTrueBRRRR?"Infinite — no money left in":"Annual CF ÷ cash remaining"}</div>
                  </div>
                  <div className="br-metric blue">
                    <div className="br-metric-label">New Monthly Payment</div>
                    <div className="br-metric-val">{fmt(calc.refiMonthlyPayment)}</div>
                    <div className="br-metric-sub">Post-refi mortgage P+I</div>
                  </div>
                  <div className={`br-metric ${calc.refiCap>=0.07?"green":calc.refiCap>=0.05?"amber":"red"}`}>
                    <div className="br-metric-label">Cap Rate on ARV</div>
                    <div className="br-metric-val">{fmtPct(calc.refiCap)}</div>
                    <div className="br-metric-sub">NOI ÷ ARV · target ≥7%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Equity created */}
            <div className="br-card">
              <div className="br-card-header">
                <div className="br-card-icon" style={{background:"rgba(167,130,255,0.12)",color:"var(--purple)"}}>💎</div>
                <div><div className="br-card-title">Equity Created</div><div className="br-card-sub">Forced appreciation through rehab</div></div>
              </div>
              <div className="br-card-body">
                <div className="br-result-grid">
                  <div className={`br-metric ${calc.equityCreated>0?"purple":"red"}`}>
                    <div className="br-metric-label">Equity Created</div>
                    <div className="br-metric-val">{fmt(calc.equityCreated)}</div>
                    <div className="br-metric-sub">ARV − total cash invested</div>
                  </div>
                  <div className={`br-metric ${calc.equityOnCost>=0.20?"green":calc.equityOnCost>=0.10?"amber":"red"}`}>
                    <div className="br-metric-label">Return on Cost</div>
                    <div className="br-metric-val">{fmtPct(calc.equityOnCost)}</div>
                    <div className="br-metric-sub">Equity gain ÷ cash invested</div>
                  </div>
                </div>
                {/* Cash waterfall */}
                <div className="br-waterfall">
                  <div className="br-waterfall-title">Cash Flow Summary</div>
                  <div className="br-wf-row"><span className="br-wf-label">Purchase price</span><span className="br-wf-val neg">({fmt(calc.pp)})</span></div>
                  <div className="br-wf-row"><span className="br-wf-label">Closing costs (buy)</span><span className="br-wf-val neg">({fmt(calc.closingCostsBuy)})</span></div>
                  {calc.rehab>0&&<div className="br-wf-row"><span className="br-wf-label">Rehab budget</span><span className="br-wf-val neg">({fmt(calc.rehab)})</span></div>}
                  {calc.holdingCost>0&&<div className="br-wf-row"><span className="br-wf-label">Holding costs</span><span className="br-wf-val neg">({fmt(calc.holdingCost)})</span></div>}
                  <div className="br-wf-row"><span className="br-wf-label" style={{fontWeight:600,color:"var(--text)"}}>Total cash invested</span><span className="br-wf-val neg" style={{fontWeight:700}}>({fmt(calc.totalCashIn)})</span></div>
                  <div className="br-wf-row"><span className="br-wf-label">Refi loan ({form.refinanceLTV}% of ARV)</span><span className="br-wf-val purple">{fmt(calc.refiLoanAmount)}</span></div>
                  {calc.refiClosingCosts>0&&<div className="br-wf-row"><span className="br-wf-label">Less: refi closing costs</span><span className="br-wf-val neg">({fmt(calc.refiClosingCosts)})</span></div>}
                  <div className="br-wf-row">
                    <span className="br-wf-label" style={{fontWeight:700,color:calc.isTrueBRRRR?"var(--green)":"var(--blue)"}}>
                      {calc.isTrueBRRRR ? "✓ Cash pulled out of deal" : "Cash still left in deal"}
                    </span>
                    <span className={`br-wf-val ${calc.isTrueBRRRR?"pos":"purple"}`} style={{fontWeight:700}}>
                      {calc.isTrueBRRRR ? fmt(calc.cashPulledOut) : fmt(calc.cashLeftInDeal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Export PDF */}
            <div className="br-card" style={{marginTop:4}}>
              <div className="br-card-body">
                <button
                  onClick={() => exportBRRRRPDF(form, calc)}
                  disabled={!calc}
                  style={{width:"100%",background:"rgba(242,92,92,0.1)",border:"1px solid rgba(242,92,92,0.25)",borderRadius:11,padding:"12px 18px",color:"#f25c5c",fontSize:13,fontWeight:700,cursor:calc?"pointer":"not-allowed",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"all 0.18s",opacity:calc?1:0.5}}
                  onMouseOver={e=>{if(calc)e.currentTarget.style.background="rgba(242,92,92,0.18)"}}
                  onMouseOut={e=>{e.currentTarget.style.background="rgba(242,92,92,0.1)"}}
                >
                  <span>📄</span> Export PDF Summary
                </button>
              </div>
            </div>

            {/* Save Deal */}
            <div className="br-card" style={{marginTop:4}}>
              <div className="br-card-body">
                {saved ? (
                  <div style={{background:"rgba(52,217,138,0.08)",border:"1px solid rgba(52,217,138,0.25)",borderRadius:11,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:20}}>✅</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--green)"}}>Deal saved!</div>
                        <div style={{fontSize:11.5,color:"var(--sub)",marginTop:1}}>{form.dealName || form.address || "BRRRR Deal"}</div>
                      </div>
                    </div>
                    <a href="/compare" style={{background:"var(--green)",color:"#07090f",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:800,textDecoration:"none",flexShrink:0}}>View Saved Deals →</a>
                  </div>
                ) : (
                  <button
                    onClick={saveDeal}
                    style={{width:"100%",background:"linear-gradient(135deg,rgba(167,130,255,0.15),rgba(59,158,255,0.12))",border:"1px solid rgba(167,130,255,0.3)",borderRadius:11,padding:"14px 18px",color:"var(--text)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"all 0.18s"}}
                    onMouseOver={e=>{e.currentTarget.style.borderColor="rgba(167,130,255,0.6)";e.currentTarget.style.background="linear-gradient(135deg,rgba(167,130,255,0.22),rgba(59,158,255,0.18))"}}
                    onMouseOut={e=>{e.currentTarget.style.borderColor="rgba(167,130,255,0.3)";e.currentTarget.style.background="linear-gradient(135deg,rgba(167,130,255,0.15),rgba(59,158,255,0.12))"}}
                  >
                    <span style={{fontSize:18}}>💾</span>
                    Save This Deal
                    <span style={{fontSize:11,color:"var(--sub)",fontWeight:500,marginLeft:4}}>· Compare with others →</span>
                  </button>
                )}
              </div>
            </div>

          </>)}
        </div>
      </div>
    </div>
  );
}
