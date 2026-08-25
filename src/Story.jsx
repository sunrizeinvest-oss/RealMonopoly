import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import TopNav from "./components/TopNav";

/**
 * Story — /story founder narrative page.
 *
 * The origin arc that turns "here's what I built" into "here's why I built
 * it and why I'm the right person to." Public (no gate) — VCs land here from
 * /pitch, brokers land here from /about.
 *
 * Founder replaces the placeholder narrative blocks with real answers.
 */
export default function Story() {
  const navigate = useNavigate();

  useDocMeta({
    title: "Our Story · RizeAI — Why we built the Canadian underwriter",
    description: "The founder story behind RizeAI — why an institutional underwriting layer for Canadian residential real estate needed to exist.",
    // Points to per-page OG image once the founder generates og-story.png (1200×630).
    // Until then, useDocMeta falls back to the site default so shares still preview.
    // image: "https://www.realdealestate.app/og-story.png",
    jsonld: {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Why we built the underwriter Canadian brokers deserve",
      "description": "Founder narrative for RizeAI — from spreadsheet frustration to a 4-strategy underwriting layer live in 7 Canadian cities.",
      "author": { "@type": "Person", "name": "Sunni Yaremchuk" },
      "publisher": { "@type": "Organization", "name": "RizeAI", "url": "https://www.realdealestate.app" },
      "mainEntityOfPage": "https://www.realdealestate.app/story",
    },
  });

  return (
    <div className="st-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="st-body">
        <div className="st-header">
          <div className="st-eyebrow">
            <span className="st-eyebrow-dot" />
            OUR STORY
          </div>
          <h1 className="st-h1">
            Why we built <span>the underwriter Canadian brokers deserve.</span>
          </h1>
          <p className="st-sub">
            RizeAI didn't start as a startup. It started as an internal tool built out of frustration.
            Here's the arc.
          </p>
        </div>

        {/* Chapter 1 */}
        <section className="st-chapter">
          <div className="st-chapter-num">01</div>
          <div className="st-chapter-body">
            <div className="st-chapter-tag">▸ THE PROBLEM I LIVED</div>
            <h2 className="st-chapter-h">Every one of my own deals took 3–6 hours in Excel.</h2>
            <p className="st-p">
              I run <a href="https://rizedevelopments.com" target="_blank" rel="noreferrer" className="st-inline">Rize Developments</a> —
              an Edmonton multifamily developer with 4 infill projects currently underway (8 units in Jasper Park,
              5 + 6 units in Allendale, 9 units in Mayfield). Every one of those deals started the same way: me at my
              desk running the same underwriting math in Excel, cross-referencing city bylaw PDFs, calling CMHC
              contacts to verify rent anchors, sanity-checking construction costs against local comps.
            </p>
            <p className="st-p">
              When Edmonton's Bylaw 20001 passed in 2024 — the reform that made every RS lot in the city support
              up to 8 units as-of-right — the underwriting complexity went <b>up, not down</b>. Every corner lot
              became a potential 8-plex. Every SFH became a "should I convert" question. Existing tools didn't
              handle the new math. CoStar skipped residential. BiggerPockets assumed US financing. DealCheck didn't
              know what an RS zoning code was.
            </p>
          </div>
        </section>

        {/* Chapter 2 */}
        <section className="st-chapter">
          <div className="st-chapter-num">02</div>
          <div className="st-chapter-body">
            <div className="st-chapter-tag">▸ THE INSIGHT</div>
            <h2 className="st-chapter-h">The data was public. Nobody was assembling it.</h2>
            <p className="st-p">
              Edmonton publishes Bylaw 20001 as open data. So does Calgary (Land Use Bylaw 1P2007), Toronto (the 2023
              Multiplex Bylaw), Vancouver (RS reforms 2024). CMHC publishes rent anchors for 26 metros every quarter.
              Nominatim geocodes any address for free. Anthropic's AI ships institutional-grade deal thesis
              generation for $0.001 per verdict.
            </p>
            <p className="st-p">
              Every ingredient was sitting in the open. Nobody was cooking with them. The value wasn't in <em>acquiring</em>
              the data — it was in <b>the integration</b>: matching a typed address against the right city adapter, running
              four strategies in parallel, anchoring rent to CMHC data, and handing back a verdict in three seconds. That's
              what I was doing manually every week for my own deals. The tool wrote itself once I sat down.
            </p>
          </div>
        </section>

        {/* Chapter 3 */}
        <section className="st-chapter">
          <div className="st-chapter-num">03</div>
          <div className="st-chapter-body">
            <div className="st-chapter-tag">▸ THE BUILD</div>
            <h2 className="st-chapter-h">Solo. 8 weeks. Every zoning code hand-verified.</h2>
            <p className="st-p">
              I started building RizeAI in early 2026. Solo. First city adapter took a full weekend — Edmonton's
              Bylaw 20001 has hundreds of provisions but only ~10 zoning codes cover 90% of residential deals.
              Every one hand-verified against the bylaw PDF because that's the standard I hold for my own deals
              at Rize Developments.
            </p>
            <p className="st-p">
              Calgary, Vancouver, Toronto, Ottawa, Mississauga, Hamilton followed. Then dimensional specs — max
              height, FAR, coverage, setbacks — for 37 codes across the 7 cities. Then the 4-strategy math engine.
              Then our AI for AI thesis generation. Then the Chrome extension so brokers can underwrite from
              a Realtor.ca listing in one click.
            </p>
            <p className="st-p">
              Every feature was built for a use case I've hit personally on a Rize project. Nothing built in a vacuum.
              I use RizeAI myself every week to underwrite my own deals — same tool, same address bar, same 3-second
              verdict. If it's not good enough for my own $2M development decisions, it's not good enough to ship.
            </p>
          </div>
        </section>

        {/* Chapter 4 */}
        <section className="st-chapter">
          <div className="st-chapter-num">04</div>
          <div className="st-chapter-body">
            <div className="st-chapter-tag">▸ WHERE WE ARE</div>
            <h2 className="st-chapter-h">Live in production. 7 cities. Real numbers.</h2>
            <p className="st-p">
              RizeAI ships today at <a onClick={() => navigate("/property")} className="st-inline">realdealestate.app/property</a>.
              Free tier is 5 lookups per month, Pro is $99/mo, Scale is $299/mo with white-label PDFs and public API access.
              37 zoning codes across 7 Canadian cities live. CMHC-anchored rent for 26 metros. Chrome extension for Realtor.ca +
              HouseSigma + Zillow + Redfin. Public API for firms who want to integrate.
            </p>
            <p className="st-p">
              You can see the current traction — real numbers pulled from the production database — at{" "}
              <a onClick={() => navigate("/live")} className="st-inline">/live</a>.
              You can see the roadmap at <a onClick={() => navigate("/roadmap")} className="st-inline">/roadmap</a>.
              You can see how brokers use it at <a onClick={() => navigate("/case-studies")} className="st-inline">/case-studies</a>.
            </p>
          </div>
        </section>

        {/* Chapter 5 — the ask */}
        <section className="st-chapter st-final">
          <div className="st-chapter-num" style={{ color: "var(--brass)" }}>05</div>
          <div className="st-chapter-body">
            <div className="st-chapter-tag" style={{ color: "var(--brass)" }}>▸ WHAT COMES NEXT</div>
            <h2 className="st-chapter-h">RizeAI becomes the default underwriter for Canadian residential.</h2>
            <p className="st-p">
              Every Canadian broker types every address through RizeAI before they pick up the phone. Every developer
              (including me at Rize Developments) runs their lots through it before they submit an offer. Every brokerage
              firm subscribes to Scale tier to give their agents the same institutional-grade underwriting the family
              offices have. Then we expand to the US, then commercial real estate, then multi-strategy funds. That's the
              10-year arc — and I'm 100% in for it.
            </p>
            <p className="st-p">
              We're raising a pre-seed round to get from here to the 1,000-customer / $100K MRR mark. Materials live at{" "}
              <a onClick={() => navigate("/pitch")} className="st-inline">realdealestate.app/pitch</a> (access code required).
            </p>
            <div className="st-final-cta">
              <button className="st-cta" onClick={() => window.open("mailto:sunni@rizedevelopments.com?subject=RizeAI%20-%20Introduction")}>
                Reach out →
              </button>
              <button className="st-cta ghost" onClick={() => navigate("/property")}>Try the product</button>
              <button className="st-cta ghost" onClick={() => navigate("/roadmap")}>See the roadmap</button>
            </div>
          </div>
        </section>

        <div className="st-signoff">
          — Sunni Yaremchuk<br />
          <span className="st-signoff-role">Founder, RizeAI</span>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .st-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .st-body { max-width: 820px; margin: 0 auto; padding: 48px 24px 80px; }

  .st-header { text-align: center; margin-bottom: 56px; }
  .st-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 14px; }
  .st-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .st-h1 { font-size: clamp(30px, 4.5vw, 44px); font-weight: 800; color: var(--text); letter-spacing: -1.6px; line-height: 1.1; margin: 0 0 14px; }
  .st-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .st-sub { font-size: 15.5px; color: var(--sub); line-height: 1.6; margin: 0 auto; max-width: 640px; }

  .st-chapter { display: grid; grid-template-columns: 100px 1fr; gap: 20px; margin-bottom: 48px; padding-bottom: 40px; border-bottom: 1px solid var(--borderf); }
  @media (max-width: 640px) { .st-chapter { grid-template-columns: 60px 1fr; gap: 14px; } }
  .st-chapter:last-of-type { border-bottom: none; }
  .st-chapter-num { font-family: 'Geist Mono', monospace; font-size: clamp(48px, 6vw, 72px); font-weight: 800; color: var(--sub); letter-spacing: -3px; line-height: 1; }
  .st-chapter-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 10px; }
  .st-chapter-h { font-size: clamp(22px, 3vw, 30px); font-weight: 800; color: var(--text); letter-spacing: -0.8px; line-height: 1.2; margin: 0 0 16px; }
  .st-p { font-size: 16px; color: var(--text); line-height: 1.75; margin: 0 0 14px; }
  .st-p b { color: var(--brass-2); font-weight: 800; }
  .st-inline { color: var(--brass-2); cursor: pointer; text-decoration: underline; text-decoration-color: rgba(212,175,55,0.4); }

  .st-final { padding: 32px 24px; background: linear-gradient(135deg, rgba(212,175,55,0.05), rgba(33,85,205,0.03)); border: 1px solid rgba(212,175,55,0.24); border-radius: 12px; margin-top: 24px; }
  .st-final-cta { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
  .st-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; }
  .st-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .st-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  .st-signoff { text-align: center; padding: 40px 20px; font-size: 18px; color: var(--brass-2); font-style: italic; font-family: 'Geist Mono', monospace; }
  .st-signoff-role { font-size: 12px; color: var(--sub); letter-spacing: 0.4px; font-style: normal; }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
