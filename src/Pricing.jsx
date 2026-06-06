import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#07090f;--card:#0d1119;--border:rgba(59,158,255,0.15);--borderf:rgba(255,255,255,0.07);--text:#dde4ef;--sub:#6b7d96;--dim:#3a4a60;--blue:#3b9eff;--green:#34d98a;--red:#f25c5c;--amber:#f0a030}
  body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
  .pr-wrap{min-height:100vh;background:var(--bg)}
  .pr-nav{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;border-bottom:1px solid var(--borderf);position:sticky;top:0;background:rgba(7,9,15,0.95);backdrop-filter:blur(20px);z-index:100}
  .pr-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none;cursor:pointer}
  .pr-logo span{color:var(--blue)}
  .pr-nav-btn{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}
  .pr-body{max-width:860px;margin:0 auto;padding:60px 20px 80px}
  .pr-hero{text-align:center;margin-bottom:56px}
  .pr-tag{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--blue);margin-bottom:16px}
  .pr-title{font-size:clamp(32px,5vw,52px);font-weight:800;color:var(--text);letter-spacing:-1.5px;line-height:1.1;margin-bottom:14px}
  .pr-title span{color:var(--blue)}
  .pr-sub{font-size:16px;color:var(--sub);max-width:440px;margin:0 auto;line-height:1.7}
  .pr-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  @media(max-width:640px){.pr-grid{grid-template-columns:1fr}}
  .pr-card{background:var(--card);border:1px solid var(--borderf);border-radius:18px;padding:32px 28px;position:relative}
  .pr-card.featured{border-color:var(--blue);box-shadow:0 0 0 1px rgba(59,158,255,0.3),0 20px 60px rgba(59,158,255,0.1)}
  .pr-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--blue);color:#fff;font-size:11px;font-weight:700;padding:4px 14px;border-radius:99px;letter-spacing:0.5px;white-space:nowrap}
  .pr-plan{font-size:12px;font-weight:700;color:var(--sub);letter-spacing:1px;text-transform:uppercase;margin-bottom:12px}
  .pr-price{font-size:48px;font-weight:800;color:var(--text);letter-spacing:-2px;line-height:1;margin-bottom:4px}
  .pr-price span{font-size:16px;font-weight:500;color:var(--sub);letter-spacing:0}
  .pr-price-note{font-size:12px;color:var(--dim);margin-bottom:24px}
  .pr-btn{width:100%;border:none;border-radius:10px;padding:13px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.18s;margin-bottom:28px}
  .pr-btn.free{background:rgba(255,255,255,0.06);color:var(--text);border:1px solid var(--borderf)}
  .pr-btn.free:hover{background:rgba(255,255,255,0.1)}
  .pr-btn.pro{background:var(--blue);color:#fff;box-shadow:0 4px 16px rgba(59,158,255,0.3)}
  .pr-btn.pro:hover{background:#5aaeff;transform:translateY(-1px);box-shadow:0 8px 24px rgba(59,158,255,0.4)}
  .pr-btn:disabled{background:var(--dim);cursor:not-allowed;transform:none;box-shadow:none}
  .pr-divider{height:1px;background:var(--borderf);margin-bottom:24px}
  .pr-features{display:flex;flex-direction:column;gap:11px}
  .pr-feature{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--sub);line-height:1.5}
  .pr-feature-icon{flex-shrink:0;margin-top:1px}
  .pr-feature.included{color:var(--text)}
  .pr-feature.excluded{color:var(--dim)}
  .pr-feature.highlight{color:var(--green);font-weight:600}
  .pr-guarantee{text-align:center;margin-top:36px;font-size:13px;color:var(--dim)}
  .pr-guarantee strong{color:var(--sub)}
`;

const FREE_FEATURES = [
  { text: "Flip deal analyzer — score, ARV, verdict", included: true },
  { text: "Full flip calculator (unlimited)", included: true },
  { text: "Rental rate estimator", included: true },
  { text: "US + Canada markets", included: true },
  { text: "3 saved deals", included: true },
  { text: "Commercial multi-family analyzer", included: false },
  { text: "Unlimited deal saves", included: false },
  { text: "NOI, cap rate & DSCR calculator", included: false },
  { text: "Pipeline dashboard", included: false },
];

const PRO_FEATURES = [
  { text: "Everything in Free", included: true },
  { text: "Commercial multi-family analyzer", included: true, highlight: true },
  { text: "NOI, cap rate & DSCR calculator", included: true, highlight: true },
  { text: "Cash-on-cash & GRM analysis", included: true, highlight: true },
  { text: "Unlimited deal saves", included: true },
  { text: "Dashboard — track your pipeline", included: true },
  { text: "Tiered realtor commission calculator", included: true },
  { text: "Priority support", included: true },
  { text: "Cancel anytime", included: true },
];

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    if (!user) { navigate("/login"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { alert("Something went wrong. Please try again."); setLoading(false); }
    } catch (err) {
      alert("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="pr-wrap">
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap" rel="stylesheet" />

      <nav className="pr-nav">
        <div className="pr-logo" onClick={() => navigate("/")}><span>Real</span> Deal</div>
        <button className="pr-nav-btn" onClick={() => navigate(user ? "/analyze" : "/login")}>
          {user ? "Go to app →" : "Sign up free →"}
        </button>
      </nav>

      <div className="pr-body">
        <div className="pr-hero">
          <div className="pr-tag">🎉 Special Launch Offer</div>
          <div className="pr-title">Everything free.<br /><span>Right now.</span></div>
          <div className="pr-sub">All tools are free during our launch. Sign up, use everything, no credit card needed.</div>
        </div>

        {/* Launch Offer Banner */}
        <div style={{maxWidth:680,margin:"0 auto 32px",background:"linear-gradient(135deg,rgba(52,217,138,0.1),rgba(59,158,255,0.08))",border:"1px solid rgba(52,217,138,0.3)",borderRadius:20,padding:"32px 36px",textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:12}}>🎉</div>
          <div style={{fontSize:24,fontWeight:800,color:"var(--text)",letterSpacing:"-0.5px",marginBottom:8}}>Free Access — Limited Time</div>
          <div style={{fontSize:15,color:"var(--sub)",lineHeight:1.65,marginBottom:24,maxWidth:460,margin:"0 auto 24px"}}>
            We're in launch mode. Every tool — Flip Analyzer, BRRRR Calculator, Multifamily Underwriter, Deal Comparison — is completely free. Get in early.
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center",marginBottom:28}}>
            {["🏚️ Fix & Flip Analyzer","🔄 BRRRR Calculator","🏢 Multifamily Underwriter","⚡ Deal Comparison","💾 Save & Compare Deals","📊 Sensitivity Analysis","📈 5-Year Projections","📄 PDF Export"].map(f => (
              <span key={f} style={{background:"rgba(52,217,138,0.1)",border:"1px solid rgba(52,217,138,0.2)",borderRadius:99,padding:"5px 14px",fontSize:12,fontWeight:600,color:"var(--green)"}}>{f}</span>
            ))}
          </div>
          <button
            className="pr-btn pro"
            style={{fontSize:15,padding:"13px 36px"}}
            onClick={() => navigate(user ? "/analyze" : "/login")}
          >
            {user ? "Go to all tools →" : "Sign up free — no card needed →"}
          </button>
          <div style={{fontSize:12,color:"var(--dim)",marginTop:12}}>Takes 30 seconds. Cancel anytime (there's nothing to cancel).</div>
        </div>

        <div style={{textAlign:"center",padding:"0 24px 60px",color:"var(--sub)",fontSize:13,lineHeight:1.7}}>
          Pricing will be introduced later. Early users get a head start — and will always be taken care of.
        </div>
      </div>
    </div>
  );
}
