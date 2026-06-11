import { useState, useMemo, useEffect } from "react";
import { useAuth } from "./AuthContext";
import TopNav from "./components/TopNav";

// ─── Utilities ───────────────────────────────────────────────────────────────
const num = v => parseFloat(v) || 0;
const fmt  = n => new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n||0);
const fmtPct = n => (isNaN(n)||!isFinite(n)) ? "—" : `${(n*100).toFixed(2)}%`;
const fmtX   = n => (isNaN(n)||!isFinite(n)||Math.abs(n)>999) ? "—" : `${n.toFixed(2)}x`;

function calcMtg(principal, annualRate, amortYears) {
  const p=num(principal), r=num(annualRate)/100/12, n=num(amortYears)*12;
  if (!p||!r||!n) return 0;
  return p*(r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1);
}

// ─── Defaults ────────────────────────────────────────────────────────────────
const FLIP_A = {name:"Deal A",address:"",purchasePrice:"",repairCosts:"",arv:"",holdingMonths:"4",holdingPerMonth:"2000",closingBuy:"1.5",closingSell:"1.5",agentCommission:"5",otherCosts:"0"};
const FLIP_B = {...FLIP_A, name:"Deal B"};
const MF_A   = {name:"Deal A",address:"",purchasePrice:"",units:"",grossMonthlyRent:"",vacancy:"5",opexPct:"35",downPct:"25",rate:"5.5",amort:"25",closingCosts:"1.5"};
const MF_B   = {...MF_A, name:"Deal B"};

// ─── Calculators ─────────────────────────────────────────────────────────────
function calcFlip(d) {
  const p=num(d.purchasePrice), rep=num(d.repairCosts), arv=num(d.arv);
  const hm=num(d.holdingMonths), hpm=num(d.holdingPerMonth);
  const cBuy=p*num(d.closingBuy)/100, cSell=arv*num(d.closingSell)/100;
  const comm=arv*num(d.agentCommission)/100, other=num(d.otherCosts);
  const holdTotal=hm*hpm;
  const totalIn=p+rep+cBuy+holdTotal+other;
  const netProfit=arv-p-rep-cBuy-cSell-comm-holdTotal-other;
  const roi=totalIn>0?netProfit/totalIn:0;
  const annRoi=hm>0?roi*(12/hm):0;
  const margin=arv>0?netProfit/arv:0;
  let grade="F";
  if(margin>=0.20) grade="A";
  else if(margin>=0.15) grade="B";
  else if(margin>=0.10) grade="C";
  else if(margin>=0.05) grade="D";
  return {totalIn,netProfit,roi,annRoi,margin,grade};
}

function calcMF(d) {
  const p=num(d.purchasePrice), units=num(d.units);
  const gpr=num(d.grossMonthlyRent)*12;
  const vac=gpr*num(d.vacancy)/100;
  const egi=gpr-vac;
  const opex=egi*num(d.opexPct)/100;
  const noi=egi-opex;
  const capRate=p>0?noi/p:0;
  const grm=num(d.grossMonthlyRent)>0?p/num(d.grossMonthlyRent):0;
  const ppu=units>0?p/units:0;
  const down=p*num(d.downPct)/100;
  const closing=p*num(d.closingCosts)/100;
  const loan=p-down;
  const mtgMo=calcMtg(loan,num(d.rate),num(d.amort));
  const debt=mtgMo*12;
  const cf=noi-debt;
  const cfMo=cf/12;
  const totalIn=down+closing;
  const coc=totalIn>0?cf/totalIn:0;
  const dscr=debt>0?noi/debt:0;
  return {noi,capRate,grm,ppu,cf,cfMo,totalIn,coc,dscr,mtgMo};
}

