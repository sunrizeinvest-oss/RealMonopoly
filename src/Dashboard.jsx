import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

const fmt = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = n => isNaN(n) || !isFinite(n) ? "—" : `${(n * 100).toFixed(1)}%`;
const fmtX = n => isNaN(n) || !isFinite(n) || Math.abs(n) > 999 ? "—" : `${n.toFixed(2)}x`;

function typeLabel(type) {
  if (type === "flip") return { emoji: "🏚️", label: "Fix & Flip", color: "#3b9eff", bg: "rgba(59,158,255,0.1)" };
  if (type === "brrrr") return { emoji: "🔄", label: "BRRRR", color: "#a782ff", bg: "rgba(167,130,255,0.1)" };
  if (type === "multifamily") return { emoji: "🏢", label: "Multifamily", color: "#34d98a", bg: "rgba(52,217,138,0.1)" };
  return { emoji: "🏠", label: "Deal", color: "#6b7d96", bg: "rgba(107,125,150,0.1)" };
}

function verdictColor(verdict) {
  if (!verdict) return "#6b7d96";
  if (verdict.includes("GO") && !verdict.includes("NO") && !verdict.includes("No")) return "#34d98a";
  if (verdict.includes("NO") || verdict.includes("No-Go") || verdict.includes("Unprofitable")) return "#f25c5c";
  return "#f0a030";
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#07090f;--card:#0d1119;--card2:#0a0e18;--border:rgba(59,158,255,0.12);--borderf:rgba(255,255,255,0.07);--text:#dde4ef;--sub:#6b7d96;--dim:#3a4a60;--blue:#3b9eff;--green:#34d98a;--red:#f25c5c;--amber:#f0a030;--purple:#a782ff}
  html,body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
  .db-wrap{min-height:100vh;background:var(--bg)}

  /* Nav */
  .db-nav{position:sticky;top:0;z-index:100;background:rgba(7,9,15,0.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .db-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none}.db-logo span{color:var(--blue)}
  .db-nav-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .db-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 11px;border-radius:7px}.db-nav-link:hover{color:var(--text);background:rgba(255,255,255,0.05)}
  .db-nav-btn{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s}.db-nav-btn:hover{color:var(--text)}
  .db-nav-primary{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none;display:inline-flex;align-items:center}.db-nav-primary:hover{background:#5aaeff}

  /* Body */
  .db-body{max-width:960px;margin:0 auto;padding:40px 20px 80px}
  .db-hero{margin-bottom:36px}
  .db-title{font-size:32px;font-weight:800;color:var(--text);letter-spacing:-1.2px;margin-bottom:6px}
  .db-title span{color:var(--blue)}
  .db-sub{font-size:14px;color:var(--sub);line-height:1.6}

  /* Stats row */
  .db-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px}
  .db-stat{background:var(--card);border:1px solid var(--borderf);border-radius:12px;padding:16px 18px}
  .db-stat-val{font-size:22px;font-weight:800;letter-spacing:-0.5px;line-height:1;margin-bottom:4px}
  .db-stat-lbl{font-size:10.5px;font-weight:600;color:var(--dim);text-transform:uppercase;letter-spacing:0.5px}

  /* Filter bar */
  .db-filter-bar{display:flex;align-items:center;gap:8px;margin-bottom:20px;flex-wrap:wrap}
  .db-filter-btn{background:var(--card2);border:1px solid var(--borderf);border-radius:99px;padding:6px 14px;font-size:12px;font-weight:600;color:var(--sub);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s}
  .db-filter-btn.active{background:rgba(59,158,255,0.1);border-color:rgba(59,158,255,0.3);color:var(--blue)}
  .db-filter-btn:hover{color:var(--text)}

  /* Deal cards */
  .db-deal-grid{display:flex;flex-direction:column;gap:12px}
  .db-deal{background:var(--card);border:1px solid var(--borderf);border-radius:16px;padding:22px 24px;transition:all 0.18s;cursor:default}
  .db-deal:hover{border-color:rgba(59,158,255,0.25);box-shadow:0 8px 32px rgba(0,0,0,0.3)}
  .db-deal-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px;flex-wrap:wrap}
  .db-deal-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .db-type-pill{font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;letter-spacing:0.3px;text-transform:uppercase}
  .db-verdict-pill{font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px}
  .db-date{font-size:11px;color:var(--dim)}
  .db-deal-name{font-size:17px;font-weight:800;color:var(--text);letter-spacing:-0.3px;margin-bottom:4px}
  .db-deal-addr{font-size:12.5px;color:var(--sub)}
  .db-deal-right{display:flex;align-items:center;gap:12px;flex-shrink:0}
  .db-score-ring{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;border:2px solid;flex-shrink:0}
  .db-score-num{font-size:15px;font-weight:800;line-height:1}
  .db-score-of{font-size:8px;color:var(--dim)}
  .db-deal-metrics{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;padding-top:14px;border-top:1px solid var(--borderf)}
  .db-metric-val{font-size:15px;font-weight:700;color:var(--text);line-height:1;margin-bottom:3px}
  .db-metric-lbl{font-size:10px;color:var(--dim);font-weight:600;text-transform:uppercase;letter-spacing:0.3px}
  .db-deal-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
  .db-action-btn{background:rgba(59,158,255,0.08);border:1px solid rgba(59,158,255,0.2);border-radius:7px;padding:6px 13px;font-size:12px;font-weight:600;color:var(--blue);cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none;transition:all 0.15s}.db-action-btn:hover{background:rgba(59,158,255,0.15)}
  .db-del-btn{background:transparent;border:none;color:var(--dim);cursor:pointer;font-size:13px;padding:6px 8px;border-radius:7px;transition:all 0.15s;font-family:'DM Sans',sans-serif}.db-del-btn:hover{color:var(--red);background:rgba(242,92,92,0.08)}

  /* Empty */
  .db-empty{background:var(--card);border:1px dashed var(--borderf);border-radius:16px;padding:72px 24px;text-align:center}
  .db-empty-icon{font-size:44px;margin-bottom:16px}
  .db-empty-title{font-size:20px;font-weight:700;color:var(--sub);margin-bottom:8px}
  .db-empty-sub{font-size:14px;color:var(--dim);margin-bottom:28px;line-height:1.7;max-width:400px;margin-left:auto;margin-right:auto}

  /* Sync banner */
  .db-sync-banner{background:linear-gradient(135deg,rgba(52,217,138,0.08),rgba(59,158,255,0.05));border:1px solid rgba(52,217,138,0.2);border-radius:12px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap}
  .db-sync-text{font-size:13px;color:var(--sub)}
  .db-sync-text strong{color:var(--green)}
  .db-sync-btn{background:rgba(52,217,138,0.12);border:1px solid rgba(52,217,138,0.3);color:var(--green);border-radius:7px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap}
  .db-sync-btn:hover{background:rgba(52,217,138,0.2)}

  /* Responsive */
  @media(max-width:700px){
    .db-stats{grid-template-columns:1fr 1fr}
    .db-deal-top{flex-direction:column}
    .db-deal-right{flex-direction:row;justify-content:flex-start}
    .db-nav-right .db-nav-link{display:none}
  }
  @media(max-width:480px){
    .db-body{padding:24px 14px 60px}
    .db-title{font-size:24px}
    .db-stats{grid-template-columns:1fr 1fr}
    .db-deal-metrics{grid-template-columns:1fr 1fr}
  }
