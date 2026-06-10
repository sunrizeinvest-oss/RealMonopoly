import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import TopNav from "./components/TopNav";

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt    = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);
const fmtK   = n => { const a=Math.abs(n||0); if(a>=1e6) return `${n<0?"-":""}$${(Math.abs(n)/1e6).toFixed(2)}M`; if(a>=1e3) return `${n<0?"-":""}$${(Math.abs(n)/1e3).toFixed(0)}K`; return fmt(n); };
const fmtPct = n => (isNaN(n)||!isFinite(n))?"—":`${(n*100).toFixed(1)}%`;
const num    = v => parseFloat(v)||0;

const PROP_KEY  = "rde_networth_props_v1";
const CASH_KEY  = "rde_networth_cash_v1";
const SNAP_KEY  = "rde_networth_snaps_v1";

const PROP_TYPES = [
  {value:"rental",    label:"🏠 Rental Property"},
  {value:"primary",   label:"🏡 Primary Residence"},
  {value:"flip_hold", label:"🔨 Active Flip/Hold"},
  {value:"commercial",label:"🏢 Commercial/MF"},
  {value:"land",      label:"🌳 Land"},
  {value:"other",     label:"📦 Other"},
];

const BLANK_PROP = {
  id:null, address:"", city:"", type:"rental",
  currentValue:"", purchasePrice:"", purchaseDate:"",
  mortgageBalance:"", mortgageRate:"", mortgagePayment:"",
  monthlyRent:"", monthlyExpenses:"",
  notes:"",
};

