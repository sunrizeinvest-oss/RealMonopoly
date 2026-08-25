/**
 * Brokers — /brokers — Industry Side landing page.
 *
 * Dedicated destination for commercial brokers, agents, syndicators,
 * developers, lenders. This is the URL we send in LinkedIn outreach —
 * a tailored page that speaks to their workflow, not the generic homepage.
 *
 * Wedge: Loss-to-Lease parser + IC memo PDF (the moat).
 * Pricing focus: $299 Scale tier.
 * Primary CTA: Book a 15-min demo.
 * Secondary CTA: Try the rent-roll parser free.
 */

import { useNavigate } from "react-router-dom";
import TopNav from "./components/TopNav";
import { useDocMeta } from "./lib/seo";

const CALENDLY_URL = "https://calendly.com/sunni-yaremchuk/rizeai-demo";

export default function Brokers() {
  useDocMeta({
    title: "For Brokers · RizeAI — Underwrite client deals in 5 seconds",
    description: "AI underwriting for Canadian commercial brokers, agents, and syndicators. Drag a rent roll → see stranded upside in dollars per door. $299/mo Scale tier. Live demo on www.realdealestate.app.",
  });
  const navigate = useNavigate();

  const css = `
    .bk-page{background:#0a1128;color:#f0f0f0;font-family:'Geist',sans-serif;min-height:100vh}
    body:has(.bk-page){background:#0a1128}

    .bk-hero{padding:80px 24px 48px;text-align:center;position:relative;overflow:hidden}
    .bk-hero::before{content:'';position:absolute;top:-20%;left:50%;transform:translateX(-50%);width:900px;height:600px;background:radial-gradient(ellipse,rgba(212,175,55,0.08) 0%,transparent 65%);pointer-events:none}
    .bk-hero-inner{max-width:960px;margin:0 auto;position:relative;z-index:1}
    .bk-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#d4af37;background:rgba(10,17,40,0.55);backdrop-filter:blur(10px);border:1px solid rgba(212,175,55,0.35);padding:7px 14px;border-radius:4px;margin-bottom:22px}
    .bk-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:#d4af37;animation:blink 2s infinite;box-shadow:0 0 8px #d4af37}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
    .bk-h1{font-size:clamp(34px,5.5vw,58px);font-weight:800;line-height:1.04;letter-spacing:-2.2px;color:#ffffff;margin:0 0 20px}
    .bk-h1 span{color:#d4af37;font-style:italic;font-weight:700}
    .bk-sub{font-size:17px;color:#d4d8e0;line-height:1.7;max-width:660px;margin:0 auto 30px}
    .bk-hero-cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:24px}
    .bk-btn{background:#d4af37;color:#0a1128;border:none;border-radius:4px;padding:14px 26px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12.5px;font-weight:800;letter-spacing:0.6px;cursor:pointer;text-transform:uppercase;transition:all 0.15s;text-decoration:none;display:inline-block}
    .bk-btn:hover{transform:translateY(-1px);box-shadow:0 14px 32px rgba(212,175,55,0.32);background:#e6c252}
    .bk-btn.ghost{background:transparent;color:#d4d8e0;border:1px solid rgba(212,175,55,0.4)}
    .bk-btn.ghost:hover{border-color:#d4af37;color:#d4af37;box-shadow:none;background:rgba(212,175,55,0.06)}
    .bk-hero-trust{display:flex;justify-content:center;gap:18px;flex-wrap:wrap;margin-top:10px}
    .bk-trust-pill{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:0.4px}
    .bk-trust-pill::before{content:'✓ ';color:#22c55e;font-weight:700}

    .bk-inner{max-width:1100px;margin:0 auto;padding:8px 24px 80px}

    /* ── Pain row ── */
    .bk-pain{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:24px 0 56px}
    .bk-pain-card{padding:20px 22px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px}
    .bk-pain-tag{font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#dc2626;text-transform:uppercase;margin-bottom:10px}
    .bk-pain-h{font-size:16px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;margin:0 0 6px;line-height:1.3}
    .bk-pain-body{font-size:13.5px;color:#d4d8e0;line-height:1.6}

    /* ── Section ── */
    .bk-section{margin-bottom:54px}
    .bk-section-tag{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#d4af37;margin-bottom:14px;display:flex;align-items:center;gap:8px}
    .bk-section-tag::after{content:'';flex:1;height:1px;background:rgba(212,175,55,0.18);margin-left:12px}
    .bk-section-h{font-size:clamp(24px,3vw,32px);font-weight:800;color:#ffffff;letter-spacing:-1px;line-height:1.15;margin:0 0 14px}
    .bk-section-h span{color:#d4af37;font-style:italic}
    .bk-section-sub{font-size:15.5px;color:#d4d8e0;line-height:1.7;max-width:760px;margin-bottom:24px}

    /* ── Moat panel ── */
    .bk-moat{padding:32px;background:linear-gradient(180deg,rgba(212,175,55,0.06) 0%,rgba(33,85,205,0.04) 100%);border:1px solid rgba(212,175,55,0.32);border-left:3px solid #d4af37;border-radius:6px}
    .bk-moat-kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0 22px}
    .bk-kpi{padding:16px 18px;background:rgba(0,0,0,0.35);border:1px solid rgba(212,175,55,0.22);border-radius:4px;text-align:center}
    .bk-kpi-val{font-family:'Geist Mono',ui-monospace,monospace;font-size:24px;font-weight:800;color:#d4af37;letter-spacing:-1px;line-height:1}
    .bk-kpi-lbl{font-family:'Geist Mono',ui-monospace,monospace;font-size:9.5px;font-weight:600;color:#94a3b8;letter-spacing:1.2px;text-transform:uppercase;margin-top:6px}
    .bk-moat-body{font-size:14.5px;color:#d4d8e0;line-height:1.7}
    .bk-moat-body strong{color:#ffffff;font-weight:700}

    /* ── Workflow steps ── */
    .bk-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}
    .bk-step{padding:22px 24px;background:rgba(0,0,0,0.25);border:1px solid rgba(212,175,55,0.22);border-radius:4px}
    .bk-step-num{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.6px;color:#d4af37;margin-bottom:10px}
    .bk-step-h{font-size:15.5px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;margin:0 0 6px;line-height:1.3}
    .bk-step-body{font-size:13.5px;color:#d4d8e0;line-height:1.55}

    /* ── Pricing card ── */
    .bk-pricing{display:grid;grid-template-columns:1.4fr 1fr;gap:16px;margin-top:18px}
    .bk-price-feature{padding:28px 30px;background:linear-gradient(135deg,rgba(212,175,55,0.08),rgba(33,85,205,0.04));border:1.5px solid #d4af37;border-radius:6px;position:relative}
    .bk-price-feature::before{content:'▸ FOR BROKERS · MOST POPULAR';position:absolute;top:-9px;left:24px;font-family:'Geist Mono',ui-monospace,monospace;font-size:9.5px;font-weight:800;letter-spacing:1.4px;color:#0a1128;background:#d4af37;padding:3px 10px;border-radius:2px}
    .bk-price-tier{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.4px;color:#d4af37;text-transform:uppercase;margin-bottom:10px;margin-top:6px}
    .bk-price-num{font-size:42px;font-weight:800;color:#ffffff;letter-spacing:-2px;line-height:1;margin-bottom:14px}
    .bk-price-num span{font-size:16px;color:#94a3b8;font-weight:600;letter-spacing:0}
    .bk-price-list{list-style:none;padding:0;margin:0 0 18px}
    .bk-price-list li{font-size:14px;color:#d4d8e0;line-height:1.7;padding:4px 0;padding-left:22px;position:relative}
    .bk-price-list li::before{content:'✓';position:absolute;left:0;color:#22c55e;font-weight:800}
    .bk-price-side{display:flex;flex-direction:column;gap:12px}
    .bk-price-side-card{padding:22px 24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px}
    .bk-price-side-h{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.4px;color:#94a3b8;text-transform:uppercase;margin-bottom:6px}
    .bk-price-side-body{font-size:13.5px;color:#d4d8e0;line-height:1.6}
    .bk-price-side-link{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:0.6px;color:#d4af37;text-transform:uppercase;cursor:pointer;margin-top:8px;display:inline-block;text-decoration:none}
    .bk-price-side-link:hover{color:#e6c252}

    /* ── Demo embed placeholder ── */
    .bk-loom{aspect-ratio:16/9;background:linear-gradient(135deg,#0a1128,#1a2748);border:1px solid rgba(212,175,55,0.32);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;margin-top:18px;cursor:pointer;transition:all 0.2s}
    .bk-loom:hover{border-color:#d4af37;background:linear-gradient(135deg,#0a1128,#243056)}
    .bk-loom-play{width:64px;height:64px;border-radius:50%;background:#d4af37;display:flex;align-items:center;justify-content:center;font-size:24px;color:#0a1128;font-weight:800}
    .bk-loom-label{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.2px;color:#d4af37;text-transform:uppercase}
    .bk-loom-sub{font-size:13px;color:#94a3b8}

    /* ── Final CTA ── */
    .bk-final{margin-top:64px;padding:48px 36px;background:linear-gradient(135deg,rgba(33,85,205,0.16),rgba(212,175,55,0.08));border:1px solid #d4af37;border-radius:8px;text-align:center}
    .bk-final-h{font-size:clamp(24px,3.4vw,36px);font-weight:800;color:#ffffff;letter-spacing:-1.2px;line-height:1.15;margin:0 0 14px}
    .bk-final-h span{color:#d4af37;font-style:italic}
    .bk-final-sub{font-size:15px;color:#d4d8e0;line-height:1.7;max-width:580px;margin:0 auto 26px}

    @media (max-width:820px){
      .bk-pain,.bk-moat-kpi-row,.bk-steps{grid-template-columns:1fr 1fr}
      .bk-pricing{grid-template-columns:1fr}
    }
    @media (max-width:520px){
      .bk-pain,.bk-moat-kpi-row,.bk-steps{grid-template-columns:1fr}
      .bk-hero{padding:56px 18px 36px}
      .bk-inner{padding:0 18px 60px}
      .bk-moat{padding:22px 18px}
      .bk-price-feature,.bk-price-side-card{padding:20px 18px}
      .bk-final{padding:32px 22px}
      .bk-hero-cta{flex-direction:column}
      .bk-hero-cta .bk-btn{width:100%;text-align:center}
    }
  `;

  return (
    <div className="bk-page">
      <style>{css}</style>
      <TopNav />

      {/* ── HERO ── */}
      <section className="bk-hero">
        <div className="bk-hero-inner">
          <div className="bk-eyebrow">
            <span className="bk-eyebrow-dot" />
            ▸ FOR COMMERCIAL BROKERS · AGENTS · SYNDICATORS
          </div>
          <h1 className="bk-h1">
            Underwrite client deals <span>in 5 seconds.</span><br/>
            Not 5 hours.
          </h1>
          <p className="bk-sub">
            RizeAI is the AI underwriting layer for the Canadian RE professionals
            CoStar refuses to call back. Drag a broker rent roll. See the stranded
            upside in dollars per door. Hand your buyer a 2-page IC memo PDF on the
            way out the door.
          </p>
          <div className="bk-hero-cta">
            <a className="bk-btn" href={CALENDLY_URL} target="_blank" rel="noreferrer">
              ▸ Book a 15-min demo
            </a>
            <button className="bk-btn ghost" onClick={() => navigate("/commercial")}>
              Try the rent-roll parser →
            </button>
          </div>
          <div className="bk-hero-trust">
            <span className="bk-trust-pill">Live in production</span>
            <span className="bk-trust-pill">Stripe billing wired</span>
            <span className="bk-trust-pill">7 Canadian cities · parcel-level</span>
            <span className="bk-trust-pill">26 CMHC metros</span>
          </div>
        </div>
      </section>

      <div className="bk-inner">

        {/* ── PAIN — what's broken in the broker workflow ── */}
        <div className="bk-pain">
          <div className="bk-pain-card">
            <div className="bk-pain-tag">▸ Friday afternoon</div>
            <h3 className="bk-pain-h">Buyer asks: "what's the loss-to-lease?"</h3>
            <p className="bk-pain-body">
              Your seller's broker sent you a 47-page OM. The rent roll is buried on
              page 31. You've got 90 minutes before the LOI deadline.
            </p>
          </div>
          <div className="bk-pain-card">
            <div className="bk-pain-tag">▸ Tuesday 11pm</div>
            <h3 className="bk-pain-h">Three deals stacked. One spreadsheet each.</h3>
            <p className="bk-pain-body">
              Cap rates calculated three different ways. None institutional. Each takes
              3 hours to rebuild and you still don't trust the numbers.
            </p>
          </div>
          <div className="bk-pain-card">
            <div className="bk-pain-tag">▸ CoStar call</div>
            <h3 className="bk-pain-h">"That's $48K a year."</h3>
            <p className="bk-pain-body">
              For data your indie brokerage can't justify. Altus is $1.5K/mo and
              you still need a CSV export to do real underwriting.
            </p>
          </div>
        </div>

        {/* ── THE MOAT — LTL parser ── */}
        <div className="bk-section">
          <div className="bk-section-tag">▸ The wedge</div>
          <h2 className="bk-section-h">Drag a rent roll. <span>See the stranded upside.</span></h2>
          <p className="bk-section-sub">
            Drop any broker rent roll PDF onto <code style={{background:"rgba(212,175,55,0.08)",padding:"2px 6px",borderRadius:3,color:"#d4af37",fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:14}}>/commercial</code>.
            AI OCRs every unit row, cross-references each against CMHC market rent
            for that bedroom count in that metro, and surfaces the stranded annual
            upside in dollars per door. Real demo on a 24-unit Calgary multifamily:
          </p>
          <div className="bk-moat">
            <div className="bk-moat-kpi-row">
              <div className="bk-kpi">
                <div className="bk-kpi-val">$187K</div>
                <div className="bk-kpi-lbl">Annual upside</div>
              </div>
              <div className="bk-kpi">
                <div className="bk-kpi-val">$708</div>
                <div className="bk-kpi-lbl">Per door / mo</div>
              </div>
              <div className="bk-kpi">
                <div className="bk-kpi-val">38%</div>
                <div className="bk-kpi-lbl">Below market</div>
              </div>
              <div className="bk-kpi">
                <div className="bk-kpi-val">$460K</div>
                <div className="bk-kpi-lbl">5-yr NPV @ 8%</div>
              </div>
            </div>
            <p className="bk-moat-body">
              Surfaced from a <strong>47-page broker OM</strong> in <strong>5 seconds</strong>.
              No competitor at any price ships this. Altus charges $5K for a static
              report. CoStar Express is $50K/mo. This is the moat.
            </p>
          </div>

          {/* ── Loom placeholder ── Until the founder records the Loom,
              clicking opens the live pre-loaded sample on /commercial?demo=1
              so visitors get the actual experience instead of a 404. */}
          <div className="bk-loom" onClick={() => navigate("/commercial?demo=1")}>
            <div className="bk-loom-play">▶</div>
            <div className="bk-loom-label">▸ See it live · 24-unit Calgary sample</div>
            <div className="bk-loom-sub">Pre-loaded — skip the rent-roll upload and jump straight to the LTL parser output</div>
          </div>
        </div>

        {/* ── 3-step workflow ── */}
        <div className="bk-section">
          <div className="bk-section-tag">▸ Your broker workflow</div>
          <h2 className="bk-section-h">Three steps. <span>Five minutes total.</span></h2>
          <div className="bk-steps">
            <div className="bk-step">
              <div className="bk-step-num">▸ STEP 01</div>
              <h3 className="bk-step-h">Type the address into the X-Ray bar</h3>
              <p className="bk-step-body">
                Parcel-level zoning, year built, assessed value, AI Building Grade
                across 4 dimensions. 5 seconds. No login. No sales call.
              </p>
            </div>
            <div className="bk-step">
              <div className="bk-step-num">▸ STEP 02</div>
              <h3 className="bk-step-h">Drop the seller's rent roll PDF</h3>
              <p className="bk-step-body">
                Loss-to-Lease parser extracts every unit, cross-references CMHC,
                computes 5-year stranded NPV. Stays on screen so your buyer sees it.
              </p>
            </div>
            <div className="bk-step">
              <div className="bk-step-num">▸ STEP 03</div>
              <h3 className="bk-step-h">Generate the 2-page IC memo PDF</h3>
              <p className="bk-step-body">
                Full underwriting summary + LTL analysis. The deliverable your
                analyst would take 3 hours to write. One click. Hand it to LP / lender.
              </p>
            </div>
          </div>
        </div>

        {/* ── Pricing ── */}
        <div className="bk-section">
          <div className="bk-section-tag">▸ Pricing built for brokers</div>
          <h2 className="bk-section-h">$299/mo. <span>Rounding error vs. one broker fee.</span></h2>
          <div className="bk-pricing">
            <div className="bk-price-feature">
              <div className="bk-price-tier" style={{marginTop:14}}>Scale</div>
              <div className="bk-price-num">$299<span>/month</span></div>
              <ul className="bk-price-list">
                <li>Unlimited X-Ray bar lookups</li>
                <li>Unlimited Loss-to-Lease parses</li>
                <li>Unlimited IC memo PDF generation</li>
                <li>20+ underwriting calculators</li>
                <li>Multi-deal pipeline + portfolio tracking</li>
                <li>Per-deal AI Read narrative (15 modes)</li>
                <li>Real Canadian MLS comps (Repliers feed)</li>
                <li>Shareable AI Read URLs for clients</li>
              </ul>
              <button className="bk-btn" style={{width:"100%"}} onClick={() => navigate("/pricing")}>
                ▸ Start 14-day free trial
              </button>
            </div>
            <div className="bk-price-side">
              <div className="bk-price-side-card">
                <div className="bk-price-side-h">▸ Team seats</div>
                <div className="bk-price-side-body">
                  3+ brokers? Email <a href="mailto:hello@rizeai.io" style={{color:"#d4af37"}}>hello@rizeai.io</a> for team pricing. Single billing, per-seat IC memo PDFs, shared deal library.
                </div>
              </div>
              <div className="bk-price-side-card">
                <div className="bk-price-side-h">▸ White-label</div>
                <div className="bk-price-side-body">
                  Brokerage-branded reports for your clients. Available on annual
                  contracts. Book a demo to discuss.
                </div>
                <a className="bk-price-side-link" href={CALENDLY_URL} target="_blank" rel="noreferrer">▸ Book demo</a>
              </div>
              <div className="bk-price-side-card">
                <div className="bk-price-side-h">▸ Tax deductible</div>
                <div className="bk-price-side-body">
                  $3,588/yr fully deductible as a professional tool. Net cost after
                  marginal rate: ~$1,900/yr.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FINAL CTA ── */}
        <div className="bk-final">
          <h2 className="bk-final-h">15 minutes. <span>A real underwrite on your next deal.</span></h2>
          <p className="bk-final-sub">
            Send me your active rent roll PDF. I'll run it through RizeAI live on
            Zoom. You walk away with the IC memo PDF whether you sign up or not.
          </p>
          <div className="bk-hero-cta">
            <a className="bk-btn" href={CALENDLY_URL} target="_blank" rel="noreferrer">
              ▸ Book a 15-min walkthrough
            </a>
            <button className="bk-btn ghost" onClick={() => navigate("/")}>
              Try the X-Ray bar first →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
