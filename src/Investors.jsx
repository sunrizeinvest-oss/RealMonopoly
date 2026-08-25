/**
 * Investors — /investors — Investor Side landing page.
 *
 * Dedicated destination for individual investors, homeowners, BRRRR operators,
 * retail buyers — "the masses." Same underwriting engine as the brokers page,
 * but messaging tuned to the person who's analyzing their OWN next door, not
 * a client's deal.
 *
 * Wedge: X-Ray bar + BRRRR calculator.
 * Pricing focus: Free tier → $99 Pro.
 * Primary CTA: Try free now (no signup wall on the X-Ray).
 * Visual differentiation: royal-blue accent (vs Brokers page's brass).
 */

import { useNavigate } from "react-router-dom";
import TopNav from "./components/TopNav";
import { useDocMeta } from "./lib/seo";

export default function Investors() {
  useDocMeta({
    title: "For Investors · RizeAI — Know if it's a real deal in seconds",
    description: "AI underwriting for Canadian individual real estate investors. Type any address, get the X-Ray. Run BRRRR math, check zoning, see CMHC rents — all free to start. $99/mo Pro tier.",
  });
  const navigate = useNavigate();

  const css = `
    .iv-page{background:#0a1128;color:#f0f0f0;font-family:'Geist',sans-serif;min-height:100vh}
    body:has(.iv-page){background:#0a1128}

    .iv-hero{padding:80px 24px 48px;text-align:center;position:relative;overflow:hidden}
    .iv-hero::before{content:'';position:absolute;top:-20%;left:50%;transform:translateX(-50%);width:900px;height:600px;background:radial-gradient(ellipse,rgba(33,85,205,0.14) 0%,transparent 65%);pointer-events:none}
    .iv-hero-inner{max-width:960px;margin:0 auto;position:relative;z-index:1}
    .iv-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#5b8eff;background:rgba(10,17,40,0.55);backdrop-filter:blur(10px);border:1px solid rgba(91,142,255,0.35);padding:7px 14px;border-radius:4px;margin-bottom:22px}
    .iv-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:#5b8eff;animation:iv-blink 2s infinite;box-shadow:0 0 8px #5b8eff}
    @keyframes iv-blink{0%,100%{opacity:1}50%{opacity:0.2}}
    .iv-h1{font-size:clamp(34px,5.5vw,58px);font-weight:800;line-height:1.04;letter-spacing:-2.2px;color:#ffffff;margin:0 0 20px}
    .iv-h1 span{color:#5b8eff;font-style:italic;font-weight:700}
    .iv-sub{font-size:17px;color:#d4d8e0;line-height:1.7;max-width:660px;margin:0 auto 30px}
    .iv-hero-cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:24px}
    .iv-btn{background:#2155cd;color:#fff;border:none;border-radius:4px;padding:14px 26px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12.5px;font-weight:800;letter-spacing:0.6px;cursor:pointer;text-transform:uppercase;transition:all 0.15s;text-decoration:none;display:inline-block}
    .iv-btn:hover{transform:translateY(-1px);box-shadow:0 14px 32px rgba(33,85,205,0.4);background:#3265dd}
    .iv-btn.ghost{background:transparent;color:#d4d8e0;border:1px solid rgba(91,142,255,0.4)}
    .iv-btn.ghost:hover{border-color:#5b8eff;color:#5b8eff;box-shadow:none;background:rgba(33,85,205,0.06)}
    .iv-hero-trust{display:flex;justify-content:center;gap:18px;flex-wrap:wrap;margin-top:10px}
    .iv-trust-pill{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:0.4px}
    .iv-trust-pill::before{content:'✓ ';color:#22c55e;font-weight:700}

    .iv-inner{max-width:1100px;margin:0 auto;padding:8px 24px 80px}

    /* ── Pain row ── */
    .iv-pain{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:24px 0 56px}
    .iv-pain-card{padding:20px 22px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px}
    .iv-pain-tag{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#dc2626;text-transform:uppercase;margin-bottom:10px}
    .iv-pain-h{font-size:16px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;margin:0 0 6px;line-height:1.3}
    .iv-pain-body{font-size:13.5px;color:#d4d8e0;line-height:1.6}

    /* ── Section ── */
    .iv-section{margin-bottom:54px}
    .iv-section-tag{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#5b8eff;margin-bottom:14px;display:flex;align-items:center;gap:8px}
    .iv-section-tag::after{content:'';flex:1;height:1px;background:rgba(91,142,255,0.18);margin-left:12px}
    .iv-section-h{font-size:clamp(24px,3vw,32px);font-weight:800;color:#ffffff;letter-spacing:-1px;line-height:1.15;margin:0 0 14px}
    .iv-section-h span{color:#5b8eff;font-style:italic}
    .iv-section-sub{font-size:15.5px;color:#d4d8e0;line-height:1.7;max-width:760px;margin-bottom:24px}

    /* ── Tool grid ── */
    .iv-tools{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
    .iv-tool{padding:22px 24px;background:linear-gradient(180deg,rgba(33,85,205,0.06) 0%,rgba(255,255,255,0.02) 100%);border:1px solid rgba(91,142,255,0.22);border-left:2px solid #2155cd;border-radius:6px;cursor:pointer;transition:all 0.2s}
    .iv-tool:hover{border-color:#5b8eff;transform:translateY(-2px);box-shadow:0 14px 32px rgba(33,85,205,0.18)}
    .iv-tool-tag{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#5b8eff;text-transform:uppercase;margin-bottom:10px}
    .iv-tool-h{font-size:16px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;margin:0 0 6px;line-height:1.3}
    .iv-tool-body{font-size:13.5px;color:#d4d8e0;line-height:1.6;margin-bottom:10px}
    .iv-tool-link{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:0.5px;color:#5b8eff;text-transform:uppercase}

    /* ── Workflow steps ── */
    .iv-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}
    .iv-step{padding:22px 24px;background:rgba(0,0,0,0.25);border:1px solid rgba(91,142,255,0.22);border-radius:4px}
    .iv-step-num{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.6px;color:#5b8eff;margin-bottom:10px}
    .iv-step-h{font-size:15.5px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;margin:0 0 6px;line-height:1.3}
    .iv-step-body{font-size:13.5px;color:#d4d8e0;line-height:1.55}

    /* ── Pricing card ── */
    .iv-pricing{display:grid;grid-template-columns:1fr 1.4fr;gap:16px;margin-top:18px}
    .iv-price-free{padding:24px 26px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:6px}
    .iv-price-feature{padding:28px 30px;background:linear-gradient(135deg,rgba(33,85,205,0.14),rgba(91,142,255,0.04));border:1.5px solid #2155cd;border-radius:6px;position:relative}
    .iv-price-feature::before{content:'▸ FOR INVESTORS · MOST POPULAR';position:absolute;top:-9px;left:24px;font-family:'Geist Mono',ui-monospace,monospace;font-size:9.5px;font-weight:800;letter-spacing:1.4px;color:#ffffff;background:#2155cd;padding:3px 10px;border-radius:2px}
    .iv-price-tier{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.4px;color:#5b8eff;text-transform:uppercase;margin-bottom:10px;margin-top:6px}
    .iv-price-num{font-size:42px;font-weight:800;color:#ffffff;letter-spacing:-2px;line-height:1;margin-bottom:14px}
    .iv-price-num span{font-size:16px;color:#94a3b8;font-weight:600;letter-spacing:0}
    .iv-price-list{list-style:none;padding:0;margin:0 0 18px}
    .iv-price-list li{font-size:14px;color:#d4d8e0;line-height:1.7;padding:4px 0;padding-left:22px;position:relative}
    .iv-price-list li::before{content:'✓';position:absolute;left:0;color:#22c55e;font-weight:800}

    /* ── Final CTA ── */
    .iv-final{margin-top:64px;padding:48px 36px;background:linear-gradient(135deg,rgba(33,85,205,0.2),rgba(91,142,255,0.04));border:1px solid #2155cd;border-radius:8px;text-align:center}
    .iv-final-h{font-size:clamp(24px,3.4vw,36px);font-weight:800;color:#ffffff;letter-spacing:-1.2px;line-height:1.15;margin:0 0 14px}
    .iv-final-h span{color:#5b8eff;font-style:italic}
    .iv-final-sub{font-size:15px;color:#d4d8e0;line-height:1.7;max-width:580px;margin:0 auto 26px}

    @media (max-width:820px){
      .iv-pain,.iv-tools,.iv-steps{grid-template-columns:1fr 1fr}
      .iv-pricing{grid-template-columns:1fr}
    }
    @media (max-width:520px){
      .iv-pain,.iv-tools,.iv-steps{grid-template-columns:1fr}
      .iv-hero{padding:56px 18px 36px}
      .iv-inner{padding:0 18px 60px}
      .iv-sub{font-size:15px}
      .iv-tool{padding:18px 20px}
      .iv-price-free,.iv-price-feature{padding:20px 18px}
      .iv-final{padding:32px 22px}
      .iv-hero-cta{flex-direction:column}
      .iv-hero-cta .iv-btn{width:100%;text-align:center}
    }
  `;

  return (
    <div className="iv-page">
      <style>{css}</style>
      <TopNav />

      {/* ── HERO ── */}
      <section className="iv-hero">
        <div className="iv-hero-inner">
          <div className="iv-eyebrow">
            <span className="iv-eyebrow-dot" />
            ▸ FOR INDIVIDUAL INVESTORS · HOMEOWNERS · BRRRR OPERATORS
          </div>
          <h1 className="iv-h1">
            Know if it's a <span>real deal.</span><br/>
            Before you waste a weekend in Excel.
          </h1>
          <p className="iv-sub">
            Type any Canadian address — get parcel-level zoning, CMHC market rent,
            BRRRR math, and an AI Building Grade. The institutional tools
            CoStar locks behind $5K/mo, tuned for the person buying their next door.
          </p>
          <div className="iv-hero-cta">
            <button className="iv-btn" onClick={() => navigate("/analyze")}>
              ▸ Try free — no signup
            </button>
            <button className="iv-btn ghost" onClick={() => navigate("/brrrr")}>
              Run BRRRR math →
            </button>
          </div>
          <div className="iv-hero-trust">
            <span className="iv-trust-pill">Free tier · 3 saved deals</span>
            <span className="iv-trust-pill">No credit card</span>
            <span className="iv-trust-pill">7 Canadian cities</span>
            <span className="iv-trust-pill">20+ calculators</span>
          </div>
        </div>
      </section>

      <div className="iv-inner">

        {/* ── PAIN — what's broken in the retail investor workflow ── */}
        <div className="iv-pain">
          <div className="iv-pain-card">
            <div className="iv-pain-tag">▸ Open house</div>
            <h3 className="iv-pain-h">"Is this priced right?"</h3>
            <p className="iv-pain-body">
              You're standing in the kitchen. Realtor's hovering. Your only tool
              is a mental math estimate of cash flow that's probably wrong by 20%.
            </p>
          </div>
          <div className="iv-pain-card">
            <div className="iv-pain-tag">▸ Saturday night</div>
            <h3 className="iv-pain-h">Your BRRRR spreadsheet has a circular reference</h3>
            <p className="iv-pain-body">
              The refi pulls cash out which changes the basis which changes the DSCR.
              Three hours rebuilding the formulas. Still doesn't trust it.
            </p>
          </div>
          <div className="iv-pain-card">
            <div className="iv-pain-tag">▸ Lender meeting</div>
            <h3 className="iv-pain-h">"What's the cap rate?"</h3>
            <p className="iv-pain-body">
              Three definitions. None match your spreadsheet. The lender asks for
              an IC memo. You've never written one.
            </p>
          </div>
        </div>

        {/* ── THE WEDGE — X-Ray bar ── */}
        <div className="iv-section">
          <div className="iv-section-tag">▸ The wedge</div>
          <h2 className="iv-section-h">Type any address. <span>5 seconds. Institutional read.</span></h2>
          <p className="iv-section-sub">
            We call it the X-Ray bar. Free on the landing page, no signup. Returns
            parcel-level zoning + assessed value + AI Building Grade across 4
            dimensions (Architecture, Systems, Amenities, Site). The same data
            CoStar serves to institutional desks at $5K-$50K per month.
          </p>
          <div className="iv-hero-cta" style={{justifyContent:"flex-start",marginTop:18}}>
            <button className="iv-btn" onClick={() => navigate("/")}>
              ▸ Try the X-Ray bar
            </button>
            <button className="iv-btn ghost" onClick={() => navigate("/property")}>
              Or jump to Property Intel →
            </button>
          </div>
        </div>

        {/* ── Tools grid — what investors use ── */}
        <div className="iv-section">
          <div className="iv-section-tag">▸ Built for the way you actually analyze</div>
          <h2 className="iv-section-h">Six tools. <span>One address. Zero spreadsheets.</span></h2>
          <div className="iv-tools">
            <div className="iv-tool" onClick={() => navigate("/brrrr")}>
              <div className="iv-tool-tag">▸ BRRRR</div>
              <h3 className="iv-tool-h">Buy / Rehab / Rent / Refi</h3>
              <p className="iv-tool-body">
                The full BRRRR cycle modeled — refi at 75% LTV, cash-out math, year-1
                through year-5 cash flow. No circular references.
              </p>
              <span className="iv-tool-link">▸ Open BRRRR →</span>
            </div>
            <div className="iv-tool" onClick={() => navigate("/app")}>
              <div className="iv-tool-tag">▸ Fix & Flip</div>
              <h3 className="iv-tool-h">Profit, ROI, hold-cost math</h3>
              <p className="iv-tool-body">
                ARV estimator + rehab budget + hard-money carry. Spot the deal that
                breaks the spreadsheet but works in real life.
              </p>
              <span className="iv-tool-link">▸ Open Flip Analyzer →</span>
            </div>
            <div className="iv-tool" onClick={() => navigate("/qualify")}>
              <div className="iv-tool-tag">▸ Mortgage Qualifier</div>
              <h3 className="iv-tool-h">GDS / TDS / stress test</h3>
              <p className="iv-tool-body">
                Canadian-specific. CMHC qualifying rate. See exactly how much you
                qualify for before you waste a broker's time.
              </p>
              <span className="iv-tool-link">▸ Open Qualifier →</span>
            </div>
            <div className="iv-tool" onClick={() => navigate("/rehab")}>
              <div className="iv-tool-tag">▸ Rehab Calculator</div>
              <h3 className="iv-tool-h">Real per-sqft Canadian costs</h3>
              <p className="iv-tool-body">
                20+ rehab categories with anchored regional pricing. Flooring,
                kitchen, bath, HVAC, electrical, structural. No more napkin math.
              </p>
              <span className="iv-tool-link">▸ Open Rehab →</span>
            </div>
            <div className="iv-tool" onClick={() => navigate("/tax")}>
              <div className="iv-tool-tag">▸ Tax Strategy</div>
              <h3 className="iv-tool-h">CCA + paper-loss optimization</h3>
              <p className="iv-tool-body">
                Capital Cost Allowance modeled per Canadian tax rules. See your
                real after-tax cash flow, not the listing's pitch.
              </p>
              <span className="iv-tool-link">▸ Open Tax →</span>
            </div>
            <div className="iv-tool" onClick={() => navigate("/portfolio")}>
              <div className="iv-tool-tag">▸ Portfolio</div>
              <h3 className="iv-tool-h">Track every door you own</h3>
              <p className="iv-tool-body">
                Per-property cash flow, equity, debt service, total ROI. The
                spreadsheet you've been meaning to build, already built.
              </p>
              <span className="iv-tool-link">▸ Open Portfolio →</span>
            </div>
          </div>
        </div>

        {/* ── 3-step workflow ── */}
        <div className="iv-section">
          <div className="iv-section-tag">▸ How most investors use it</div>
          <h2 className="iv-section-h">A weekend deal-hunt, <span>in 15 minutes.</span></h2>
          <div className="iv-steps">
            <div className="iv-step">
              <div className="iv-step-num">▸ STEP 01</div>
              <h3 className="iv-step-h">Browse Realtor.ca · find candidates</h3>
              <p className="iv-step-body">
                Copy 3-5 addresses from listings that look interesting on paper.
                The X-Ray bar takes raw addresses — no MLS number needed.
              </p>
            </div>
            <div className="iv-step">
              <div className="iv-step-num">▸ STEP 02</div>
              <h3 className="iv-step-h">Run each through the X-Ray</h3>
              <p className="iv-step-body">
                See zoning, year built, assessed value, and the AI Building Grade
                in 5 seconds per address. Kill the ones that don't pass the smell test.
              </p>
            </div>
            <div className="iv-step">
              <div className="iv-step-num">▸ STEP 03</div>
              <h3 className="iv-step-h">Run BRRRR math on the survivors</h3>
              <p className="iv-step-body">
                One-click handoff from Property Intel → BRRRR Calculator with
                address + assessed value pre-populated. Cash flow, DSCR, refi pull
                — all there.
              </p>
            </div>
          </div>
        </div>

        {/* ── Pricing ── */}
        <div className="iv-section">
          <div className="iv-section-tag">▸ Pricing built for the masses</div>
          <h2 className="iv-section-h">Free to start. <span>$99/mo when you're ready.</span></h2>
          <div className="iv-pricing">
            <div className="iv-price-free">
              <div className="iv-price-tier">Free</div>
              <div className="iv-price-num">$0<span>/forever</span></div>
              <ul className="iv-price-list">
                <li>X-Ray bar · unlimited lookups</li>
                <li>3 saved deals at a time</li>
                <li>All 20+ calculators</li>
                <li>BRRRR / Flip / Tax math</li>
                <li>No credit card required</li>
              </ul>
              <button className="iv-btn ghost" style={{width:"100%"}} onClick={() => navigate("/analyze")}>
                ▸ Start free
              </button>
            </div>
            <div className="iv-price-feature">
              <div className="iv-price-tier" style={{marginTop:14}}>Pro</div>
              <div className="iv-price-num">$99<span>/month</span></div>
              <ul className="iv-price-list">
                <li>Unlimited saved deals</li>
                <li>Building Grade + AI Read narrative</li>
                <li>CMHC rent anchor + zoning thesis</li>
                <li>Deal pipeline + portfolio tracking</li>
                <li>One-click IC memo PDF export</li>
                <li>Daily deal alert digest by email</li>
                <li>Shareable AI Read URLs</li>
                <li>Priority support</li>
              </ul>
              <button className="iv-btn" style={{width:"100%"}} onClick={() => navigate("/pricing")}>
                ▸ Start 14-day free trial
              </button>
            </div>
          </div>
        </div>

        {/* ── FINAL CTA ── */}
        <div className="iv-final">
          <h2 className="iv-final-h">Stop guessing. <span>Start knowing.</span></h2>
          <p className="iv-final-sub">
            The X-Ray bar is free. No signup. No credit card. Type any Canadian
            address and see what 5 seconds of institutional underwriting looks like.
          </p>
          <div className="iv-hero-cta">
            <button className="iv-btn" onClick={() => navigate("/")}>
              ▸ Run an X-Ray on your next deal
            </button>
            <button className="iv-btn ghost" onClick={() => navigate("/learn")}>
              Read the playbook first →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