`;

export default function Dashboard() {
  const { user, signOut, getDeals, deleteDeal, loading } = useAuth();
  const navigate = useNavigate();
  const [supaDeals, setSupaDeals] = useState([]);
  const [localDeals, setLocalDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    if (!loading && !user) { navigate("/analyze"); return; }
    if (user) loadAllDeals();
  }, [user, loading]);

  async function loadAllDeals() {
    setDealsLoading(true);
    // Load from Supabase
    try {
      const { data } = await getDeals();
      setSupaDeals(data || []);
    } catch { setSupaDeals([]); }
    // Load from localStorage (saved by calculators)
    try {
      const raw = localStorage.getItem("rde_brrrr_deals");
      setLocalDeals(raw ? JSON.parse(raw) : []);
    } catch { setLocalDeals([]); }
    setDealsLoading(false);
  }

  // Merge and normalize all deals
  const allDeals = [
    ...localDeals.map(d => ({
      id: d.id,
      source: "local",
      type: d.type || "flip",
      name: d.name || d.address || "Untitled Deal",
      address: d.address || "",
      savedAt: d.savedAt,
      verdict: d.verdict || "",
      score: d.results?.score || d.results?.grade || null,
      grade: d.results?.grade || null,
      results: d.results || {},
      inputs: d.inputs || {},
    })),
    ...supaDeals.map(d => ({
      id: d.id,
      source: "supabase",
      type: d.deal_type || "flip",
      name: d.address || "Deal",
      address: d.address || "",
      savedAt: d.created_at,
      verdict: d.verdict || "",
      score: d.score || null,
      grade: d.grade || null,
      results: { netProfit: d.profit, roiTotal: d.margin, mao: d.mao },
      inputs: {},
    })),
  ].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

  const filtered = filter === "all" ? allDeals : allDeals.filter(d => d.type === filter);

  // Stats
  const totalDeals = allDeals.length;
  const goDeals = allDeals.filter(d => d.verdict && d.verdict.includes("GO") && !d.verdict.includes("NO") && !d.verdict.includes("No-Go")).length;
  const avgProfit = allDeals.length > 0
    ? allDeals.reduce((s, d) => s + (d.results?.netProfit || d.results?.noi || 0), 0) / allDeals.length
    : 0;
  const flipCount = allDeals.filter(d => d.type === "flip").length;
  const brrrrCount = allDeals.filter(d => d.type === "brrrr").length;
  const mfCount = allDeals.filter(d => d.type === "multifamily").length;

  function deleteLocal(id) {
    const updated = localDeals.filter(d => d.id !== id);
    setLocalDeals(updated);
    localStorage.setItem("rde_brrrr_deals", JSON.stringify(updated));
  }

  async function deleteSupaDeal(id) {
    setDeletingId(id);
    await deleteDeal(id);
    setSupaDeals(p => p.filter(d => d.id !== id));
    setDeletingId(null);
  }

  function handleDelete(deal) {
    if (deal.source === "local") deleteLocal(deal.id);
    else deleteSupaDeal(deal.id);
  }

  function openDeal(deal) {
    if (deal.source === "local" && deal.inputs && Object.keys(deal.inputs).length > 0) {
      // Pre-fill the appropriate calculator
      const key = deal.type === "flip" ? "rde_prefill_flip" : deal.type === "brrrr" ? "rde_prefill_brrrr" : "rde_prefill_mf";
      const route = deal.type === "flip" ? "/app" : deal.type === "brrrr" ? "/brrrr" : "/commercial";
      navigate(route);
    } else {
      const route = deal.type === "flip" ? "/app" : deal.type === "brrrr" ? "/brrrr" : "/commercial";
      navigate(route);
    }
  }

  function copyShare(deal) {
    const txt = `${deal.name} — ${deal.verdict || "Analyzed"} | Profit: ${fmt(deal.results?.netProfit || deal.results?.cashFlow || 0)} | ${window.location.origin}`;
    navigator.clipboard.writeText(txt);
    setCopied(deal.id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#07090f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#3b9eff", fontSize: 14 }}>Loading...</div>
    </div>
  );

  return (
    <div className="db-wrap">
      <style>{CSS}</style>
      <nav className="db-nav">
        <a href="/" className="db-logo"><span>Real</span> Deal</a>
        <div className="db-nav-right">
          <a href="/analyze" className="db-nav-link">🏠 Analyze</a>
          <a href="/app" className="db-nav-link">Flip</a>
          <a href="/commercial" className="db-nav-link">Multifamily</a>
          <a href="/brrrr" className="db-nav-link">BRRRR</a>
          <a href="/compare" className="db-nav-link">Compare</a>
          <a href="/analyze" className="db-nav-primary">+ New Analysis</a>
          {user && <button className="db-nav-btn" onClick={signOut}>Sign out</button>}
        </div>
      </nav>

      <div className="db-body">
        <div className="db-hero">
          <div className="db-title">My <span>Deal</span> Pipeline</div>
          <div className="db-sub">
            {user?.email && <span style={{ color: "var(--sub)" }}>{user.email} · </span>}
            {totalDeals} deal{totalDeals !== 1 ? "s" : ""} tracked across {[flipCount && "Flip", brrrrCount && "BRRRR", mfCount && "Multifamily"].filter(Boolean).join(", ") || "all tools"}
          </div>
        </div>

        {/* Stats */}
        {totalDeals > 0 && (
          <div className="db-stats">
            <div className="db-stat">
              <div className="db-stat-val" style={{ color: "var(--blue)" }}>{totalDeals}</div>
              <div className="db-stat-lbl">Total Deals</div>
            </div>
            <div className="db-stat">
              <div className="db-stat-val" style={{ color: "var(--green)" }}>{goDeals}</div>
              <div className="db-stat-lbl">GO Deals</div>
            </div>
            <div className="db-stat">
              <div className="db-stat-val" style={{ color: avgProfit >= 0 ? "var(--green)" : "var(--red)" }}>{fmt(Math.abs(avgProfit))}</div>
              <div className="db-stat-lbl">Avg Profit/CF</div>
            </div>
            <div className="db-stat">
              <div className="db-stat-val" style={{ color: "var(--amber)" }}>{flipCount}F · {brrrrCount}B · {mfCount}M</div>
              <div className="db-stat-lbl">Flip · BRRRR · MF</div>
            </div>
          </div>
        )}

        {/* Filter */}
        {totalDeals > 0 && (
          <div className="db-filter-bar">
            {[
              { key: "all", label: `All (${totalDeals})` },
              { key: "flip", label: `🏚️ Flip (${flipCount})` },
              { key: "brrrr", label: `🔄 BRRRR (${brrrrCount})` },
              { key: "multifamily", label: `🏢 Multifamily (${mfCount})` },
            ].filter(f => f.key === "all" || allDeals.some(d => d.type === f.key)).map(f => (
              <button key={f.key} className={`db-filter-btn ${filter === f.key ? "active" : ""}`} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {dealsLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--dim)" }}>Loading your deals...</div>
        ) : totalDeals === 0 ? (
          <div className="db-empty">
            <div className="db-empty-icon">🏚️</div>
            <div className="db-empty-title">No saved deals yet</div>
            <div className="db-empty-sub">Analyze a property using any tool and hit "Save Deal" to track it here. Your entire deal pipeline lives in one place.</div>
            <a href="/analyze" className="db-nav-primary" style={{ display: "inline-flex", marginBottom: 12 }}>+ Analyze a deal →</a>
          </div>
        ) : (
          <div className="db-deal-grid">
            {filtered.map(deal => {
              const tl = typeLabel(deal.type);
              const vColor = verdictColor(deal.verdict);
              const r = deal.results;
              const hasScore = deal.score && !isNaN(deal.score);
              const scoreNum = typeof deal.score === "string" ? deal.score : deal.score;

              return (
                <div key={`${deal.source}-${deal.id}`} className="db-deal">
                  <div className="db-deal-top">
                    <div style={{ flex: 1 }}>
                      <div className="db-deal-meta">
                        <span className="db-type-pill" style={{ background: tl.bg, color: tl.color }}>{tl.emoji} {tl.label}</span>
                        {deal.verdict && (
                          <span className="db-verdict-pill" style={{ background: `${vColor}18`, color: vColor }}>{deal.verdict}</span>
                        )}
                        <span className="db-date">
                          {deal.savedAt ? new Date(deal.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                        </span>
                      </div>
                      <div className="db-deal-name" style={{ marginTop: 8 }}>{deal.name}</div>
                      {deal.address && deal.address !== deal.name && (
                        <div className="db-deal-addr">📍 {deal.address}</div>
                      )}
                    </div>
                    <div className="db-deal-right">
                      {hasScore && (
                        <div className="db-score-ring" style={{ borderColor: tl.color, background: `${tl.color}12` }}>
                          <div className="db-score-num" style={{ color: tl.color }}>{scoreNum}</div>
                          <div className="db-score-of">{typeof deal.score === "number" ? "/100" : "grade"}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="db-deal-metrics">
                    {deal.type === "flip" && <>
                      <div>
                        <div className="db-metric-val" style={{ color: (r.netProfit || 0) >= 0 ? "var(--green)" : "var(--red)" }}>{fmt(r.netProfit)}</div>
                        <div className="db-metric-lbl">Net Profit</div>
                      </div>
                      {r.roiTotal != null && <div>
                        <div className="db-metric-val" style={{ color: "var(--blue)" }}>{fmtPct(r.roiTotal)}</div>
                        <div className="db-metric-lbl">Total ROI</div>
                      </div>}
                      {r.profitMargin != null && <div>
                        <div className="db-metric-val">{fmtPct(r.profitMargin)}</div>
                        <div className="db-metric-lbl">Margin</div>
                      </div>}
                      {r.mao != null && <div>
                        <div className="db-metric-val">{fmt(r.mao)}</div>
                        <div className="db-metric-lbl">MAO</div>
                      </div>}
                    </>}
                    {deal.type === "brrrr" && <>
                      <div>
                        <div className="db-metric-val" style={{ color: (r.monthlyCF || 0) >= 0 ? "var(--green)" : "var(--red)" }}>{fmt(r.monthlyCF)}/mo</div>
                        <div className="db-metric-lbl">Monthly CF</div>
                      </div>
                      {r.dscr != null && <div>
                        <div className="db-metric-val" style={{ color: r.dscr >= 1.25 ? "var(--green)" : r.dscr >= 1 ? "var(--amber)" : "var(--red)" }}>{fmtX(r.dscr)}</div>
                        <div className="db-metric-lbl">DSCR</div>
                      </div>}
                      {r.isTrueBRRRR != null && <div>
                        <div className="db-metric-val" style={{ color: r.isTrueBRRRR ? "var(--green)" : "var(--amber)" }}>{r.isTrueBRRRR ? "✓ True" : "Partial"}</div>
                        <div className="db-metric-lbl">BRRRR</div>
                      </div>}
                      {r.cashLeftInDeal != null && <div>
                        <div className="db-metric-val">{fmt(r.cashLeftInDeal)}</div>
                        <div className="db-metric-lbl">Cash Left In</div>
                      </div>}
                    </>}
                    {deal.type === "multifamily" && <>
                      <div>
                        <div className="db-metric-val" style={{ color: "var(--green)" }}>{fmt(r.noi)}</div>
                        <div className="db-metric-lbl">NOI (Annual)</div>
                      </div>
                      <div>
                        <div className="db-metric-val" style={{ color: (r.annualCF || r.cashFlow || 0) >= 0 ? "var(--blue)" : "var(--red)" }}>{fmt(r.monthlyCF || (r.annualCF / 12) || 0)}/mo</div>
                        <div className="db-metric-lbl">Cash Flow</div>
                      </div>
                      {r.dscr != null && <div>
                        <div className="db-metric-val" style={{ color: r.dscr >= 1.25 ? "var(--green)" : "var(--amber)" }}>{fmtX(r.dscr)}</div>
                        <div className="db-metric-lbl">DSCR</div>
                      </div>}
                      {r.coc != null && r.coc < 99 && <div>
                        <div className="db-metric-val">{fmtPct(r.coc)}</div>
                        <div className="db-metric-lbl">Cash-on-Cash</div>
                      </div>}
                    </>}
                  </div>

                  {/* Actions */}
                  <div className="db-deal-actions">
                    <button className="db-action-btn" onClick={() => openDeal(deal)}>
                      ✏️ Open in {deal.type === "flip" ? "Flip Calc" : deal.type === "brrrr" ? "BRRRR Calc" : "MF Underwriter"}
                    </button>
                    <button
                      className="db-action-btn"
                      style={{ color: copied === deal.id ? "var(--green)" : "var(--blue)" }}
                      onClick={() => copyShare(deal)}
                    >
                      {copied === deal.id ? "✓ Copied!" : "🔗 Share"}
                    </button>
                    <a href="/compare" className="db-action-btn" style={{ color: "var(--amber)", borderColor: "rgba(240,160,48,0.3)", background: "rgba(240,160,48,0.08)" }}>
                      ⚡ Compare
                    </a>
                    <button
                      className="db-del-btn"
                      onClick={() => handleDelete(deal)}
                      disabled={deletingId === deal.id}
                    >
                      {deletingId === deal.id ? "..." : "🗑 Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom CTA */}
        {totalDeals > 0 && (
          <div style={{ marginTop: 40, textAlign: "center" }}>
            <a href="/analyze" className="db-nav-primary" style={{ fontSize: 14, padding: "10px 24px" }}>+ Analyze another deal →</a>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 10 }}>
              {localDeals.length > 0 && `${localDeals.length} deal${localDeals.length !== 1 ? "s" : ""} saved locally · `}
              Deals are saved in your browser. Sign in to access across devices.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
