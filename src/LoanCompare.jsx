/**
 * /loans — Multi-loan side-by-side debt comparison.
 *
 * Closes the last big gap from the 10-feature audit (#9: loan/debt analysis
 * with multiple scenarios). Lets a user model 3 financing structures for the
 * same property side-by-side: LTV, rate, amort, origination — with winner
 * highlights on monthly payment, DSCR, total interest, balance at exit.
 *
 * Terminal aesthetic, mono numerics. No new endpoints required.
 */
import { useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useDocMeta } from "./lib/seo";

const num = v => parseFloat(String(v).replace(/,/g, "")) || 0;
const fmt = n => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = n => (isNaN(n) || !isFinite(n)) ? "—" : `${(n*100).toFixed(2)}%`;
const fmtX = n => (isNaN(n) || !isFinite(n) || Math.abs(n) > 999) ? "—" : `${n.toFixed(2)}x`;

function pmt(principal, annualRate, amortYears) {
  const p = num(principal), r = num(annualRate)/100/12, n = num(amortYears)*12;
  if (!p || !r || !n) return 0;
  return p * (r*Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
}
function loanBalance(principal, annualRate, amortYears, yearsElapsed) {
  const p = num(principal), r = num(annualRate)/100/12;
  const n = num(amortYears)*12, k = num(yearsElapsed)*12;
  if (!p || !r || !n) return p;
  return p * (Math.pow(1+r, n) - Math.pow(1+r, k)) / (Math.pow(1+r, n) - 1);
}

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
  input{font-size:16px!important;font-family:'DM Sans',sans-serif}

  .lc-wrap{min-height:100vh;background:var(--bg)}
  .lc-nav{position:sticky;top:0;z-index:100;background:rgba(7,9,15,0.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .lc-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none}.lc-logo span{color:var(--blue)}
  .lc-nav-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .lc-nav-link{font-family:'Fira Code',monospace;font-size:11px;color:var(--sub);text-decoration:none;font-weight:600;padding:6px 11px;border-radius:3px;letter-spacing:0.4px;text-transform:uppercase}
  .lc-nav-link:hover{color:var(--text);background:rgba(255,255,255,0.05)}
  .lc-nav-link.active{color:var(--blue)}
  .lc-nav-ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:3px;padding:6px 14px;font-family:'Fira Code',monospace;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:0.5px;text-transform:uppercase}.lc-nav-ghost:hover{color:var(--text);border-color:var(--blue)}

  .lc-body{max-width:1160px;margin:0 auto;padding:36px 22px 80px}
  .lc-hero{margin-bottom:28px}
  .lc-hero-tag{font-family:'Fira Code',monospace;font-size:10.5px;font-weight:700;color:var(--blue);letter-spacing:1.2px;text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:8px}
  .lc-hero-tag::before{content:"●";color:var(--green);animation:lcblink 2s infinite}
  @keyframes lcblink{0%,100%{opacity:1}50%{opacity:0.3}}
  .lc-title{font-size:28px;font-weight:800;color:var(--text);letter-spacing:-1px;margin-bottom:5px}
  .lc-sub{font-size:13.5px;color:var(--sub);line-height:1.6;max-width:680px}

  /* Deal context card */
  .lc-deal{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:18px 20px;margin-bottom:20px}
  .lc-deal-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}
  .lc-deal-badge{width:32px;height:22px;border:1px solid rgba(59,158,255,0.4);border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:'Fira Code',monospace;font-size:9.5px;font-weight:700;color:var(--blue);letter-spacing:0.5px}
  .lc-deal-title{font-size:13px;font-weight:700;color:var(--text)}
  .lc-deal-sub{font-family:'Fira Code',monospace;font-size:10.5px;color:var(--dim);letter-spacing:0.5px}
  .lc-deal-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  .lc-field{display:flex;flex-direction:column;gap:4px}
  .lc-label{font-family:'Fira Code',monospace;font-size:9.5px;color:var(--dim);font-weight:700;text-transform:uppercase;letter-spacing:0.7px}
  .lc-input{background:rgba(255,255,255,0.03);border:1px solid var(--borderf);border-radius:4px;padding:9px 11px;font-family:'Fira Code',monospace;font-size:13px;color:var(--text);outline:none;width:100%;font-weight:600;letter-spacing:-0.2px;transition:border 0.15s}
  .lc-input:focus{border-color:rgba(59,158,255,0.45);background:rgba(59,158,255,0.04)}

  /* Loan columns */
  .lc-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px}
  @media(max-width:840px){.lc-cols{grid-template-columns:1fr}}
  .lc-col{background:var(--card);border:1px solid var(--borderf);border-radius:6px;overflow:hidden}
  .lc-col.winner{border-color:rgba(52,217,138,0.4);box-shadow:0 0 0 1px rgba(52,217,138,0.2)}
  .lc-col-head{padding:10px 14px;background:rgba(255,255,255,0.025);border-bottom:1px solid var(--borderf);display:flex;align-items:center;gap:10px}
  .lc-col-tag{width:24px;height:22px;border:1px solid rgba(59,158,255,0.4);border-radius:3px;display:flex;align-items:center;justify-content:center;font-family:'Fira Code',monospace;font-size:10px;font-weight:700;color:var(--blue);letter-spacing:0.5px}
  .lc-col-name{flex:1;font-family:'DM Sans',sans-serif;background:transparent;border:none;color:var(--text);font-size:13.5px;font-weight:700;outline:none;letter-spacing:-0.2px}
  .lc-col-name:focus{color:var(--blue)}
  .lc-col-body{padding:14px}
  .lc-col-inputs{display:flex;flex-direction:column;gap:10px}
  .lc-col-divider{height:1px;background:var(--borderf);margin:14px 0}
  .lc-result-row{display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px dashed rgba(255,255,255,0.04);font-size:12.5px}
  .lc-result-row:last-child{border-bottom:none}
  .lc-result-lbl{color:var(--sub);font-family:'DM Sans',sans-serif;font-weight:500}
  .lc-result-val{font-family:'Fira Code',monospace;font-weight:700;letter-spacing:-0.2px;color:var(--text)}
  .lc-result-val.win{color:var(--green)}
  .lc-result-val.bad{color:var(--red)}
  .lc-result-val.warn{color:var(--amber)}
  .lc-win-badge{display:inline-block;margin-left:6px;font-family:'Fira Code',monospace;font-size:9px;font-weight:700;color:var(--green);letter-spacing:0.5px;border:1px solid rgba(52,217,138,0.4);border-radius:2px;padding:1px 5px;background:rgba(52,217,138,0.08)}

  .lc-summary{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:18px 20px}
  .lc-summary-head{font-family:'Fira Code',monospace;font-size:10.5px;font-weight:700;color:var(--blue);letter-spacing:1.2px;text-transform:uppercase;margin-bottom:12px}
  .lc-summary-head::before{content:"▸ "}
  .lc-summary-text{font-size:13px;color:var(--text);line-height:1.7}
  .lc-summary-text strong{color:var(--green)}

  @media(max-width:600px){
    .lc-deal-grid{grid-template-columns:1fr 1fr}
    .lc-body{padding:24px 14px 60px}
    .lc-title{font-size:22px}
  }
