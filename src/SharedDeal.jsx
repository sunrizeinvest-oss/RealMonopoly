import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "./AuthContext";

const fmt = n => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = n => isNaN(n) || !isFinite(n) ? "—" : `${(n * 100).toFixed(1)}%`;
function scoreColor(s) { return s >= 80 ? "var(--green)" : s >= 65 ? "var(--blue)" : s >= 48 ? "var(--amber)" : "var(--red)"; }

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
  .sd-wrap{min-height:100vh;background:var(--bg)}
  .sd-nav{position:sticky;top:0;z-index:100;background:rgba(7,9,15,0.95);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .sd-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none}
  .sd-logo span{color:var(--blue)}
  .sd-btn{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none;display:inline-flex;align-items:center}
  .sd-body{max-width:600px;margin:0 auto;padding:40px 20px 80px}
  .sd-card{background:var(--card);border:1px solid var(--border);border-radius:6px;overflow:hidden}
  .sd-card-header{padding:20px 24px;border-bottom:1px solid var(--borderf);background:#0a0e18;display:flex;align-items:center;justify-content:space-between}
  .sd-card-body{padding:24px}
  .sd-score-row{display:flex;align-items:center;gap:16px;margin-bottom:24px}
  .sd-score-ring{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;border:3px solid;flex-shrink:0}
  .sd-score-num{font-size:22px;font-weight:800;font-family:monospace;line-height:1}
  .sd-score-of{font-size:9px;color:var(--dim)}
  .sd-verdict{font-size:22px;font-weight:800;letter-spacing:-0.5px}
  .sd-metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
  .sd-metric{background:#0a0e18;border:1px solid var(--borderf);border-radius:6px;padding:14px 16px}
  .sd-metric-val{font-size:18px;font-weight:800;font-family:monospace;line-height:1;margin-bottom:4px}
  .sd-metric-lbl{font-family:'Fira Code',ui-monospace,monospace;font-size:10px;color:var(--dim);font-weight:600;text-transform:uppercase;letter-spacing:0.3px}
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
    async function load() {
      const { data, error } = await getDealByShareId(shareId);
      if (error || !data) setNotFound(true);
      else setDeal(data);
      setLoading(false);
    }
    load();
  }, [shareId]);

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#07090f",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"var(--blue)",fontSize:14}}>Loading deal...</div>
    </div>
  );

  if (notFound) return (
    <div style={{minHeight:"100vh",background:"#07090f",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
      <div style={{fontSize:32}}>🏠</div>
      <div style={{fontSize:18,fontWeight:700,color:"var(--text)"}}>Deal not found</div>
      <div style={{fontSize:14,color:"var(--sub)"}}>This link may have expired or been removed.</div>
      <a href="/analyze" style={{marginTop:8,background:"var(--blue)",color:"#fff",borderRadius:8,padding:"10px 20px",fontSize:13,fontWeight:700,textDecoration:"none"}}>Analyze your own deal →</a>
    </div>
  );

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
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.04)",border:"1px solid var(--borderf)",borderRadius:99,padding:"4px 12px",fontSize:11,color:"var(--sub)",marginBottom:8}}>🔗 Shared deal analysis</div>
          <div style={{fontSize:13,color:"var(--dim)"}}>Analyzed with realdealestate.app</div>
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
