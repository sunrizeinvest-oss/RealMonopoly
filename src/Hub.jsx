import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import TopNav from "./components/TopNav";
import RecentDeals from "./components/RecentDeals";
import OnboardingTour from "./components/OnboardingTour";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}

  .hub-wrap{min-height:100vh;background:var(--bg);display:flex;flex-direction:column}

  /* Nav */
  .hub-nav{position:sticky;top:0;z-index:100;background:rgba(7,9,15,0.95);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .hub-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none}.hub-logo span{color:var(--blue)}
  .hub-nav-right{display:flex;align-items:center;gap:10px}
  .hub-nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:6px 12px;border-radius:7px}.hub-nav-link:hover{color:var(--text)}
  .hub-nav-btn{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none}
  .hub-nav-ghost{background:transparent;color:var(--sub);border:1px solid var(--borderf);border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif}.hub-nav-ghost:hover{color:var(--text)}

  /* Hero */
  .hub-hero{text-align:center;padding:72px 24px 48px;position:relative;overflow:hidden}
  .hub-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(59,158,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(59,158,255,0.02) 1px,transparent 1px);background-size:56px 56px;pointer-events:none}
  .hub-glow{position:absolute;top:-10%;left:50%;transform:translateX(-50%);width:800px;height:400px;background:radial-gradient(ellipse,rgba(59,158,255,0.07) 0%,transparent 65%);pointer-events:none}
  .hub-hero h1{font-size:clamp(30px,5vw,52px);font-weight:800;letter-spacing:-2px;color:var(--text);line-height:1.05;margin-bottom:14px;position:relative;z-index:1}
  .hub-hero p{font-size:16px;color:var(--sub);max-width:480px;margin:0 auto;line-height:1.6;position:relative;z-index:1}

  /* Cards */
  .hub-cards{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:960px;margin:0 auto;padding:0 24px 80px;width:100%}
  .hub-section-label{grid-column:1/-1;font-family:'Fira Code',ui-monospace,monospace;font-size:10.5px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:1.4px;padding-top:8px}
  .hub-section-label::before{content:"// "}
  .hub-card.worth{border-color:rgba(255,180,60,0.25);background:linear-gradient(135deg,rgba(255,180,60,0.04) 0%,var(--card) 60%)}
  .hub-card.worth:hover{border-color:rgba(255,180,60,0.5);box-shadow:0 16px 48px rgba(255,180,60,0.08)}
  .hub-card{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:28px 26px;cursor:pointer;transition:all 0.15s;position:relative;display:flex;flex-direction:column;gap:12px}
  .hub-card:hover{border-color:rgba(59,158,255,0.45);transform:translateY(-2px);box-shadow:0 12px 36px rgba(0,0,0,0.45)}
  .hub-card::before{content:"";position:absolute;top:14px;left:18px;font-family:'Fira Code',monospace;font-size:9.5px;font-weight:700;color:var(--dim);letter-spacing:0.7px}
  .hub-card.featured{border-color:rgba(52,217,138,0.3);background:linear-gradient(135deg,rgba(52,217,138,0.04) 0%,var(--card) 60%)}
  .hub-card.featured:hover{border-color:rgba(52,217,138,0.55);box-shadow:0 12px 36px rgba(52,217,138,0.1)}

  .hub-card-badge{position:absolute;top:18px;right:18px;background:rgba(52,217,138,0.08);color:var(--green);border:1px solid rgba(52,217,138,0.4);font-family:'Fira Code',monospace;font-size:9px;font-weight:700;letter-spacing:0.8px;padding:3px 8px;border-radius:3px}
  .hub-card-icon{font-size:34px;line-height:1;margin-top:14px}
  .hub-card-title{font-size:19px;font-weight:800;color:var(--text);letter-spacing:-0.4px}
  .hub-card-sub{font-size:13px;color:var(--sub);line-height:1.55}
  .hub-card-divider{height:1px;background:var(--borderf);margin:4px 0}
  .hub-card-pills{display:flex;flex-wrap:wrap;gap:6px}
  .hub-pill{background:rgba(255,255,255,0.025);border:1px solid var(--borderf);border-radius:3px;padding:2px 8px;font-family:'Fira Code',monospace;font-size:10px;color:var(--sub);font-weight:600;letter-spacing:0.3px}
  .hub-card.featured .hub-pill{border-color:rgba(52,217,138,0.18);color:var(--sub)}
  .hub-card-cta{margin-top:auto;padding-top:10px;font-family:'Fira Code',monospace;font-size:12px;font-weight:700;letter-spacing:0.6px;color:var(--blue);display:flex;align-items:center;gap:6px;text-transform:uppercase}
  .hub-card.featured .hub-card-cta{color:var(--green)}

  @media(max-width:640px){
    .hub-cards{grid-template-columns:1fr}
    .hub-hero{padding:48px 16px 36px}
    .hub-cards{padding:0 16px 60px}
  }