`;

const DEFAULT_LOANS = [
  { name: "Conventional 75%", ltv: "75", rate: "6.50", amort: "30", originPct: "1.0" },
  { name: "Conventional 80%", ltv: "80", rate: "6.75", amort: "30", originPct: "1.0" },
  { name: "Bridge / Short",    ltv: "70", rate: "8.50", amort: "25", originPct: "2.0" },
];

export default function LoanCompare() {
  useDocMeta({
    title: "Loan Comparison",
    description: "Compare 3 loan structures side-by-side for the same property: LTV, rate, amort, payment, DSCR, total interest. Free.",
  });
  const { user, signOut } = useAuth();

  // Deal context
  const [propertyValue, setPropertyValue] = useState("1500000");
  const [annualNOI, setAnnualNOI] = useState("105000");
  const [holdYears, setHoldYears] = useState("5");
  const [downCashExtras, setDownCashExtras] = useState("0"); // closing costs etc not included in loan

  // Three loans
  const [loans, setLoans] = useState(DEFAULT_LOANS);
  const updateLoan = (i, field, v) => setLoans(p => p.map((l, idx) => idx === i ? { ...l, [field]: v } : l));

  // Per-loan computations
  const rows = useMemo(() => {
    const pv = num(propertyValue);
    const noi = num(annualNOI);
    const hold = Math.max(1, num(holdYears));
    return loans.map(l => {
      const ltv = num(l.ltv) / 100;
      const loanAmt = pv * ltv;
      const equityIn = pv - loanAmt;
      const origination = loanAmt * (num(l.originPct) / 100);
      const totalCashIn = equityIn + origination + num(downCashExtras);
      const monthly = pmt(loanAmt, l.rate, l.amort);
      const annualDS = monthly * 12;
      const dscr = annualDS > 0 ? noi / annualDS : 0;
      const annualCF = noi - annualDS;
      const coc = totalCashIn > 0 ? annualCF / totalCashIn : 0;
      const balanceAtExit = loanBalance(loanAmt, l.rate, l.amort, hold);
      const principalPaid = loanAmt - balanceAtExit;
      const totalDebtSvc = annualDS * hold;
      const totalInterest = totalDebtSvc - principalPaid;
      return {
        ...l,
        loanAmt, equityIn, origination, totalCashIn,
        monthly, annualDS, dscr, annualCF, coc,
        balanceAtExit, principalPaid, totalInterest, totalDebtSvc,
      };
    });
  }, [loans, propertyValue, annualNOI, holdYears, downCashExtras]);

  // Determine winners per metric (best value across the 3 columns)
  const winners = useMemo(() => {
    const minIdx = (key) => {
      let best = 0;
      rows.forEach((r, i) => { if (r[key] < rows[best][key]) best = i; });
      return best;
    };
    const maxIdx = (key) => {
      let best = 0;
      rows.forEach((r, i) => { if (r[key] > rows[best][key]) best = i; });
      return best;
    };
    return {
      monthly:      minIdx("monthly"),
      dscr:         maxIdx("dscr"),
      coc:          maxIdx("coc"),
      totalInterest: minIdx("totalInterest"),
      balanceAtExit: minIdx("balanceAtExit"),
      annualCF:     maxIdx("annualCF"),
      totalCashIn:  minIdx("totalCashIn"),
    };
  }, [rows]);

  // Overall winner — highest annual CF after debt service is a reasonable proxy
  const overallWinnerIdx = useMemo(() => {
    let best = 0;
    rows.forEach((r, i) => { if (r.annualCF > rows[best].annualCF) best = i; });
    return best;
  }, [rows]);

  return (
    <div className="lc-wrap">
      <style>{CSS}</style>

      <nav className="lc-nav">
        <a href="/" className="lc-logo"><span>Real</span> Deal</a>
        <div className="lc-nav-right">
          <a href="/analyze" className="lc-nav-link">Tools</a>
          <a href="/app" className="lc-nav-link">Flip</a>
          <a href="/commercial" className="lc-nav-link">Multifamily</a>
          <a href="/brrrr" className="lc-nav-link">BRRRR</a>
          <a href="/loans" className="lc-nav-link active">Loans</a>
          <a href="/compare" className="lc-nav-link">Compare</a>
          {user && <a href="/dashboard" className="lc-nav-link">My Deals</a>}
          {user
            ? <button className="lc-nav-ghost" onClick={signOut}>Sign out</button>
            : <a href="/login" className="lc-nav-ghost">Sign in</a>}
        </div>
      </nav>

      <div className="lc-body">
        {/* Hero */}
        <div className="lc-hero">
          <div className="lc-hero-tag">[ LOAN COMPARE · MULTI-SCENARIO DEBT MODELLER ]</div>
          <div className="lc-title">Side-by-side debt structures.</div>
          <div className="lc-sub">Model three financing scenarios for the same deal. Winner highlights call out the best monthly payment, DSCR, cash-on-cash, total interest, and remaining loan balance at exit.</div>
        </div>

        {/* Deal context */}
        <div className="lc-deal">
          <div className="lc-deal-head">
            <div className="lc-deal-badge">DEAL</div>
            <div>
              <div className="lc-deal-title">Property Context</div>
              <div className="lc-deal-sub">[ Common inputs · same across all 3 loans ]</div>
            </div>
          </div>
          <div className="lc-deal-grid">
            <div className="lc-field">
              <div className="lc-label">Property value</div>
              <input className="lc-input" type="text" value={propertyValue} onChange={e => setPropertyValue(e.target.value)} />
            </div>
            <div className="lc-field">
              <div className="lc-label">Annual NOI</div>
              <input className="lc-input" type="text" value={annualNOI} onChange={e => setAnnualNOI(e.target.value)} />
            </div>
            <div className="lc-field">
              <div className="lc-label">Hold years</div>
              <input className="lc-input" type="text" value={holdYears} onChange={e => setHoldYears(e.target.value)} />
            </div>
            <div className="lc-field">
              <div className="lc-label">Other cash in ($)</div>
              <input className="lc-input" type="text" value={downCashExtras} onChange={e => setDownCashExtras(e.target.value)} />
            </div>
          </div>
        </div>

        {/* 3 loan columns */}
        <div className="lc-cols">
          {rows.map((r, i) => {
            const isOverallWinner = i === overallWinnerIdx;
            const winRow = (key, dir = "win") => (i === winners[key] ? (dir === "win" ? "win" : "bad") : "");
            return (
              <div key={i} className={`lc-col ${isOverallWinner ? "winner" : ""}`}>
                <div className="lc-col-head">
                  <div className="lc-col-tag">L{i+1}</div>
                  <input
                    className="lc-col-name"
                    value={r.name}
                    onChange={e => updateLoan(i, "name", e.target.value)}
                  />
                  {isOverallWinner && (
                    <span style={{fontFamily:"'Fira Code',monospace",fontSize:9,fontWeight:700,color:"var(--green)",letterSpacing:"0.6px",border:"1px solid rgba(52,217,138,0.4)",borderRadius:2,padding:"2px 6px",background:"rgba(52,217,138,0.1)"}}>
                      ▲ BEST CF
                    </span>
                  )}
                </div>
                <div className="lc-col-body">
                  {/* Inputs */}
                  <div className="lc-col-inputs">
                    <div className="lc-field">
                      <div className="lc-label">LTV %</div>
                      <input className="lc-input" type="text" value={r.ltv} onChange={e => updateLoan(i, "ltv", e.target.value)} />
                    </div>
                    <div className="lc-field">
                      <div className="lc-label">Interest rate %</div>
                      <input className="lc-input" type="text" value={r.rate} onChange={e => updateLoan(i, "rate", e.target.value)} />
                    </div>
                    <div className="lc-field">
                      <div className="lc-label">Amort years</div>
                      <input className="lc-input" type="text" value={r.amort} onChange={e => updateLoan(i, "amort", e.target.value)} />
                    </div>
                    <div className="lc-field">
                      <div className="lc-label">Origination %</div>
                      <input className="lc-input" type="text" value={r.originPct} onChange={e => updateLoan(i, "originPct", e.target.value)} />
                    </div>
                  </div>

                  <div className="lc-col-divider" />

                  {/* Results */}
                  <div className="lc-result-row">
                    <span className="lc-result-lbl">Loan amount</span>
                    <span className="lc-result-val">{fmt(r.loanAmt)}</span>
                  </div>
                  <div className="lc-result-row">
                    <span className="lc-result-lbl">Cash required</span>
                    <span className={`lc-result-val ${winRow("totalCashIn")}`}>
                      {fmt(r.totalCashIn)}
                      {i === winners.totalCashIn && <span className="lc-win-badge">▲ LEAST</span>}
                    </span>
                  </div>
                  <div className="lc-result-row">
                    <span className="lc-result-lbl">Monthly P&amp;I</span>
                    <span className={`lc-result-val ${winRow("monthly")}`}>
                      {fmt(r.monthly)}
                      {i === winners.monthly && <span className="lc-win-badge">▲ LOWEST</span>}
                    </span>
                  </div>
                  <div className="lc-result-row">
                    <span className="lc-result-lbl">Annual debt service</span>
                    <span className="lc-result-val">{fmt(r.annualDS)}</span>
                  </div>
                  <div className="lc-result-row">
                    <span className="lc-result-lbl">DSCR</span>
                    <span className={`lc-result-val ${r.dscr >= 1.25 ? "win" : r.dscr >= 1.0 ? "warn" : "bad"}`}>
                      {fmtX(r.dscr)}
                      {i === winners.dscr && <span className="lc-win-badge">▲ HIGHEST</span>}
                    </span>
                  </div>
                  <div className="lc-result-row">
                    <span className="lc-result-lbl">Annual cash flow</span>
                    <span className={`lc-result-val ${r.annualCF >= 0 ? "win" : "bad"}`}>
                      {fmt(r.annualCF)}
                      {i === winners.annualCF && <span className="lc-win-badge">▲ HIGHEST</span>}
                    </span>
                  </div>
                  <div className="lc-result-row">
                    <span className="lc-result-lbl">Cash-on-cash</span>
                    <span className={`lc-result-val ${r.coc >= 0.07 ? "win" : r.coc >= 0.04 ? "warn" : "bad"}`}>
                      {fmtPct(r.coc)}
                      {i === winners.coc && <span className="lc-win-badge">▲ HIGHEST</span>}
                    </span>
                  </div>

                  <div className="lc-col-divider" />

                  <div className="lc-result-row">
                    <span className="lc-result-lbl">Balance at exit (Yr {holdYears})</span>
                    <span className={`lc-result-val ${winRow("balanceAtExit")}`}>
                      {fmt(r.balanceAtExit)}
                      {i === winners.balanceAtExit && <span className="lc-win-badge">▲ LEAST</span>}
                    </span>
                  </div>
                  <div className="lc-result-row">
                    <span className="lc-result-lbl">Principal paid (cumul.)</span>
                    <span className="lc-result-val">{fmt(r.principalPaid)}</span>
                  </div>
                  <div className="lc-result-row">
                    <span className="lc-result-lbl">Total interest over hold</span>
                    <span className={`lc-result-val ${winRow("totalInterest")}`}>
                      {fmt(r.totalInterest)}
                      {i === winners.totalInterest && <span className="lc-win-badge">▲ LEAST</span>}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="lc-summary">
          <div className="lc-summary-head">Summary</div>
          <div className="lc-summary-text">
            On annual cash flow alone, <strong>{rows[overallWinnerIdx].name}</strong> wins at {fmt(rows[overallWinnerIdx].annualCF)}/yr (DSCR {fmtX(rows[overallWinnerIdx].dscr)}, CoC {fmtPct(rows[overallWinnerIdx].coc)}).
            But weigh cash required ({fmt(rows[winners.totalCashIn].totalCashIn)} for {rows[winners.totalCashIn].name}) and total interest over {holdYears} years ({fmt(rows[winners.totalInterest].totalInterest)} for {rows[winners.totalInterest].name}) before deciding.
            Higher LTV usually wins on cash-on-cash but costs more in absolute interest and pushes DSCR closer to the lender minimum.
          </div>
        </div>
      </div>
    </div>
  );
}
