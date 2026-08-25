import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import TopNav from "./components/TopNav";

/**
 * VsDealCheck — /vs-dealcheck public comparison landing page.
 *
 * Completes the vs- trio (BiggerPockets, CoStar, DealCheck). Every serious
 * deal-analyzer shopper Googles competitors. DealCheck is the closest
 * feature-wise mid-market comp — this page owns that search intent.
 *
 * Positioning: "DealCheck was built for US financing structures. RizeAI
 * ships Canadian bylaw math they don't have."
 */
export default function VsDealCheck() {
  const navigate = useNavigate();

  useDocMeta({
    title: "RizeAI vs DealCheck — Canadian bylaw-native underwriting",
    description: "DealCheck was built for US markets and financing structures. RizeAI ships Canadian bylaw specs, CMHC rent anchors, and the multiplex math DealCheck doesn't have. Free tier + $99/mo Pro.",
  });

  useEffect(() => { track("vs_dealcheck_view"); }, []);

  return (
    <div className="vd-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="vd-body">
        {/* HERO */}
        <div className="vd-hero">
          <div className="vd-eyebrow">
            <span className="vd-eyebrow-dot" />
            COMPARISON · RIZEAI vs DEALCHECK
          </div>
          <h1 className="vd-h1">DealCheck was built for the US market. <span>RizeAI is Canadian-native.</span></h1>
          <p className="vd-sub">
            DealCheck ($36/mo) is a solid US-focused deal analyzer with real users and good UX. If you're underwriting Kansas duplexes, keep it. If you're underwriting Canadian residential — especially post-2023 multiplex bylaws — you need something built for the actual rules.
          </p>
          <div className="vd-hero-cta-row">
            <button className="vd-cta" onClick={() => navigate("/property?addr=2424+Westmount+Rd+NW%2C+Calgary+AB")}>▶ Try RizeAI — no signup</button>
            <button className="vd-cta ghost" onClick={() => navigate("/pricing")}>Pricing</button>
          </div>
        </div>

        {/* SIDE-BY-SIDE */}
        <section className="vd-section">
          <div className="vd-section-tag">▸ SIDE-BY-SIDE</div>
          <div className="vd-table-wrap">
            <table className="vd-table">
              <thead>
                <tr>
                  <th style={{minWidth:220}}>Capability</th>
                  <th className="rz">RizeAI</th>
                  <th>DealCheck</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>Market focus</b></td>
                  <td className="rz">Canadian residential (7 cities)</td>
                  <td>US markets (all 50 states)</td>
                </tr>
                <tr>
                  <td><b>Starting price</b></td>
                  <td className="rz"><span className="vd-brass">$99/mo</span> Pro</td>
                  <td>$36/mo (billed annually)</td>
                </tr>
                <tr>
                  <td><b>Free tier</b></td>
                  <td className="rz"><span className="vd-yes">✓</span> 5 lookups/mo</td>
                  <td><span className="vd-partial">◐</span> 3-property limit</td>
                </tr>
                <tr>
                  <td><b>Canadian zoning bylaws (bylaw-level)</b></td>
                  <td className="rz"><span className="vd-yes">✓</span> 37 codes · 7 cities</td>
                  <td><span className="vd-no">✗</span> Not built for CA</td>
                </tr>
                <tr>
                  <td><b>CMHC rent anchors (26 metros)</b></td>
                  <td className="rz"><span className="vd-yes">✓</span> Live · quarterly refresh</td>
                  <td><span className="vd-no">✗</span> US rent data only</td>
                </tr>
                <tr>
                  <td><b>Toronto multiplex bylaw math (2023)</b></td>
                  <td className="rz"><span className="vd-yes">✓</span></td>
                  <td><span className="vd-no">✗</span></td>
                </tr>
                <tr>
                  <td><b>Edmonton Bylaw 20001 (8-unit as-of-right)</b></td>
                  <td className="rz"><span className="vd-yes">✓</span></td>
                  <td><span className="vd-no">✗</span></td>
                </tr>
                <tr>
                  <td><b>4 strategies in parallel (BRRRR/Hold/Flip/Build)</b></td>
                  <td className="rz"><span className="vd-yes">✓</span> Auto-computed · 3 seconds</td>
                  <td><span className="vd-partial">◐</span> Sequential · 1 at a time</td>
                </tr>
                <tr>
                  <td><b>AI-generated deal thesis</b></td>
                  <td className="rz"><span className="vd-yes">✓</span> our AI</td>
                  <td><span className="vd-no">✗</span> No AI layer</td>
                </tr>
                <tr>
                  <td><b>Chrome extension (Realtor.ca + HouseSigma)</b></td>
                  <td className="rz"><span className="vd-yes">✓</span></td>
                  <td><span className="vd-no">✗</span></td>
                </tr>
                <tr>
                  <td><b>Buy Box saved searches + weekly digest</b></td>
                  <td className="rz"><span className="vd-yes">✓</span></td>
                  <td><span className="vd-no">✗</span></td>
                </tr>
                <tr>
                  <td><b>White-label PDF for firms</b></td>
                  <td className="rz"><span className="vd-yes">✓</span> Scale tier</td>
                  <td><span className="vd-partial">◐</span> Team tier</td>
                </tr>
                <tr>
                  <td><b>Public API (embed in firm CRM)</b></td>
                  <td className="rz"><span className="vd-yes">✓</span> Scale tier</td>
                  <td><span className="vd-no">✗</span></td>
                </tr>
                <tr>
                  <td><b>Time to verdict on new address</b></td>
                  <td className="rz"><span className="vd-brass"><b>3 seconds</b></span></td>
                  <td>10-15 min setup</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* WHY THIS MATTERS */}
        <section className="vd-section">
          <div className="vd-section-tag">▸ THE UNDERLYING GAP</div>
          <h2 className="vd-h2">DealCheck assumes US financing + US zoning.</h2>
          <div className="vd-gap-grid">
            <div className="vd-gap">
              <div className="vd-gap-num">01</div>
              <div className="vd-gap-h">US financing structures baked in</div>
              <div className="vd-gap-p">DealCheck defaults to 30-year fixed FHA-eligible mortgages, US property tax rules, US insurance patterns. Every input requires manual overrides for Canadian usage. Small errors compound into wrong verdicts.</div>
            </div>
            <div className="vd-gap">
              <div className="vd-gap-num">02</div>
              <div className="vd-gap-h">No Canadian bylaw layer</div>
              <div className="vd-gap-p">Toronto's 2023 Multiplex Bylaw, Edmonton's Bylaw 20001, Calgary's R-CG rezoning — these fundamentally changed what buildings are legal on which lots. DealCheck sees a 3,800 sqft Toronto lot and computes SFH numbers. Misses the 4-unit path entirely.</div>
            </div>
            <div className="vd-gap">
              <div className="vd-gap-num">03</div>
              <div className="vd-gap-h">Rent data from US sources</div>
              <div className="vd-gap-p">DealCheck's rent estimates come from US comp scrapers that either don't cover Canadian markets or return low-confidence data. CMHC is the government-published rental anchor for Canada — RizeAI ships against it natively.</div>
            </div>
          </div>
        </section>

        {/* WHEN DEALCHECK IS RIGHT */}
        <section className="vd-section">
          <div className="vd-section-tag">▸ WHEN DEALCHECK IS THE RIGHT ANSWER</div>
          <p className="vd-p">Same intellectual honesty applies here as with CoStar. If any of these fit, DealCheck is a genuinely good choice:</p>
          <div className="vd-when">
            <div className="vd-when-item">▸ You underwrite primarily US properties</div>
            <div className="vd-when-item">▸ You need US-specific financing scenarios (FHA, VA, 1031 exchange)</div>
            <div className="vd-when-item">▸ You're a US-based investor with a small Canadian side portfolio</div>
            <div className="vd-when-item">▸ You want the cheapest possible per-lookup cost and don't need bylaw specs</div>
          </div>
          <p className="vd-p" style={{marginTop:14}}>
            For everything else — every Canadian broker, agent, and investor underwriting deals under CA bylaws — DealCheck requires too many workarounds to be reliable. RizeAI is what you actually want.
          </p>
        </section>

        {/* CTA */}
        <div className="vd-cta-block">
          <div className="vd-cta-h">Try the difference in 3 seconds.</div>
          <div className="vd-cta-p">Free tier: 5 lookups/month, no credit card. Same address DealCheck can't underwrite correctly.</div>
          <div className="vd-cta-row">
            <button className="vd-cta big" onClick={() => navigate("/property?addr=2424+Westmount+Rd+NW%2C+Calgary+AB")}>▶ Run a live verdict →</button>
            <button className="vd-cta ghost" onClick={() => navigate("/case-studies")}>Case studies</button>
            <button className="vd-cta ghost" onClick={() => navigate("/pricing")}>Pricing</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .vd-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .vd-body { max-width: 980px; margin: 0 auto; padding: 44px 24px 80px; }

  .vd-hero { text-align: center; margin-bottom: 44px; padding-bottom: 36px; border-bottom: 1px solid var(--borderf); }
  .vd-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 16px; }
  .vd-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .vd-h1 { font-size: clamp(30px, 4.5vw, 46px); font-weight: 800; color: var(--text); letter-spacing: -1.7px; line-height: 1.08; margin: 0 0 16px; }
  .vd-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .vd-sub { font-size: 15.5px; color: var(--sub); line-height: 1.7; max-width: 700px; margin: 0 auto 24px; }
  .vd-hero-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

  .vd-section { margin-bottom: 40px; padding-bottom: 32px; border-bottom: 1px solid var(--borderf); }
  .vd-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 12px; text-transform: uppercase; }
  .vd-h2 { font-size: clamp(22px, 3vw, 30px); font-weight: 800; color: var(--text); letter-spacing: -0.7px; line-height: 1.2; margin: 0 0 22px; }
  .vd-p { font-size: 14.5px; color: var(--text); line-height: 1.7; margin: 0 0 12px; }

  .vd-table-wrap { overflow-x: auto; border: 1px solid var(--borderf); border-radius: 10px; background: var(--card); }
  .vd-table { width: 100%; border-collapse: collapse; font-family: 'Geist', sans-serif; min-width: 640px; }
  .vd-table th, .vd-table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--borderf); font-size: 13.5px; }
  .vd-table th { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.2px; color: var(--sub); text-transform: uppercase; background: var(--card2); }
  .vd-table th.rz { color: var(--brass); border-bottom: 2px solid var(--brass); }
  .vd-table td.rz { background: rgba(212,175,55,0.04); }
  .vd-table tr:last-child td { border-bottom: none; }
  .vd-yes { color: #16a34a; font-weight: 800; font-size: 16px; margin-right: 5px; }
  .vd-no { color: #dc2626; font-weight: 800; font-size: 16px; margin-right: 5px; }
  .vd-partial { color: #eab308; font-weight: 800; font-size: 14px; margin-right: 5px; }
  .vd-brass { color: var(--brass); font-weight: 800; }

  .vd-gap-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  @media(max-width:720px){ .vd-gap-grid { grid-template-columns: 1fr; } }
  .vd-gap { padding: 18px 20px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--royal); border-radius: 10px; }
  .vd-gap-num { font-family: 'Geist Mono', monospace; font-size: 22px; font-weight: 800; color: var(--royal); letter-spacing: -0.8px; margin-bottom: 8px; }
  .vd-gap-h { font-size: 15px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 8px; }
  .vd-gap-p { font-size: 12.5px; color: var(--sub); line-height: 1.6; }

  .vd-when { display: flex; flex-direction: column; gap: 6px; padding: 16px 18px; background: rgba(220,38,38,0.04); border: 1px solid rgba(220,38,38,0.18); border-left: 3px solid #dc2626; border-radius: 8px; margin-top: 10px; }
  .vd-when-item { font-size: 13px; color: var(--text); line-height: 1.6; font-family: 'Geist Mono', monospace; letter-spacing: 0.2px; }

  .vd-cta-block { padding: 34px 30px; background: linear-gradient(135deg, rgba(212,175,55,0.08), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.35); border-radius: 12px; text-align: center; margin-top: 32px; }
  .vd-cta-h { font-size: 24px; font-weight: 800; color: var(--text); letter-spacing: -0.6px; margin-bottom: 8px; }
  .vd-cta-p { font-size: 14.5px; color: var(--sub); line-height: 1.6; margin-bottom: 22px; max-width: 500px; margin-left: auto; margin-right: auto; }
  .vd-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .vd-cta { padding: 12px 22px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; }
  .vd-cta.big { padding: 14px 28px; font-size: 13px; }
  .vd-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .vd-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
