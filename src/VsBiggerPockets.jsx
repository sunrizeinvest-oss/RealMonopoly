import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useDocMeta } from "./lib/seo";
import TopNav from "./components/TopNav";

/**
 * VsBiggerPockets — dedicated SEO comparison page at /vs-biggerpockets.
 *
 * Targets the "rizeai vs biggerpockets" / "biggerpockets alternative canadian"
 * search intent. BP has 2M members but their calculators are 2015-era forms
 * with no AI, no zoning, and no Canadian data. This page frames RizeAI as
 * the Canadian broker's institutional alternative honestly (BP wins on
 * community + US SFH content; RizeAI wins on underwriting depth + Canadian
 * data + AI).
 *
 * Ships with dedicated meta title/description via useDocMeta so Google
 * indexes it separately from the landing page.
 */
export default function VsBiggerPockets() {
  const navigate = useNavigate();

  useDocMeta({
    title: "RizeAI vs BiggerPockets — Which Underwrites Better?",
    description: "Honest comparison: BiggerPockets (US retail community + basic calculators) vs RizeAI (Canadian broker underwriting with AI thesis, dimensional zoning, and CMHC-anchored rent). See the feature matrix.",
  });

  const rows = [
    { feature: "Primary geography",              rizeai: "Canada (7 cities, expanding)", bp: "US" },
    { feature: "Deal analyzer strategies",       rizeai: "Buy & Hold · BRRRR · Fix & Flip · Multifamily (4-strategy verdict panel)", bp: "5 separate calculators (no side-by-side)" },
    { feature: "Address-in, verdict-out flow",   rizeai: "Yes — 3-second lookup", bp: "No — you type every field manually" },
    { feature: "AI-generated deal thesis",       rizeai: "Yes — our AI, ~900-word memo", bp: "No" },
    { feature: "Dimensional zoning specs",       rizeai: "37 codes across 7 CA cities (height, FAR, setbacks, permitted uses)", bp: "None" },
    { feature: "CMHC-anchored rent model",       rizeai: "26 Canadian metros", bp: "US market rent estimates via Rentometer" },
    { feature: "Rent roll PDF parser (LTL)",     rizeai: "Yes (Scale tier)", bp: "No" },
    { feature: "Investor + IC + lender PDFs",    rizeai: "3 institutional docs, branded", bp: "Basic deal report" },
    { feature: "Free tier",                      rizeai: "5 property lookups/month, no credit card", bp: "~5 total calculator runs, then paywall" },
    { feature: "Paid pricing",                   rizeai: "$99 Pro / $299 Scale (CAD)", bp: "~$390/yr Pro (no monthly)" },
    { feature: "Community + forum",              rizeai: "Not yet — private for now", bp: "2M+ member community, forum, podcasts" },
    { feature: "Content library",                rizeai: "Playbook + blog (early)", bp: "1000s of articles, books, courses" },
    { feature: "Mobile app",                     rizeai: "Web + mobile web", bp: "Web + native app" },
  ];

  const CSS = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:var(--bg);color:var(--text);font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased}
    .vs-wrap{min-height:100vh;background:var(--bg)}
    .vs-hero{padding:96px 24px 56px;text-align:center;background:linear-gradient(180deg,#0a1128 0%,#0c1530 100%);position:relative;overflow:hidden}
    .vs-hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(0,102,204,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,102,204,0.06) 1px,transparent 1px);background-size:56px 56px;pointer-events:none}
    .vs-hero-inner{max-width:820px;margin:0 auto;position:relative;z-index:1}
    .vs-eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--brass);background:rgba(10,17,40,0.55);border:1px solid rgba(212,175,55,0.30);padding:6px 12px;border-radius:4px;margin-bottom:16px}
    .vs-eyebrow-dot{width:6px;height:6px;border-radius:50%;background:var(--brass);animation:blink 2s infinite;box-shadow:0 0 8px var(--brass)}
    .vs-h1{font-size:clamp(30px,4.5vw,52px);font-weight:800;line-height:1.1;letter-spacing:-1.6px;color:var(--alabaster);margin-bottom:16px;text-shadow:0 4px 20px rgba(0,0,0,0.6)}
    .vs-h1 span{color:var(--brass);font-style:italic;font-weight:700}
    .vs-sub{font-size:16px;color:var(--alabaster-2);line-height:1.65;max-width:640px;margin:0 auto 28px}
    .vs-cta{display:inline-block;padding:12px 24px;background:var(--brass);color:#0a1128;border:1px solid var(--brass);border-radius:6px;font-family:'Geist Mono',monospace;font-size:12.5px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:transform 160ms,box-shadow 200ms}
    .vs-cta:hover{transform:translateY(-2px);box-shadow:0 20px 40px -12px rgba(212,175,55,0.4)}

    .vs-body{max-width:1080px;margin:0 auto;padding:64px 24px 96px}
    .vs-table-wrap{background:var(--card);border:1px solid var(--borderf);border-radius:12px;overflow:hidden;margin-bottom:56px;box-shadow:0 18px 40px -18px rgba(15,23,42,0.12)}
    .vs-table{width:100%;border-collapse:collapse}
    .vs-table thead{background:var(--card2)}
    .vs-table th{padding:16px 18px;text-align:left;font-family:'Geist Mono',monospace;font-size:10.5px;font-weight:700;color:var(--sub);letter-spacing:1.2px;text-transform:uppercase;border-bottom:1px solid var(--borderf)}
    .vs-table th.rize{color:var(--brass-2);background:rgba(212,175,55,0.05)}
    .vs-table th.bp{color:#059669;background:rgba(5,150,105,0.05)}
    .vs-table td{padding:16px 18px;font-size:13.5px;color:var(--text);border-bottom:1px solid var(--borderf);line-height:1.55;vertical-align:top}
    .vs-table tr:last-child td{border-bottom:none}
    .vs-table td.feature{font-weight:700;color:var(--text);width:26%}
    .vs-table td.rize{color:var(--text);width:37%;background:rgba(212,175,55,0.03)}
    .vs-table td.bp{color:var(--sub);width:37%;background:rgba(5,150,105,0.02)}
    @media(max-width:720px){.vs-table th,.vs-table td{padding:12px 10px;font-size:12px}.vs-table td.feature{width:32%}}

    .vs-section{margin-bottom:56px}
    .vs-section-h2{font-size:clamp(22px,3vw,32px);font-weight:800;color:var(--text);letter-spacing:-1px;line-height:1.2;margin-bottom:14px}
    .vs-section-h2 span{color:var(--brass);font-style:italic}
    .vs-section-p{font-size:15px;color:var(--sub);line-height:1.7;margin-bottom:12px}
    .vs-section-p strong{color:var(--text);font-weight:700}

    .vs-honest{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:36px}
    @media(max-width:720px){.vs-honest{grid-template-columns:1fr}}
    .vs-honest-card{padding:22px;background:var(--card);border:1px solid var(--borderf);border-radius:10px}
    .vs-honest-card.win{border-left:3px solid var(--brass)}
    .vs-honest-card.lose{border-left:3px solid #059669}
    .vs-honest-tag{font-family:'Geist Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:10px}
    .vs-honest-card.win .vs-honest-tag{color:var(--brass-2)}
    .vs-honest-card.lose .vs-honest-tag{color:#059669}
    .vs-honest-h{font-size:16px;font-weight:800;color:var(--text);margin-bottom:8px;letter-spacing:-0.4px}
    .vs-honest-list{list-style:none;padding:0;margin:0;font-size:13.5px;color:var(--sub);line-height:1.7}
    .vs-honest-list li{padding-left:18px;position:relative;margin-bottom:6px}
    .vs-honest-list li::before{content:"▸";position:absolute;left:0;top:0;color:var(--brass);font-family:'Geist Mono',monospace}
    .vs-honest-card.lose .vs-honest-list li::before{color:#059669}

    .vs-cta-bottom{text-align:center;padding:48px 24px;background:var(--card2);border-radius:12px;border:1px solid var(--borderf)}
    .vs-cta-bottom-h{font-size:24px;font-weight:800;color:var(--text);margin-bottom:10px;letter-spacing:-0.6px}
    .vs-cta-bottom-h span{color:var(--brass);font-style:italic}
    .vs-cta-bottom-p{font-size:14.5px;color:var(--sub);margin-bottom:22px;max-width:520px;margin-left:auto;margin-right:auto;line-height:1.6}
    @keyframes blink{0%,50%{opacity:1}51%,100%{opacity:0.35}}
  `;

  return (
    <div className="vs-wrap">
      <style>{CSS}</style>
      <TopNav />

      <section className="vs-hero">
        <div className="vs-hero-inner">
          <div className="vs-eyebrow">
            <span className="vs-eyebrow-dot" />
            HONEST COMPARISON · UPDATED JULY 2026
          </div>
          <h1 className="vs-h1">RizeAI vs BiggerPockets. <span>Which underwrites better?</span></h1>
          <p className="vs-sub">BiggerPockets built a 2M-member community and a great US content library. We built the Canadian broker's institutional underwriter. Here's the honest side-by-side.</p>
          <a onClick={() => navigate("/property")} className="vs-cta">Try RizeAI free — no credit card →</a>
        </div>
      </section>

      <section className="vs-body">
        {/* Feature matrix */}
        <div className="vs-section">
          <h2 className="vs-section-h2">The feature matrix. <span>Line by line.</span></h2>
          <p className="vs-section-p">Every row is checked against public info from BiggerPockets Pro (biggerpockets.com/pro) and BiggerPockets Analyze (biggerpockets.com/analyze) as of July 2026. If we got something wrong, email <a href="mailto:sunni@rizedevelopments.com" style={{color:"var(--brass-2)"}}>sunni@rizedevelopments.com</a> — we'll fix it same day.</p>
        </div>

        <div className="vs-table-wrap">
          <table className="vs-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th className="rize">RizeAI</th>
                <th className="bp">BiggerPockets</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="feature">{r.feature}</td>
                  <td className="rize">{r.rizeai}</td>
                  <td className="bp">{r.bp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Where each wins */}
        <div className="vs-section">
          <h2 className="vs-section-h2">Where each one <span>actually wins.</span></h2>
          <p className="vs-section-p">Different tools for different jobs. Here's how we'd choose.</p>
        </div>

        <div className="vs-honest">
          <div className="vs-honest-card win">
            <div className="vs-honest-tag">▸ Where RizeAI wins</div>
            <div className="vs-honest-h">Canadian broker underwriting speed</div>
            <ul className="vs-honest-list">
              <li>Type any Canadian address → 4-strategy verdict in ~3 seconds</li>
              <li>Dimensional zoning (max height, FAR, setbacks) for 37 codes across 7 CA cities</li>
              <li>CMHC-anchored rent model beats broad-strokes rental estimates for Canadian markets</li>
              <li>our AI generates a real ~900-word deal thesis — not a summary of the numbers you already saw</li>
              <li>Institutional PDFs (investor, IC, lender) ready to walk into a committee</li>
              <li>Rent roll PDF parser (LTL) — drop a rent roll, get stranded-upside dollars-per-door</li>
            </ul>
          </div>

          <div className="vs-honest-card lose">
            <div className="vs-honest-tag">▸ Where BiggerPockets wins</div>
            <div className="vs-honest-h">Community, content, and US retail depth</div>
            <ul className="vs-honest-list">
              <li>2M+ member community, forums, and podcasts you can't replicate overnight</li>
              <li>Massive US content library — books, courses, blog posts, expert interviews</li>
              <li>Native mobile app with feature parity</li>
              <li>Long track record — trusted brand since 2004</li>
              <li>Rentometer integration for US rent comps at scale</li>
              <li>US-focused calculator tuning (LLC structures, US financing, US tax rules)</li>
            </ul>
          </div>
        </div>

        {/* Positioning */}
        <div className="vs-section">
          <h2 className="vs-section-h2">The one-line take.</h2>
          <p className="vs-section-p"><strong>If you're a US retail investor</strong> — spending most of your time learning the ropes, browsing forums, and running quick "does this pencil?" checks — BiggerPockets is the natural home. Their content library and community are unmatched.</p>
          <p className="vs-section-p"><strong>If you're a Canadian broker, agent, or commercial-side investor</strong> — underwriting deals for clients, needing zoning specs, CMHC-anchored rents, and institutional-grade PDFs to walk into IC — RizeAI is what you're missing. That's who we built it for.</p>
          <p className="vs-section-p" style={{color:"var(--dim)",fontSize:13,marginTop:16}}>Both tools can coexist in your workflow. This isn't zero-sum.</p>
        </div>

        {/* Bottom CTA */}
        <div className="vs-cta-bottom">
          <div className="vs-cta-bottom-h">Type an address. <span>See the difference.</span></div>
          <div className="vs-cta-bottom-p">5 free lookups this month. No credit card, no signup wall. If it's better than what BP gives you, upgrade for $99/mo. If not, cost you 3 seconds.</div>
          <a onClick={() => navigate("/property")} className="vs-cta">Try /property free →</a>
        </div>
      </section>
    </div>
  );
}
