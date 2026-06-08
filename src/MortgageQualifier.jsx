import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/TopNav";

// ─── Utilities ────────────────────────────────────────────────────────────────
const num = v => parseFloat(v) || 0;
const fmt = n => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = (n, decimals = 2) => (isNaN(n) || !isFinite(n)) ? "—" : `${(n * 100).toFixed(decimals)}%`;

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
  input,select{font-family:'DM Sans',sans-serif;font-size:14px!important}

  /* Nav */
  .mq-nav{position:sticky;top:0;z-index:100;background:rgba(7,9,15,0.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .mq-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none}.mq-logo span{color:var(--blue)}
  .mq-nav-links{display:flex;align-items:center;gap:4px}
  .mq-nav-links a{color:var(--sub);text-decoration:none;font-size:13px;font-weight:500;padding:6px 12px;border-radius:8px;transition:all .15s}
  .mq-nav-links a:hover{color:var(--text);background:rgba(255,255,255,0.06)}
  .mq-nav-links a.active{color:var(--blue);background:rgba(59,158,255,0.1)}

  /* Layout */
  .mq-wrap{min-height:100vh;background:var(--bg)}
  .mq-hero{padding:40px 24px 24px;text-align:center}
  .mq-hero h1{font-size:28px;font-weight:800;color:var(--text);margin-bottom:8px}
  .mq-hero p{color:var(--sub);font-size:15px;max-width:560px;margin:0 auto}
  .mq-body{display:grid;grid-template-columns:420px 1fr;gap:20px;padding:0 24px 48px;max-width:1200px;margin:0 auto}
  @media(max-width:900px){.mq-body{grid-template-columns:1fr}}

  /* Inputs Panel */
  .mq-inputs{display:flex;flex-direction:column;gap:16px}
  .mq-section{background:var(--card);border:1px solid var(--borderf);border-radius:6px;overflow:hidden}
  .mq-section-head{padding:14px 18px;border-bottom:1px solid var(--borderf);display:flex;align-items:center;gap:10px}
  .mq-section-head .sec-icon{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px}
  .mq-section-head h3{font-size:13px;font-weight:700;color:var(--text);letter-spacing:.04em;text-transform:uppercase}
  .mq-section-body{padding:16px 18px;display:flex;flex-direction:column;gap:12px}

  /* Fields */
  .mq-row{display:flex;flex-direction:column;gap:5px}
  .mq-row-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .mq-label{font-size:12px;font-weight:600;color:var(--sub);display:flex;align-items:center;gap:6px}
  .mq-label .badge{font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700}
  .mq-label .opt{color:var(--dim);font-weight:400}
  .mq-field{display:flex;align-items:center;background:var(--card2);border:1px solid var(--borderf);border-radius:9px;overflow:hidden;transition:border-color .15s}
  .mq-field:focus-within{border-color:rgba(59,158,255,0.4)}
  .mq-field .prefix{padding:0 10px;color:var(--sub);font-size:13px;font-weight:600;background:rgba(255,255,255,0.03);border-right:1px solid var(--borderf);height:38px;display:flex;align-items:center;white-space:nowrap}
  .mq-field .suffix{padding:0 10px;color:var(--sub);font-size:12px;font-weight:600;background:rgba(255,255,255,0.03);border-left:1px solid var(--borderf);height:38px;display:flex;align-items:center;white-space:nowrap;min-width:52px;justify-content:center}
  .mq-field input{flex:1;background:transparent;border:none;outline:none;color:var(--text);padding:0 12px;height:38px;font-size:14px}
  .mq-field input::placeholder{color:var(--dim)}
  .mq-field select{flex:1;background:transparent;border:none;outline:none;color:var(--text);padding:0 12px;height:38px;font-size:14px;cursor:pointer;-webkit-appearance:none;appearance:none}
  .mq-field select option{background:var(--card2);color:var(--text)}
  .mq-calc-row{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(59,158,255,0.05);border:1px solid rgba(59,158,255,0.12);border-radius:8px}
  .mq-calc-row span{font-size:12px;color:var(--sub)}
  .mq-calc-row strong{font-size:14px;font-weight:700;color:var(--blue)}
  .mq-note{font-size:11px;color:var(--amber);background:rgba(240,160,48,0.08);border:1px solid rgba(240,160,48,0.18);border-radius:7px;padding:8px 10px;line-height:1.5}
  .mq-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .mq-seg-btn{padding:8px;border-radius:8px;border:1px solid var(--borderf);background:transparent;color:var(--sub);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;text-align:center}
  .mq-seg-btn.active{background:rgba(59,158,255,0.15);border-color:rgba(59,158,255,0.4);color:var(--blue)}
  .mq-seg-3{grid-template-columns:1fr 1fr 1fr}

  /* Results */
  .mq-results{display:flex;flex-direction:column;gap:16px}

  /* Verdict */
  .mq-verdict{border-radius:6px;padding:20px 22px;border:1px solid}
  .mq-verdict.pass{background:rgba(52,217,138,0.08);border-color:rgba(52,217,138,0.25)}
  .mq-verdict.fail{background:rgba(242,92,92,0.08);border-color:rgba(242,92,92,0.25)}
  .mq-verdict.neutral{background:var(--card);border-color:var(--borderf)}
  .mq-verdict-top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
  .mq-verdict-label{font-size:20px;font-weight:800}
  .mq-verdict.pass .mq-verdict-label{font-family:'Fira Code',ui-monospace,monospace;color:var(--green)}
  .mq-verdict.fail .mq-verdict-label{font-family:'Fira Code',ui-monospace,monospace;color:var(--red)}
  .mq-verdict.neutral .mq-verdict-label{font-family:'Fira Code',ui-monospace,monospace;color:var(--sub)}
  .mq-verdict-rates{display:flex;gap:14px;flex-wrap:wrap;margin-top:12px}
  .mq-rate-pill{padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600}
  .mq-rate-pill.contract{background:rgba(167,130,255,0.12);color:var(--purple);border:1px solid rgba(167,130,255,0.2)}
  .mq-rate-pill.qualify{background:rgba(240,160,48,0.12);color:var(--amber);border:1px solid rgba(240,160,48,0.2)}

  /* Metric cards row */
  .mq-metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  @media(max-width:640px){.mq-metrics{grid-template-columns:1fr}}
  .mq-metric-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:16px 18px}
  .mq-metric-card.highlight{background:rgba(52,217,138,0.06);border-color:rgba(52,217,138,0.2)}
  .mq-metric-label{font-family:'Fira Code',ui-monospace,monospace;font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
  .mq-metric-value{font-family:'Fira Code',ui-monospace,monospace;font-size:22px;font-weight:800;color:var(--text)}
  .mq-metric-card.highlight .mq-metric-value{font-family:'Fira Code',ui-monospace,monospace;color:var(--green)}
  .mq-metric-sub{font-size:11px;color:var(--dim);margin-top:3px}

  /* GDS/TDS gauges */
  .mq-gauges{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:18px 20px;display:flex;flex-direction:column;gap:16px}
  .mq-gauge-title{font-size:12px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
  .mq-gauge-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
  .mq-gauge-label{font-size:15px;font-weight:700;color:var(--text)}
  .mq-gauge-badge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:6px}
  .mq-gauge-badge.pass{background:rgba(52,217,138,0.15);color:var(--green)}
  .mq-gauge-badge.warn{background:rgba(240,160,48,0.15);color:var(--amber)}
  .mq-gauge-badge.fail{background:rgba(242,92,92,0.15);color:var(--red)}
  .mq-gauge-bar{height:8px;border-radius:4px;background:rgba(255,255,255,0.06);position:relative;overflow:visible;margin-bottom:6px}
  .mq-gauge-fill{height:100%;border-radius:4px;transition:width .4s ease}
  .mq-gauge-limit{position:absolute;top:-3px;width:2px;height:14px;border-radius:1px}
  .mq-gauge-nums{display:flex;justify-content:space-between;font-size:11px;color:var(--sub)}

  /* Breakdown tables */
  .mq-breakdown{background:var(--card);border:1px solid var(--borderf);border-radius:6px;overflow:hidden}
  .mq-breakdown-head{padding:14px 18px;border-bottom:1px solid var(--borderf);font-size:12px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:.05em}
  .mq-breakdown-body{padding:4px 0}
  .mq-brow{display:flex;justify-content:space-between;align-items:center;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,0.03)}
  .mq-brow:last-child{border-bottom:none}
  .mq-brow.total{background:rgba(255,255,255,0.03);font-weight:700}
  .mq-brow-key{font-size:13px;color:var(--sub)}
  .mq-brow-val{font-size:13px;font-weight:600;color:var(--text)}
  .mq-brow-val.green{color:var(--green)}
  .mq-brow-val.red{color:var(--red)}
  .mq-brow-val.blue{color:var(--blue)}
  .mq-brow-val.amber{color:var(--amber)}

  /* Info boxes */
  .mq-info-boxes{display:flex;flex-direction:column;gap:12px}
  .mq-info-box{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:16px 18px}
  .mq-info-box h4{font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px;display:flex;align-items:center;gap:8px}
  .mq-info-box h4 .icon{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px}
  .mq-info-box p{font-size:12px;color:var(--sub);line-height:1.6}
  .mq-info-box p strong{color:var(--text)}

  /* Divider */
  .mq-divider{height:1px;background:var(--borderf);margin:4px 0}

  /* Afford mode badge */
  .mq-afford-badge{background:rgba(167,130,255,0.1);border:1px solid rgba(167,130,255,0.2);border-radius:6px;padding:10px 14px;font-size:12px;color:var(--purple);font-weight:600;text-align:center}
