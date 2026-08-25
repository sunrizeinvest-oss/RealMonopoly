import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import TopNav from "./components/TopNav";

/**
 * VsCoStar — /vs-costar public comparison landing page.
 *
 * Every serious Canadian real estate professional Googles "CoStar Canada
 * residential" or "CoStar alternative for residential" — currently there's
 * no first-party answer. This page captures that intent.
 *
 * Positioning: "CoStar for the market they refuse to serve." Not attacking
 * CoStar — pointing at the gap CoStar has publicly declined to fill.
 */
export default function VsCoStar() {
  const navigate = useNavigate();

  useDocMeta({
    title: "RizeAI vs CoStar — The Canadian residential alternative",
    description: "CoStar refuses to serve residential real estate under 20 units. RizeAI is what fills that gap for Canadian brokers, agents, and investors — 3-second underwriting with real bylaw data, $99/mo vs $12K/yr.",
  });

  useEffect(() => { track("vs_costar_view"); }, []);

  return (
    <div className="vc-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="vc-body">
        {/* HERO */}
        <div className="vc-hero">
          <div className="vc-eyebrow">
            <span className="vc-eyebrow-dot" />
            COMPARISON · RIZEAI vs COSTAR
          </div>
          <h1 className="vc-h1">CoStar refuses to serve residential. <span>RizeAI fills the gap.</span></h1>
          <p className="vc-sub">
            CoStar is the standard for commercial real estate data — public company, ~$30B market cap, $12K/yr subscriptions. They've publicly declined to build for residential under 20 units. If you're underwriting Canadian residential, CoStar isn't for you. RizeAI is.
          </p>
          <div className="vc-hero-cta-row">
            <button className="vc-cta" onClick={() => navigate("/property?addr=2424+Westmount+Rd+NW%2C+Calgary+AB")}>▶ Try RizeAI — no signup</button>
            <button className="vc-cta ghost" onClick={() => navigate("/pricing")}>See pricing</button>
          </div>
        </div>

        {/* HEADLINE TABLE */}
        <section className="vc-section">
          <div className="vc-section-tag">▸ SIDE-BY-SIDE</div>
          <div className="vc-table-wrap">
            <table className="vc-table">
              <thead>
                <tr>
                  <th style={{minWidth:220}}>Capability</th>
                  <th className="rz">RizeAI</th>
                  <th>CoStar</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>Focus</b></td>
                  <td className="rz">Canadian residential (SFH → 8-plex)</td>
                  <td>US + intl commercial (20+ units)</td>
                </tr>
                <tr>
                  <td><b>Starting price</b></td>
                  <td className="rz"><span className="vc-brass">$99/mo</span> (Pro tier)</td>
                  <td>~$12,000/yr enterprise seat</td>
                </tr>
                <tr>
                  <td><b>Free tier</b></td>
                  <td className="rz"><span className="vc-yes">✓</span> 5 lookups/mo</td>
                  <td><span className="vc-no">✗</span> None</td>
                </tr>
                <tr>
                  <td><b>Canadian residential zoning specs</b></td>
                  <td className="rz"><span className="vc-yes">✓</span> 37 codes · 7 cities · bylaw-level</td>
                  <td><span className="vc-partial">◐</span> Commercial only</td>
                </tr>
                <tr>
                  <td><b>Toronto Multiplex Bylaw (2023)</b></td>
                  <td className="rz"><span className="vc-yes">✓</span> Live math on every RD lot</td>
                  <td><span className="vc-no">✗</span> Not modeled</td>
                </tr>
                <tr>
                  <td><b>Edmonton Bylaw 20001 (8-unit as-of-right)</b></td>
                  <td className="rz"><span className="vc-yes">✓</span> Live</td>
                  <td><span className="vc-no">✗</span> Not modeled</td>
                </tr>
                <tr>
                  <td><b>CMHC rent anchors</b></td>
                  <td className="rz"><span className="vc-yes">✓</span> 26 metros · quarterly refresh</td>
                  <td><span className="vc-partial">◐</span> Different data source</td>
                </tr>
                <tr>
                  <td><b>4-strategy verdict (BRRRR / Hold / Flip / Multiplex)</b></td>
                  <td className="rz"><span className="vc-yes">✓</span> Parallel · 3 seconds</td>
                  <td><span className="vc-no">✗</span> Not built for pro-investor workflow</td>
                </tr>
                <tr>
                  <td><b>Chrome extension (Realtor.ca / HouseSigma)</b></td>
                  <td className="rz"><span className="vc-yes">✓</span></td>
                  <td><span className="vc-no">✗</span></td>
                </tr>
                <tr>
                  <td><b>Public API for firms</b></td>
                  <td className="rz"><span className="vc-yes">✓</span> Scale tier ($299/mo)</td>
                  <td><span className="vc-partial">◐</span> Enterprise contract only</td>
                </tr>
                <tr>
                  <td><b>Time to verdict on a new address</b></td>
                  <td className="rz"><span className="vc-brass"><b>3 seconds</b></span></td>
                  <td>Hours of manual pull</td>
                </tr>
                <tr>
                  <td><b>Onboarding time</b></td>
                  <td className="rz">30 seconds (sign in with Google)</td>
                  <td>2–4 weeks · legal + procurement</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* WHY THE GAP EXISTS */}
        <section className="vc-section">
          <div className="vc-section-tag">▸ WHY THIS GAP EXISTS</div>
          <h2 className="vc-h2">CoStar's math doesn't work below 20 units.</h2>
          <div className="vc-why-grid">
            <div className="vc-why">
              <div className="vc-why-num">01</div>
              <div className="vc-why-h">Enterprise sales motion</div>
              <div className="vc-why-p">CoStar's business model is 6-figure annual contracts with institutional CRE. That sales motion can't profitably reach a Canadian broker running a 4-plex analysis for $99/mo. The economics preclude it.</div>
            </div>
            <div className="vc-why">
              <div className="vc-why-num">02</div>
              <div className="vc-why-h">US-centric data infrastructure</div>
              <div className="vc-why-p">CoStar's Canadian coverage is 10-K public buildings + institutional CRE. Provincial zoning bylaws (Alberta R-CG, Ontario RD, BC RS) require city-by-city data assembly — CoStar's playbook doesn't scale that way.</div>
            </div>
            <div className="vc-why">
              <div className="vc-why-num">03</div>
              <div className="vc-why-h">No pro-investor workflow</div>
              <div className="vc-why-p">CoStar is a data provider. RizeAI is a workflow. Brokers don't need more data — they need "type an address, get the verdict." That's a fundamentally different product.</div>
            </div>
          </div>
        </section>

        {/* WHEN COSTAR STILL WINS */}
        <section className="vc-section">
          <div className="vc-section-tag">▸ WHERE COSTAR IS STILL THE ANSWER</div>
          <p className="vc-p">
            We won't pretend CoStar isn't the right tool for the jobs it's actually built for. If any of these apply, keep CoStar:
          </p>
          <div className="vc-when">
            <div className="vc-when-item">▸ You underwrite 20+ unit commercial buildings at institutional scale</div>
            <div className="vc-when-item">▸ You need historical lease-level data on Class A office towers</div>
            <div className="vc-when-item">▸ You work at a REIT, pension fund, or bank with existing CoStar contract</div>
            <div className="vc-when-item">▸ Your workflow is portfolio-management, not deal-underwriting</div>
          </div>
          <p className="vc-p" style={{marginTop:14}}>
            For everything else — every Canadian broker, agent, investor, or firm underwriting under 20-unit residential — CoStar is over-priced, under-fit, and doesn't have the data. That's where RizeAI is the answer.
          </p>
        </section>

        {/* CTA */}
        <div className="vc-cta-block">
          <div className="vc-cta-h">Try the difference in 3 seconds.</div>
          <div className="vc-cta-p">Free tier: 5 lookups/month, no credit card. Type any Canadian address; get the 4-strategy verdict.</div>
          <div className="vc-cta-row">
            <button className="vc-cta big" onClick={() => navigate("/property?addr=2424+Westmount+Rd+NW%2C+Calgary+AB")}>▶ Run a live verdict →</button>
            <button className="vc-cta ghost" onClick={() => navigate("/case-studies")}>See broker case studies</button>
            <button className="vc-cta ghost" onClick={() => navigate("/pricing")}>Pricing</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .vc-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .vc-body { max-width: 980px; margin: 0 auto; padding: 44px 24px 80px; }

  .vc-hero { text-align: center; margin-bottom: 44px; padding-bottom: 36px; border-bottom: 1px solid var(--borderf); }
  .vc-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 16px; }
  .vc-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .vc-h1 { font-size: clamp(30px, 4.5vw, 46px); font-weight: 800; color: var(--text); letter-spacing: -1.7px; line-height: 1.08; margin: 0 0 16px; }
  .vc-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .vc-sub { font-size: 15.5px; color: var(--sub); line-height: 1.7; max-width: 700px; margin: 0 auto 24px; }
  .vc-hero-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

  .vc-section { margin-bottom: 40px; padding-bottom: 32px; border-bottom: 1px solid var(--borderf); }
  .vc-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 12px; text-transform: uppercase; }
  .vc-h2 { font-size: clamp(22px, 3vw, 30px); font-weight: 800; color: var(--text); letter-spacing: -0.7px; line-height: 1.2; margin: 0 0 22px; }
  .vc-p { font-size: 14.5px; color: var(--text); line-height: 1.7; margin: 0 0 12px; }
  .vc-p b { color: var(--brass-2); font-weight: 800; }

  .vc-table-wrap { overflow-x: auto; border: 1px solid var(--borderf); border-radius: 10px; background: var(--card); }
  .vc-table { width: 100%; border-collapse: collapse; font-family: 'Geist', sans-serif; min-width: 640px; }
  .vc-table th, .vc-table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--borderf); font-size: 13.5px; }
  .vc-table th { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.2px; color: var(--sub); text-transform: uppercase; background: var(--card2); }
  .vc-table th.rz { color: var(--brass); border-bottom: 2px solid var(--brass); }
  .vc-table td.rz { background: rgba(212,175,55,0.04); }
  .vc-table tr:last-child td { border-bottom: none; }
  .vc-yes { color: #16a34a; font-weight: 800; font-size: 16px; margin-right: 5px; }
  .vc-no { color: #dc2626; font-weight: 800; font-size: 16px; margin-right: 5px; }
  .vc-partial { color: #eab308; font-weight: 800; font-size: 14px; margin-right: 5px; }
  .vc-brass { color: var(--brass); font-weight: 800; }

  .vc-why-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  @media(max-width:720px){ .vc-why-grid { grid-template-columns: 1fr; } }
  .vc-why { padding: 18px 20px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--royal); border-radius: 10px; }
  .vc-why-num { font-family: 'Geist Mono', monospace; font-size: 22px; font-weight: 800; color: var(--royal); letter-spacing: -0.8px; margin-bottom: 8px; }
  .vc-why-h { font-size: 15px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 8px; }
  .vc-why-p { font-size: 12.5px; color: var(--sub); line-height: 1.6; }

  .vc-when { display: flex; flex-direction: column; gap: 6px; padding: 16px 18px; background: rgba(220,38,38,0.04); border: 1px solid rgba(220,38,38,0.18); border-left: 3px solid #dc2626; border-radius: 8px; margin-top: 10px; }
  .vc-when-item { font-size: 13px; color: var(--text); line-height: 1.6; font-family: 'Geist Mono', monospace; letter-spacing: 0.2px; }

  .vc-cta-block { padding: 34px 30px; background: linear-gradient(135deg, rgba(212,175,55,0.08), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.35); border-radius: 12px; text-align: center; margin-top: 32px; }
  .vc-cta-h { font-size: 24px; font-weight: 800; color: var(--text); letter-spacing: -0.6px; margin-bottom: 8px; }
  .vc-cta-p { font-size: 14.5px; color: var(--sub); line-height: 1.6; margin-bottom: 22px; max-width: 500px; margin-left: auto; margin-right: auto; }
  .vc-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .vc-cta { padding: 12px 22px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; }
  .vc-cta.big { padding: 14px 28px; font-size: 13px; }
  .vc-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .vc-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