`;

export default function Hub() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const upgraded = new URLSearchParams(location.search).get("upgraded") === "true";

  return (
    <div className="hub-wrap">
      <style>{CSS}</style>

      <TopNav />

      {/* Upgrade success banner */}
      {upgraded && (
        <div style={{background:"rgba(52,217,138,0.08)",borderBottom:"1px solid rgba(52,217,138,0.2)",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
          <span style={{fontSize:20}}>🎉</span>
          <div>
            <span style={{fontSize:14,fontWeight:700,color:"var(--green)"}}>Welcome to Pro! </span>
            <span style={{fontSize:14,color:"var(--sub)"}}>All tools are now unlocked. You're all set.</span>
          </div>
        </div>
      )}

      <div className="hub-hero">
        <div className="hub-glow" />
        <h1>What are you analyzing today?</h1>
        <p>Type an address to get everything — property data, comps, rent estimates, AI analysis, and calculators — all on one page.</p>
        <div data-tour="search" style={{maxWidth:600,margin:"20px auto 0",display:"flex",gap:10}}>
          <input
            style={{flex:1,background:"var(--card2)",border:"1px solid var(--borderf)",borderRadius:10,padding:"12px 16px",fontSize:14,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",outline:"none"}}
            placeholder="Enter any address — US or Canadian property"
            onKeyDown={e => { if(e.key==="Enter" && e.target.value.trim()) { localStorage.setItem("rde_prefill", JSON.stringify({searchQuery:e.target.value.trim(),timestamp:Date.now()})); navigate("/property"); } }}
          />
          <button
            style={{background:"var(--blue)",color:"#fff",border:"none",borderRadius:10,padding:"12px 20px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}
            onClick={e => { const inp = e.target.previousSibling; if(inp?.value?.trim()) { localStorage.setItem("rde_prefill", JSON.stringify({searchQuery:inp.value.trim(),timestamp:Date.now()})); navigate("/property"); } else navigate("/property"); }}
          >
            🔍 Analyze →
          </button>
        </div>
        <div style={{fontSize:12,color:"var(--dim)",marginTop:10}}>Or choose a specific tool below</div>
      </div>

      {/* Resume the user's recent saved deals — silent empty state when none */}
      <RecentDeals limit={6} />

      <div className="hub-cards" data-tour="hub-cards">
        {/* Flip Card */}
        <div className="hub-card" onClick={() => navigate("/app")}>
          <div className="hub-card-badge" style={{background:"linear-gradient(135deg,var(--purple),var(--blue))"}}>🤖 AI</div>
          <div className="hub-card-icon">🏚️</div>
          <div className="hub-card-title">Fix &amp; Flip Analyzer</div>
          <div className="hub-card-sub">Full acquisition-to-exit analysis. Get an AI verdict — strengths, risks, price recommendation — in one click after running your numbers.</div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["ARV", "Profit Margin", "Deal Grade", "🤖 AI Analysis", "Offer Letter", "Lender Package"].map(p => (
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
          <div className="hub-card-cta">Analyze a flip →</div>
        </div>

        {/* Commercial Card */}
        <div className="hub-card featured" onClick={() => navigate("/commercial")}>
          <div className="hub-card-badge" style={{background:"linear-gradient(135deg,var(--green),var(--blue))"}}>FREE NOW</div>
          <div className="hub-card-icon">🏢</div>
          <div className="hub-card-title">Multifamily Underwriter</div>
          <div className="hub-card-sub">Institutional-grade underwriting template for income properties. NOI, DSCR, cap rate, cash-on-cash, deal verdict and checklist.</div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["Cap Rate", "DSCR", "Cash-on-Cash", "NOI", "GRM", "Deal Verdict", "PDF Export"].map(p => (
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
          <div className="hub-card-cta">Underwrite a deal →</div>
        </div>

        {/* BRRRR Card */}
        <div className="hub-card" style={{borderColor:"rgba(167,130,255,0.2)"}} onClick={() => navigate("/brrrr")}>
          <div className="hub-card-icon">🔄</div>
          <div className="hub-card-title">BRRRR Calculator</div>
          <div className="hub-card-sub">Model your Buy, Rehab, Rent, Refinance, Repeat strategy. See if you get all your money back and what it cash flows after.</div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["Cash Recycled", "Equity Created", "Cash-on-Cash", "DSCR", "Post-Refi CF"].map(p => (
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
          <div className="hub-card-cta" style={{color:"var(--purple)"}}>Model a BRRRR →</div>
        </div>

        {/* Compare Card */}
        <div className="hub-card" style={{borderColor:"rgba(240,160,48,0.2)"}} onClick={() => navigate("/compare")}>
          <div className="hub-card-icon">⚡</div>
          <div className="hub-card-title">Deal Comparison</div>
          <div className="hub-card-sub">Put two deals head-to-head. Every metric scored live — green wins, you decide. Works for flips and multifamily.</div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["Side-by-Side", "Live Scoring", "Winner Flags", "Flip & MF", "Cap Rate", "CoC"].map(p => (
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
          <div className="hub-card-cta" style={{color:"var(--amber)"}}>Compare deals →</div>
        </div>

        {/* What's My Property Worth Card — full width */}
        <div className="hub-card worth" style={{gridColumn:"1 / -1"}} onClick={() => navigate("/worth")}>
          <div className="hub-card-badge" style={{background:"linear-gradient(135deg,#ffb43c,var(--red))"}}>NEW</div>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <div className="hub-card-icon" style={{fontSize:48}}>🏠</div>
            <div style={{flex:1}}>
              <div className="hub-card-title">What's My Property Worth?</div>
              <div className="hub-card-sub" style={{maxWidth:560}}>Instant property valuation + rental income estimate — no API key needed. Share with sellers or investors who don't know their numbers. Get value range, rent, cap rate, cash flow, and a strategy recommendation in seconds.</div>
            </div>
            <div className="hub-card-cta" style={{color:"#ffb43c",whiteSpace:"nowrap",fontSize:16}}>Estimate value →</div>
          </div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["Value Range", "Rent Estimate", "Cap Rate", "Cash Flow", "GRM", "DSCR", "CoC Return", "Instant Results", "No Login Needed"].map(p => (
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
        </div>

        {/* ── Planning Tools ────────────────────────────────────────── */}
        <div className="hub-section-label">🛠️ Planning Tools</div>

        {/* Quick Deal Screener */}
        <div className="hub-card" style={{borderColor:"rgba(52,217,138,0.2)"}} onClick={() => navigate("/screen")}>
          <div className="hub-card-badge" style={{background:"linear-gradient(135deg,var(--green),var(--blue))"}}>FAST</div>
          <div className="hub-card-icon">⚡</div>
          <div className="hub-card-title">Quick Deal Screener</div>
          <div className="hub-card-sub">Standing in front of a property? 3 numbers in, instant pass/fail. Asking price, ARV, repairs → your max offer and verdict in 5 seconds. Built for the field.</div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["3 Inputs","Instant Verdict","Max Offer","70% Rule","Add to Pipeline","Mobile-First"].map(p => (
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
          <div className="hub-card-cta" style={{color:"var(--green)"}}>Screen a deal →</div>
        </div>

        {/* Budget Tracker */}
        <div className="hub-card" style={{borderColor:"rgba(167,130,255,0.2)"}} onClick={() => navigate("/budget")}>
          <div className="hub-card-icon">📊</div>
          <div className="hub-card-title">Rehab Budget Tracker</div>
          <div className="hub-card-sub">Track actual expenses vs your rehab estimate during an active renovation. Log by category, see live variance, and know your real cost basis at closing.</div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["Actual vs Budget","By Category","Live Variance","Receipt Logging","Export to Flip Calc","Multi-Deal"].map(p => (
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
          <div className="hub-card-cta" style={{color:"var(--purple)"}}>Track rehab costs →</div>
        </div>

        {/* Rehab Estimator Card */}
        <div className="hub-card" style={{borderColor:"rgba(240,160,48,0.2)"}} onClick={() => navigate("/rehab")}>
          <div className="hub-card-badge" style={{background:"linear-gradient(135deg,var(--amber),var(--red))"}}>NEW</div>
          <div className="hub-card-icon">🔨</div>
          <div className="hub-card-title">Rehab Cost Estimator</div>
          <div className="hub-card-sub">Estimate renovation costs by room and category. Kitchen, baths, flooring, roof, HVAC, and more — with condition-based ranges. Push your budget straight into the Flip Analyzer.</div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["By Category", "Cost Ranges", "Condition-Based", "Auto-Fill Flip", "Contingency"].map(p => (
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
          <div className="hub-card-cta" style={{color:"var(--amber)"}}>Estimate rehab →</div>
        </div>

        {/* Tax / Depreciation Card */}
        <div className="hub-card" style={{borderColor:"rgba(52,217,138,0.2)"}} onClick={() => navigate("/tax")}>
          <div className="hub-card-badge" style={{background:"linear-gradient(135deg,var(--green),var(--blue))"}}>NEW</div>
          <div className="hub-card-icon">💸</div>
          <div className="hub-card-title">Depreciation &amp; Tax Calculator</div>
          <div className="hub-card-sub">See the full tax advantage of real estate. Annual depreciation, paper loss deductions, cost segregation year-1 bonus, and 10-year cumulative tax savings — by bracket.</div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["27.5yr Residential", "39yr Commercial", "Cost Segregation", "PAL Rules", "10-Yr Projection"].map(p => (
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
          <div className="hub-card-cta" style={{color:"var(--green)"}}>Calculate tax savings →</div>
        </div>

        {/* ── Deal Pipeline + Portfolio ─────────────────────────────── */}
        <div className="hub-section-label">📊 Pipeline &amp; Performance</div>

        {/* Net Worth Dashboard — full width */}
        <div className="hub-card" style={{gridColumn:"1 / -1",borderColor:"rgba(52,217,138,0.25)",background:"linear-gradient(135deg,rgba(52,217,138,0.04),var(--card))"}} onClick={() => navigate("/networth")}>
          <div className="hub-card-badge" style={{background:"linear-gradient(135deg,var(--green),var(--blue))"}}>NEW</div>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <div className="hub-card-icon" style={{fontSize:48}}>💎</div>
            <div style={{flex:1}}>
              <div className="hub-card-title">Net Worth Dashboard</div>
              <div className="hub-card-sub" style={{maxWidth:560}}>Your live real estate balance sheet. Track properties, equity, mortgage debt, cash accounts, monthly cash flow, closed profits, and pipeline value — all in one number. Save monthly snapshots to watch your net worth grow.</div>
            </div>
            <div className="hub-card-cta" style={{color:"var(--green)",whiteSpace:"nowrap",fontSize:16}}>View net worth →</div>
          </div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["Total Net Worth","Property Equity","Monthly Cash Flow","Asset Allocation","Net Worth Chart","Live Balance Sheet"].map(p=>(
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
        </div>

        {/* Pipeline Card */}
        <div className="hub-card" style={{borderColor:"rgba(59,158,255,0.25)",background:"linear-gradient(135deg,rgba(59,158,255,0.04),var(--card))"}} onClick={() => navigate("/pipeline")}>
          <div className="hub-card-badge" style={{background:"linear-gradient(135deg,var(--blue),var(--purple))"}}>NEW</div>
          <div className="hub-card-icon">🗂️</div>
          <div className="hub-card-title">Deal Pipeline</div>
          <div className="hub-card-sub">Your deal CRM. Track every lead from first look to closed — drag and drop through 7 stages. See total projected profit in your pipeline, days per stage, and one-click analyze any deal.</div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["Kanban Board","Drag & Drop","7 Stages","Projected Profit","Days Tracker","One-click Analyze"].map(p => (
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
          <div className="hub-card-cta" style={{color:"var(--blue)"}}>Open pipeline →</div>
        </div>
        <div className="hub-card" style={{gridColumn:"1 / -1",borderColor:"rgba(52,217,138,0.2)",background:"linear-gradient(135deg,rgba(52,217,138,0.03),var(--card))"}} onClick={() => navigate("/portfolio")}>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <div className="hub-card-icon" style={{fontSize:48}}>🏆</div>
            <div style={{flex:1}}>
              <div className="hub-card-title">Portfolio Tracker</div>
              <div className="hub-card-sub" style={{maxWidth:560}}>Your investor scoreboard. Track every closed deal — total profit earned, win rate, average ROI, average hold time, profit by month, and your best deal ever. The numbers that tell your real story.</div>
            </div>
            <div className="hub-card-cta" style={{color:"var(--green)",whiteSpace:"nowrap",fontSize:16}}>View portfolio →</div>
          </div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["Total Profit","Win Rate","Avg ROI","Profit Timeline","Strategy Breakdown","Best Deal"].map(p => (
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
        </div>

        {/* Canadian Mortgage Qualifier */}
        <div className="hub-card" style={{borderColor:"rgba(240,160,48,0.2)"}} onClick={() => navigate("/qualify")}>
          <div className="hub-card-badge" style={{background:"linear-gradient(135deg,var(--amber),var(--green))"}}>🇨🇦 Canada</div>
          <div className="hub-card-icon">🏦</div>
          <div className="hub-card-title">Mortgage Qualifier</div>
          <div className="hub-card-sub">OSFI B-20 stress test calculator. See if you qualify at the qualifying rate, your max purchase price, GDS/TDS ratios, and CMHC insurance costs.</div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["Stress Test","GDS/TDS","Max Price","CMHC Insurance","Co-Borrower"].map(p=>(
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
          <div className="hub-card-cta" style={{color:"var(--amber)"}}>Check qualification →</div>
        </div>

        {/* Submit a Deal — full width */}
        <div className="hub-card" style={{gridColumn:"1 / -1",borderColor:"rgba(52,217,138,0.2)",background:"linear-gradient(135deg,rgba(52,217,138,0.03),var(--card))"}} onClick={() => navigate("/submit")}>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <div className="hub-card-icon" style={{fontSize:48}}>📬</div>
            <div style={{flex:1}}>
              <div className="hub-card-title">Submit a Deal</div>
              <div className="hub-card-sub" style={{maxWidth:560}}>Share this link on Instagram, TikTok, and with your network. Anyone who finds an off-market deal submits it here — it goes straight into your pipeline. If you close it, they earn a finder's fee.</div>
            </div>
            <div className="hub-card-cta" style={{color:"var(--green)",whiteSpace:"nowrap",fontSize:16}}>Share the link →</div>
          </div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["Public Form","Auto-Pipeline","Finder's Fee","Mobile-First","Canada-Wide","No Login Needed"].map(p=>(
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
        </div>

        {/* Distress Checker — full width */}
        <div className="hub-card" style={{gridColumn:"1 / -1",borderColor:"rgba(242,92,92,0.2)",background:"linear-gradient(135deg,rgba(242,92,92,0.03),var(--card))"}} onClick={() => navigate("/distress")}>
          <div className="hub-card-badge" style={{background:"linear-gradient(135deg,var(--red),var(--amber))"}}>🇨🇦 Canada</div>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <div className="hub-card-icon" style={{fontSize:48}}>🔍</div>
            <div style={{flex:1}}>
              <div className="hub-card-title">Distress Signal Checker</div>
              <div className="hub-card-sub" style={{maxWidth:560}}>Research any Canadian property in minutes. Check 15 distress signals — tax liens, foreclosures, stacked mortgages, corporate owners with no filings, empty homes, expired MLS — with one-click links to BC Assessment, LTSA, provincial court registries, and city portals.</div>
            </div>
            <div className="hub-card-cta" style={{color:"var(--red)",whiteSpace:"nowrap",fontSize:16}}>Research a deal →</div>
          </div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["15 Signals","BC/AB/ON","Tax Liens","Foreclosures","Title Search Links","Save to Pipeline"].map(p=>(
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
        </div>

        {/* Deal Alerts */}
        <div className="hub-card" style={{borderColor:"rgba(59,158,255,0.2)"}} onClick={() => navigate("/alerts")}>
          <div className="hub-card-badge" style={{background:"linear-gradient(135deg,var(--blue),var(--green))"}}>NEW</div>
          <div className="hub-card-icon">🔔</div>
          <div className="hub-card-title">Deal Alerts</div>
          <div className="hub-card-sub">Set your criteria — city, max price, min bedrooms, property type. We check Realtor.ca and the MLS daily and email you when matching listings appear.</div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["Daily Check","Realtor.ca","MLS","Email Digest","Canada + US","Save Criteria"].map(p=>(
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
          <div className="hub-card-cta" style={{color:"var(--blue)"}}>Set up alerts →</div>
        </div>

        {/* ── Learning & Discovery ───────────────────────────────────── */}
        <div className="hub-section-label">📚 Learning &amp; Discovery</div>

        {/* Strategy Quiz Card */}
        <div className="hub-card" style={{borderColor:"rgba(167,130,255,0.2)"}} onClick={() => navigate("/quiz")}>
          <div className="hub-card-icon">🧠</div>
          <div className="hub-card-title">Strategy Fit Quiz</div>
          <div className="hub-card-sub">Not sure which strategy is right for you? Answer 7 quick questions — budget, timeline, risk tolerance, experience — and we'll recommend your best investment strategy.</div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["7 Questions", "2 Minutes", "Flip vs BRRRR vs Rental", "Scored Result", "Auto-Route"].map(p => (
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
          <div className="hub-card-cta" style={{color:"var(--purple)"}}>Take the quiz →</div>
        </div>

        {/* Education Hub Card */}
        <div className="hub-card" style={{borderColor:"rgba(59,158,255,0.2)"}} onClick={() => navigate("/learn")}>
          <div className="hub-card-icon">📖</div>
          <div className="hub-card-title">Investor Education Hub</div>
          <div className="hub-card-sub">Searchable glossary of 20+ key metrics, strategy breakdowns, quick-reference rules (70% Rule, 1% Rule, DSCR ≥ 1.25), red flags to watch, and market timing signals.</div>
          <div className="hub-card-divider" />
          <div className="hub-card-pills">
            {["Glossary", "Formulas", "Rules of Thumb", "Red Flags", "Market Signals", "Searchable"].map(p => (
              <span key={p} className="hub-pill">{p}</span>
            ))}
          </div>
          <div className="hub-card-cta" style={{color:"var(--blue)"}}>Start learning →</div>
        </div>

      </div>

      <OnboardingTour />
    </div>
  );
}