`;

// ─── Mortgage math ────────────────────────────────────────────────────────────
function calcPayment(principal, annualRate, amortYears) {
  const p = principal;
  const r = annualRate / 100 / 12;
  const n = amortYears * 12;
  if (!p || p <= 0 || !r || !n) return 0;
  return p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function loanFromPayment(payment, annualRate, amortYears) {
  const r = annualRate / 100 / 12;
  const n = amortYears * 12;
  if (!payment || payment <= 0 || !r || !n) return 0;
  const factor = Math.pow(1 + r, n);
  return payment * (factor - 1) / (r * factor);
}

function cmhcPremium(downPct) {
  if (downPct >= 0.20) return 0;
  if (downPct >= 0.15) return 0.028;
  if (downPct >= 0.10) return 0.031;
  return 0.040;
}

function minDownPayment(price) {
  if (price < 500000) return price * 0.05;
  if (price < 1000000) return 500000 * 0.05 + (price - 500000) * 0.10;
  return price * 0.20;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MortgageQualifier() {
  const navigate = useNavigate();

  // ── State ──
  const [annualIncome, setAnnualIncome] = useState("");
  const [coIncome, setCoIncome] = useState("");
  const [employmentType, setEmploymentType] = useState("employed");

  const [carPayment, setCarPayment] = useState("");
  const [creditCard, setCreditCard] = useState("");
  const [studentLoan, setStudentLoan] = useState("");
  const [otherDebt, setOtherDebt] = useState("");

  const [purchasePrice, setPurchasePrice] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [mortgageRate, setMortgageRate] = useState("5.5");
  const [amortization, setAmortization] = useState(25);

  const [propertyTax, setPropertyTax] = useState("");
  const [monthlyHeating, setMonthlyHeating] = useState("150");
  const [condoFee, setCondoFee] = useState("");

  // ── Prefill from localStorage ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rde_prefill");
      if (raw) {
        const data = JSON.parse(raw);
        if (data.purchasePrice) setPurchasePrice(String(data.purchasePrice));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // ── Derived calculations ──
  const calcs = useMemo(() => {
    const price = num(purchasePrice);
    const dp = num(downPayment);
    const rate = num(mortgageRate);
    const amort = num(amortization);
    const income = num(annualIncome);
    const coInc = num(coIncome);
    const totalIncome = income + coInc;
    const grossMonthly = totalIncome / 12;

    const totalMonthlyDebt = num(carPayment) + num(creditCard) + num(studentLoan) + num(otherDebt);

    // Qualify rate (OSFI stress test)
    const qualifyingRate = Math.max(rate + 2.0, 5.25);

    // Down payment %
    const dpPct = price > 0 ? dp / price : 0;

    // Determine mortgage type
    const isInsured = price > 0 && dp > 0 && dpPct < 0.20 && price < 1000000;

    // CMHC premium
    const cmhcPct = isInsured ? cmhcPremium(dpPct) : 0;
    const baseLoan = Math.max(0, price - dp);
    const cmhcAmount = isInsured ? baseLoan * cmhcPct : 0;
    const totalLoan = baseLoan + cmhcAmount;

    // Property tax default: 0.8% of purchase price if blank
    const annualTax = propertyTax !== "" ? num(propertyTax) : (price * 0.008);
    const monthlyTax = annualTax / 12;
    const heating = num(monthlyHeating) || 150;
    const condo = num(condoFee);
    const condoContrib = condo * 0.5; // 50% per OSFI

    // Monthly payment at qualifying rate (stress test)
    const stressPayment = calcPayment(totalLoan, qualifyingRate, amort);

    // Monthly payment at contract rate
    const contractPayment = calcPayment(totalLoan, rate, amort);

    // PITH
    const monthlyPITH = stressPayment + monthlyTax + heating + condoContrib;

    // GDS / TDS
    const GDS = grossMonthly > 0 ? monthlyPITH / grossMonthly : null;
    const TDS = grossMonthly > 0 ? (monthlyPITH + totalMonthlyDebt) / grossMonthly : null;

    // Max qualifying amount (from GDS=39% and TDS=44%)
    const maxPITH_GDS = grossMonthly * 0.39;
    const maxPayment_GDS = maxPITH_GDS - monthlyTax - heating - condoContrib;

    const maxPITH_TDS = grossMonthly * 0.44 - totalMonthlyDebt;
    const maxPayment_TDS = maxPITH_TDS - monthlyTax - heating - condoContrib;

    const maxPayment = Math.min(maxPayment_GDS, maxPayment_TDS);
    const maxLoan = loanFromPayment(maxPayment, qualifyingRate, amort);

    // Max purchase price estimate
    let maxPrice = 0;
    if (maxLoan > 0) {
      // Try conventional first (20% down)
      const convPrice = maxLoan / 0.80;
      // Try insured (5% down approx) — iterate to account for CMHC
      // For purchase < $500K: dp = 5%, loan = price * 0.95 * (1 + cmhcRate)
      // Solve: price * 0.95 * 1.04 = maxLoan => price = maxLoan / (0.95 * 1.04)
      const insuredPrice5 = maxLoan / (0.95 * 1.04);
      // Use the larger of the two (insured allows more home with less down)
      // But only use insured if it would be under $1M
      if (insuredPrice5 < 1000000 && insuredPrice5 > convPrice) {
        maxPrice = insuredPrice5;
      } else {
        maxPrice = convPrice;
      }
    }

    // Does the entered purchase price qualify?
    const hasPrice = price > 0;
    const hasIncome = totalIncome > 0;
    const gdsPass = GDS !== null && GDS <= 0.39;
    const tdsPass = TDS !== null && TDS <= 0.44;
    const qualifies = hasPrice && hasIncome && gdsPass && tdsPass;
    const fails = hasPrice && hasIncome && (!gdsPass || !tdsPass);

    // Min down payment check
    const minDP = price > 0 ? minDownPayment(price) : 0;
    const dpShortfall = dp > 0 && dp < minDP ? minDP - dp : 0;

    return {
      price, dp, dpPct, rate, qualifyingRate, amort,
      totalIncome, grossMonthly, totalMonthlyDebt,
      isInsured, cmhcPct, cmhcAmount, baseLoan, totalLoan,
      annualTax, monthlyTax, heating, condo, condoContrib,
      stressPayment, contractPayment, monthlyPITH,
      GDS, TDS,
      maxLoan, maxPrice, maxPayment,
      hasPrice, hasIncome, qualifies, fails,
      minDP, dpShortfall,
    };
  }, [annualIncome, coIncome, employmentType, carPayment, creditCard, studentLoan, otherDebt,
      purchasePrice, downPayment, mortgageRate, amortization, propertyTax, monthlyHeating, condoFee]);

  const totalMonthlyDebt = num(carPayment) + num(creditCard) + num(studentLoan) + num(otherDebt);
  const affordMode = !calcs.hasPrice && calcs.hasIncome;

  // ── Gauge helpers ──
  function gaugeColor(val, limit) {
    if (val === null) return "var(--dim)";
    if (val > limit) return "var(--red)";
    if (val > limit - 0.02) return "var(--amber)";
    return "var(--green)";
  }
  function gaugeBadgeClass(val, limit) {
    if (val === null) return "";
    if (val > limit) return "fail";
    if (val > limit - 0.02) return "warn";
    return "pass";
  }
  function gaugeBadgeLabel(val, limit) {
    if (val === null) return "—";
    if (val > limit) return "Fail ✗";
    if (val > limit - 0.02) return "Near Limit";
    return "Pass ✓";
  }

  // ── Verdict ──
  function verdictClass() {
    if (!calcs.hasIncome || (!calcs.hasPrice && !affordMode)) return "neutral";
    if (calcs.qualifies) return "pass";
    if (calcs.fails) return "fail";
    return "neutral";
  }
  function verdictLabel() {
    if (!calcs.hasIncome) return "Enter income to begin";
    if (affordMode) return "Affordability Mode — Max Purchase Price below";
    if (calcs.qualifies) return "✅ You Qualify";
    if (calcs.fails) return "❌ You Don't Qualify at this price";
    return "Enter details to check";
  }

  return (
    <div className="mq-wrap">
      <style>{CSS}</style>

      {/* Nav */}
      <TopNav />

      {/* Hero */}
      <div className="mq-hero">
        <h1>Canadian Mortgage Qualifier</h1>
        <p>OSFI B-20 stress test calculator — find out exactly what you qualify for and why.</p>
      </div>

      <div className="mq-body">
        {/* ── LEFT: Inputs ── */}
        <div className="mq-inputs">

          {/* Income */}
          <div className="mq-section">
            <div className="mq-section-head">
              <div className="sec-icon" style={{background:"rgba(52,217,138,0.12)"}}>💼</div>
              <h3>Income</h3>
            </div>
            <div className="mq-section-body">
              <div className="mq-row">
                <label className="mq-label">Annual Gross Income</label>
                <div className="mq-field">
                  <span className="prefix">CA$</span>
                  <input type="number" placeholder="120,000" value={annualIncome} onChange={e => setAnnualIncome(e.target.value)} />
                </div>
              </div>
              <div className="mq-row">
                <label className="mq-label">Co-borrower Annual Income <span className="opt">(optional)</span></label>
                <div className="mq-field">
                  <span className="prefix">CA$</span>
                  <input type="number" placeholder="0" value={coIncome} onChange={e => setCoIncome(e.target.value)} />
                </div>
              </div>
              <div className="mq-row">
                <label className="mq-label">Employment Type</label>
                <div className="mq-seg mq-seg-3">
                  {["employed","self-employed","contract"].map(t => (
                    <button key={t} className={`mq-seg-btn${employmentType === t ? " active" : ""}`} onClick={() => setEmploymentType(t)}>
                      {t === "employed" ? "Employed" : t === "self-employed" ? "Self-Empl." : "Contract"}
                    </button>
                  ))}
                </div>
              </div>
              {employmentType === "self-employed" && (
                <div className="mq-note">
                  Self-employed income: lenders typically use a 2-year average of net income from NOAs (Notice of Assessment). Enter your 2-year average above.
                </div>
              )}
              {calcs.hasIncome && (
                <div className="mq-calc-row">
                  <span>Gross Monthly Income</span>
                  <strong>{fmt(calcs.grossMonthly)}/mo</strong>
                </div>
              )}
            </div>
          </div>

          {/* Debts */}
          <div className="mq-section">
            <div className="mq-section-head">
              <div className="sec-icon" style={{background:"rgba(242,92,92,0.12)"}}>💳</div>
              <h3>Monthly Debts</h3>
            </div>
            <div className="mq-section-body">
              <div className="mq-row-2">
                <div className="mq-row">
                  <label className="mq-label">Car Payment</label>
                  <div className="mq-field">
                    <span className="prefix">$</span>
                    <input type="number" placeholder="0" value={carPayment} onChange={e => setCarPayment(e.target.value)} />
                  </div>
                </div>
                <div className="mq-row">
                  <label className="mq-label">Credit Card Min.</label>
                  <div className="mq-field">
                    <span className="prefix">$</span>
                    <input type="number" placeholder="0" value={creditCard} onChange={e => setCreditCard(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="mq-row-2">
                <div className="mq-row">
                  <label className="mq-label">Student Loan</label>
                  <div className="mq-field">
                    <span className="prefix">$</span>
                    <input type="number" placeholder="0" value={studentLoan} onChange={e => setStudentLoan(e.target.value)} />
                  </div>
                </div>
                <div className="mq-row">
                  <label className="mq-label">Other Debt</label>
                  <div className="mq-field">
                    <span className="prefix">$</span>
                    <input type="number" placeholder="0" value={otherDebt} onChange={e => setOtherDebt(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="mq-calc-row">
                <span>Total Monthly Debts</span>
                <strong style={{color: totalMonthlyDebt > 0 ? "var(--red)" : "var(--dim)"}}>{fmt(totalMonthlyDebt)}/mo</strong>
              </div>
            </div>
          </div>

          {/* Mortgage Details */}
          <div className="mq-section">
            <div className="mq-section-head">
              <div className="sec-icon" style={{background:"rgba(59,158,255,0.12)"}}>🏦</div>
              <h3>Mortgage Details</h3>
            </div>
            <div className="mq-section-body">
              <div className="mq-row">
                <label className="mq-label">Property Purchase Price</label>
                <div className="mq-field">
                  <span className="prefix">CA$</span>
                  <input type="number" placeholder="Leave blank for affordability mode" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} />
                </div>
              </div>
              {affordMode && (
                <div className="mq-afford-badge">
                  Affordability Mode — showing maximum purchase price
                </div>
              )}
              <div className="mq-row">
                <label className="mq-label">Down Payment</label>
                <div className="mq-field">
                  <span className="prefix">CA$</span>
                  <input type="number" placeholder="e.g. 60000" value={downPayment} onChange={e => setDownPayment(e.target.value)} />
                  {calcs.price > 0 && calcs.dp > 0 && (
                    <span className="suffix">{fmtPct(calcs.dpPct, 1)}</span>
                  )}
                </div>
              </div>
              {calcs.dpShortfall > 0 && (
                <div className="mq-note">
                  Minimum down payment for this price is {fmt(calcs.minDP)}. You need {fmt(calcs.dpShortfall)} more.
                </div>
              )}
              {calcs.price >= 1000000 && calcs.dp > 0 && calcs.dpPct < 0.20 && (
                <div className="mq-note">
                  Properties $1M+ require minimum 20% down payment. CMHC insurance is not available.
                </div>
              )}
              <div className="mq-row-2">
                <div className="mq-row">
                  <label className="mq-label">Mortgage Rate</label>
                  <div className="mq-field">
                    <input type="number" step="0.05" placeholder="5.50" value={mortgageRate} onChange={e => setMortgageRate(e.target.value)} />
                    <span className="suffix">%</span>
                  </div>
                </div>
                <div className="mq-row">
                  <label className="mq-label">Qualifying Rate</label>
                  <div className="mq-field" style={{background:"rgba(240,160,48,0.06)",borderColor:"rgba(240,160,48,0.2)"}}>
                    <input type="text" readOnly value={`${calcs.qualifyingRate.toFixed(2)}%`} style={{color:"var(--amber)",fontWeight:700}} />
                  </div>
                </div>
              </div>
              <div className="mq-row">
                <label className="mq-label">Amortization</label>
                <div className="mq-seg">
                  <button className={`mq-seg-btn${amortization === 25 ? " active" : ""}`} onClick={() => setAmortization(25)}>25 years</button>
                  <button className={`mq-seg-btn${amortization === 30 ? " active" : ""}`} onClick={() => setAmortization(30)}>30 years (first-time)</button>
                </div>
              </div>
              <div className="mq-row">
                <label className="mq-label">Mortgage Type</label>
                <div className="mq-calc-row">
                  <span>{calcs.isInsured ? "Insured (CMHC required)" : calcs.price >= 1000000 ? "Conventional (≥20% required)" : calcs.dp > 0 ? "Conventional (≥20% down)" : "—"}</span>
                  <strong style={{color: calcs.isInsured ? "var(--amber)" : "var(--blue)"}}>
                    {calcs.isInsured ? `+${fmtPct(calcs.cmhcPct, 2)} CMHC` : "No CMHC"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Property Costs */}
          <div className="mq-section">
            <div className="mq-section-head">
              <div className="sec-icon" style={{background:"rgba(167,130,255,0.12)"}}>🏠</div>
              <h3>Property Costs</h3>
            </div>
            <div className="mq-section-body">
              <div className="mq-row">
                <label className="mq-label">Annual Property Tax <span className="opt">(blank = 0.8% of price)</span></label>
                <div className="mq-field">
                  <span className="prefix">CA$</span>
                  <input type="number" placeholder={calcs.price > 0 ? Math.round(calcs.price * 0.008).toLocaleString() : "auto"} value={propertyTax} onChange={e => setPropertyTax(e.target.value)} />
                </div>
              </div>
              <div className="mq-row-2">
                <div className="mq-row">
                  <label className="mq-label">Monthly Heating</label>
                  <div className="mq-field">
                    <span className="prefix">$</span>
                    <input type="number" placeholder="150" value={monthlyHeating} onChange={e => setMonthlyHeating(e.target.value)} />
                  </div>
                </div>
                <div className="mq-row">
                  <label className="mq-label">Monthly Condo Fee</label>
                  <div className="mq-field">
                    <span className="prefix">$</span>
                    <input type="number" placeholder="0" value={condoFee} onChange={e => setCondoFee(e.target.value)} />
                  </div>
                </div>
              </div>
              {num(condoFee) > 0 && (
                <div className="mq-note">
                  OSFI rules: 50% of condo fee ({fmt(num(condoFee) * 0.5)}/mo) is included in GDS calculation.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT: Results ── */}
        <div className="mq-results">

          {/* Verdict */}
          <div className={`mq-verdict ${verdictClass()}`}>
            <div className="mq-verdict-top">
              <div className="mq-verdict-label">{verdictLabel()}</div>
            </div>
            {calcs.hasIncome && (
              <div className="mq-verdict-rates">
                <div className="mq-rate-pill contract">Contract Rate: {calcs.rate.toFixed(2)}%</div>
                <div className="mq-rate-pill qualify">Qualifying Rate: {calcs.qualifyingRate.toFixed(2)}%</div>
              </div>
            )}
          </div>

          {/* Key Metric Cards */}
          {calcs.hasIncome && (
            <div className="mq-metrics">
              <div className="mq-metric-card highlight">
                <div className="mq-metric-label">Max Purchase Price</div>
                <div className="mq-metric-value">{calcs.maxPrice > 0 ? fmt(calcs.maxPrice) : "—"}</div>
                <div className="mq-metric-sub">Based on OSFI stress test</div>
              </div>
              <div className="mq-metric-card">
                <div className="mq-metric-label">Max Mortgage Amount</div>
                <div className="mq-metric-value">{calcs.maxLoan > 0 ? fmt(calcs.maxLoan) : "—"}</div>
                <div className="mq-metric-sub">At qualifying rate {calcs.qualifyingRate.toFixed(2)}%</div>
              </div>
              {calcs.hasPrice && calcs.contractPayment > 0 && (
                <>
                  <div className="mq-metric-card">
                    <div className="mq-metric-label">Actual Monthly Payment</div>
                    <div className="mq-metric-value">{fmt(calcs.contractPayment)}</div>
                    <div className="mq-metric-sub">At contract rate {calcs.rate.toFixed(2)}%</div>
                  </div>
                  <div className="mq-metric-card">
                    <div className="mq-metric-label">Stress Test Payment</div>
                    <div className="mq-metric-value" style={{color:"var(--amber)"}}>{fmt(calcs.stressPayment)}</div>
                    <div className="mq-metric-sub">At qualifying rate {calcs.qualifyingRate.toFixed(2)}%</div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* GDS / TDS Gauges */}
          {calcs.hasIncome && calcs.hasPrice && (
            <div className="mq-gauges">
              <div className="mq-gauge-title">Debt Service Ratios (OSFI B-20)</div>

              {/* GDS */}
              <div>
                <div className="mq-gauge-row">
                  <div className="mq-gauge-label">
                    GDS — {calcs.GDS !== null ? fmtPct(calcs.GDS, 1) : "—"}
                    <span style={{fontSize:11,color:"var(--sub)",fontWeight:400,marginLeft:6}}>limit 39%</span>
                  </div>
                  <span className={`mq-gauge-badge ${gaugeBadgeClass(calcs.GDS, 0.39)}`}>
                    {gaugeBadgeLabel(calcs.GDS, 0.39)}
                  </span>
                </div>
                <div className="mq-gauge-bar">
                  <div className="mq-gauge-fill" style={{
                    width: `${Math.min(100, (calcs.GDS || 0) / 0.60 * 100)}%`,
                    background: gaugeColor(calcs.GDS, 0.39)
                  }} />
                  <div className="mq-gauge-limit" style={{
                    left: `${0.39 / 0.60 * 100}%`,
                    background: "rgba(255,255,255,0.3)"
                  }} />
                </div>
                <div className="mq-gauge-nums">
                  <span>0%</span>
                  <span style={{color:"rgba(255,255,255,0.3)"}}>39% limit</span>
                  <span>60%+</span>
                </div>
              </div>

              <div className="mq-divider" />

              {/* TDS */}
              <div>
                <div className="mq-gauge-row">
                  <div className="mq-gauge-label">
                    TDS — {calcs.TDS !== null ? fmtPct(calcs.TDS, 1) : "—"}
                    <span style={{fontSize:11,color:"var(--sub)",fontWeight:400,marginLeft:6}}>limit 44%</span>
                  </div>
                  <span className={`mq-gauge-badge ${gaugeBadgeClass(calcs.TDS, 0.44)}`}>
                    {gaugeBadgeLabel(calcs.TDS, 0.44)}
                  </span>
                </div>
                <div className="mq-gauge-bar">
                  <div className="mq-gauge-fill" style={{
                    width: `${Math.min(100, (calcs.TDS || 0) / 0.65 * 100)}%`,
                    background: gaugeColor(calcs.TDS, 0.44)
                  }} />
                  <div className="mq-gauge-limit" style={{
                    left: `${0.44 / 0.65 * 100}%`,
                    background: "rgba(255,255,255,0.3)"
                  }} />
                </div>
                <div className="mq-gauge-nums">
                  <span>0%</span>
                  <span style={{color:"rgba(255,255,255,0.3)"}}>44% limit</span>
                  <span>65%+</span>
                </div>
              </div>
            </div>
          )}

          {/* Loan Breakdown */}
          {calcs.hasPrice && calcs.hasIncome && (
            <div className="mq-breakdown">
              <div className="mq-breakdown-head">Loan Breakdown</div>
              <div className="mq-breakdown-body">
                <div className="mq-brow">
                  <span className="mq-brow-key">Purchase Price</span>
                  <span className="mq-brow-val">{fmt(calcs.price)}</span>
                </div>
                <div className="mq-brow">
                  <span className="mq-brow-key">Down Payment</span>
                  <span className="mq-brow-val green">{fmt(calcs.dp)} ({fmtPct(calcs.dpPct, 1)})</span>
                </div>
                <div className="mq-brow">
                  <span className="mq-brow-key">Base Mortgage</span>
                  <span className="mq-brow-val">{fmt(calcs.baseLoan)}</span>
                </div>
                <div className="mq-brow">
                  <span className="mq-brow-key">CMHC Insurance Premium</span>
                  <span className="mq-brow-val amber">
                    {calcs.isInsured ? `${fmt(calcs.cmhcAmount)} (${fmtPct(calcs.cmhcPct, 2)} of loan)` : "None"}
                  </span>
                </div>
                <div className="mq-brow total">
                  <span className="mq-brow-key">Total Mortgage</span>
                  <span className="mq-brow-val blue">{fmt(calcs.totalLoan)}</span>
                </div>
                <div className="mq-brow">
                  <span className="mq-brow-key">Amortization</span>
                  <span className="mq-brow-val">{calcs.amort} years</span>
                </div>
                <div className="mq-brow">
                  <span className="mq-brow-key">Monthly Payment (contract rate)</span>
                  <span className="mq-brow-val">{fmt(calcs.contractPayment)}/mo</span>
                </div>
                <div className="mq-brow">
                  <span className="mq-brow-key">Monthly Payment (qualifying rate)</span>
                  <span className="mq-brow-val amber">{fmt(calcs.stressPayment)}/mo</span>
                </div>
              </div>
            </div>
          )}

          {/* Income Breakdown */}
          {calcs.hasIncome && calcs.hasPrice && (
            <div className="mq-breakdown">
              <div className="mq-breakdown-head">Income & Ratio Breakdown</div>
              <div className="mq-breakdown-body">
                <div className="mq-brow">
                  <span className="mq-brow-key">Total Gross Monthly Income</span>
                  <span className="mq-brow-val green">{fmt(calcs.grossMonthly)}/mo</span>
                </div>
                <div className="mq-brow">
                  <span className="mq-brow-key">Stress Test Payment (P&I)</span>
                  <span className="mq-brow-val">{fmt(calcs.stressPayment)}/mo</span>
                </div>
                <div className="mq-brow">
                  <span className="mq-brow-key">Property Tax</span>
                  <span className="mq-brow-val">{fmt(calcs.monthlyTax)}/mo</span>
                </div>
                <div className="mq-brow">
                  <span className="mq-brow-key">Heating</span>
                  <span className="mq-brow-val">{fmt(calcs.heating)}/mo</span>
                </div>
                {calcs.condoContrib > 0 && (
                  <div className="mq-brow">
                    <span className="mq-brow-key">Condo Fee (50% per OSFI)</span>
                    <span className="mq-brow-val">{fmt(calcs.condoContrib)}/mo</span>
                  </div>
                )}
                <div className="mq-brow total">
                  <span className="mq-brow-key">Monthly Housing Cost (PITH)</span>
                  <span className="mq-brow-val blue">{fmt(calcs.monthlyPITH)}/mo</span>
                </div>
                <div className="mq-brow">
                  <span className="mq-brow-key">Other Monthly Debts</span>
                  <span className="mq-brow-val red">{fmt(calcs.totalMonthlyDebt)}/mo</span>
                </div>
                <div className="mq-brow">
                  <span className="mq-brow-key">GDS Ratio</span>
                  <span className={`mq-brow-val ${calcs.GDS !== null && calcs.GDS > 0.39 ? "red" : "green"}`}>
                    {calcs.GDS !== null ? fmtPct(calcs.GDS, 2) : "—"} (limit 39%)
                  </span>
                </div>
                <div className="mq-brow">
                  <span className="mq-brow-key">TDS Ratio</span>
                  <span className={`mq-brow-val ${calcs.TDS !== null && calcs.TDS > 0.44 ? "red" : "green"}`}>
                    {calcs.TDS !== null ? fmtPct(calcs.TDS, 2) : "—"} (limit 44%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Educational Notes */}
          <div className="mq-info-boxes">
            <div className="mq-info-box">
              <h4>
                <span className="icon" style={{background:"rgba(240,160,48,0.15)",color:"var(--amber)"}}>?</span>
                What is the Stress Test?
              </h4>
              <p>
                The <strong>OSFI B-20 stress test</strong> requires lenders to qualify you at the higher of your contracted mortgage rate plus 2%, or 5.25% — whichever is greater. As of 2024, the floor rate is <strong>5.25%</strong>. This means even if your actual rate is 4%, you're tested at 6%. The stress test protects borrowers from rate increases and ensures Canadians can still afford payments if rates rise.
              </p>
            </div>
            <div className="mq-info-box">
              <h4>
                <span className="icon" style={{background:"rgba(59,158,255,0.15)",color:"var(--blue)"}}>%</span>
                GDS vs TDS Ratios
              </h4>
              <p>
                <strong>GDS (Gross Debt Service)</strong> ratio measures your monthly housing costs — mortgage payment, property tax, heating, and 50% of condo fees — as a percentage of gross monthly income. OSFI limit is <strong>39%</strong>.<br /><br />
                <strong>TDS (Total Debt Service)</strong> ratio adds all other monthly debts (car loans, credit cards, student loans) to your housing costs. OSFI limit is <strong>44%</strong>. Both ratios must pass for a mortgage approval.
              </p>
            </div>
            <div className="mq-info-box">
              <h4>
                <span className="icon" style={{background:"rgba(52,217,138,0.15)",color:"var(--green)"}}>C</span>
                CMHC Mortgage Insurance
              </h4>
              <p>
                <strong>CMHC insurance</strong> is required when your down payment is less than 20% of the purchase price. It protects the lender (not you) in case of default. Premiums range from <strong>2.80% to 4.00%</strong> of the loan amount and are added to your mortgage balance. CMHC insurance is not available on homes priced at $1,000,000 or more — those require a minimum 20% down payment. Insurance allows Canadians to buy sooner with as little as 5% down.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
