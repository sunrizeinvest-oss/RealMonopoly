import { useState, useMemo, useEffect } from "react";
import { dealLimit, TIER_LABEL, TIER_COLOR } from "./lib/tiers";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import TopNav from "./components/TopNav";

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt  = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
const fmtK = n => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
};
const fmtPct = n => (isNaN(n) || !isFinite(n)) ? "—" : `${(n * 100).toFixed(1)}%`;
const num    = v => parseFloat(v) || 0;

const STORAGE_KEY = "rde_portfolio_v1";

const TYPE_META = {
  flip:         { emoji: "🏚️", label: "Fix & Flip",   color: "var(--blue)", bg: "rgba(59,158,255,0.1)" },
  brrrr:        { emoji: "🔄", label: "BRRRR",         color: "var(--purple)", bg: "rgba(167,130,255,0.1)" },
  multifamily:  { emoji: "🏢", label: "Multifamily",   color: "var(--green)", bg: "rgba(52,217,138,0.1)" },
  rental:       { emoji: "🏠", label: "Rental",        color: "var(--amber)", bg: "rgba(240,160,48,0.1)" },
  wholesale:    { emoji: "📋", label: "Wholesale",     color: "var(--red)", bg: "rgba(242,92,92,0.1)" },
};

const BLANK_DEAL = {
  id: null, address: "", city: "", type: "flip",
  closeDate: new Date().toISOString().slice(0, 10),
  purchasePrice: "", salePrice: "", repairCosts: "",
  holdMonths: "", myCash: "", notes: "",
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght;500;600;700;800&family=Geist+Mono:wght;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text);font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased}

  /* Nav */
  .pf-nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .pf-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none}.pf-logo span{color:var(--blue)}
  .pf-nav-right{display:flex;align-items:center;gap:8px}
  .pf-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 11px;border-radius:7px}.pf-nav-link:hover{color:var(--text)}
  .pf-nav-btn{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Geist',sans-serif;display:flex;align-items:center;gap:6px}
  .pf-nav-ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:7px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif}.pf-nav-ghost:hover{color:var(--text)}

  /* Body */
  .pf-body{max-width:1000px;margin:0 auto;padding:40px 20px 100px}

  /* Hero */
  .pf-hero{margin-bottom:36px;position:relative}
  .pf-hero-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(52,217,138,0.08);border:1px solid rgba(52,217,138,0.2);border-radius:3px;padding:4px 14px;font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px}
  .pf-hero h1{font-size:clamp(26px,4vw,40px);font-weight:800;color:var(--text);letter-spacing:-1.5px;line-height:1.1;margin-bottom:8px}
  .pf-hero h1 span{color:var(--green)}
  .pf-hero p{font-size:14px;color:var(--sub);line-height:1.6;max-width:500px}

  /* Scoreboard */
  .pf-scoreboard{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:32px}
  @media(max-width:800px){.pf-scoreboard{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:480px){.pf-scoreboard{grid-template-columns:repeat(2,1fr)}}
  .pf-score-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:18px 16px;text-align:center;transition:border-color 0.15s}
  .pf-score-card.highlight{border-color:rgba(52,217,138,0.25);background:linear-gradient(135deg,rgba(52,217,138,0.04),var(--card))}
  .pf-score-icon{font-size:20px;margin-bottom:8px}
  .pf-score-val{font-family:'Geist Mono',ui-monospace,monospace;font-size:22px;font-weight:800;letter-spacing:-0.5px;line-height:1;margin-bottom:5px}
  .pf-score-lbl{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.5px}

  /* Section header */
  .pf-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px}
  .pf-section-title{font-size:15px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px}
  .pf-add-btn{background:rgba(59,158,255,0.1);border:1px solid rgba(59,158,255,0.25);border-radius: 10px;padding:8px 16px;font-size:13px;font-weight:700;color:var(--blue);cursor:pointer;font-family:'Geist',sans-serif;transition:all 0.15s;display:flex;align-items:center;gap:6px}
  .pf-add-btn:hover{background:rgba(59,158,255,0.18)}

  /* Timeline chart */
  .pf-chart-wrap{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:20px 24px;margin-bottom:28px}
  .pf-chart-title{font-size:13px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:18px}
  .pf-chart{display:flex;align-items:flex-end;gap:6px;height:120px;padding-bottom:24px;position:relative}
  .pf-chart::after{content:'';position:absolute;bottom:24px;left:0;right:0;height:1px;background:var(--borderf)}
  .pf-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}
  .pf-bar{width:100%;border-radius:5px 5px 0 0;transition:height 0.4s ease;min-height:4px;cursor:default;position:relative}
  .pf-bar:hover::after{content:attr(data-tip);position:absolute;bottom:calc(100%+6px);left:50%;transform:translateX(-50%);background:#1a2035;color:var(--text);font-size:11px;font-weight:600;white-space:nowrap;padding:4px 8px;border-radius:6px;pointer-events:none;z-index:10}
  .pf-bar-lbl{font-size:9px;color:var(--dim);font-weight:600;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
  .pf-chart-empty{display:flex;align-items:center;justify-content:center;height:120px;color:var(--dim);font-size:13px}

  /* Deal table */
  .pf-table-wrap{border-radius:6px;border:1px solid var(--borderf);overflow:hidden;margin-bottom:32px}
  .pf-table{width:100%;border-collapse:collapse;background:var(--card);min-width:700px}
  .pf-table th{font-size:10px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;padding:11px 16px;text-align:left;border-bottom:1px solid var(--borderf);background:var(--card2);white-space:nowrap}
  .pf-table td{padding:13px 16px;font-size:13px;color:var(--text);border-bottom:1px solid rgba(15,23,42,0.03);vertical-align:middle}
  .pf-table tr:last-child td{border-bottom:none}
  .pf-table tr:hover td{background:rgba(15,23,42,0.015)}
  .pf-table-scroll{overflow-x:auto;border-radius:6px;border:1px solid var(--borderf)}

  .pf-type-pill{font-size:10px;font-weight:700;padding:3px 9px;border-radius:3px;text-transform:uppercase;letter-spacing:0.3px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
  .pf-profit-pos{color:var(--green);font-weight:800}
  .pf-profit-neg{color:var(--red);font-weight:800}
  .pf-addr-cell{font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pf-action-btn{background:transparent;border:none;color:var(--dim);cursor:pointer;font-size:12px;padding:5px 8px;border-radius:6px;font-family:'Geist',sans-serif;transition:all 0.15s}
  .pf-action-btn:hover{color:var(--blue);background:rgba(59,158,255,0.08)}
  .pf-del-btn{background:transparent;border:none;color:var(--dim);cursor:pointer;font-size:12px;padding:5px 8px;border-radius:6px;font-family:'Geist',sans-serif;transition:all 0.15s}
  .pf-del-btn:hover{color:var(--red);background:rgba(242,92,92,0.08)}

  /* Type breakdown */
  .pf-breakdown{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:32px}
  .pf-breakdown-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:16px 18px;display:flex;align-items:center;gap:14px}
  .pf-bd-icon{font-size:28px;flex-shrink:0}
  .pf-bd-val{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
  .pf-bd-lbl{font-size:11px;color:var(--sub);font-weight:600}

  /* Modal overlay */
  .pf-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
  .pf-modal{background:#f8fafc;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:32px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto}
  .pf-modal-title{font-size:20px;font-weight:800;color:var(--text);letter-spacing:-0.5px;margin-bottom:6px}
  .pf-modal-sub{font-size:13px;color:var(--sub);margin-bottom:24px}
  .pf-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media(max-width:480px){.pf-modal-grid{grid-template-columns:1fr}}
  .pf-field{display:flex;flex-direction:column;gap:6px}
  .pf-field.full{grid-column:1/-1}
  .pf-label{font-size:11px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px}
  .pf-input{background:#f1f5f9;border:1px solid rgba(15,23,42,0.08);border-radius: 10px;padding:10px 12px;font-size:13px;color:var(--text);font-family:'Geist',sans-serif;outline:none;width:100%;transition:border-color 0.15s}
  .pf-input:focus{border-color:rgba(59,158,255,0.4)}
  .pf-select{background:#f1f5f9;border:1px solid rgba(15,23,42,0.08);border-radius: 10px;padding:10px 12px;font-size:13px;color:var(--text);font-family:'Geist',sans-serif;outline:none;width:100%;cursor:pointer}
  .pf-modal-calc{background:rgba(52,217,138,0.05);border:1px solid rgba(52,217,138,0.15);border-radius:6px;padding:14px 16px;margin:16px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .pf-calc-item{text-align:center}
  .pf-calc-val{font-size:16px;font-weight:800;color:var(--text);margin-bottom:3px}
  .pf-calc-lbl{font-size:10px;color:var(--dim);font-weight:600;text-transform:uppercase}
  .pf-modal-actions{display:flex;gap:10px;margin-top:24px;justify-content:flex-end}
  .pf-save-btn{background:var(--blue);color:#fff;border:none;border-radius:6px;padding:11px 24px;font-size:14px;font-weight:700;cursor:pointer;font-family:'Geist',sans-serif;transition:all 0.15s}
  .pf-save-btn:hover{background:#5aaeff}
  .pf-cancel-btn{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:6px;padding:11px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif}
  .pf-cancel-btn:hover{color:var(--text)}

  /* Best deal banner */
  .pf-best{background:linear-gradient(135deg,rgba(240,160,48,0.06),rgba(52,217,138,0.04));border:1px solid rgba(240,160,48,0.2);border-radius:6px;padding:18px 22px;margin-bottom:28px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
  .pf-best-icon{font-size:32px;flex-shrink:0}
  .pf-best-label{font-size:11px;font-weight:700;color:var(--amber);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
  .pf-best-val{font-size:22px;font-weight:800;color:var(--text);letter-spacing:-0.5px}
  .pf-best-sub{font-size:12px;color:var(--sub);margin-top:2px}

  /* Empty */
  .pf-empty{background:var(--card);border:2px dashed var(--borderf);border-radius:6px;padding:80px 24px;text-align:center;margin-bottom:32px}
  .pf-empty-icon{font-size:48px;margin-bottom:16px}
  .pf-empty-title{font-size:20px;font-weight:800;color:var(--sub);margin-bottom:8px}
  .pf-empty-sub{font-size:14px;color:var(--dim);max-width:380px;margin:0 auto 28px;line-height:1.7}

  @media(max-width:640px){
    .pf-body{padding:24px 14px 80px}
    .pf-hero h1{font-size:26px}
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcDeal(d) {
  const purchase = num(d.purchasePrice);
  const sale     = num(d.salePrice);
  const repair   = num(d.repairCosts);
  const cash     = num(d.myCash);
  const months   = num(d.holdMonths);
  const netProfit = sale - purchase - repair;
  const totalCost = purchase + repair;
  const roi       = totalCost > 0 ? netProfit / totalCost : 0;
  const coc       = cash > 0 && months > 0 ? (netProfit / cash) * (12 / months) : null;
  return { netProfit, roi, coc };
}

function groupByMonth(deals) {
  const map = {};
  deals.forEach(d => {
    const key = d.closeDate ? d.closeDate.slice(0, 7) : "unknown";
    if (!map[key]) map[key] = 0;
    map[key] += calcDeal(d).netProfit;
  });
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Portfolio() {
  const { user, signOut, userTier } = useAuth();
  const navigate = useNavigate();

  const [deals,      setDeals]      = useState([]);
  const [showModal,  setShowModal]  = useState(false);
  const [editDeal,   setEditDeal]   = useState(null); // null = new, object = editing
  const [form,       setForm]       = useState(BLANK_DEAL);
  const [sortBy,     setSortBy]     = useState("date"); // date | profit | roi

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDeals(JSON.parse(raw));
    } catch {}
  }, []);

  function save(updated) {
    setDeals(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function openAdd() {
    setEditDeal(null);
    setForm({ ...BLANK_DEAL, id: Date.now() });
    setShowModal(true);
  }

  function openEdit(d) {
    setEditDeal(d.id);
    setForm({ ...d });
    setShowModal(true);
  }

  function submitForm() {
    if (!form.address.trim()) return;
    let updated;
    if (editDeal) {
      updated = deals.map(d => d.id === editDeal ? { ...form } : d);
    } else {
      updated = [{ ...form, id: Date.now() }, ...deals];
    }
    save(updated);
    setShowModal(false);
  }

  function deleteDeal(id) {
    if (!window.confirm("Remove this deal from your portfolio?")) return;
    save(deals.filter(d => d.id !== id));
  }

  // ── Calculated stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!deals.length) return null;
    const calcs = deals.map(d => ({ ...d, ...calcDeal(d) }));
    const totalProfit  = calcs.reduce((s, d) => s + d.netProfit, 0);
    const winners      = calcs.filter(d => d.netProfit > 0);
    const winRate      = calcs.length > 0 ? winners.length / calcs.length : 0;
    const avgROI       = calcs.reduce((s, d) => s + d.roi, 0) / calcs.length;
    const avgHold      = calcs.filter(d => num(d.holdMonths) > 0).reduce((s, d) => s + num(d.holdMonths), 0) / (calcs.filter(d => num(d.holdMonths) > 0).length || 1);
    const bestDeal     = calcs.reduce((b, d) => d.netProfit > (b?.netProfit || -Infinity) ? d : b, null);
    const totalVolume  = calcs.reduce((s, d) => s + num(d.salePrice), 0);
    return { totalProfit, winners: winners.length, total: calcs.length, winRate, avgROI, avgHold, bestDeal, totalVolume, calcs };
  }, [deals]);

  // ── Sorted deals ──────────────────────────────────────────────────────────
  const sortedDeals = useMemo(() => {
    const withCalcs = deals.map(d => ({ ...d, ...calcDeal(d) }));
    if (sortBy === "profit") return [...withCalcs].sort((a, b) => b.netProfit - a.netProfit);
    if (sortBy === "roi")    return [...withCalcs].sort((a, b) => b.roi - a.roi);
    return [...withCalcs].sort((a, b) => (b.closeDate || "").localeCompare(a.closeDate || ""));
  }, [deals, sortBy]);

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => groupByMonth(deals), [deals]);
  const chartMax  = Math.max(...chartData.map(([, v]) => Math.abs(v)), 1);

  // ── Type counts ────────────────────────────────────────────────────────────
  const typeCounts = useMemo(() => {
    const map = {};
    deals.forEach(d => { map[d.type] = (map[d.type] || 0) + 1; });
    return map;
  }, [deals]);

  // ── Live calc for modal ────────────────────────────────────────────────────
  const liveCalc = useMemo(() => calcDeal(form), [form]);

  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <style>{CSS}</style>

      {/* Nav */}
      <TopNav />

      <div className="pf-body">

        {/* Hero */}
        <div className="pf-hero">
          <div className="pf-hero-tag">📊 Investor Scoreboard</div>
          <h1>Your <span>Portfolio</span></h1>
          <p>Track every closed deal. See your real numbers — total profit, win rate, average ROI, and your best deal ever.</p>
        </div>

        {/* Tier-cap usage badge — surfaces the ceiling before the user hits it */}
        {(() => {
          const limit = dealLimit(userTier);
          const used  = deals.length;
          const pct   = Number.isFinite(limit) && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
          const isUnlimited = !Number.isFinite(limit);
          const tierColor = TIER_COLOR[userTier] || "var(--sub)";
          const nearCap = !isUnlimited && used / limit >= 0.8;
          return (
            <div style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "12px 16px", marginBottom: 18,
              background: "var(--card)",
              border: "1px solid var(--borderf)",
              borderLeft: `3px solid ${nearCap ? "var(--amber)" : tierColor}`,
              borderRadius: 6, flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 700,
                  letterSpacing: "1.2px", color: tierColor,
                  padding: "3px 8px", border: `1px solid ${tierColor}`, borderRadius: 3,
                }}>
                  {TIER_LABEL[userTier] || "Free"}
                </span>
                <span style={{ fontFamily: "'Geist',sans-serif", fontSize: 14, color: "var(--text)", fontWeight: 600 }}>
                  {isUnlimited ? `${used} deals saved` : `${used} / ${limit} deals used`}
                </span>
              </div>
              {!isUnlimited && (
                <div style={{ flex: 1, minWidth: 160, height: 8, background: "rgba(15,23,42,0.05)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${pct}%`,
                    background: nearCap ? "var(--amber)" : tierColor,
                    transition: "width 0.3s",
                  }} />
                </div>
              )}
              {!isUnlimited && used >= limit && (
                <a href="/pricing" style={{
                  background: "var(--purple)", color: "#ffffff",
                  border: "none", borderRadius: 4, padding: "6px 14px",
                  fontSize: 12, fontWeight: 700, textDecoration: "none",
                  fontFamily: "'Geist Mono',ui-monospace,monospace", letterSpacing: "0.8px",
                }}>UPGRADE FOR MORE →</a>
              )}
              {isUnlimited && (
                <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, fontFamily: "'Geist Mono',ui-monospace,monospace" }}>
                  ∞ UNLIMITED
                </span>
              )}
            </div>
          );
        })()}

        {/* Scoreboard */}
        <div className="pf-scoreboard">
          <div className="pf-score-card highlight">
            <div className="pf-score-icon">💰</div>
            <div className="pf-score-val" style={{ color: "var(--green)" }}>
              {stats ? fmtK(stats.totalProfit) : "$0"}
            </div>
            <div className="pf-score-lbl">Total Profit</div>
          </div>
          <div className="pf-score-card">
            <div className="pf-score-icon">🏠</div>
            <div className="pf-score-val" style={{ color: "var(--blue)" }}>
              {stats ? stats.total : 0}
            </div>
            <div className="pf-score-lbl">Deals Closed</div>
          </div>
          <div className="pf-score-card">
            <div className="pf-score-icon">✅</div>
            <div className="pf-score-val" style={{ color: stats && stats.winRate >= 0.7 ? "var(--green)" : "var(--amber)" }}>
              {stats ? fmtPct(stats.winRate) : "—"}
            </div>
            <div className="pf-score-lbl">Win Rate</div>
          </div>
          <div className="pf-score-card">
            <div className="pf-score-icon">📈</div>
            <div className="pf-score-val" style={{ color: "var(--blue)" }}>
              {stats ? fmtPct(stats.avgROI) : "—"}
            </div>
            <div className="pf-score-lbl">Avg ROI</div>
          </div>
          <div className="pf-score-card">
            <div className="pf-score-icon">⏱️</div>
            <div className="pf-score-val">
              {stats && stats.avgHold > 0 ? `${stats.avgHold.toFixed(1)}mo` : "—"}
            </div>
            <div className="pf-score-lbl">Avg Hold Time</div>
          </div>
          <div className="pf-score-card">
            <div className="pf-score-icon">📦</div>
            <div className="pf-score-val" style={{ color: "var(--amber)" }}>
              {stats ? fmtK(stats.totalVolume) : "$0"}
            </div>
            <div className="pf-score-lbl">Total Volume</div>
          </div>
        </div>

        {/* Best deal banner */}
        {stats?.bestDeal && (
          <div className="pf-best">
            <span className="pf-best-icon">🏆</span>
            <div style={{ flex: 1 }}>
              <div className="pf-best-label">Best Deal Ever</div>
              <div className="pf-best-val">{stats.bestDeal.address}</div>
              <div className="pf-best-sub">
                {fmt(stats.bestDeal.netProfit)} profit · {fmtPct(stats.bestDeal.roi)} ROI
                {stats.bestDeal.closeDate ? ` · Closed ${new Date(stats.bestDeal.closeDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--green)", letterSpacing: "-1px" }}>
                {fmt(stats.bestDeal.netProfit)}
              </div>
              <div style={{ fontSize: 11, color: "var(--sub)" }}>net profit</div>
            </div>
          </div>
        )}

        {/* Profit timeline chart */}
        {chartData.length > 0 && (
          <div className="pf-chart-wrap">
            <div className="pf-chart-title">📅 Profit by Month (last 12 months)</div>
            <div className="pf-chart">
              {chartData.map(([month, profit]) => {
                const heightPct = (Math.abs(profit) / chartMax) * 100;
                const isPos = profit >= 0;
                const label = month.slice(2).replace("-", "/");
                return (
                  <div key={month} className="pf-bar-wrap">
                    <div
                      className="pf-bar"
                      data-tip={`${label}: ${fmt(profit)}`}
                      style={{
                        height: `${Math.max(heightPct, 3)}%`,
                        background: isPos
                          ? "linear-gradient(180deg,var(--green),rgba(52,217,138,0.5))"
                          : "linear-gradient(180deg,var(--red),rgba(242,92,92,0.5))",
                      }}
                    />
                    <div className="pf-bar-lbl">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Deal type breakdown */}
        {Object.keys(typeCounts).length > 0 && (
          <>
            <div className="pf-section-head" style={{ marginBottom: 12 }}>
              <div className="pf-section-title">Strategy Breakdown</div>
            </div>
            <div className="pf-breakdown">
              {Object.entries(typeCounts).map(([type, count]) => {
                const m = TYPE_META[type] || TYPE_META.flip;
                const typeDeals = sortedDeals.filter(d => d.type === type);
                const typeProfit = typeDeals.reduce((s, d) => s + d.netProfit, 0);
                return (
                  <div key={type} className="pf-breakdown-card" style={{ borderColor: m.color + "33" }}>
                    <span className="pf-bd-icon">{m.emoji}</span>
                    <div>
                      <div className="pf-bd-val">{count} deal{count > 1 ? "s" : ""}</div>
                      <div className="pf-bd-lbl">{m.label}</div>
                      <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 700, marginTop: 2 }}>
                        {fmt(typeProfit)} profit
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Deals table */}
        <div className="pf-section-head">
          <div className="pf-section-title">
            📋 Closed Deals
            {deals.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--sub)", background: "rgba(15,23,42,0.05)", border: "1px solid var(--borderf)", borderRadius: 99, padding: "2px 9px" }}>
                {deals.length}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--dim)", fontWeight: 600 }}>Sort:</span>
            {[["date", "Date"], ["profit", "Profit"], ["roi", "ROI"]].map(([val, lbl]) => (
              <button key={val}
                onClick={() => setSortBy(val)}
                style={{
                  background: sortBy === val ? "rgba(59,158,255,0.1)" : "transparent",
                  border: `1px solid ${sortBy === val ? "rgba(59,158,255,0.3)" : "var(--borderf)"}`,
                  borderRadius: 99, padding: "4px 12px", fontSize: 11, fontWeight: 600,
                  color: sortBy === val ? "var(--blue)" : "var(--dim)", cursor: "pointer",
                  fontFamily: "'Geist',sans-serif",
                }}>
                {lbl}
              </button>
            ))}
            <button className="pf-add-btn" onClick={openAdd}>+ Add Deal</button>
          </div>
        </div>

        {deals.length === 0 ? (
          <div className="pf-empty">
            <div className="pf-empty-icon">🏆</div>
            <div className="pf-empty-title">Your scoreboard is empty</div>
            <div className="pf-empty-sub">Add your first closed deal to start tracking your portfolio performance. Every great investor knows their numbers.</div>
            <button className="pf-add-btn" style={{ margin: "0 auto", justifyContent: "center" }} onClick={openAdd}>
              + Add Your First Closed Deal
            </button>
          </div>
        ) : (
          <div className="pf-table-scroll">
            <table className="pf-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Close Date</th>
                  <th>Purchase</th>
                  <th>Sale Price</th>
                  <th>Repairs</th>
                  <th>Net Profit</th>
                  <th>ROI</th>
                  <th>Hold</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedDeals.map(d => {
                  const m = TYPE_META[d.type] || TYPE_META.flip;
                  const isPos = d.netProfit >= 0;
                  return (
                    <tr key={d.id}>
                      <td>
                        <div className="pf-addr-cell" title={`${d.address}${d.city ? `, ${d.city}` : ""}`}>
                          {d.address || "—"}
                        </div>
                        {d.city && <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{d.city}</div>}
                      </td>
                      <td>
                        <span className="pf-type-pill" style={{ background: m.bg, color: m.color }}>
                          {m.emoji} {m.label}
                        </span>
                      </td>
                      <td style={{ color: "var(--sub)", fontSize: 12 }}>
                        {d.closeDate ? new Date(d.closeDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td style={{ color: "var(--sub)" }}>{d.purchasePrice ? fmt(num(d.purchasePrice)) : "—"}</td>
                      <td style={{ color: "var(--text)", fontWeight: 600 }}>{d.salePrice ? fmt(num(d.salePrice)) : "—"}</td>
                      <td style={{ color: "var(--sub)" }}>{d.repairCosts ? fmt(num(d.repairCosts)) : "—"}</td>
                      <td className={isPos ? "pf-profit-pos" : "pf-profit-neg"}>
                        {d.salePrice ? fmt(d.netProfit) : "—"}
                      </td>
                      <td style={{ color: isPos ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                        {d.salePrice ? fmtPct(d.roi) : "—"}
                      </td>
                      <td style={{ color: "var(--sub)", fontSize: 12 }}>
                        {d.holdMonths ? `${d.holdMonths} mo` : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 2 }}>
                          <button className="pf-action-btn" onClick={() => openEdit(d)} title="Edit">✏️</button>
                          <button className="pf-del-btn" onClick={() => deleteDeal(d.id)} title="Delete">✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes footer */}
        <div style={{ marginTop: 24, padding: "14px 18px", background: "rgba(59,158,255,0.04)", border: "1px solid rgba(59,158,255,0.1)", borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: "var(--sub)", lineHeight: 1.6 }}>
            💡 <strong style={{ color: "var(--text)" }}>Your portfolio is stored locally</strong> — deals are saved in your browser.
            To back them up, export via your browser or upgrade to Pro for cloud sync across devices.
          </div>
        </div>

      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="pf-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="pf-modal">
            <div className="pf-modal-title">{editDeal ? "Edit Closed Deal" : "Add Closed Deal"}</div>
            <div className="pf-modal-sub">Enter the actual final numbers — purchase price, what you sold for, real repair costs.</div>

            <div className="pf-modal-grid">

              <div className="pf-field full">
                <div className="pf-label">Street Address *</div>
                <input className="pf-input" placeholder="123 Main St" value={form.address} onChange={f("address")} />
              </div>

              <div className="pf-field">
                <div className="pf-label">City / Market</div>
                <input className="pf-input" placeholder="Phoenix, AZ" value={form.city} onChange={f("city")} />
              </div>

              <div className="pf-field">
                <div className="pf-label">Close Date</div>
                <input className="pf-input" type="date" value={form.closeDate} onChange={f("closeDate")} />
              </div>

              <div className="pf-field full">
                <div className="pf-label">Deal Type</div>
                <select className="pf-select" value={form.type} onChange={f("type")}>
                  {Object.entries(TYPE_META).map(([v, m]) => (
                    <option key={v} value={v}>{m.emoji} {m.label}</option>
                  ))}
                </select>
              </div>

              <div className="pf-field">
                <div className="pf-label">Purchase Price ($)</div>
                <input className="pf-input" type="number" placeholder="180000" value={form.purchasePrice} onChange={f("purchasePrice")} />
              </div>

              <div className="pf-field">
                <div className="pf-label">Sale Price ($)</div>
                <input className="pf-input" type="number" placeholder="320000" value={form.salePrice} onChange={f("salePrice")} />
              </div>

              <div className="pf-field">
                <div className="pf-label">Repair Costs ($)</div>
                <input className="pf-input" type="number" placeholder="55000" value={form.repairCosts} onChange={f("repairCosts")} />
              </div>

              <div className="pf-field">
                <div className="pf-label">Hold Time (months)</div>
                <input className="pf-input" type="number" placeholder="6" value={form.holdMonths} onChange={f("holdMonths")} />
              </div>

              <div className="pf-field full">
                <div className="pf-label">My Cash Invested ($) <span style={{ fontWeight: 400, textTransform: "none" }}>— for CoC calc</span></div>
                <input className="pf-input" type="number" placeholder="40000" value={form.myCash} onChange={f("myCash")} />
              </div>

              <div className="pf-field full">
                <div className="pf-label">Notes</div>
                <input className="pf-input" placeholder="Hard money deal, wholesaler source, biggest lesson learned..." value={form.notes} onChange={f("notes")} />
              </div>

            </div>

            {/* Live calc preview */}
            {(num(form.purchasePrice) > 0 || num(form.salePrice) > 0) && (
              <div className="pf-modal-calc">
                <div className="pf-calc-item">
                  <div className="pf-calc-val" style={{ color: liveCalc.netProfit >= 0 ? "var(--green)" : "var(--red)" }}>
                    {fmt(liveCalc.netProfit)}
                  </div>
                  <div className="pf-calc-lbl">Net Profit</div>
                </div>
                <div className="pf-calc-item">
                  <div className="pf-calc-val" style={{ color: "var(--blue)" }}>{fmtPct(liveCalc.roi)}</div>
                  <div className="pf-calc-lbl">ROI</div>
                </div>
                <div className="pf-calc-item">
                  <div className="pf-calc-val" style={{ color: "var(--amber)" }}>
                    {liveCalc.coc !== null ? fmtPct(liveCalc.coc) : "—"}
                  </div>
                  <div className="pf-calc-lbl">Ann. CoC</div>
                </div>
              </div>
            )}

            <div className="pf-modal-actions">
              <button className="pf-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="pf-save-btn" onClick={submitForm} disabled={!form.address.trim()}>
                {editDeal ? "Save Changes" : "Add to Portfolio"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
