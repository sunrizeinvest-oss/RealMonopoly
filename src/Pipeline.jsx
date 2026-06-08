import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import AddressAutocomplete from "./AddressAutocomplete";
import TopNav from "./components/TopNav";

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt    = n => new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(n||0);
const fmtK   = n => { const a=Math.abs(n||0); if(a>=1e6) return `$${(n/1e6).toFixed(1)}M`; if(a>=1e3) return `$${(n/1e3).toFixed(0)}K`; return fmt(n); };
const num    = v => parseFloat(v)||0;
const fmtPct = n => (isNaN(n)||!isFinite(n)) ? "—" : `${(n*100).toFixed(1)}%`;

const STORAGE_KEY = "rde_pipeline_v1";

// ─── Stages ───────────────────────────────────────────────────────────────────
const STAGES = [
  { id:"lead",      label:"🔍 Lead",           color:"var(--sub)", desc:"New potential deal" },
  { id:"analyzing", label:"📊 Analyzing",      color:"var(--blue)", desc:"Running the numbers" },
  { id:"offer",     label:"📝 Offer Sent",     color:"var(--purple)", desc:"Waiting on response" },
  { id:"contract",  label:"🤝 Under Contract", color:"var(--amber)", desc:"Accepted, in due diligence" },
  { id:"rehab",     label:"🔨 Active Rehab",   color:"var(--red)", desc:"Bought it, renovating" },
  { id:"listed",    label:"🏷️ Listed",         color:"var(--green)", desc:"On market, waiting for buyer" },
  { id:"closed",    label:"✅ Closed",          color:"var(--green)", desc:"Sold — move to portfolio" },
  { id:"dead",      label:"❌ Dead",            color:"var(--dim)", desc:"Passed or fell through" },
];

const TYPE_META = {
  flip:        { emoji:"🏚️", label:"Flip",        color:"var(--blue)" },
  brrrr:       { emoji:"🔄", label:"BRRRR",        color:"var(--purple)" },
  multifamily: { emoji:"🏢", label:"Multifamily",  color:"var(--green)" },
  rental:      { emoji:"🏠", label:"Rental",       color:"var(--amber)" },
  wholesale:   { emoji:"📋", label:"Wholesale",    color:"var(--red)" },
};

const SOURCE_OPTIONS = ["MLS","Wholesaler","Direct Mail","Cold Call","Driving for Dollars","Referral","Auction","Off-Market","Other"];

const GRADE_COLOR = { A:"var(--green)", B:"var(--blue)", C:"var(--amber)", D:"var(--amber)", F:"var(--red)" };

const BLANK = {
  id:null, address:"", city:"", type:"flip", stage:"lead", source:"",
  askingPrice:"", projectedProfit:"", projectedROI:"", grade:"",
  notes:"", addedDate:new Date().toISOString().slice(0,10), stageDate:new Date().toISOString().slice(0,10),
  arv:"", purchasePrice:"", repairCosts:"",
};

