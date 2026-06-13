import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/TopNav";

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased}
  .pr-wrap{min-height:100vh;background:var(--bg)}
  .pr-nav{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;border-bottom:1px solid var(--borderf);position:sticky;top:0;background:rgba(255,255,255,0.95);backdrop-filter:blur(20px);z-index:100}
  .pr-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none;cursor:pointer}
  .pr-logo span{color:var(--blue)}
  .pr-nav-btn{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif}
  .pr-body{max-width:860px;margin:0 auto;padding:60px 20px 80px}
  .pr-hero{text-align:center;margin-bottom:56px}
  .pr-tag{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--blue);margin-bottom:16px}
  .pr-title{font-size:clamp(32px,5vw,52px);font-weight:800;color:var(--text);letter-spacing:-1.5px;line-height:1.1;margin-bottom:14px}
  .pr-title span{color:var(--blue)}
  .pr-sub{font-size:16px;color:var(--sub);max-width:440px;margin:0 auto;line-height:1.7}
  .pr-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  @media(max-width:640px){.pr-grid{grid-template-columns:1fr}}
  .pr-card{background:var(--card);border:1px solid var(--borderf);border-radius:6px;padding:32px 28px;position:relative}
  .pr-card.featured{border-color:var(--blue);box-shadow:0 0 0 1px rgba(59,158,255,0.3),0 20px 60px rgba(59,158,255,0.1)}
  .pr-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--blue);color:#fff;font-size:11px;font-weight:700;padding:4px 14px;border-radius:3px;letter-spacing:0.5px;white-space:nowrap}
  .pr-plan{font-size:12px;font-weight:700;color:var(--sub);letter-spacing:1px;text-transform:uppercase;margin-bottom:12px}
  .pr-price{font-size:48px;font-weight:800;color:var(--text);letter-spacing:-2px;line-height:1;margin-bottom:4px}
  .pr-price span{font-size:16px;font-weight:500;color:var(--sub);letter-spacing:0}
  .pr-price-note{font-size:12px;color:var(--dim);margin-bottom:24px}
  .pr-btn{width:100%;border:none;border-radius:6px;padding:13px;font-family:'Geist',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.15s;margin-bottom:28px}
  .pr-btn.free{background:rgba(15,23,42,0.06);color:var(--text);border:1px solid var(--borderf)}
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
  const [loading, setLoading] = useState(null); // null | "pro" | "scale"

  async function handleUpgrade(plan = "pro") {
    if (!user) { navigate("/login"); return; }
    setLoading(plan);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email, plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { alert("Something went wrong. Please try again."); setLoading(null); }
    } catch (err) {
      alert("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="pr-wrap">
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <TopNav />

      <div className="pr-body">
        <div className="pr-hero">
          <div className="pr-tag">🎉 Special Launch Offer</div>
          <div className="pr-title">Everything free.<br /><span>Right now.</span></div>
          <div className="pr-sub">All tools are free during our launch. Sign up, use everything, no credit card needed.</div>
        </div>

        {/* Launch Offer Banner */}
        <div style={{maxWidth:680,margin:"0 auto 32px",background:"linear-gradient(135deg,rgba(52,217,138,0.1),rgba(59,158,255,0.08))",border:"1px solid rgba(52,217,138,0.3)",borderRadius: 16,padding:"32px 36px",textAlign:"center"}}>
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

        {/* ── 3-TIER COMPARISON ──────────────────────────────────────────── */}
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 24px 32px"}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:11,fontWeight:700,color:"var(--blue)",letterSpacing:"1.6px",marginBottom:6}}>
              ▸ AFTER LAUNCH · PRICING
            </div>
            <div style={{fontSize:24,fontWeight:800,color:"var(--text)",letterSpacing:"-0.6px"}}>
              Three tiers. Pick what fits.
            </div>
            <div style={{fontSize:13,color:"var(--sub)",marginTop:6,lineHeight:1.55}}>
              Free during launch — these are the post-launch tiers. Lock in pricing early.
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:14}}>
            {[
              {
                plan: "free", label: "Free", price: "$0", per: "forever",
                color: "var(--sub)",
                blurb: "Try the platform. No credit card.",
                features: [
                  "All 20+ underwriting calculators",
                  "X-Ray address scan (Calgary · Edmonton · Vancouver · Toronto)",
                  "CMHC rent + vacancy on 26 Canadian metros",
                  "3 saved deals",
                  "Single-deal PDF export",
                ],
                cta: user ? "Currently using →" : "Sign up free →",
                action: () => navigate(user ? "/analyze" : "/login"),
                highlight: false,
              },
              {
                plan: "pro", label: "Pro", price: "$99", per: "per month",
                color: "var(--blue)",
                blurb: "Independent residential investors, BRRRR strategists.",
                features: [
                  "Everything in Free",
                  "Unlimited saved deals + Pipeline tracking",
                  "AI Read narrative on every surface (9 modes)",
                  "CMHC-anchored rent predictor (model-based)",
                  "All PDF exports (Investor Memo, Lender Package, Deal Report)",
                  "Email + chat support",
                ],
                cta: "Upgrade to Pro →",
                action: () => handleUpgrade("pro"),
                highlight: true,
              },
              {
                plan: "scale", label: "Scale", price: "$299", per: "per month",
                color: "var(--gold)",
                blurb: "Commercial brokers, land developers, wholesalers.",
                features: [
                  "Everything in Pro · unlimited",
                  "AI Document Drop (paste an OM → autofill the underwriter)",
                  "Institutional Risk Simulator (Monte Carlo, customizable priors)",
                  "Commercial Lease & Sales Matrix",
                  "Market Triggers — saved searches + weekly digest",
                  "Building quality grading (4-dimension institutional read)",
                  "Priority support · 24h SLA",
                ],
                cta: "Upgrade to Scale →",
                action: () => handleUpgrade("scale"),
                highlight: false,
                premium: true,  // marks the card for gold "PREMIUM" ribbon
              },
            ].map(tier => (
              <div key={tier.plan} style={{
                background: tier.premium ? "linear-gradient(180deg, rgba(255,204,0,0.06) 0%, var(--card) 60%)" : "var(--card)",
                border: `1px solid ${tier.premium || tier.highlight ? tier.color : "var(--borderf)"}`,
                borderRadius: 8,
                padding: 22,
                display: "flex", flexDirection: "column",
                boxShadow: tier.premium
                  ? `0 0 0 1px ${tier.color}66, 0 24px 64px rgba(255,204,0,0.18)`
                  : tier.highlight
                    ? `0 0 0 1px ${tier.color}55, 0 18px 56px rgba(0,102,204,0.15)`
                    : "none",
                position: "relative",
              }}>
                {tier.highlight && (
                  <div style={{
                    position: "absolute", top: -10, left: 16,
                    background: tier.color, color: "#ffffff",
                    fontFamily: "'Geist Mono',ui-monospace,monospace",
                    fontSize: 9.5, fontWeight: 700, letterSpacing: "1.2px",
                    padding: "3px 9px", borderRadius: 3,
                  }}>
                    MOST POPULAR
                  </div>
                )}
                {tier.premium && (
                  <div style={{
                    position: "absolute", top: -10, left: 16,
                    background: tier.color, color: "#0f172a",
                    fontFamily: "'Geist Mono',ui-monospace,monospace",
                    fontSize: 9.5, fontWeight: 800, letterSpacing: "1.3px",
                    padding: "3px 10px", borderRadius: 3,
                  }}>
                    ★ PREMIUM
                  </div>
                )}
                <div style={{
                  fontFamily: "'Geist Mono',ui-monospace,monospace",
                  fontSize: 11, fontWeight: 700, letterSpacing: "1.4px",
                  color: tier.color, marginBottom: 6,
                }}>
                  ▸ {tier.label.toUpperCase()}
                </div>
                <div style={{display:"flex", alignItems:"baseline", gap:6, marginBottom:6}}>
                  <span style={{fontFamily:"'Geist',sans-serif",fontSize:38,fontWeight:800,color:"var(--text)",letterSpacing:"-1.2px"}}>{tier.price}</span>
                  <span style={{fontSize:13,color:"var(--sub)"}}>{tier.per}</span>
                </div>
                <div style={{fontSize:13,color:"var(--sub)",lineHeight:1.5,marginBottom:14}}>
                  {tier.blurb}
                </div>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:7,marginBottom:18}}>
                  {tier.features.map(f => (
                    <div key={f} style={{display:"flex",alignItems:"baseline",gap:8,fontSize:12.5,color:"var(--text)",lineHeight:1.55}}>
                      <span style={{color:tier.color,flexShrink:0}}>✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={tier.action}
                  disabled={loading === tier.plan}
                  style={{
                    background: tier.highlight ? tier.color : "transparent",
                    color: tier.highlight ? "#ffffff" : tier.color,
                    border: tier.highlight ? "none" : `1px solid ${tier.color}`,
                    borderRadius: 5,
                    padding: "12px 18px",
                    fontFamily: "'Geist Mono',ui-monospace,monospace",
                    fontSize: 11.5, fontWeight: 700, letterSpacing: "1.2px",
                    cursor: loading === tier.plan ? "wait" : "pointer",
                    opacity: loading && loading !== tier.plan ? 0.5 : 1,
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 8px 22px ${tier.color}55`; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  {loading === tier.plan ? "OPENING…" : tier.cta}
                </button>
              </div>
            ))}
          </div>

          <div style={{textAlign:"center",marginTop:32,fontSize:12.5,color:"var(--dim)",lineHeight:1.65}}>
            All paid tiers cancel anytime · Course bundle ($1,497 + Pro $99/mo) coming soon · Annual pricing available on Scale
          </div>
        </div>

        <div style={{textAlign:"center",padding:"0 24px 60px",color:"var(--sub)",fontSize:13,lineHeight:1.7}}>
          Early users get a head start — and will always be taken care of.
        </div>
      </div>
    </div>
  );
}