// higher=true → bigger number wins; higher=false → smaller number wins
function win(a, b, higher=true) {
  if (!isFinite(a)||!isFinite(b)) return null;
  if (Math.abs(a-b) < 0.0001) return "tie";
  return (higher ? a > b : a < b) ? "A" : "B";
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text);font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased}
  input,select{font-family:'Geist',sans-serif;font-size:14px!important}

  .cmp-wrap{min-height:100vh;background:var(--bg)}

  /* Nav */
  .cmp-nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .cmp-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none}.cmp-logo span{color:var(--blue)}
  .cmp-nav-right{display:flex;align-items:center;gap:10px}
  .cmp-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 12px;border-radius:7px}.cmp-nav-link:hover{color:var(--text)}.cmp-nav-link.active{color:var(--blue)}
  .cmp-nav-btn{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif;text-decoration:none}
  .cmp-nav-ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif}.cmp-nav-ghost:hover{color:var(--text)}

  /* Hero */
  .cmp-hero{text-align:center;padding:44px 24px 32px;position:relative;overflow:hidden}
  .cmp-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(59,158,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(59,158,255,0.02) 1px,transparent 1px);background-size:56px 56px;pointer-events:none}
  .cmp-glow{position:absolute;top:-20%;left:50%;transform:translateX(-50%);width:800px;height:400px;background:radial-gradient(ellipse,rgba(59,158,255,0.06) 0%,transparent 65%);pointer-events:none}
  .cmp-hero-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(59,158,255,0.08);border:1px solid rgba(59,158,255,0.2);border-radius:3px;padding:5px 14px;font-size:11px;font-weight:700;color:var(--blue);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:18px;position:relative;z-index:1}
  .cmp-hero h1{font-size:clamp(22px,4vw,36px);font-weight:800;letter-spacing:-1.5px;color:var(--text);line-height:1.1;margin-bottom:10px;position:relative;z-index:1}
  .cmp-hero p{font-size:15px;color:var(--sub);max-width:500px;margin:0 auto;line-height:1.65;position:relative;z-index:1}

  /* Mode toggle */
  .cmp-mode-bar{display:flex;justify-content:center;gap:0;margin-bottom:28px}
  .cmp-mode-btn{padding:10px 28px;font-size:13px;font-weight:700;cursor:pointer;border:1px solid var(--borderf);background:var(--card);color:var(--sub);transition:all 0.15s;font-family:'Geist',sans-serif}
  .cmp-mode-btn:first-child{border-radius:6px 0 0 10px;border-right:none}
  .cmp-mode-btn:last-child{border-radius:0 10px 10px 0;border-left:none}
  .cmp-mode-btn.active{background:var(--blue);color:#fff;border-color:var(--blue)}

  /* Page body */
  .cmp-body{max-width:1200px;margin:0 auto;padding:0 20px 100px}

  /* Two-col inputs */
  .cmp-cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
  @media(max-width:760px){.cmp-cols{grid-template-columns:1fr}}

  /* Input card */
  .cmp-card{background:var(--card);border:1px solid var(--border);border-radius:6px;overflow:hidden}
  .cmp-card.deal-a{border-color:rgba(59,158,255,0.25)}
  .cmp-card.deal-b{border-color:rgba(52,217,138,0.25)}
  .cmp-card-header{padding:14px 18px 12px;border-bottom:1px solid var(--borderf);background:var(--card2);display:flex;align-items:center;justify-content:space-between}
  .cmp-card-title{font-size:13px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px}
  .cmp-deal-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
  .cmp-card-body{padding:16px 18px;display:flex;flex-direction:column;gap:11px}

  .cmp-field{display:flex;flex-direction:column;gap:4px}
  .cmp-label{font-size:10.5px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.4px;display:flex;justify-content:space-between;align-items:center}
  .cmp-hint{font-size:10px;color:var(--dim);font-weight:500}
  .cmp-input{background:rgba(15,23,42,0.04);border:1px solid var(--borderf);border-radius: 10px;padding:9px 12px;font-size:14px;color:var(--text);outline:none;width:100%;transition:border 0.15s}
  .cmp-input:focus{border-color:rgba(59,158,255,0.35);background:rgba(59,158,255,0.02)}
  .cmp-input::placeholder{color:var(--dim)}
  .deal-b .cmp-input:focus{border-color:rgba(52,217,138,0.35);background:rgba(52,217,138,0.02)}
  .cmp-name-input{background:transparent;border:none;border-bottom:1px solid var(--borderf);border-radius:0;padding:4px 0;font-size:15px;font-weight:700;color:var(--text);outline:none;width:100%}
  .cmp-name-input:focus{border-bottom-color:var(--blue)}
  .cmp-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .cmp-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
  .cmp-section-label{font-size:10px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:1px;padding-top:4px}
  .cmp-divider{height:1px;background:var(--borderf);margin:2px 0}

  /* Results section */
  .cmp-results{background:var(--card);border:1px solid var(--border);border-radius:6px;overflow:hidden;margin-bottom:20px}
  .cmp-results-hdr{padding:16px 20px;background:var(--card2);border-bottom:1px solid var(--borderf);display:flex;align-items:center;justify-content:space-between}
  .cmp-results-title{font-size:13px;font-weight:800;color:var(--text);letter-spacing:0.5px;text-transform:uppercase}

  /* Comparison table */
  .cmp-table{width:100%}
  .cmp-trow{display:grid;grid-template-columns:200px 1fr 1fr;align-items:center;border-bottom:1px solid rgba(15,23,42,0.03);min-height:44px;transition:background 0.1s}
  .cmp-trow:hover{background:rgba(255,255,255,0.01)}
  .cmp-trow:last-child{border-bottom:none}
  .cmp-trow.section-head{background:var(--card2);border-top:1px solid var(--borderf);min-height:36px}
  .cmp-trow.total-row{background:rgba(255,255,255,0.02);border-top:1px solid var(--borderf)}

  .cmp-th{padding:10px 16px 10px 20px;font-size:10px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.8px}
  .cmp-th.a{color:rgba(59,158,255,0.7)}
  .cmp-th.b{color:rgba(52,217,138,0.7)}

  .cmp-tlabel{padding:8px 12px 8px 20px;font-size:12.5px;color:var(--sub);font-weight:500}
  .cmp-tlabel.bold{color:var(--text);font-weight:700}
  .cmp-tlabel.section{font-size:11px;font-weight:700;color:var(--text);letter-spacing:0.3px;padding-left:20px}

  .cmp-tval{padding:8px 16px;font-size:13px;font-family:'Geist Mono',monospace;font-weight:500;color:var(--text);border-radius: 6px;transition:all 0.15s}
  .cmp-tval.winner{color:var(--green);background:rgba(52,217,138,0.08);border:1px solid rgba(52,217,138,0.15);display:flex;align-items:center;gap:6px}
  .cmp-tval.loser{color:var(--sub)}
  .cmp-tval.bold{font-weight:700;font-size:14px}
  .cmp-tval.pos{color:var(--green)}
  .cmp-tval.neg{color:var(--red)}
  .cmp-tval.neutral{color:var(--text)}
  .cmp-win-badge{font-size:9px;font-weight:800;letter-spacing:0.5px;background:var(--green);color:#0a1f15;padding:2px 6px;border-radius:3px;font-family:'Geist',sans-serif}

  /* Winner summary */
  .cmp-verdict{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:20px;border-top:1px solid var(--borderf)}
  .cmp-verdict-card{border-radius:6px;padding:20px 20px 16px;display:flex;flex-direction:column;gap:6px}
  .cmp-verdict-card.winner-card{background:rgba(52,217,138,0.06);border:1.5px solid rgba(52,217,138,0.3)}
  .cmp-verdict-card.loser-card{background:rgba(255,255,255,0.02);border:1px solid var(--borderf)}
  .cmp-verdict-name{font-size:16px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px}
  .cmp-verdict-badge{font-size:10px;font-weight:800;letter-spacing:0.5px;padding:3px 10px;border-radius:3px}
  .cmp-verdict-badge.win{background:linear-gradient(135deg,var(--green),var(--blue));color:#fff}
  .cmp-verdict-badge.tie{background:var(--amber);color:#f1f5f9}
  .cmp-verdict-sub{font-size:13px;color:var(--sub);line-height:1.5}
  .cmp-verdict-wins{font-size:28px;font-weight:800;color:var(--green);letter-spacing:-1px;line-height:1}
  .cmp-verdict-wins-label{font-size:11px;color:var(--sub)}

  /* Grade pill */
  .grade-pill{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius: 6px;font-size:13px;font-weight:800}
  .grade-A{background:rgba(52,217,138,0.15);color:var(--green)}
  .grade-B{background:rgba(59,158,255,0.15);color:var(--blue)}
  .grade-C{background:rgba(240,160,48,0.15);color:var(--amber)}
  .grade-D{background:rgba(242,92,92,0.15);color:var(--red)}
  .grade-F{background:rgba(15,23,42,0.06);color:var(--dim)}

  @media(max-width:640px){
    .cmp-trow{grid-template-columns:140px 1fr 1fr}
    .cmp-hero{padding:36px 16px 24px}
    .cmp-verdict{grid-template-columns:1fr}
  }
`;

// ─── Input Field Helper ───────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div className="cmp-field">
      <div className="cmp-label">
        <span>{label}</span>
        {hint && <span className="cmp-hint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Flip Input Form ──────────────────────────────────────────────────────────
function FlipForm({ d, set, side }) {
  const upd = (k, v) => set(p => ({...p, [k]: v}));
  const p = num(d.purchasePrice);
  const arv = num(d.arv);
  return (
    <div className={`cmp-card ${side}`}>
      <div className="cmp-card-header">
        <div className="cmp-card-title">
          <div className="cmp-deal-dot" style={{background: side==="deal-a"?"var(--blue)":"var(--green)"}} />
          <input
            className="cmp-name-input"
            value={d.name}
            onChange={e => upd("name", e.target.value)}
            placeholder="Deal name…"
            style={{color: side==="deal-a"?"var(--blue)":"var(--green)"}}
          />
        </div>
      </div>
      <div className="cmp-card-body">
        <Field label="Property Address" hint="">
          <input className="cmp-input" value={d.address} onChange={e=>upd("address",e.target.value)} placeholder="123 Main St" />
        </Field>
        <div className="cmp-section-label">Acquisition</div>
        <div className="cmp-row2">
          <Field label="Purchase Price">
            <input className="cmp-input" type="number" value={d.purchasePrice} onChange={e=>upd("purchasePrice",e.target.value)} placeholder="350,000" />
          </Field>
          <Field label="Repair Costs">
            <input className="cmp-input" type="number" value={d.repairCosts} onChange={e=>upd("repairCosts",e.target.value)} placeholder="50,000" />
          </Field>
        </div>
        <Field label="After Repair Value (ARV)" hint={p>0?`${fmtPct(num(d.arv)/p-1)} vs purchase`:""}>
          <input className="cmp-input" type="number" value={d.arv} onChange={e=>upd("arv",e.target.value)} placeholder="480,000" />
        </Field>
        <div className="cmp-divider" />
        <div className="cmp-section-label">Costs &amp; Holding</div>
        <div className="cmp-row2">
          <Field label="Holding (months)">
            <input className="cmp-input" type="number" value={d.holdingMonths} onChange={e=>upd("holdingMonths",e.target.value)} placeholder="4" />
          </Field>
          <Field label="Cost/Month">
            <input className="cmp-input" type="number" value={d.holdingPerMonth} onChange={e=>upd("holdingPerMonth",e.target.value)} placeholder="2,000" />
          </Field>
        </div>
        <div className="cmp-row3">
          <Field label="Close Buy %">
            <input className="cmp-input" type="number" value={d.closingBuy} onChange={e=>upd("closingBuy",e.target.value)} placeholder="1.5" />
          </Field>
          <Field label="Close Sell %">
            <input className="cmp-input" type="number" value={d.closingSell} onChange={e=>upd("closingSell",e.target.value)} placeholder="1.5" />
          </Field>
          <Field label="Commission %">
            <input className="cmp-input" type="number" value={d.agentCommission} onChange={e=>upd("agentCommission",e.target.value)} placeholder="5" />
          </Field>
        </div>
        <Field label="Other Costs">
          <input className="cmp-input" type="number" value={d.otherCosts} onChange={e=>upd("otherCosts",e.target.value)} placeholder="0" />
        </Field>
      </div>
    </div>
  );
}

// ─── Multifamily Input Form ───────────────────────────────────────────────────
function MFForm({ d, set, side }) {
  const upd = (k, v) => set(p => ({...p, [k]: v}));
  const p = num(d.purchasePrice);
  const units = num(d.units);
  const gmr = num(d.grossMonthlyRent);
  return (
    <div className={`cmp-card ${side}`}>
      <div className="cmp-card-header">
        <div className="cmp-card-title">
          <div className="cmp-deal-dot" style={{background: side==="deal-a"?"var(--blue)":"var(--green)"}} />
          <input
            className="cmp-name-input"
            value={d.name}
            onChange={e => upd("name", e.target.value)}
            placeholder="Deal name…"
            style={{color: side==="deal-a"?"var(--blue)":"var(--green)"}}
          />
        </div>
      </div>
      <div className="cmp-card-body">
        <Field label="Property Address">
          <input className="cmp-input" value={d.address} onChange={e=>upd("address",e.target.value)} placeholder="123 Main St" />
        </Field>
        <div className="cmp-section-label">Property</div>
        <div className="cmp-row2">
          <Field label="Purchase Price">
            <input className="cmp-input" type="number" value={d.purchasePrice} onChange={e=>upd("purchasePrice",e.target.value)} placeholder="1,200,000" />
          </Field>
          <Field label="# of Units">
            <input className="cmp-input" type="number" value={d.units} onChange={e=>upd("units",e.target.value)} placeholder="8" />
          </Field>
        </div>
        <Field label="Gross Monthly Rent (all units)" hint={units>0&&gmr>0?`${fmt(gmr/units)}/unit/mo`:""}>
          <input className="cmp-input" type="number" value={d.grossMonthlyRent} onChange={e=>upd("grossMonthlyRent",e.target.value)} placeholder="9,600" />
        </Field>
        <div className="cmp-divider" />
        <div className="cmp-section-label">Income &amp; Expenses</div>
        <div className="cmp-row2">
          <Field label="Vacancy %" hint={gmr>0?`${fmt(gmr*num(d.vacancy)/100)}/mo`:""}>
            <input className="cmp-input" type="number" value={d.vacancy} onChange={e=>upd("vacancy",e.target.value)} placeholder="5" />
          </Field>
          <Field label="OpEx % of EGI" hint="35–45% typical">
            <input className="cmp-input" type="number" value={d.opexPct} onChange={e=>upd("opexPct",e.target.value)} placeholder="35" />
          </Field>
        </div>
        <div className="cmp-divider" />
        <div className="cmp-section-label">Financing</div>
        <div className="cmp-row2">
          <Field label="Down Payment %" hint={p>0?fmt(p*num(d.downPct)/100):""}>
            <input className="cmp-input" type="number" value={d.downPct} onChange={e=>upd("downPct",e.target.value)} placeholder="25" />
          </Field>
          <Field label="Closing Costs %" hint={p>0?fmt(p*num(d.closingCosts)/100):""}>
            <input className="cmp-input" type="number" value={d.closingCosts} onChange={e=>upd("closingCosts",e.target.value)} placeholder="1.5" />
          </Field>
        </div>
        <div className="cmp-row2">
          <Field label="Interest Rate %">
            <input className="cmp-input" type="number" value={d.rate} onChange={e=>upd("rate",e.target.value)} placeholder="5.5" />
          </Field>
          <Field label="Amortization (yr)">
            <input className="cmp-input" type="number" value={d.amort} onChange={e=>upd("amort",e.target.value)} placeholder="25" />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ─── Comparison Row ───────────────────────────────────────────────────────────
function CmpRow({ label, valA, valB, fmt: fmtFn, higher=true, bold=false, className="" }) {
  const w = win(valA, valB, higher);
  const isAWin = w === "A";
  const isBWin = w === "B";
  const fA = fmtFn ? fmtFn(valA) : valA;
  const fB = fmtFn ? fmtFn(valB) : valB;
  return (
    <div className={`cmp-trow ${className}`}>
      <div className={`cmp-tlabel ${bold?"bold":""}`}>{label}</div>
      <div className={`cmp-tval ${isAWin?"winner":isBWin?"loser":""} ${bold?"bold":""}`}>
        {fA}{isAWin && <span className="cmp-win-badge">BETTER</span>}
      </div>
      <div className={`cmp-tval ${isBWin?"winner":isAWin?"loser":""} ${bold?"bold":""}`}>
        {fB}{isBWin && <span className="cmp-win-badge">BETTER</span>}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHead({ label }) {
  return (
    <div className="cmp-trow section-head">
      <div className="cmp-tlabel section">{label}</div>
      <div />
      <div />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DealComparison() {
  const { user, signOut, getSubscription } = useAuth();
  const [mode, setMode]           = useState("mf");
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

  const [flipA, setFlipA] = useState({...FLIP_A});
  const [flipB, setFlipB] = useState({...FLIP_B});
  const [mfA, setMfA] = useState({...MF_A});
  const [mfB, setMfB] = useState({...MF_B});

  // Saved BRRRR deals from localStorage
  const [savedDeals, setSavedDeals] = useState([]);
  const [showSaved, setShowSaved] = useState(true);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("rde_brrrr_deals") || "[]");
      setSavedDeals(raw);
    } catch {}
  }, []);
  function deleteSaved(id) {
    const updated = savedDeals.filter(d => d.id !== id);
    setSavedDeals(updated);
    localStorage.setItem("rde_brrrr_deals", JSON.stringify(updated));
  }

  const resA = useMemo(() => mode==="flip" ? calcFlip(flipA) : calcMF(mfA), [mode, flipA, mfA]);
  const resB = useMemo(() => mode==="flip" ? calcFlip(flipB) : calcMF(mfB), [mode, flipB, mfB]);

  // Count wins for verdict
  const metrics = useMemo(() => {
    if (mode === "flip") {
      return [
        win(resA.netProfit, resB.netProfit, true),
        win(resA.roi,       resB.roi,       true),
        win(resA.annRoi,    resB.annRoi,    true),
        win(resA.margin,    resB.margin,    true),
        win(resA.totalIn,   resB.totalIn,   false), // less capital = better
      ];
    } else {
      return [
        win(resA.capRate, resB.capRate, true),
        win(resA.dscr,    resB.dscr,    true),
        win(resA.coc,     resB.coc,     true),
        win(resA.cfMo,    resB.cfMo,    true),
        win(resA.noi,     resB.noi,     true),
        win(resA.ppu,     resB.ppu,     false),
        win(resA.grm,     resB.grm,     false),
        win(resA.totalIn, resB.totalIn, false),
      ];
    }
  }, [mode, resA, resB]);

  const winsA = metrics.filter(m => m==="A").length;
  const winsB = metrics.filter(m => m==="B").length;
  const overallWinner = winsA > winsB ? "A" : winsB > winsA ? "B" : "tie";
  const nameA = mode==="flip" ? flipA.name||"Deal A" : mfA.name||"Deal A";
  const nameB = mode==="flip" ? flipB.name||"Deal B" : mfB.name||"Deal B";

  return (
    <div className="cmp-wrap">
      <style>{CSS}</style>

      {/* Nav */}
      <TopNav />

      {/* Hero */}
      <div className="cmp-hero">
        <div className="cmp-glow" />
        <div className="cmp-hero-tag">⚡ Deal Comparison</div>
        <h1>Two Deals, One Decision</h1>
        <p>Enter both properties side by side. Every metric is scored live — green wins, you choose.</p>
      </div>

      <div className="cmp-body">

        {/* Saved BRRRR Deals */}
        {savedDeals.length > 0 && (
          <div style={{background:"var(--card)",border:"1px solid rgba(167,130,255,0.2)",borderRadius:16,overflow:"hidden",marginBottom:24}}>
            <div style={{padding:"14px 20px",background:"var(--card2)",borderBottom:"1px solid var(--borderf)",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}} onClick={()=>setShowSaved(s=>!s)}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>💾</span>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:"var(--text)"}}>Saved Deals</div>
                  <div style={{fontSize:11,color:"var(--sub)",marginTop:1}}>{savedDeals.length} deal{savedDeals.length!==1?"s":""} saved</div>
                </div>
              </div>
              <span style={{color:"var(--sub)",fontSize:14}}>{showSaved?"▲":"▼"}</span>
            </div>
            {showSaved && (
              <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:10}}>
                {savedDeals.map(deal => {
                  const r = deal.results;
                  const savedDate = new Date(deal.savedAt).toLocaleDateString("en-CA",{month:"short",day:"numeric"});
                  const typeColor = deal.type==="brrrr" ? "rgba(167,130,255,0.2)" : deal.type==="flip" ? "rgba(59,158,255,0.2)" : "rgba(52,217,138,0.2)";
                  const typeText = deal.type==="brrrr" ? "BRRRR" : deal.type==="flip" ? "Flip" : "Multifamily";
                  const typeBg = deal.type==="brrrr" ? "rgba(167,130,255,0.1)" : deal.type==="flip" ? "rgba(59,158,255,0.1)" : "rgba(52,217,138,0.1)";
                  const typeColor2 = deal.type==="brrrr" ? "var(--purple)" : deal.type==="flip" ? "var(--blue)" : "var(--green)";
                  return (
                    <div key={deal.id} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${typeColor}`,borderRadius: 10,padding:"12px 16px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                      <div style={{flex:1,minWidth:160}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                          <span style={{background:typeBg,color:typeColor2,borderRadius:99,padding:"2px 8px",fontSize:10,fontWeight:800}}>{typeText}</span>
                          <span style={{fontSize:10.5,color:"var(--dim)"}}>saved {savedDate}</span>
                        </div>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{deal.name}</div>
                        {deal.address && deal.address !== deal.name && <div style={{fontSize:11,color:"var(--sub)",marginTop:1}}>{deal.address}</div>}
                        {deal.verdict && <div style={{fontSize:11,color:"var(--sub)",marginTop:2,fontStyle:"italic"}}>{deal.verdict}</div>}
                      </div>
                      {r && (
                        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                          {r.noi > 0 && <div style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:800,color:"var(--green)"}}>{fmt(r.noi)}</div><div style={{fontSize:10,color:"var(--dim)"}}>NOI/yr</div></div>}
                          {r.monthlyCF !== undefined && <div style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:800,color:r.monthlyCF>=0?"var(--green)":"var(--red)"}}>{fmt(r.monthlyCF)}/mo</div><div style={{fontSize:10,color:"var(--dim)"}}>Cash Flow</div></div>}
                          {r.dscr > 0 && <div style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:800,color:r.dscr>=1.25?"var(--green)":r.dscr>=1?"var(--amber)":"var(--red)"}}>{r.dscr.toFixed(2)}x</div><div style={{fontSize:10,color:"var(--dim)"}}>DSCR</div></div>}
                          {r.netProfit !== undefined && <div style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:800,color:r.netProfit>=0?"var(--green)":"var(--red)"}}>{fmt(r.netProfit)}</div><div style={{fontSize:10,color:"var(--dim)"}}>Net Profit</div></div>}
                          {r.coc !== undefined && r.coc < 999 && <div style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:800,color:"var(--blue)"}}>{(r.coc*100).toFixed(1)}%</div><div style={{fontSize:10,color:"var(--dim)"}}>CoC</div></div>}
                        </div>
                      )}
                      <a href={deal.type==="brrrr"?"/brrrr":deal.type==="flip"?"/app":"/commercial"}
                        style={{background:"var(--card2)",border:"1px solid var(--borderf)",borderRadius: 6,padding:"7px 13px",fontSize:12,fontWeight:600,color:"var(--sub)",textDecoration:"none",flexShrink:0}}>Open →</a>
                      <button onClick={()=>deleteSaved(deal.id)}
                        style={{background:"rgba(242,92,92,0.08)",border:"1px solid rgba(242,92,92,0.2)",borderRadius: 6,padding:"7px 10px",fontSize:12,color:"var(--red)",cursor:"pointer",flexShrink:0,fontFamily:"'Geist',sans-serif"}}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Mode Toggle */}
        <div className="cmp-mode-bar">
          <button
            className={`cmp-mode-btn ${mode==="flip"?"active":""}`}
            onClick={() => setMode("flip")}
          >🏚️ Fix &amp; Flip</button>
          <button
            className={`cmp-mode-btn ${mode==="mf"?"active":""}`}
            onClick={() => setMode("mf")}
          >🏢 Multifamily</button>
        </div>

        {/* Input columns */}
        <div className="cmp-cols">
          {mode==="flip"
            ? <><FlipForm d={flipA} set={setFlipA} side="deal-a" /><FlipForm d={flipB} set={setFlipB} side="deal-b" /></>
            : <><MFForm d={mfA} set={setMfA} side="deal-a" /><MFForm d={mfB} set={setMfB} side="deal-b" /></>
          }
        </div>

        {/* Results comparison — Pro gated */}
        {proChecked && !isPro ? (
          <div style={{background:"var(--card)",border:"1px solid rgba(59,158,255,0.2)",borderRadius:16,padding:"48px 36px",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:14}}>⚡</div>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(59,158,255,0.08)",border:"1px solid rgba(59,158,255,0.2)",borderRadius:99,padding:"4px 14px",fontSize:11,fontWeight:800,color:"var(--blue)",letterSpacing:1,textTransform:"uppercase",marginBottom:16}}>Pro Feature</div>
            <h3 style={{fontSize:20,fontWeight:800,color:"var(--text)",marginBottom:8}}>Deal Comparison Results</h3>
            <p style={{fontSize:13,color:"var(--sub)",lineHeight:1.6,marginBottom:24,maxWidth:360,margin:"0 auto 24px"}}>See every metric scored side-by-side with winner highlights. Enter your deals above, then upgrade to unlock results.</p>
            {!user
              ? <a href="/login" style={{background:"var(--blue)",color:"#fff",borderRadius:10,padding:"11px 28px",fontSize:14,fontWeight:700,textDecoration:"none",display:"inline-block"}}>Sign in to upgrade →</a>
              : <a href="/pricing" style={{background:"linear-gradient(135deg,var(--blue),var(--purple))",color:"#fff",borderRadius:10,padding:"11px 28px",fontSize:14,fontWeight:700,textDecoration:"none",display:"inline-block"}}>Upgrade to Pro — $29/mo →</a>
            }
          </div>
        ) : (
        <div className="cmp-results">
          <div className="cmp-results-hdr">
            <div className="cmp-results-title">📊 Metric Comparison</div>
            <div style={{display:"flex",gap:20,alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"rgba(59,158,255,0.8)"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"var(--blue)"}} />
                {nameA}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"rgba(52,217,138,0.8)"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"var(--green)"}} />
                {nameB}
              </div>
            </div>
          </div>

          <div className="cmp-table">
            {/* Column headers */}
            <div className="cmp-trow section-head">
              <div className="cmp-th">Metric</div>
              <div className="cmp-th a">{nameA}</div>
              <div className="cmp-th b">{nameB}</div>
            </div>

            {mode === "flip" ? (
              <>
                <SectionHead label="💰 Profitability" />
                <CmpRow label="Net Profit"         valA={resA.netProfit} valB={resB.netProfit} fmt={fmt} higher={true} bold />
                <CmpRow label="Profit Margin (% ARV)" valA={resA.margin} valB={resB.margin} fmt={fmtPct} higher={true} />
                <CmpRow label="ROI on Capital"     valA={resA.roi}       valB={resB.roi}       fmt={fmtPct} higher={true} />
                <CmpRow label="Annualized ROI"     valA={resA.annRoi}    valB={resB.annRoi}    fmt={fmtPct} higher={true} />
                <SectionHead label="🏗️ Capital" />
                <CmpRow label="Total Capital In"   valA={resA.totalIn}   valB={resB.totalIn}   fmt={fmt} higher={false} />
                <SectionHead label="🏆 Deal Grade" />
                <div className="cmp-trow">
                  <div className="cmp-tlabel bold">Grade</div>
                  <div className="cmp-tval">
                    <span className={`grade-pill grade-${resA.grade}`}>{resA.grade}</span>
                  </div>
                  <div className="cmp-tval">
                    <span className={`grade-pill grade-${resB.grade}`}>{resB.grade}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <SectionHead label="📈 Returns" />
                <CmpRow label="Cap Rate"           valA={resA.capRate} valB={resB.capRate} fmt={fmtPct} higher={true} bold />
                <CmpRow label="Cash-on-Cash Return" valA={resA.coc}    valB={resB.coc}    fmt={fmtPct} higher={true} bold />
                <CmpRow label="Monthly Cash Flow"  valA={resA.cfMo}   valB={resB.cfMo}   fmt={fmt}    higher={true} />
                <SectionHead label="🏦 Debt Service" />
                <CmpRow label="DSCR"               valA={resA.dscr}   valB={resB.dscr}   fmt={fmtX}   higher={true} bold />
                <CmpRow label="Monthly Mortgage"   valA={resA.mtgMo}  valB={resB.mtgMo}  fmt={fmt}    higher={false} />
                <SectionHead label="📋 Income" />
                <CmpRow label="Net Operating Income (NOI)" valA={resA.noi} valB={resB.noi} fmt={fmt} higher={true} />
                <SectionHead label="🏗️ Valuation" />
                <CmpRow label="Price Per Unit"     valA={resA.ppu}    valB={resB.ppu}    fmt={fmt}    higher={false} />
                <CmpRow label="Gross Rent Multiplier" valA={resA.grm} valB={resB.grm}    fmt={fmtX}   higher={false} />
                <SectionHead label="💼 Capital Required" />
                <CmpRow label="Total Cash In"      valA={resA.totalIn} valB={resB.totalIn} fmt={fmt}  higher={false} />
              </>
            )}
          </div>

          {/* Overall Verdict */}
          <div className="cmp-verdict">
            {[
              { name: nameA, wins: winsA, total: metrics.length, side: "A", res: resA },
              { name: nameB, wins: winsB, total: metrics.length, side: "B", res: resB },
            ].map(({ name, wins, total, side, res }) => {
              const isWinner = overallWinner === side;
              const isTie    = overallWinner === "tie";
              return (
                <div key={side} className={`cmp-verdict-card ${isWinner?"winner-card":"loser-card"}`}>
                  <div className="cmp-verdict-name">
                    <div style={{width:10,height:10,borderRadius:"50%",background:side==="A"?"var(--blue)":"var(--green)",flexShrink:0}} />
                    {name}
                    {isWinner && <span className="cmp-verdict-badge win">WINNER</span>}
                    {isTie    && <span className="cmp-verdict-badge tie">TIE</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"baseline",gap:6,marginTop:4}}>
                    <div className="cmp-verdict-wins">{wins}</div>
                    <div className="cmp-verdict-wins-label">of {total} metrics won</div>
                  </div>
                  <div className="cmp-verdict-sub">
                    {mode === "flip"
                      ? `Net profit: ${fmt(res.netProfit)} · Margin: ${fmtPct(res.margin)} · ROI: ${fmtPct(res.roi)}`
                      : `Cap rate: ${fmtPct(res.capRate)} · DSCR: ${fmtX(res.dscr)} · CoC: ${fmtPct(res.coc)}`
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}{/* end isPro results gate */}

      </div>
    </div>
  );
}