const BLANK_CASH = {
  id:null, label:"", amount:"", type:"checking",
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text);font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased}

  /* Nav */
  .nw-nav{position:sticky;top:0;z-index:100;background:rgba(7,9,15,0.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between;gap:12px}
  .nw-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none}.nw-logo span{color:var(--blue)}
  .nw-nav-right{display:flex;align-items:center;gap:6px;flex-wrap:nowrap}
  .nw-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 10px;border-radius:7px;white-space:nowrap}.nw-nav-link:hover{color:var(--text)}
  .nw-nav-ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:7px;padding:7px 12px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif}

  /* Body */
  .nw-body{max-width:1060px;margin:0 auto;padding:40px 20px 100px}

  /* Hero */
  .nw-hero{text-align:center;padding:48px 24px 40px;position:relative}
  .nw-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(52,217,138,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(52,217,138,0.025) 1px,transparent 1px);background-size:48px 48px;pointer-events:none;border-radius:6px}
  .nw-glow{position:absolute;top:-20%;left:50%;transform:translateX(-50%);width:600px;height:300px;background:radial-gradient(ellipse,rgba(52,217,138,0.06) 0%,transparent 65%);pointer-events:none}
  .nw-hero-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(52,217,138,0.08);border:1px solid rgba(52,217,138,0.2);border-radius:3px;padding:4px 14px;font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px;position:relative;z-index:1}
  .nw-total-label{font-size:13px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;position:relative;z-index:1}
  .nw-total{font-size:clamp(48px,8vw,80px);font-weight:800;letter-spacing:-3px;line-height:1;margin-bottom:6px;position:relative;z-index:1}
  .nw-total-sub{font-size:14px;color:var(--sub);position:relative;z-index:1}
  .nw-snap-btn{margin-top:16px;background:rgba(52,217,138,0.08);border:1px solid rgba(52,217,138,0.2);border-radius: 10px;padding:8px 18px;font-size:13px;font-weight:700;color:var(--green);cursor:pointer;font-family:'Geist',sans-serif;position:relative;z-index:1;transition:all 0.15s}
  .nw-snap-btn:hover{background:rgba(52,217,138,0.15)}

  /* Breakdown row */
  .nw-breakdown{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px}
  @media(max-width:700px){.nw-breakdown{grid-template-columns:repeat(2,1fr)}}
  .nw-bd-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:18px 16px}
  .nw-bd-icon{font-size:22px;margin-bottom:8px}
  .nw-bd-val{font-size:20px;font-weight:800;letter-spacing:-0.5px;line-height:1;margin-bottom:4px}
  .nw-bd-lbl{font-size:10px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.5px}
  .nw-bd-sub{font-size:11px;color:var(--sub);margin-top:3px}

  /* Asset allocation bar */
  .nw-alloc{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:20px 24px;margin-bottom:28px}
  .nw-alloc-title{font-size:13px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px}
  .nw-alloc-bar{display:flex;height:12px;border-radius:3px;overflow:hidden;gap:2px;margin-bottom:12px}
  .nw-alloc-seg{height:100%;border-radius:2px;transition:flex 0.5s ease}
  .nw-alloc-legend{display:flex;flex-wrap:wrap;gap:12px}
  .nw-legend-item{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--sub);font-weight:600}
  .nw-legend-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0}

  /* Net worth chart (sparkline) */
  .nw-chart-wrap{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:20px 24px;margin-bottom:28px}
  .nw-chart-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px}
  .nw-chart-title{font-size:13px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:1px}
  .nw-chart{display:flex;align-items:flex-end;gap:8px;height:100px;padding-bottom:20px;position:relative}
  .nw-chart::after{content:'';position:absolute;bottom:20px;left:0;right:0;height:1px;background:var(--borderf)}
  .nw-chart-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0}
  .nw-chart-bar{width:100%;border-radius:4px 4px 0 0;background:linear-gradient(180deg,rgba(52,217,138,0.9),rgba(52,217,138,0.4));min-height:4px;transition:height 0.4s}
  .nw-chart-lbl{font-size:9px;color:var(--dim);font-weight:600;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%}
  .nw-chart-empty{display:flex;align-items:center;justify-content:center;height:100px;color:var(--dim);font-size:12px;font-style:italic}

  /* Section */
  .nw-section{margin-bottom:32px}
  .nw-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px}
  .nw-section-title{font-size:15px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px}
  .nw-add-btn{background:rgba(59,158,255,0.08);border:1px solid rgba(59,158,255,0.2);border-radius: 10px;padding:7px 16px;font-size:12px;font-weight:700;color:var(--blue);cursor:pointer;font-family:'Geist',sans-serif;display:flex;align-items:center;gap:5px;transition:all 0.15s}
  .nw-add-btn:hover{background:rgba(59,158,255,0.15)}

  /* Properties table */
  .nw-table-scroll{overflow-x:auto;border-radius:6px;border:1px solid var(--borderf)}
  .nw-table{width:100%;border-collapse:collapse;background:var(--card);min-width:680px}
  .nw-table th{font-size:10px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;padding:10px 14px;text-align:left;border-bottom:1px solid var(--borderf);background:var(--card2);white-space:nowrap}
  .nw-table td{padding:12px 14px;font-size:13px;color:var(--text);border-bottom:1px solid rgba(255,255,255,0.03);vertical-align:middle}
  .nw-table tr:last-child td{border-bottom:none}
  .nw-table tr:hover td{background:rgba(255,255,255,0.015)}
  .nw-equity-bar{height:5px;border-radius:3px;background:var(--borderf);overflow:hidden;margin-top:4px}
  .nw-equity-fill{height:100%;border-radius:3px;background:var(--green);transition:width 0.4s}
  .nw-type-pill{font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;white-space:nowrap}
  .nw-del-btn{background:transparent;border:none;color:var(--dim);cursor:pointer;font-size:12px;padding:4px 7px;border-radius:6px;font-family:'Geist',sans-serif;transition:all 0.15s}
  .nw-del-btn:hover{color:var(--red);background:rgba(242,92,92,0.08)}
  .nw-edit-btn{background:transparent;border:none;color:var(--dim);cursor:pointer;font-size:12px;padding:4px 7px;border-radius:6px;font-family:'Geist',sans-serif;transition:all 0.15s}
  .nw-edit-btn:hover{color:var(--blue);background:rgba(59,158,255,0.08)}

  /* Cash accounts */
  .nw-cash-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
  .nw-cash-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px}
  .nw-cash-left{}
  .nw-cash-label{font-size:12px;font-weight:700;color:var(--text);margin-bottom:3px}
  .nw-cash-type{font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:0.5px;font-weight:600}
  .nw-cash-val{font-size:18px;font-weight:800;color:var(--green);letter-spacing:-0.5px}
  .nw-cash-actions{display:flex;gap:2px;flex-shrink:0}

  /* Integration cards (pipeline / portfolio) */
  .nw-integration-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:28px}
  @media(max-width:600px){.nw-integration-row{grid-template-columns:1fr}}
  .nw-int-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:18px 20px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all 0.15s;text-decoration:none}
  .nw-int-card:hover{border-color:rgba(59,158,255,0.3);transform:translateY(-2px)}
  .nw-int-icon{font-size:32px;flex-shrink:0}
  .nw-int-label{font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px}
  .nw-int-val{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
  .nw-int-sub{font-size:11px;color:var(--sub);margin-top:2px}

  /* Modal */
  .nw-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(5px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
  .nw-modal{background:#0d1119;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:28px;width:100%;max-width:600px;max-height:90vh;overflow-y:auto}
  .nw-modal-title{font-size:19px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin-bottom:20px}
  .nw-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media(max-width:500px){.nw-form-grid{grid-template-columns:1fr}}
  .nw-field{display:flex;flex-direction:column;gap:5px}
  .nw-field.full{grid-column:1/-1}
  .nw-lbl{font-size:10px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px}
  .nw-inp{background:#0a0e18;border:1px solid rgba(255,255,255,0.08);border-radius: 6px;padding:9px 11px;font-size:13px;color:var(--text);font-family:'Geist',sans-serif;outline:none;width:100%;transition:border-color 0.15s}
  .nw-inp:focus{border-color:rgba(59,158,255,0.4)}
  .nw-sel{background:#0a0e18;border:1px solid rgba(255,255,255,0.08);border-radius: 6px;padding:9px 11px;font-size:13px;color:var(--text);font-family:'Geist',sans-serif;outline:none;width:100%;cursor:pointer}
  .nw-live-preview{background:rgba(52,217,138,0.05);border:1px solid rgba(52,217,138,0.15);border-radius:6px;padding:12px 16px;margin:12px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .nw-prev-val{font-size:16px;font-weight:800;color:var(--text);margin-bottom:3px}
  .nw-prev-lbl{font-size:10px;color:var(--dim);font-weight:600;text-transform:uppercase}
  .nw-modal-acts{display:flex;gap:8px;margin-top:20px;justify-content:flex-end}
  .nw-save-btn{background:var(--blue);color:#fff;border:none;border-radius: 10px;padding:10px 22px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Geist',sans-serif}
  .nw-save-btn:hover{background:#5aaeff}
  .nw-cancel-btn{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius: 10px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif}

  /* Empty */
  .nw-empty{background:rgba(255,255,255,0.02);border:1px dashed var(--borderf);border-radius:6px;padding:32px;text-align:center;color:var(--dim);font-size:13px}

  @media(max-width:640px){
    .nw-body{padding:24px 14px 80px}
    .nw-total{font-size:44px}
  }
`;

// ─── Property type colours ────────────────────────────────────────────────────
const PROP_COLORS = {
  rental:"var(--green)", primary:"var(--blue)", flip_hold:"var(--red)",
  commercial:"var(--purple)", land:"var(--amber)", other:"var(--sub)",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function NetWorth() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [snapshots, setSnapshots] = useState([]);

  const [showPropModal, setShowPropModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [editPropId, setEditPropId] = useState(null);
  const [editCashId, setEditCashId] = useState(null);
  const [propForm, setPropForm] = useState({ ...BLANK_PROP });
  const [cashForm, setCashForm] = useState({ ...BLANK_CASH });

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    try { const r = localStorage.getItem(PROP_KEY);  if(r) setProperties(JSON.parse(r)); } catch{}
    try { const r = localStorage.getItem(CASH_KEY);  if(r) setCashAccounts(JSON.parse(r)); } catch{}
    try { const r = localStorage.getItem(SNAP_KEY);  if(r) setSnapshots(JSON.parse(r)); } catch{}
  }, []);

  function saveProps(p) { setProperties(p); localStorage.setItem(PROP_KEY, JSON.stringify(p)); }
  function saveCash(c) { setCashAccounts(c); localStorage.setItem(CASH_KEY, JSON.stringify(c)); }
  function saveSnaps(s) { setSnapshots(s); localStorage.setItem(SNAP_KEY, JSON.stringify(s)); }

  // ── Pull pipeline + portfolio data ────────────────────────────────────────
  const pipelineDeals = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("rde_pipeline_v1")||"[]"); } catch{ return []; }
  }, []);

  const portfolioDeals = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("rde_portfolio_v1")||"[]"); } catch{ return []; }
  }, []);

  const pipelineProjected = useMemo(() => {
    const active = pipelineDeals.filter(d => !["closed","dead"].includes(d.stage));
    return active.reduce((s,d) => s + num(d.projectedProfit), 0);
  }, [pipelineDeals]);

  const portfolioProfit = useMemo(() => {
    return portfolioDeals.reduce((s,d) => {
      const pp = num(d.salePrice) - num(d.purchasePrice) - num(d.repairCosts);
      return s + (isNaN(pp)?0:pp);
    }, 0);
  }, [portfolioDeals]);

  // ── Per-property calculations ────────────────────────────────────────────
  const propsWithCalc = useMemo(() => properties.map(p => {
    const value    = num(p.currentValue);
    const mortgage = num(p.mortgageBalance);
    const equity   = value - mortgage;
    const equityPct= value > 0 ? equity/value : 0;
    const rent     = num(p.monthlyRent);
    const expenses = num(p.monthlyExpenses) + num(p.mortgagePayment);
    const cashFlow = rent - expenses;
    const capRate  = value > 0 && rent > 0 ? ((rent*12 - num(p.monthlyExpenses)*12) / value) : null;
    const gain     = num(p.purchasePrice) > 0 ? (value - num(p.purchasePrice)) : null;
    return { ...p, value, mortgage, equity, equityPct, cashFlow, capRate, gain };
  }), [properties]);

  // ── Aggregate stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalPropValue = propsWithCalc.reduce((s,p) => s+p.value, 0);
    const totalMortgage  = propsWithCalc.reduce((s,p) => s+p.mortgage, 0);
    const totalEquity    = propsWithCalc.reduce((s,p) => s+p.equity, 0);
    const totalCash      = cashAccounts.reduce((s,a) => s+num(a.amount), 0);
    const totalCashFlow  = propsWithCalc.filter(p=>p.monthlyRent>0).reduce((s,p) => s+p.cashFlow, 0);
    const realEstateNW   = totalEquity;
    const totalNW        = realEstateNW + totalCash + portfolioProfit;
    const totalAssets    = totalPropValue + totalCash + portfolioProfit + pipelineProjected;
    return { totalPropValue, totalMortgage, totalEquity, totalCash, totalCashFlow, realEstateNW, totalNW, totalAssets, pipelineProjected };
  }, [propsWithCalc, cashAccounts, portfolioProfit, pipelineProjected]);

  // ── Snapshot ──────────────────────────────────────────────────────────────
  function addSnapshot() {
    const snap = { date: new Date().toISOString().slice(0,10), netWorth: stats.totalNW };
    const updated = [...snapshots.filter(s => s.date !== snap.date), snap].sort((a,b)=>a.date.localeCompare(b.date)).slice(-24);
    saveSnaps(updated);
  }

  // ── Property modal ───────────────────────────────────────────────────────
  function openAddProp() { setEditPropId(null); setPropForm({...BLANK_PROP,id:Date.now()}); setShowPropModal(true); }
  function openEditProp(p) { setEditPropId(p.id); setPropForm({...p}); setShowPropModal(true); }
  function submitProp() {
    if(!propForm.address.trim()) return;
    const updated = editPropId ? properties.map(p=>p.id===editPropId?{...propForm}:p) : [{...propForm,id:Date.now()},...properties];
    saveProps(updated);
    setShowPropModal(false);
  }
  function deleteProp(id) { if(!window.confirm("Remove this property?")) return; saveProps(properties.filter(p=>p.id!==id)); }

  // ── Cash modal ────────────────────────────────────────────────────────────
  function openAddCash() { setEditCashId(null); setCashForm({...BLANK_CASH,id:Date.now()}); setShowCashModal(true); }
  function openEditCash(a) { setEditCashId(a.id); setCashForm({...a}); setShowCashModal(true); }
  function submitCash() {
    if(!cashForm.label.trim()) return;
    const updated = editCashId ? cashAccounts.map(a=>a.id===editCashId?{...cashForm}:a) : [{...cashForm,id:Date.now()},...cashAccounts];
    saveCash(updated);
    setShowCashModal(false);
  }
  function deleteCash(id) { saveCash(cashAccounts.filter(a=>a.id!==id)); }

  const fp = f => e => setPropForm(p=>({...p,[f]:e.target.value}));
  const fc = f => e => setCashForm(p=>({...p,[f]:e.target.value}));

  // ── Live preview in modal ────────────────────────────────────────────────
  const liveEquity   = num(propForm.currentValue) - num(propForm.mortgageBalance);
  const liveCashFlow = num(propForm.monthlyRent) - num(propForm.monthlyExpenses) - num(propForm.mortgagePayment);
  const liveCapRate  = num(propForm.currentValue) > 0 ? ((num(propForm.monthlyRent)*12 - num(propForm.monthlyExpenses)*12) / num(propForm.currentValue)) : null;

  // ── Chart max ────────────────────────────────────────────────────────────
  const chartMax = Math.max(...snapshots.map(s=>s.netWorth), 1);

  // ── Net worth colour ─────────────────────────────────────────────────────
  const nwColor = stats.totalNW >= 0 ? "var(--green)" : "var(--red)";

  // ── Alloc segments ────────────────────────────────────────────────────────
  const totalForAlloc = stats.totalEquity + stats.totalCash + portfolioProfit + pipelineProjected || 1;
  const allocSegs = [
    { label:"Real Estate Equity", val:stats.totalEquity,      color:"var(--green)" },
    { label:"Cash & Liquid",      val:stats.totalCash,        color:"var(--blue)" },
    { label:"Closed Profits",     val:portfolioProfit,        color:"var(--purple)" },
    { label:"Pipeline (Proj.)",   val:pipelineProjected,      color:"var(--amber)" },
  ].filter(s=>s.val>0);

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      <style>{CSS}</style>

      {/* Nav */}
      <TopNav />

      {/* Hero — big number */}
      <div className="nw-hero">
        <div className="nw-glow" />
        <div className="nw-hero-tag">💎 Live Balance Sheet</div>
        <div className="nw-total-label">Total Real Estate Net Worth</div>
        <div className="nw-total" style={{color:nwColor}}>{fmtK(stats.totalNW)}</div>
        <div className="nw-total-sub">
          {fmtK(stats.totalEquity)} equity &nbsp;+&nbsp; {fmtK(stats.totalCash)} cash
          {portfolioProfit > 0 && <> &nbsp;+&nbsp; {fmtK(portfolioProfit)} closed profits</>}
          {stats.pipelineProjected > 0 && <> &nbsp;+&nbsp; {fmtK(stats.pipelineProjected)} projected pipeline</>}
        </div>
        <button className="nw-snap-btn" onClick={addSnapshot}>📸 Save Today's Snapshot</button>
      </div>

      <div className="nw-body">

        {/* Breakdown cards */}
        <div className="nw-breakdown">
          <div className="nw-bd-card" style={{borderColor:"rgba(52,217,138,0.2)"}}>
            <div className="nw-bd-icon">🏠</div>
            <div className="nw-bd-val" style={{color:"var(--green)"}}>{fmtK(stats.totalEquity)}</div>
            <div className="nw-bd-lbl">Real Estate Equity</div>
            <div className="nw-bd-sub">{propsWithCalc.length} propert{propsWithCalc.length===1?"y":"ies"} · {fmtK(stats.totalPropValue)} total value</div>
          </div>
          <div className="nw-bd-card" style={{borderColor:"rgba(59,158,255,0.2)"}}>
            <div className="nw-bd-icon">💵</div>
            <div className="nw-bd-val" style={{color:"var(--blue)"}}>{fmtK(stats.totalCash)}</div>
            <div className="nw-bd-lbl">Cash &amp; Liquid</div>
            <div className="nw-bd-sub">{cashAccounts.length} account{cashAccounts.length!==1?"s":""}</div>
          </div>
          <div className="nw-bd-card" style={{borderColor:"rgba(167,130,255,0.2)"}}>
            <div className="nw-bd-icon">📊</div>
            <div className="nw-bd-val" style={{color:"var(--purple)"}}>{fmt(stats.totalCashFlow)}<span style={{fontSize:12,fontWeight:500,color:"var(--sub)"}}>/mo</span></div>
            <div className="nw-bd-lbl">Monthly Cash Flow</div>
            <div className="nw-bd-sub">{fmt(stats.totalCashFlow*12)}/yr passive income</div>
          </div>
          <div className="nw-bd-card" style={{borderColor:"rgba(242,92,92,0.2)"}}>
            <div className="nw-bd-icon">🏦</div>
            <div className="nw-bd-val" style={{color:"var(--red)"}}>{fmtK(stats.totalMortgage)}</div>
            <div className="nw-bd-lbl">Total Debt</div>
            <div className="nw-bd-sub">
              LTV {stats.totalPropValue > 0 ? fmtPct(stats.totalMortgage/stats.totalPropValue) : "—"}
            </div>
          </div>
        </div>

        {/* Asset allocation bar */}
        {allocSegs.length > 0 && (
          <div className="nw-alloc">
            <div className="nw-alloc-title">Asset Allocation</div>
            <div className="nw-alloc-bar">
              {allocSegs.map(s => (
                <div key={s.label} className="nw-alloc-seg"
                  style={{flex:s.val/totalForAlloc, background:s.color, opacity:0.85}}
                  title={`${s.label}: ${fmtK(s.val)}`}
                />
              ))}
            </div>
            <div className="nw-alloc-legend">
              {allocSegs.map(s => (
                <div key={s.label} className="nw-legend-item">
                  <div className="nw-legend-dot" style={{background:s.color}} />
                  <span>{s.label}: <strong style={{color:"var(--text)"}}>{fmtK(s.val)}</strong> ({fmtPct(s.val/totalForAlloc)})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Net worth chart */}
        <div className="nw-chart-wrap">
          <div className="nw-chart-head">
            <div className="nw-chart-title">📈 Net Worth Over Time</div>
            <button className="nw-snap-btn" style={{fontSize:11,padding:"5px 12px"}} onClick={addSnapshot}>
              + Save snapshot
            </button>
          </div>
          {snapshots.length < 2 ? (
            <div className="nw-chart-empty">
              Click "Save Today's Snapshot" monthly to track your net worth growth over time
            </div>
          ) : (
            <div className="nw-chart">
              {snapshots.map(s => {
                const h = (s.netWorth/chartMax)*100;
                return (
                  <div key={s.date} className="nw-chart-bar-wrap">
                    <div className="nw-chart-bar"
                      style={{height:`${Math.max(h,3)}%`}}
                      title={`${s.date}: ${fmtK(s.netWorth)}`}
                    />
                    <div className="nw-chart-lbl">{s.date.slice(2,7).replace("-","/")}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pipeline + Portfolio integration cards */}
        <div className="nw-integration-row">
          <a href="/pipeline" className="nw-int-card" style={{borderColor:"rgba(59,158,255,0.2)"}}>
            <span className="nw-int-icon">🗂️</span>
            <div>
              <div className="nw-int-label">Active Pipeline</div>
              <div className="nw-int-val" style={{color:"var(--blue)"}}>{fmtK(stats.pipelineProjected)}</div>
              <div className="nw-int-sub">{pipelineDeals.filter(d=>!["closed","dead"].includes(d.stage)).length} active deals · projected profit</div>
            </div>
          </a>
          <a href="/portfolio" className="nw-int-card" style={{borderColor:"rgba(167,130,255,0.2)"}}>
            <span className="nw-int-icon">🏆</span>
            <div>
              <div className="nw-int-label">Closed Deal Profits</div>
              <div className="nw-int-val" style={{color:"var(--purple)"}}>{fmtK(portfolioProfit)}</div>
              <div className="nw-int-sub">{portfolioDeals.length} closed deals · realized gains</div>
            </div>
          </a>
        </div>

        {/* Properties */}
        <div className="nw-section">
          <div className="nw-section-head">
            <div className="nw-section-title">
              🏠 Properties Owned
              {propsWithCalc.length > 0 && (
                <span style={{fontSize:11,fontWeight:600,color:"var(--sub)",background:"rgba(255,255,255,0.05)",border:"1px solid var(--borderf)",borderRadius:99,padding:"2px 8px"}}>
                  {propsWithCalc.length}
                </span>
              )}
            </div>
            <button className="nw-add-btn" onClick={openAddProp}>+ Add Property</button>
          </div>

          {propsWithCalc.length === 0 ? (
            <div className="nw-empty">Add your properties — each one with current value, mortgage balance, rent and expenses.</div>
          ) : (
            <div className="nw-table-scroll">
              <table className="nw-table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Type</th>
                    <th>Current Value</th>
                    <th>Mortgage</th>
                    <th>Equity</th>
                    <th>Cash Flow/mo</th>
                    <th>Cap Rate</th>
                    <th>Appreciation</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {propsWithCalc.map(p => {
                    const tc = PROP_COLORS[p.type]||"var(--sub)";
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{fontWeight:700,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={p.address}>{p.address||"—"}</div>
                          {p.city && <div style={{fontSize:11,color:"var(--dim)",marginTop:2}}>{p.city}</div>}
                        </td>
                        <td>
                          <span className="nw-type-pill" style={{background:tc+"18",color:tc}}>
                            {PROP_TYPES.find(t=>t.value===p.type)?.label || p.type}
                          </span>
                        </td>
                        <td style={{fontWeight:700}}>{p.value ? fmt(p.value) : "—"}</td>
                        <td style={{color:"var(--red)"}}>{p.mortgage ? fmt(p.mortgage) : "—"}</td>
                        <td>
                          {p.value ? (
                            <>
                              <div style={{fontWeight:800,color:"var(--green)"}}>{fmt(p.equity)}</div>
                              <div className="nw-equity-bar">
                                <div className="nw-equity-fill" style={{width:`${Math.max(0,Math.min(100,p.equityPct*100))}%`}} />
                              </div>
                              <div style={{fontSize:10,color:"var(--dim)",marginTop:2}}>{fmtPct(p.equityPct)} LTV-free</div>
                            </>
                          ) : "—"}
                        </td>
                        <td>
                          {p.monthlyRent > 0 ? (
                            <span style={{fontWeight:700,color:p.cashFlow>=0?"var(--green)":"var(--red)"}}>
                              {fmt(p.cashFlow)}/mo
                            </span>
                          ) : <span style={{color:"var(--dim)"}}>—</span>}
                        </td>
                        <td style={{color:"var(--sub)"}}>
                          {p.capRate !== null ? fmtPct(p.capRate) : "—"}
                        </td>
                        <td>
                          {p.gain !== null ? (
                            <span style={{fontWeight:700,color:p.gain>=0?"var(--green)":"var(--red)"}}>
                              {p.gain >= 0 ? "+" : ""}{fmt(p.gain)}
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          <button className="nw-edit-btn" onClick={() => openEditProp(p)}>✏️</button>
                          <button className="nw-del-btn" onClick={() => deleteProp(p.id)}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cash accounts */}
        <div className="nw-section">
          <div className="nw-section-head">
            <div className="nw-section-title">💵 Cash &amp; Liquid Accounts</div>
            <button className="nw-add-btn" onClick={openAddCash}>+ Add Account</button>
          </div>

          {cashAccounts.length === 0 ? (
            <div className="nw-empty">Add your bank accounts, investment accounts, and cash reserves.</div>
          ) : (
            <div className="nw-cash-grid">
              {cashAccounts.map(a => (
                <div key={a.id} className="nw-cash-card">
                  <div className="nw-cash-left">
                    <div className="nw-cash-label">{a.label}</div>
                    <div className="nw-cash-type">{a.type}</div>
                    <div className="nw-cash-val">{fmt(num(a.amount))}</div>
                  </div>
                  <div className="nw-cash-actions">
                    <button className="nw-edit-btn" onClick={() => openEditCash(a)}>✏️</button>
                    <button className="nw-del-btn" onClick={() => deleteCash(a.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{marginTop:24,padding:"14px 18px",background:"rgba(59,158,255,0.04)",border:"1px solid rgba(59,158,255,0.1)",borderRadius: 10}}>
          <div style={{fontSize:12,color:"var(--sub)",lineHeight:1.6}}>
            💡 <strong style={{color:"var(--text)"}}>Data stored locally in your browser.</strong> Click "Save Today's Snapshot" each month to build your net worth timeline. Upgrade to Pro for cloud sync across devices.
          </div>
        </div>

      </div>

      {/* ── Property Modal ─────────────────────────────────────────────────── */}
      {showPropModal && (
        <div className="nw-overlay" onClick={e=>e.target===e.currentTarget&&setShowPropModal(false)}>
          <div className="nw-modal">
            <div className="nw-modal-title">{editPropId?"Edit Property":"Add Property"}</div>
            <div className="nw-form-grid">
              <div className="nw-field full">
                <div className="nw-lbl">Street Address *</div>
                <input className="nw-inp" placeholder="123 Main St" value={propForm.address} onChange={fp("address")} />
              </div>
              <div className="nw-field">
                <div className="nw-lbl">City / Market</div>
                <input className="nw-inp" placeholder="Phoenix, AZ" value={propForm.city} onChange={fp("city")} />
              </div>
              <div className="nw-field">
                <div className="nw-lbl">Property Type</div>
                <select className="nw-sel" value={propForm.type} onChange={fp("type")}>
                  {PROP_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="nw-field">
                <div className="nw-lbl">Current Market Value ($)</div>
                <input className="nw-inp" type="number" placeholder="350000" value={propForm.currentValue} onChange={fp("currentValue")} />
              </div>
              <div className="nw-field">
                <div className="nw-lbl">Mortgage Balance ($)</div>
                <input className="nw-inp" type="number" placeholder="220000" value={propForm.mortgageBalance} onChange={fp("mortgageBalance")} />
              </div>
              <div className="nw-field">
                <div className="nw-lbl">Monthly Mortgage Payment ($)</div>
                <input className="nw-inp" type="number" placeholder="1450" value={propForm.mortgagePayment} onChange={fp("mortgagePayment")} />
              </div>
              <div className="nw-field">
                <div className="nw-lbl">Mortgage Rate (%)</div>
                <input className="nw-inp" type="number" placeholder="6.5" value={propForm.mortgageRate} onChange={fp("mortgageRate")} />
              </div>
              <div className="nw-field">
                <div className="nw-lbl">Monthly Rent ($)</div>
                <input className="nw-inp" type="number" placeholder="2400" value={propForm.monthlyRent} onChange={fp("monthlyRent")} />
              </div>
              <div className="nw-field">
                <div className="nw-lbl">Monthly Expenses (excl. mortgage)</div>
                <input className="nw-inp" type="number" placeholder="450" value={propForm.monthlyExpenses} onChange={fp("monthlyExpenses")} />
              </div>
              <div className="nw-field">
                <div className="nw-lbl">Purchase Price ($)</div>
                <input className="nw-inp" type="number" placeholder="280000" value={propForm.purchasePrice} onChange={fp("purchasePrice")} />
              </div>
              <div className="nw-field">
                <div className="nw-lbl">Purchase Date</div>
                <input className="nw-inp" type="date" value={propForm.purchaseDate} onChange={fp("purchaseDate")} />
              </div>
              <div className="nw-field full">
                <div className="nw-lbl">Notes</div>
                <input className="nw-inp" placeholder="Tenant info, refinance plans, notes…" value={propForm.notes} onChange={fp("notes")} />
              </div>
            </div>

            {/* Live preview */}
            {num(propForm.currentValue) > 0 && (
              <div className="nw-live-preview">
                <div>
                  <div className="nw-prev-val" style={{color:liveEquity>=0?"var(--green)":"var(--red)"}}>{fmt(liveEquity)}</div>
                  <div className="nw-prev-lbl">Equity</div>
                </div>
                <div>
                  <div className="nw-prev-val" style={{color:liveCashFlow>=0?"var(--green)":"var(--red)"}}>{fmt(liveCashFlow)}/mo</div>
                  <div className="nw-prev-lbl">Cash Flow</div>
                </div>
                <div>
                  <div className="nw-prev-val" style={{color:"var(--blue)"}}>{liveCapRate!==null?fmtPct(liveCapRate):"—"}</div>
                  <div className="nw-prev-lbl">Cap Rate</div>
                </div>
              </div>
            )}

            <div className="nw-modal-acts">
              <button className="nw-cancel-btn" onClick={()=>setShowPropModal(false)}>Cancel</button>
              <button className="nw-save-btn" onClick={submitProp} disabled={!propForm.address.trim()}>
                {editPropId?"Save Changes":"Add Property"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cash Modal ──────────────────────────────────────────────────────── */}
      {showCashModal && (
        <div className="nw-overlay" onClick={e=>e.target===e.currentTarget&&setShowCashModal(false)}>
          <div className="nw-modal" style={{maxWidth:400}}>
            <div className="nw-modal-title">{editCashId?"Edit Account":"Add Cash Account"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="nw-field">
                <div className="nw-lbl">Account Label *</div>
                <input className="nw-inp" placeholder="TD Chequing, TFSA, Investment Acct…" value={cashForm.label} onChange={fc("label")} />
              </div>
              <div className="nw-field">
                <div className="nw-lbl">Account Type</div>
                <select className="nw-sel" value={cashForm.type} onChange={fc("type")}>
                  {["Checking","Savings","TFSA","RRSP","Investment","Cash Reserve","Line of Credit","Other"].map(t=><option key={t} value={t.toLowerCase()}>{t}</option>)}
                </select>
              </div>
              <div className="nw-field">
                <div className="nw-lbl">Current Balance ($)</div>
                <input className="nw-inp" type="number" placeholder="25000" value={cashForm.amount} onChange={fc("amount")} />
              </div>
            </div>
            <div className="nw-modal-acts">
              <button className="nw-cancel-btn" onClick={()=>setShowCashModal(false)}>Cancel</button>
              <button className="nw-save-btn" onClick={submitCash} disabled={!cashForm.label.trim()}>
                {editCashId?"Save Changes":"Add Account"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