// ─── Days since date ──────────────────────────────────────────────────────────
function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}

  /* Nav */
  .pl-nav{position:sticky;top:0;z-index:200;background:rgba(7,9,15,0.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 20px;height:56px;display:flex;align-items:center;justify-content:space-between;gap:12px}
  .pl-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none;flex-shrink:0}.pl-logo span{color:var(--blue)}
  .pl-nav-right{display:flex;align-items:center;gap:6px;flex-wrap:nowrap}
  .pl-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 10px;border-radius:7px;white-space:nowrap}.pl-nav-link:hover{color:var(--text)}
  .pl-nav-btn{background:var(--blue);color:#fff;border:none;border-radius: 6px;padding:7px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;flex-shrink:0}
  .pl-nav-ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:7px;padding:7px 12px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}

  /* Stats bar */
  .pl-stats{display:flex;gap:0;border-bottom:1px solid var(--borderf);background:rgba(13,17,25,0.8);padding:0 20px;overflow-x:auto}
  .pl-stat{padding:12px 20px;border-right:1px solid var(--borderf);flex-shrink:0;text-align:center;min-width:100px}
  .pl-stat-val{font-family:'Fira Code',ui-monospace,monospace;font-size:18px;font-weight:800;color:var(--text);letter-spacing:-0.5px;line-height:1}
  .pl-stat-lbl{font-family:'Fira Code',ui-monospace,monospace;font-size:10px;font-weight:600;color:var(--dim);text-transform:uppercase;letter-spacing:0.5px;margin-top:3px}

  /* Board */
  .pl-board-wrap{overflow-x:auto;padding:20px;min-height:calc(100vh - 120px)}
  .pl-board{display:flex;gap:14px;align-items:flex-start;min-width:max-content;padding-bottom:40px}

  /* Column */
  .pl-col{width:240px;flex-shrink:0;display:flex;flex-direction:column;gap:0}
  .pl-col-head{padding:10px 14px 10px;border-radius:6px 12px 0 0;display:flex;align-items:center;justify-content:space-between}
  .pl-col-label{font-size:12px;font-weight:800;letter-spacing:0.2px}
  .pl-col-count{font-size:10px;font-weight:700;background:rgba(255,255,255,0.1);border-radius:3px;padding:2px 8px;color:rgba(255,255,255,0.7)}
  .pl-col-body{background:rgba(255,255,255,0.02);border:1px solid var(--borderf);border-top:none;border-radius:0 0 12px 12px;padding:8px;min-height:120px;transition:background 0.15s}
  .pl-col-body.drag-over{background:rgba(59,158,255,0.06);border-color:rgba(59,158,255,0.3)}
  .pl-col-add{width:100%;background:transparent;border:1px dashed var(--borderf);border-radius: 6px;padding:8px;font-size:12px;font-weight:600;color:var(--dim);cursor:pointer;font-family:'DM Sans',sans-serif;margin-top:6px;transition:all 0.15s;text-align:center}
  .pl-col-add:hover{border-color:rgba(59,158,255,0.4);color:var(--blue);background:rgba(59,158,255,0.04)}

  /* Cards */
  .pl-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:12px 13px;margin-bottom:8px;cursor:grab;transition:all 0.15s;position:relative;user-select:none}
  .pl-card:hover{border-color:rgba(59,158,255,0.3);box-shadow:0 4px 16px rgba(0,0,0,0.3);transform:translateY(-1px)}
  .pl-card.dragging{opacity:0.4;transform:scale(0.98)}
  .pl-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:8px}
  .pl-card-addr{font-size:13px;font-weight:700;color:var(--text);line-height:1.3;flex:1;word-break:break-word}
  .pl-card-city{font-size:10.5px;color:var(--sub);margin-top:2px}
  .pl-grade{font-size:13px;font-weight:900;flex-shrink:0;width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:'Fira Code',monospace}
  .pl-card-meta{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px}
  .pl-type-pill{font-size:9px;font-weight:700;padding:2px 8px;border-radius:3px;text-transform:uppercase;letter-spacing:0.3px}
  .pl-source-pill{font-size:9px;font-weight:600;padding:2px 7px;border-radius:3px;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid var(--borderf)}
  .pl-card-numbers{display:flex;justify-content:space-between;align-items:center}
  .pl-profit{font-size:14px;font-weight:800;letter-spacing:-0.3px}
  .pl-days{font-size:10px;color:var(--dim);font-weight:600}
  .pl-days.stale{color:var(--amber)}
  .pl-days.urgent{color:var(--red)}
  .pl-card-actions{display:flex;gap:4px;margin-top:8px;border-top:1px solid rgba(255,255,255,0.04);padding-top:8px}
  .pl-ca-btn{flex:1;background:rgba(59,158,255,0.07);border:1px solid rgba(59,158,255,0.15);border-radius:6px;padding:5px 4px;font-size:10px;font-weight:700;color:var(--blue);cursor:pointer;font-family:'DM Sans',sans-serif;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:3px;transition:all 0.12s}
  .pl-ca-btn:hover{background:rgba(59,158,255,0.15)}
  .pl-ca-del{background:transparent;border:1px solid rgba(255,255,255,0.05);border-radius:6px;padding:5px 7px;font-size:10px;font-weight:700;color:var(--dim);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.12s}
  .pl-ca-del:hover{color:var(--red);background:rgba(242,92,92,0.08);border-color:rgba(242,92,92,0.2)}

  /* Modal */
  .pl-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(5px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
  .pl-modal{background:#0d1119;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:28px;width:100%;max-width:580px;max-height:90vh;overflow-y:auto}
  .pl-modal-title{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin-bottom:20px}
  .pl-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media(max-width:500px){.pl-form-grid{grid-template-columns:1fr}}
  .pl-field{display:flex;flex-direction:column;gap:5px}
  .pl-field.full{grid-column:1/-1}
  .pl-lbl{font-size:10px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px}
  .pl-inp{background:#0a0e18;border:1px solid rgba(255,255,255,0.08);border-radius: 6px;padding:9px 11px;font-size:13px;color:var(--text);font-family:'DM Sans',sans-serif;outline:none;width:100%;transition:border-color 0.15s}
  .pl-inp:focus{border-color:rgba(59,158,255,0.4)}
  .pl-sel{background:#0a0e18;border:1px solid rgba(255,255,255,0.08);border-radius: 6px;padding:9px 11px;font-size:13px;color:var(--text);font-family:'DM Sans',sans-serif;outline:none;width:100%;cursor:pointer}
  .pl-modal-acts{display:flex;gap:8px;margin-top:20px;justify-content:flex-end;flex-wrap:wrap}
  .pl-save-btn{background:var(--blue);color:#fff;border:none;border-radius: 10px;padding:10px 22px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif}
  .pl-save-btn:hover{background:#5aaeff}
  .pl-cancel-btn{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius: 10px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
  .pl-analyze-btn{background:rgba(52,217,138,0.1);color:var(--green);border:1px solid rgba(52,217,138,0.25);border-radius: 10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;margin-right:auto}
  .pl-analyze-btn:hover{background:rgba(52,217,138,0.18)}

  /* Empty col */
  .pl-empty-col{padding:20px 8px;text-align:center;color:var(--dim);font-size:11px;font-weight:600}

  @media(max-width:640px){
    .pl-stats{padding:0 12px}
    .pl-board-wrap{padding:12px}
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function Pipeline() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [deals,      setDeals]     = useState([]);
  const [showModal,  setShowModal] = useState(false);
  const [form,       setForm]      = useState({ ...BLANK });
  const [editId,     setEditId]    = useState(null);
  const [dragId,     setDragId]    = useState(null);
  const [dragOver,   setDragOver]  = useState(null); // stage id being hovered

  // ── Persist ────────────────────────────────────────────────────────────────
  useEffect(() => {
    try { const r = localStorage.getItem(STORAGE_KEY); if (r) setDeals(JSON.parse(r)); } catch {}
  }, []);

  function save(updated) {
    setDeals(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  // ── Modal helpers ──────────────────────────────────────────────────────────
  function openAdd(stageId = "lead") {
    setEditId(null);
    setForm({ ...BLANK, id: Date.now(), stage: stageId });
    setShowModal(true);
  }

  function openEdit(deal) {
    setEditId(deal.id);
    setForm({ ...deal });
    setShowModal(true);
  }

  function submitForm() {
    if (!form.address.trim()) return;
    const updated = editId
      ? deals.map(d => d.id === editId ? { ...form } : d)
      : [{ ...form, id: Date.now() }, ...deals];
    save(updated);
    setShowModal(false);
  }

  function deleteDeal(id) {
    if (!window.confirm("Remove this deal from the pipeline?")) return;
    save(deals.filter(d => d.id !== id));
  }

  function moveStage(dealId, newStage) {
    save(deals.map(d => d.id === dealId
      ? { ...d, stage: newStage, stageDate: new Date().toISOString().slice(0,10) }
      : d));
  }

  // ── Drag and drop ──────────────────────────────────────────────────────────
  function onDragStart(e, dealId) {
    setDragId(dealId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragEnd() {
    setDragId(null);
    setDragOver(null);
  }

  function onDragOver(e, stageId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(stageId);
  }

  function onDrop(e, stageId) {
    e.preventDefault();
    if (dragId !== null) moveStage(dragId, stageId);
    setDragId(null);
    setDragOver(null);
  }

  // ── Prefill analyzer ──────────────────────────────────────────────────────
  function analyzeInCalculator(deal, strategy = null) {
    const strat = strategy || deal.type || "flip";
    const route = strat === "brrrr" ? "/brrrr" : strat === "multifamily" ? "/commercial" : "/app";
    const prefill = {
      strategy: strat,
      timestamp: Date.now(),
      address: deal.address || "",
      searchQuery: deal.address || "",
      estimatedValue: num(deal.arv) || null,
      purchasePrice: num(deal.purchasePrice) || num(deal.askingPrice) || null,
      repairCosts: num(deal.repairCosts) || null,
    };
    localStorage.setItem("rde_prefill", JSON.stringify(prefill));
    navigate(route);
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = deals.filter(d => !["closed","dead"].includes(d.stage));
    const totalProjected = active.reduce((s,d) => s + num(d.projectedProfit), 0);
    const withProfit = active.filter(d => num(d.projectedProfit) > 0);
    const avgProfit = withProfit.length ? totalProjected / withProfit.length : 0;
    const closedDeals = deals.filter(d => d.stage === "closed").length;
    const convRate = deals.length > 0 ? closedDeals / deals.filter(d => d.stage !== "dead").length : 0;
    return { active: active.length, total: deals.length, totalProjected, avgProfit, closedDeals, convRate };
  }, [deals]);

  const f = field => e => setForm(p => ({ ...p, [field]: e.target.value }));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)" }}>
      <style>{CSS}</style>

      {/* Nav */}
      <TopNav />

      {/* Stats bar */}
      <div className="pl-stats">
        <div className="pl-stat">
          <div className="pl-stat-val" style={{color:"var(--blue)"}}>{stats.active}</div>
          <div className="pl-stat-lbl">Active Deals</div>
        </div>
        <div className="pl-stat">
          <div className="pl-stat-val" style={{color:"var(--green)"}}>{fmtK(stats.totalProjected)}</div>
          <div className="pl-stat-lbl">Projected Profit</div>
        </div>
        <div className="pl-stat">
          <div className="pl-stat-val">{fmtK(stats.avgProfit)}</div>
          <div className="pl-stat-lbl">Avg Deal Profit</div>
        </div>
        <div className="pl-stat">
          <div className="pl-stat-val" style={{color:"var(--green)"}}>{stats.closedDeals}</div>
          <div className="pl-stat-lbl">Closed This Pipeline</div>
        </div>
        <div className="pl-stat">
          <div className="pl-stat-val">{stats.total}</div>
          <div className="pl-stat-lbl">All Time Deals</div>
        </div>
      </div>

      {/* Board */}
      <div className="pl-board-wrap">
        <div className="pl-board">
          {STAGES.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage.id);
            return (
              <div key={stage.id} className="pl-col">
                {/* Column header */}
                <div className="pl-col-head" style={{ background: stage.color + "18", borderTop: `3px solid ${stage.color}` }}>
                  <span className="pl-col-label" style={{ color: stage.color }}>{stage.label}</span>
                  <span className="pl-col-count">{stageDeals.length}</span>
                </div>

                {/* Drop zone */}
                <div
                  className={`pl-col-body${dragOver === stage.id ? " drag-over" : ""}`}
                  onDragOver={e => onDragOver(e, stage.id)}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => onDrop(e, stage.id)}
                >
                  {stageDeals.length === 0 && (
                    <div className="pl-empty-col">Drop deals here</div>
                  )}

                  {stageDeals.map(deal => {
                    const tm = TYPE_META[deal.type] || TYPE_META.flip;
                    const days = daysSince(deal.stageDate);
                    const daysClass = days == null ? "" : days > 30 ? "urgent" : days > 14 ? "stale" : "";
                    const profit = num(deal.projectedProfit);
                    const isGoodDeal = profit > 0;

                    return (
                      <div
                        key={deal.id}
                        className={`pl-card${dragId === deal.id ? " dragging" : ""}`}
                        draggable
                        onDragStart={e => onDragStart(e, deal.id)}
                        onDragEnd={onDragEnd}
                      >
                        {/* Top row: address + grade */}
                        <div className="pl-card-top">
                          <div>
                            <div className="pl-card-addr">{deal.address || "Untitled Deal"}</div>
                            {deal.city && <div className="pl-card-city">{deal.city}</div>}
                          </div>
                          {deal.grade && (
                            <div className="pl-grade" style={{ background: (GRADE_COLOR[deal.grade] || "var(--sub)") + "22", color: GRADE_COLOR[deal.grade] || "var(--sub)" }}>
                              {deal.grade}
                            </div>
                          )}
                        </div>

                        {/* Pills */}
                        <div className="pl-card-meta">
                          <span className="pl-type-pill" style={{ background: tm.color + "18", color: tm.color }}>
                            {tm.emoji} {tm.label}
                          </span>
                          {deal.source && (
                            <span className="pl-source-pill">{deal.source}</span>
                          )}
                        </div>

                        {/* Numbers row */}
                        <div className="pl-card-numbers">
                          <div>
                            {profit !== 0 && (
                              <div className="pl-profit" style={{ color: isGoodDeal ? "var(--green)" : "var(--red)" }}>
                                {fmtK(profit)}
                              </div>
                            )}
                            {deal.askingPrice && !deal.projectedProfit && (
                              <div style={{ fontSize:12, color:"var(--sub)", fontWeight:600 }}>Ask: {fmtK(num(deal.askingPrice))}</div>
                            )}
                            {deal.arv && (
                              <div style={{ fontSize:10, color:"var(--dim)" }}>ARV {fmtK(num(deal.arv))}</div>
                            )}
                          </div>
                          {days != null && (
                            <div className={`pl-days ${daysClass}`}>
                              {days === 0 ? "Today" : `${days}d`}
                            </div>
                          )}
                        </div>

                        {deal.notes && (
                          <div style={{ fontSize:10, color:"var(--dim)", marginTop:6, lineHeight:1.4, borderTop:"1px solid rgba(255,255,255,0.04)", paddingTop:6 }}>
                            {deal.notes.length > 80 ? deal.notes.slice(0,80) + "…" : deal.notes}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="pl-card-actions">
                          <button className="pl-ca-btn" onClick={() => analyzeInCalculator(deal)}>
                            📊 Analyze
                          </button>
                          <button className="pl-ca-btn" style={{ background:"rgba(255,255,255,0.04)", borderColor:"var(--borderf)", color:"var(--sub)" }} onClick={() => openEdit(deal)}>
                            ✏️ Edit
                          </button>
                          <button className="pl-ca-del" onClick={() => deleteDeal(deal.id)}>✕</button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add button at bottom of each column */}
                  <button className="pl-col-add" onClick={() => openAdd(stage.id)}>+ Add here</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="pl-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="pl-modal">
            <div className="pl-modal-title">{editId ? "Edit Deal" : "Add Deal to Pipeline"}</div>

            <div className="pl-form-grid">

              <div className="pl-field full">
                <div className="pl-lbl">Street Address *</div>
                <AddressAutocomplete
                  className="pl-inp"
                  placeholder="123 Main St, City, Province / State"
                  value={form.address}
                  onChange={v => setForm(p => ({ ...p, address: v }))}
                  onSelect={(addr, meta) => setForm(p => ({
                    ...p,
                    address: addr.split(",")[0]?.trim() || addr,
                    city: [meta.city, meta.state].filter(Boolean).join(", ") || p.city,
                  }))}
                />
              </div>

              <div className="pl-field">
                <div className="pl-lbl">City / Market</div>
                <input className="pl-inp" placeholder="Phoenix, AZ" value={form.city} onChange={f("city")} />
              </div>

              <div className="pl-field">
                <div className="pl-lbl">Stage</div>
                <select className="pl-sel" value={form.stage} onChange={f("stage")}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>

              <div className="pl-field">
                <div className="pl-lbl">Deal Type</div>
                <select className="pl-sel" value={form.type} onChange={f("type")}>
                  {Object.entries(TYPE_META).map(([v,m]) => <option key={v} value={v}>{m.emoji} {m.label}</option>)}
                </select>
              </div>

              <div className="pl-field">
                <div className="pl-lbl">Lead Source</div>
                <select className="pl-sel" value={form.source} onChange={f("source")}>
                  <option value="">Select source…</option>
                  {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="pl-field">
                <div className="pl-lbl">Asking Price ($)</div>
                <input className="pl-inp" type="number" placeholder="250000" value={form.askingPrice} onChange={f("askingPrice")} />
              </div>

              <div className="pl-field">
                <div className="pl-lbl">Your Purchase Price ($)</div>
                <input className="pl-inp" type="number" placeholder="180000" value={form.purchasePrice} onChange={f("purchasePrice")} />
              </div>

              <div className="pl-field">
                <div className="pl-lbl">ARV ($)</div>
                <input className="pl-inp" type="number" placeholder="320000" value={form.arv} onChange={f("arv")} />
              </div>

              <div className="pl-field">
                <div className="pl-lbl">Estimated Repairs ($)</div>
                <input className="pl-inp" type="number" placeholder="55000" value={form.repairCosts} onChange={f("repairCosts")} />
              </div>

              <div className="pl-field">
                <div className="pl-lbl">Projected Profit ($)</div>
                <input className="pl-inp" type="number" placeholder="Auto from analyzer" value={form.projectedProfit} onChange={f("projectedProfit")} />
              </div>

              <div className="pl-field">
                <div className="pl-lbl">Deal Grade</div>
                <select className="pl-sel" value={form.grade} onChange={f("grade")}>
                  <option value="">No grade yet</option>
                  {["A","B","C","D","F"].map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </div>

              <div className="pl-field">
                <div className="pl-lbl">Date Added</div>
                <input className="pl-inp" type="date" value={form.addedDate} onChange={f("addedDate")} />
              </div>

              <div className="pl-field full">
                <div className="pl-lbl">Notes</div>
                <input className="pl-inp" placeholder="Seller motivation, condition notes, contractor comments…" value={form.notes} onChange={f("notes")} />
              </div>

            </div>

            <div className="pl-modal-acts">
              {/* Analyze button pre-fills the right calculator */}
              {form.address && (
                <button className="pl-analyze-btn" onClick={() => { submitForm(); setTimeout(() => analyzeInCalculator(form), 100); }}>
                  📊 Save &amp; Analyze →
                </button>
              )}
              <button className="pl-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="pl-save-btn" onClick={submitForm} disabled={!form.address.trim()}>
                {editId ? "Save Changes" : "Add to Pipeline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
