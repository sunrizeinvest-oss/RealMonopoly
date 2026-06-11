import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { isB64ShareId, decodeDeal } from "./lib/shareDeal";

const fmt = n => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = n => isNaN(n) || !isFinite(n) ? "—" : `${(n * 100).toFixed(1)}%`;
const fmtX   = n => isNaN(n) || !isFinite(n) ? "—" : `${Number(n).toFixed(2)}x`;
function scoreColor(s) { return s >= 80 ? "var(--green)" : s >= 65 ? "var(--blue)" : s >= 48 ? "var(--amber)" : "var(--red)"; }

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased}
  .sd-wrap{min-height:100vh;background:var(--bg)}
  .sd-nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.95);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .sd-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none}
  .sd-logo span{color:var(--blue)}
  .sd-btn{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif;text-decoration:none;display:inline-flex;align-items:center}
  .sd-body{max-width:600px;margin:0 auto;padding:40px 20px 80px}
  .sd-card{background:var(--card);border:1px solid var(--border);border-radius:6px;overflow:hidden}
  .sd-card-header{padding:20px 24px;border-bottom:1px solid var(--borderf);background:#f1f5f9;display:flex;align-items:center;justify-content:space-between}
  .sd-card-body{padding:24px}
  .sd-score-row{display:flex;align-items:center;gap:16px;margin-bottom:24px}
  .sd-score-ring{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;border:3px solid;flex-shrink:0}
  .sd-score-num{font-size:22px;font-weight:800;font-family:monospace;line-height:1}
  .sd-score-of{font-size:9px;color:var(--dim)}
  .sd-verdict{font-size:22px;font-weight:800;letter-spacing:-0.5px}
  .sd-metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
  .sd-metric{background:#f1f5f9;border:1px solid var(--borderf);border-radius:6px;padding:14px 16px}
  .sd-metric-val{font-size:18px;font-weight:800;font-family:monospace;line-height:1;margin-bottom:4px}
  .sd-metric-lbl{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;color:var(--dim);font-weight:600;text-transform:uppercase;letter-spacing:0.3px}
  .sd-cta{background:rgba(59,158,255,0.06);border:1px solid rgba(59,158,255,0.15);border-radius:6px;padding:18px 20px;text-align:center;margin-top:20px}
  .sd-cta-title{font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px}
  .sd-cta-sub{font-size:13px;color:var(--sub);margin-bottom:14px}
`;

export default function SharedDeal() {
  const { shareId } = useParams();
  const { getDealByShareId } = useAuth();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Two paths: base64-encoded payload (no backend round-trip) or a
    // Supabase UUID share id (lookup the flip deal we saved server-side).
    if (isB64ShareId(shareId)) {
      const payload = decodeDeal(shareId);
      if (payload) setDeal({ kind: "b64", ...payload });
      else setNotFound(true);
      setLoading(false);
      return;
    }
    async function load() {
      const { data, error } = await getDealByShareId(shareId);
      if (error || !data) setNotFound(true);
      else setDeal({ kind: "flip", ...data });
      setLoading(false);
    }
    load();
  }, [shareId]);

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#ffffff",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"var(--blue)",fontSize:14}}>Loading deal...</div>
    </div>
  );

  if (notFound) return (
    <div style={{minHeight:"100vh",background:"#ffffff",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
      <div style={{fontSize:32}}>🏠</div>
      <div style={{fontSize:18,fontWeight:700,color:"var(--text)"}}>Deal not found</div>
      <div style={{fontSize:14,color:"var(--sub)"}}>This link may have expired or been removed.</div>
      <a href="/analyze" style={{marginTop:8,background:"var(--blue)",color:"#fff",borderRadius: 6,padding:"10px 20px",fontSize:13,fontWeight:700,textDecoration:"none"}}>Analyze your own deal →</a>
    </div>
  );

  // Branch on the payload shape — base64 BRRRR/MF deals vs. Supabase Flip deals
  if (deal.kind === "b64") return <SharedB64Deal deal={deal} />;

  const color = scoreColor(deal.score);

  return (
    <div className="sd-wrap">
      <style>{CSS}</style>
      <nav className="sd-nav">
        <a href="/" className="sd-logo"><span>Real</span> Deal</a>
        <a href="/analyze" className="sd-btn">Analyze my own deal →</a>
      </nav>
      <div className="sd-body">
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(15,23,42,0.04)",border:"1px solid var(--borderf)",borderRadius:99,padding:"4px 12px",fontSize:11,color:"var(--sub)",marginBottom:8}}>🔗 Shared deal analysis</div>
          <div style={{fontSize:13,color:"var(--dim)"}}>Analyzed with rizeai.co</div>
        </div>
        <div className="sd-card">
          <div className="sd-card-header">
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"var(--blue)",letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>
                {deal.deal_type === "flip" ? "🔨 Fix & Flip" : "🏠 Rental"} Analysis
              </div>
              <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>{deal.address || "Property Analysis"}</div>
            </div>
            <div style={{fontSize:11,color:"var(--dim)"}}>{new Date(deal.created_at).toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"})}</div>
          </div>
          <div className="sd-card-body">
            <div className="sd-score-row">
              <div className="sd-score-ring" style={{borderColor:color,background:`${color}12`}}>
                <div className="sd-score-num" style={{color}}>{deal.score}</div>
                <div className="sd-score-of">/100</div>
              </div>
              <div>
                <div className="sd-verdict" style={{color}}>{deal.verdict}</div>
                <div style={{fontSize:13,color:"var(--sub)",marginTop:4}}>{deal.address || "No address"}</div>
              </div>
            </div>
            <div className="sd-metrics">
              <div className="sd-metric"><div className="sd-metric-val" style={{color:deal.profit>0?"var(--green)":"var(--red)"}}>{fmt(deal.profit)}</div><div className="sd-metric-lbl">Est. Net Profit</div></div>
              <div className="sd-metric"><div className="sd-metric-val" style={{color:"var(--blue)"}}>{fmt(deal.arv_mid)}</div><div className="sd-metric-lbl">Estimated ARV</div></div>
              <div className="sd-metric"><div className="sd-metric-val" style={{color:"var(--text)"}}>{fmt(deal.purchase_price)}</div><div className="sd-metric-lbl">Purchase Price</div></div>
              <div className="sd-metric"><div className="sd-metric-val" style={{color:"var(--amber)"}}>{fmtPct(deal.margin)}</div><div className="sd-metric-lbl">Profit Margin</div></div>
              <div className="sd-metric"><div className="sd-metric-val" style={{color:"var(--text)"}}>{fmt(deal.repair_cost)}</div><div className="sd-metric-lbl">Repair Cost</div></div>
              <div className="sd-metric"><div className="sd-metric-val" style={{color:"var(--green)"}}>{fmt(deal.rent_mid)}/mo</div><div className="sd-metric-lbl">Est. Rental Rate</div></div>
            </div>
            <div style={{background:`${color}08`,border:`1px solid ${color}20`,borderRadius:10,padding:"14px 16px",fontSize:13,color:color,fontWeight:600,textAlign:"center"}}>
              {deal.score >= 65 ? "✅ This deal scored above the GO threshold" : "⚠️ This deal needs further review before proceeding"}
            </div>
            <div className="sd-cta">
              <div className="sd-cta-title">Run your own analysis</div>
              <div className="sd-cta-sub">Free property analysis — score, ARV estimate, rental rates, instant verdict.</div>
              <a href="/analyze" className="sd-btn" style={{display:"inline-flex"}}>Analyze a deal free →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Base64-payload renderer (BRRRR + Multifamily) ────────────────────────
function SharedB64Deal({ deal }) {
  const isMF = deal.type === "multifamily";
  const isBRRRR = deal.type === "brrrr";
  const r = deal.results || {};
  const i = deal.inputs  || {};

  // Pick the metric set based on strategy
  const metrics = isMF
    ? [
        { lbl: "Cap Rate",       val: fmtPct(r.cap),          color: pickColor(r.cap, [0.06, 0.05, 0.04]) },
        { lbl: "DSCR",           val: fmtX(r.dscr),           color: r.dscr >= 1.25 ? "var(--green)" : r.dscr >= 1.0 ? "var(--amber)" : "var(--red)" },
        { lbl: "Cash-on-Cash",   val: fmtPct(r.coc),          color: "var(--blue)" },
        { lbl: "IRR (5yr)",      val: fmtPct(r.irr),          color: pickColor(r.irr, [0.18, 0.12, 0.06]) },
        { lbl: "NOI",            val: fmt(r.noi),             color: "var(--text)" },
        { lbl: "Equity Multiple",val: fmtX(r.eqMul),          color: "var(--blue)" },
        { lbl: "Purchase Price", val: fmt(i.purchase),        color: "var(--text)" },
        { lbl: "Total Cash In",  val: fmt(r.tci),             color: "var(--amber)" },
      ]
    : [
        { lbl: "True BRRRR",      val: r.isTrue ? "✓ Yes" : "✗ No",   color: r.isTrue ? "var(--green)" : "var(--amber)" },
        { lbl: "DSCR",            val: fmtX(r.dscr),           color: r.dscr >= 1.25 ? "var(--green)" : r.dscr >= 1.0 ? "var(--amber)" : "var(--red)" },
        { lbl: "Monthly CF",      val: fmt(r.cf),              color: r.cf > 0 ? "var(--green)" : "var(--red)" },
        { lbl: "Cash Pulled Out", val: fmt(r.cpo),             color: "var(--blue)" },
        { lbl: "Cash Left In",    val: fmt(r.cli),             color: r.cli > 5000 ? "var(--amber)" : "var(--green)" },
        { lbl: "Equity Created",  val: fmt(r.eq),              color: r.eq > 0 ? "var(--green)" : "var(--red)" },
        { lbl: "ARV",             val: fmt(i.arv),             color: "var(--text)" },
        { lbl: "Purchase Price",  val: fmt(i.purchase),        color: "var(--text)" },
      ];

  const verdictText = deal.verdict || (isMF ? "Multifamily deal" : "BRRRR deal");
  const verdictColor =
    /strong|go|true/i.test(deal.verdict || "") ? "var(--green)" :
    /caution|warn|thin/i.test(deal.verdict || "") ? "var(--amber)" :
    /no|pass|red/i.test(deal.verdict || "") ? "var(--red)" :
    "var(--blue)";

  return (
    <div className="sd-wrap">
      <style>{CSS}</style>
      <nav className="sd-nav">
        <a href="/" className="sd-logo"><span>Real</span> Deal</a>
        <a href="/analyze" className="sd-btn">Analyze my own deal →</a>
      </nav>
      <div className="sd-body">
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(15,23,42,0.04)",border:"1px solid var(--borderf)",borderRadius:99,padding:"4px 12px",fontSize:11,color:"var(--sub)",marginBottom:8}}>🔗 Shared deal analysis</div>
          <div style={{fontSize:13,color:"var(--dim)"}}>Analyzed with rizeai.co</div>
        </div>
        <div className="sd-card">
          <div className="sd-card-header">
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"var(--blue)",letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>
                {isMF ? "🏢 Multifamily" : "🔄 BRRRR"} Analysis
              </div>
              <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>{deal.addr || deal.name || "Property Analysis"}</div>
            </div>
            {deal.date && (
              <div style={{fontSize:11,color:"var(--dim)"}}>
                {new Date(deal.date).toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"})}
              </div>
            )}
          </div>
          <div className="sd-card-body">
            <div style={{
              background:`${verdictColor}10`, border:`1px solid ${verdictColor}30`,
              borderLeft:`4px solid ${verdictColor}`, borderRadius:6,
              padding:"16px 18px", marginBottom:20,
            }}>
              <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:10.5,fontWeight:700,color:verdictColor,letterSpacing:"1.4px",marginBottom:4}}>
                ▸ VERDICT
              </div>
              <div style={{fontSize:20,fontWeight:800,color:verdictColor,letterSpacing:"-0.3px"}}>{verdictText}</div>
            </div>
            <div className="sd-metrics">
              {metrics.map(m => (
                <div key={m.lbl} className="sd-metric">
                  <div className="sd-metric-val" style={{color: m.color}}>{m.val}</div>
                  <div className="sd-metric-lbl">{m.lbl}</div>
                </div>
              ))}
            </div>
            <div className="sd-cta">
              <div className="sd-cta-title">Run your own deal</div>
              <div className="sd-cta-sub">Free underwriting — institutional metrics, AI thesis, all 20 tools.</div>
              <a href={isMF ? "/commercial" : "/brrrr"} className="sd-btn" style={{display:"inline-flex"}}>
                Open the {isMF ? "Multifamily" : "BRRRR"} calculator →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function pickColor(v, [a, b, c]) {
  if (v == null || isNaN(v)) return "var(--sub)";
  if (v >= a) return "var(--green)";
  if (v >= b) return "var(--blue)";
  if (v >= c) return "var(--amber)";
  return "var(--red)";
}
