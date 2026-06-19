/**
 * About page — /about — the credibility surface investors and brokers
 * land on after reading the deck or seeing a Loom demo.
 *
 * Brand-consistent Family Office palette (navy + brass + alabaster).
 * No auth required; reachable from the Landing footer + nav.
 *
 * Founder bio is concise on purpose — investor-pitch tone, not LinkedIn-
 * resume tone. The "Why I'm building this" section is the differentiator
 * vs. a generic founder bio.
 */

import { useNavigate } from "react-router-dom";
import TopNav from "./components/TopNav";
import { useDocMeta } from "./lib/seo";

export default function About() {
  useDocMeta({
    title: "About · RizeAI",
    description: "Why RizeAI exists, who built it, and the operating principles behind a Canadian-first AI underwriting platform.",
  });
  const navigate = useNavigate();
  const css = `
    .ab-page{background:#0a1128;color:#f0f0f0;font-family:'Geist',sans-serif;min-height:100vh}
    body:has(.ab-page){background:#0a1128}

    .ab-hero{padding:96px 24px 56px;text-align:center;position:relative;overflow:hidden}
    .ab-hero-eyebrow{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#d4af37;margin-bottom:18px;display:inline-flex;align-items:center;gap:8px;background:rgba(10,17,40,0.55);backdrop-filter:blur(10px);border:1px solid rgba(212,175,55,0.35);padding:7px 14px;border-radius:4px}
    .ab-hero-h1{font-size:clamp(40px,5.5vw,64px);font-weight:800;line-height:1.04;letter-spacing:-2.4px;color:#ffffff;margin:0 0 22px;max-width:880px;margin-left:auto;margin-right:auto}
    .ab-hero-h1 span{color:#d4af37;font-style:italic;font-weight:700}
    .ab-hero-sub{font-size:17px;color:#d4d8e0;line-height:1.7;max-width:660px;margin:0 auto}

    .ab-inner{max-width:920px;margin:0 auto;padding:32px 24px 80px}
    .ab-section{margin-bottom:54px}
    .ab-section-tag{font-family:'Geist Mono',ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#d4af37;margin-bottom:12px}
    .ab-section-h2{font-size:clamp(24px,3vw,30px);font-weight:800;color:#ffffff;letter-spacing:-1px;line-height:1.15;margin:0 0 22px}
    .ab-section-h2 span{color:#d4af37;font-style:italic}
    .ab-p{font-size:16px;color:#d4d8e0;line-height:1.78;margin:0 0 16px}
    .ab-p strong{color:#ffffff;font-weight:700}

    .ab-founder-card{display:flex;gap:28px;align-items:flex-start;padding:28px;background:linear-gradient(180deg,rgba(33,85,205,0.06) 0%,rgba(212,175,55,0.04) 100%);border:1px solid rgba(212,175,55,0.22);border-left:3px solid #d4af37;border-radius:6px;flex-wrap:wrap}
    .ab-avatar{width:132px;height:132px;border-radius:4px;background:linear-gradient(135deg,#2155cd 0%,#0a1128 100%);border:1px solid rgba(212,175,55,0.4);display:flex;align-items:center;justify-content:center;font-family:'Geist',sans-serif;font-size:48px;font-weight:800;color:#d4af37;letter-spacing:-2px;flex-shrink:0}
    .ab-founder-body{flex:1;min-width:280px}
    .ab-founder-name{font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;margin-bottom:4px}
    .ab-founder-title{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;color:#d4af37;text-transform:uppercase;margin-bottom:14px}
    .ab-founder-bio{font-size:14.5px;color:#d4d8e0;line-height:1.7}

    .ab-principles{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:22px}
    .ab-principle{padding:18px 20px;background:rgba(255,255,255,0.03);border:1px solid rgba(212,175,55,0.18);border-left:2px solid #d4af37;border-radius:4px}
    .ab-principle-num{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:1.4px;color:#d4af37;margin-bottom:6px}
    .ab-principle-h{font-size:15.5px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;margin-bottom:6px}
    .ab-principle-body{font-size:13.5px;color:#d4d8e0;line-height:1.6}

    .ab-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:24px}
    .ab-stat{padding:18px 20px;background:rgba(0,0,0,0.25);border:1px solid rgba(212,175,55,0.22);border-radius:4px;text-align:center}
    .ab-stat-val{font-family:'Geist Mono',ui-monospace,monospace;font-size:26px;font-weight:800;color:#d4af37;letter-spacing:-1px;line-height:1}
    .ab-stat-lbl{font-family:'Geist Mono',ui-monospace,monospace;font-size:9.5px;font-weight:600;color:#94a3b8;letter-spacing:1.2px;text-transform:uppercase;margin-top:6px}

    .ab-cta{margin-top:54px;padding:28px 32px;background:linear-gradient(135deg,rgba(33,85,205,0.12),rgba(212,175,55,0.06));border:1px solid #d4af37;border-radius:6px;text-align:center}
    .ab-cta-h{font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;margin-bottom:8px}
    .ab-cta-sub{font-size:14px;color:#d4d8e0;line-height:1.6;margin-bottom:18px}
    .ab-cta-buttons{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
    .ab-cta-btn{background:#2155cd;color:#fff;border:1px solid #d4af37;border-radius:4px;padding:13px 26px;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;font-weight:700;letter-spacing:0.6px;cursor:pointer;text-transform:uppercase;transition:all 0.15s}
    .ab-cta-btn:hover{background:#0047ab;transform:translateY(-1px);box-shadow:0 10px 28px rgba(212,175,55,0.25)}
    .ab-cta-btn.secondary{background:transparent;border-color:rgba(212,175,55,0.4);color:#d4d8e0}
    .ab-cta-btn.secondary:hover{border-color:#d4af37;color:#d4af37}

    @media (max-width:720px){
      .ab-principles{grid-template-columns:1fr}
      .ab-stats{grid-template-columns:repeat(2,1fr)}
      .ab-founder-card{padding:20px}
      .ab-avatar{width:100px;height:100px;font-size:36px}
    }
  `;

  return (
    <div className="ab-page">
      <style>{css}</style>
      <TopNav />

      {/* Hero */}
      <div className="ab-hero">
        <div className="ab-hero-eyebrow">▸ About · RizeAI</div>
        <h1 className="ab-hero-h1">Built for the segment <span>CoStar refuses to call back.</span></h1>
        <p className="ab-hero-sub">
          RizeAI is the AI underwriting layer for Canadian real estate operators —
          open-data first, AI translates city + CMHC data into institutional reads
          in under 60 seconds. We're the platform we wished existed when we were
          the customer.
        </p>
      </div>

      <div className="ab-inner">
        {/* Why we exist */}
        <div className="ab-section">
          <div className="ab-section-tag">Why we exist</div>
          <h2 className="ab-section-h2">There's a $5,000/month gap below CoStar nobody serves with institutional tools.</h2>
          <p className="ab-p">
            CoStar, Altus, CompStak — the institutional-grade data + analytics platforms
            charge $5K-$50K per month. Their customers are REITs, pension funds, big PE.
            <strong> Below that price ceiling, the market has nothing.</strong> The
            10,000+ Canadian commercial brokers, multifamily syndicators, BRRRR investors,
            and emerging-shop GPs all underwrite on Excel.
          </p>
          <p className="ab-p">
            Every deal: 3-5 hours rebuilding the same spreadsheet. Cap rates calculated
            three ways, none institutional. Sale comps off Zillow. Loss-to-lease
            eyeballed, never quantified. IC memo written from scratch.
          </p>
          <p className="ab-p">
            We're the platform that closes this gap. <strong>Institutional outputs.
            Retail pricing. Self-serve onboarding. Canadian-first data foundation.</strong>
          </p>
        </div>

        {/* Founder */}
        <div className="ab-section">
          <div className="ab-section-tag">Founder</div>
          <h2 className="ab-section-h2">The customer IS the founder.</h2>

          <div className="ab-founder-card">
            <div className="ab-avatar">SY</div>
            <div className="ab-founder-body">
              <div className="ab-founder-name">Sunni Yaremchuk</div>
              <div className="ab-founder-title">Founder · Engineering · Pitch</div>
              <div className="ab-founder-bio">
                Real estate operator turned platform builder. Built RizeAI after spending
                hundreds of hours hand-underwriting deals with Excel + scattered open data
                sources. The Loss-to-Lease parser exists because no broker's rent roll
                ever showed me the spread I was actually buying. The Building Grade
                exists because every IC memo I wrote needed an asset-class read that took
                me an hour to compose. The platform is the toolkit I needed.
              </div>
            </div>
          </div>
        </div>

        {/* Stats — make the live platform tangible */}
        <div className="ab-section">
          <div className="ab-section-tag">Today</div>
          <h2 className="ab-section-h2">Live in production. Honest about what's next.</h2>
          <p className="ab-p">
            Not a Figma mockup. The numbers below reflect what's actually deployed and
            verifiable in production right now.
          </p>

          <div className="ab-stats">
            <div className="ab-stat">
              <div className="ab-stat-val">6</div>
              <div className="ab-stat-lbl">Cities · parcel-level zoning</div>
            </div>
            <div className="ab-stat">
              <div className="ab-stat-val">26</div>
              <div className="ab-stat-lbl">CMHC metros · rent + vacancy</div>
            </div>
            <div className="ab-stat">
              <div className="ab-stat-val">20+</div>
              <div className="ab-stat-lbl">Underwriting calculators</div>
            </div>
            <div className="ab-stat">
              <div className="ab-stat-val">15</div>
              <div className="ab-stat-lbl">Live AI Read modes</div>
            </div>
          </div>
        </div>

        {/* Operating principles */}
        <div className="ab-section">
          <div className="ab-section-tag">Operating principles</div>
          <h2 className="ab-section-h2">Four rules we don't compromise on.</h2>

          <div className="ab-principles">
            <div className="ab-principle">
              <div className="ab-principle-num">▸ 01</div>
              <div className="ab-principle-h">Honest about coverage.</div>
              <div className="ab-principle-body">
                When an address falls outside our covered set, we say so. No fake estimates
                presented as data. AI-inferred values are labeled "AI EST" with
                confidence + reasoning surfaced inline.
              </div>
            </div>
            <div className="ab-principle">
              <div className="ab-principle-num">▸ 02</div>
              <div className="ab-principle-h">Open-data first.</div>
              <div className="ab-principle-body">
                Six Canadian cities ship parcel-level zoning via free public APIs.
                CMHC publishes 26 metros of rent + vacancy annually. We build on
                what's free, layer on what's licensed only where it materially
                changes the read.
              </div>
            </div>
            <div className="ab-principle">
              <div className="ab-principle-num">▸ 03</div>
              <div className="ab-principle-h">Self-serve, no salesperson.</div>
              <div className="ab-principle-body">
                Free tier loads in 30 seconds. Stripe live-mode billing. Pricing
                is public. If you need a sales call to start using the product,
                we built the wrong product.
              </div>
            </div>
            <div className="ab-principle">
              <div className="ab-principle-num">▸ 04</div>
              <div className="ab-principle-h">AI Read, not AI replace.</div>
              <div className="ab-principle-body">
                Claude translates data into institutional reads. We never claim to
                replace your judgment — we cut the 3 hours of analyst work that
                stands between you and the decision.
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="ab-cta">
          <div className="ab-cta-h">Try the platform. 60 seconds. Free.</div>
          <div className="ab-cta-sub">
            Type any Canadian address into the X-Ray bar. Or drop a rent roll PDF on
            the Commercial Underwriter and see the stranded upside in dollars.
          </div>
          <div className="ab-cta-buttons">
            <button className="ab-cta-btn" onClick={() => navigate("/")}>
              Try the X-Ray →
            </button>
            <button className="ab-cta-btn secondary" onClick={() => navigate("/pricing")}>
              See pricing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
