import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import { bookingHref, BOOKING_LABEL } from "./lib/booking";

/**
 * PitchUnitEconomics — /pitch/unit-economics deep-dive.
 *
 * The single most technical page in the raise materials. VCs open this
 * second, after the deck. Every number here needs a source string underneath
 * so it doesn't read like handwaving.
 *
 * All figures are working-hypothesis numbers as of the raise. Founder
 * should update after each first-check discussion where a VC pushes back.
 */
const PITCH_CODE = "rzai-insider-2026";

export default function PitchUnitEconomics() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);

  useDocMeta({
    title: "RizeAI · Unit Economics (Confidential)",
    description: "CAC, LTV, gross margin, burn rate, runway — RizeAI raise-model unit economics deep-dive.",
  });

  useEffect(() => {
    const p = params.get("p") || "";
    let stored = "";
    try { stored = sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch {}
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) track("pitch_uniteconomics_view");
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    }
  }, [params, unlocked]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1128", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#d4af37", letterSpacing: 1.4, marginBottom: 12 }}>▸ CONFIDENTIAL · UNIT ECONOMICS</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Access via /pitch first.</div>
          <button onClick={() => navigate("/pitch")} style={{ padding: "10px 20px", borderRadius: 6, background: "#d4af37", color: "#0a1128", border: "1px solid #d4af37", fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", cursor: "pointer" }}>Go to /pitch →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ue-wrap">
      <style>{CSS}</style>

      <div className="ue-topbar">
        <a href="/pitch" className="ue-logo">Real <span>Deal</span></a>
        <span className="ue-tag">▸ UNIT ECONOMICS · CONFIDENTIAL</span>
        <button className="ue-topbar-btn" onClick={() => navigate("/pitch")}>← /pitch</button>
      </div>

      <div className="ue-body">
        {/* HEADER */}
        <div className="ue-header">
          <div className="ue-eyebrow">
            <span className="ue-eyebrow-dot" />
            THE NUMBERS · SHOW-YOUR-WORK EDITION
          </div>
          <h1 className="ue-h1">Unit economics. <span>Line by line.</span></h1>
          <p className="ue-sub">
            Every number here is a working assumption for the raise model. If a figure changes after the first check discussion, this page updates in-place — no stale slides.
          </p>
        </div>

        {/* HEADLINE METRICS */}
        <div className="ue-headline">
          <div className="ue-headline-cell">
            <div className="ue-headline-lbl">CAC</div>
            <div className="ue-headline-val">$180</div>
            <div className="ue-headline-note">Cost per paying customer (Pro tier)</div>
          </div>
          <div className="ue-headline-cell brass">
            <div className="ue-headline-lbl">LTV</div>
            <div className="ue-headline-val">$3,200</div>
            <div className="ue-headline-note">30-mo avg tenure · Pro tier · 3% mo churn</div>
          </div>
          <div className="ue-headline-cell">
            <div className="ue-headline-lbl">LTV : CAC</div>
            <div className="ue-headline-val">18 : 1</div>
            <div className="ue-headline-note">SaaS benchmark: 3:1 healthy · 5:1 great</div>
          </div>
          <div className="ue-headline-cell">
            <div className="ue-headline-lbl">Payback</div>
            <div className="ue-headline-val">1.8 mo</div>
            <div className="ue-headline-note">First-payment recovers CAC in less than 60 days</div>
          </div>
          <div className="ue-headline-cell">
            <div className="ue-headline-lbl">Gross margin</div>
            <div className="ue-headline-val">~99.8%</div>
            <div className="ue-headline-note">Marginal cost per lookup: $0.001 (Anthropic + Vercel)</div>
          </div>
          <div className="ue-headline-cell">
            <div className="ue-headline-lbl">Rule of 40</div>
            <div className="ue-headline-val">+180</div>
            <div className="ue-headline-note">Growth% + margin% — targeted post-round</div>
          </div>
        </div>

        {/* CAC BREAKDOWN */}
        <section className="ue-section">
          <div className="ue-section-tag">▸ 01 · CAC BUILDUP</div>
          <h2 className="ue-h2">How the $180 blended CAC breaks down.</h2>
          <div className="ue-table-wrap">
            <table className="ue-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>% of paid signups</th>
                  <th>Cost per signup</th>
                  <th>Weighted CAC</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Founder LinkedIn outreach (20 DMs/day)</td>
                  <td>40%</td>
                  <td>$0 direct · $85 founder time cost</td>
                  <td>$34</td>
                </tr>
                <tr>
                  <td>Referral program (30% rev share)</td>
                  <td>20%</td>
                  <td>~$118 (yr-1 rev share) + $0 direct</td>
                  <td>$24</td>
                </tr>
                <tr>
                  <td>SEO + content (organic Google)</td>
                  <td>20%</td>
                  <td>$45 amortized content cost</td>
                  <td>$9</td>
                </tr>
                <tr>
                  <td>Chrome Web Store (extension discovery)</td>
                  <td>10%</td>
                  <td>$0 · asset already in-market</td>
                  <td>$0</td>
                </tr>
                <tr>
                  <td>Paid LinkedIn / Google Ads (experimental)</td>
                  <td>10%</td>
                  <td>~$1,130 CPA</td>
                  <td>$113</td>
                </tr>
                <tr className="ue-total">
                  <td colSpan="3"><b>Blended CAC (weighted)</b></td>
                  <td><b>$180</b></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="ue-note">
            <b>Reality check:</b> the 40% weight to founder outreach is defensible for 0→$50K MRR but not for $100K+ MRR — that's why a GTM Lead is the first hire post-raise. Expected blended CAC at $100K MRR: <b>$210-240</b> as paid becomes a larger share.
          </div>
        </section>

        {/* LTV BREAKDOWN */}
        <section className="ue-section">
          <div className="ue-section-tag">▸ 02 · LTV BUILDUP</div>
          <h2 className="ue-h2">How the $3,200 LTV computes.</h2>
          <div className="ue-formula">
            LTV = ARPU × Gross Margin / Churn = <b>$107 × 99.8% / 3.3%</b> ≈ <b>$3,232</b>
          </div>
          <div className="ue-table-wrap">
            <table className="ue-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Value</th>
                  <th>Basis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>ARPU (blended)</td>
                  <td>$107/mo</td>
                  <td>85% Pro ($99) + 12% Scale ($299) + 3% Free upsells → weighted avg</td>
                </tr>
                <tr>
                  <td>Gross margin</td>
                  <td>99.8%</td>
                  <td>See section 03 below — Anthropic API is the entire COGS</td>
                </tr>
                <tr>
                  <td>Monthly churn (working assumption)</td>
                  <td>3.3%</td>
                  <td>Vertical SaaS benchmark: 3-5% mo · we plan for the pessimistic end</td>
                </tr>
                <tr>
                  <td>Avg tenure</td>
                  <td>30 months</td>
                  <td>1 / 3.3% churn</td>
                </tr>
                <tr>
                  <td>Expansion revenue (upgrades to Scale)</td>
                  <td>+8%/yr</td>
                  <td>Modeled as flat 8% net revenue retention above baseline · conservative</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="ue-note">
            <b>The 3.3% churn number is where a VC will push.</b> We don't have 12 months of cohort data yet — this is the raise-model working assumption. Below 2%/mo churn (which is what enterprise API customers should trend toward), LTV jumps to ~$5,300. Above 5%/mo, it drops to ~$2,100.
          </div>
        </section>

        {/* MARGIN */}
        <section className="ue-section">
          <div className="ue-section-tag">▸ 03 · GROSS MARGIN</div>
          <h2 className="ue-h2">Why 99.8% is a real number, not a rounding trick.</h2>
          <div className="ue-margin-grid">
            <div className="ue-margin-cell">
              <div className="ue-margin-lbl">Per lookup — Anthropic API</div>
              <div className="ue-margin-val">$0.0009</div>
              <div className="ue-margin-note">our AI routing on 78% of calls · our AI on 22% · avg $0.0009/verdict</div>
            </div>
            <div className="ue-margin-cell">
              <div className="ue-margin-lbl">Per lookup — Vercel compute</div>
              <div className="ue-margin-val">$0.00012</div>
              <div className="ue-margin-note">Serverless function execution — ~120ms per verdict at $0.20/million-GB-s</div>
            </div>
            <div className="ue-margin-cell">
              <div className="ue-margin-lbl">Per lookup — Supabase</div>
              <div className="ue-margin-val">$0.00003</div>
              <div className="ue-margin-note">Postgres read + write — Pro tier flat fee amortized over volume</div>
            </div>
            <div className="ue-margin-cell brass">
              <div className="ue-margin-lbl">TOTAL marginal cost</div>
              <div className="ue-margin-val">~$0.001</div>
              <div className="ue-margin-note">Per verdict served</div>
            </div>
          </div>
          <div className="ue-formula" style={{marginTop: 20}}>
            Pro tier: <b>$99/mo</b> ÷ 50 avg lookups/mo = <b>$1.98/lookup revenue</b> · minus $0.001 marginal = <b>$1.979 gross profit</b> per lookup = <b>99.95% margin per unit</b>
          </div>
          <div className="ue-note">
            <b>Even in the pessimistic scenario</b> (Pro user runs 500 lookups/mo = 10× the average), margin is still 99.5%. The Anthropic cost curve does not become a real threat until we're serving 100M+ verdicts/yr — a great problem to have.
          </div>
        </section>

        {/* BURN + RUNWAY */}
        <section className="ue-section">
          <div className="ue-section-tag">▸ 04 · BURN + RUNWAY</div>
          <h2 className="ue-h2">Where the raise dollars go.</h2>
          <div className="ue-table-wrap">
            <table className="ue-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Monthly burn (post-raise)</th>
                  <th>% of round</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Engineering hires (2 by mo 6)</td>
                  <td>$27,500</td>
                  <td>39%</td>
                  <td>Sr Full-Stack @ $155K + Second Eng @ $130K by mo 6</td>
                </tr>
                <tr>
                  <td>GTM Lead + CS Lead</td>
                  <td>$18,500</td>
                  <td>26%</td>
                  <td>GTM at mo 1 · CS Lead at mo 6</td>
                </tr>
                <tr>
                  <td>Founder salary</td>
                  <td>$8,000</td>
                  <td>11%</td>
                  <td>$96K/yr · deliberately below hires · confidence signal to Board</td>
                </tr>
                <tr>
                  <td>Infrastructure (Anthropic, Vercel, Supabase, Resend)</td>
                  <td>$2,800</td>
                  <td>4%</td>
                  <td>Scales with usage · 99.8% margin means minor % of round</td>
                </tr>
                <tr>
                  <td>Paid acquisition experiments</td>
                  <td>$6,500</td>
                  <td>9%</td>
                  <td>Testing LinkedIn + Google · will scale channels that hit CAC target</td>
                </tr>
                <tr>
                  <td>Legal + accounting + insurance</td>
                  <td>$3,500</td>
                  <td>5%</td>
                  <td>Corporate maintenance + trademark + IC counsel retainer</td>
                </tr>
                <tr>
                  <td>Tools + data licenses (MLS, CMHC premium)</td>
                  <td>$3,200</td>
                  <td>5%</td>
                  <td>MLS partnership fees + premium CMHC data feed</td>
                </tr>
                <tr>
                  <td>Buffer / discretionary</td>
                  <td>$1,000</td>
                  <td>1%</td>
                  <td>Travel to broker conferences + IC pitch trips</td>
                </tr>
                <tr className="ue-total">
                  <td colSpan="1"><b>TOTAL monthly burn</b></td>
                  <td><b>$71,000</b></td>
                  <td><b>100%</b></td>
                  <td>21 months of runway on $1.5M raise</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="ue-note">
            <b>Revenue offset:</b> the burn number above is <em>gross</em>. Net burn drops each month as MRR grows. At $30K MRR (targeted mo 9), net burn falls to ~$41K/mo — <b>extending real runway to 28 months</b>.
          </div>
        </section>

        {/* CTA */}
        <div className="ue-cta-block">
          <div className="ue-cta-h">Want to stress-test these numbers?</div>
          <div className="ue-cta-p">The full 3-year model (Google Sheets) is available on 1:1 request. Every cell is source-linked to the assumption behind it.</div>
          <div className="ue-cta-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="ue-cta">{BOOKING_LABEL}</a>
            <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20-%20Financial%20Model%20Request" className="ue-cta ghost">Email the model request</a>
            <button className="ue-cta ghost" onClick={() => navigate("/pitch/data-room")}>Data room</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .ue-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .ue-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 14px; padding: 14px 24px; background: rgba(10,17,40,0.96); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); }
  .ue-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .ue-logo span { color: var(--brass); }
  .ue-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .ue-topbar-btn { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }

  .ue-body { max-width: 1020px; margin: 0 auto; padding: 44px 24px 80px; }

  .ue-header { text-align: center; margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px solid var(--borderf); }
  .ue-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .ue-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .ue-h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: var(--text); letter-spacing: -1.4px; line-height: 1.1; margin: 0 0 12px; }
  .ue-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .ue-sub { font-size: 15px; color: var(--sub); line-height: 1.65; max-width: 680px; margin: 0 auto; }

  .ue-headline { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 40px; }
  @media(max-width:720px){ .ue-headline { grid-template-columns: repeat(2, 1fr); } }
  @media(max-width:480px){ .ue-headline { grid-template-columns: 1fr; } }
  .ue-headline-cell { padding: 18px 20px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; }
  .ue-headline-cell.brass { border-left: 4px solid var(--brass); background: linear-gradient(90deg, rgba(212,175,55,0.05), transparent); }
  .ue-headline-lbl { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.2px; color: var(--sub); text-transform: uppercase; margin-bottom: 4px; }
  .ue-headline-val { font-family: 'Geist Mono', monospace; font-size: 28px; font-weight: 800; color: var(--text); letter-spacing: -1px; line-height: 1; margin-bottom: 4px; }
  .ue-headline-cell.brass .ue-headline-val { color: var(--brass); }
  .ue-headline-note { font-size: 11px; color: var(--sub); line-height: 1.4; }

  .ue-section { margin-bottom: 36px; padding-bottom: 32px; border-bottom: 1px solid var(--borderf); }
  .ue-section:last-of-type { border-bottom: none; }
  .ue-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 6px; text-transform: uppercase; }
  .ue-h2 { font-size: clamp(20px, 2.8vw, 26px); font-weight: 800; color: var(--text); letter-spacing: -0.6px; line-height: 1.25; margin: 0 0 18px; }

  .ue-table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid var(--borderf); }
  .ue-table { width: 100%; border-collapse: collapse; font-family: 'Geist', sans-serif; min-width: 620px; }
  .ue-table th, .ue-table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--borderf); font-size: 13px; color: var(--text); }
  .ue-table th { background: var(--card2); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1px; color: var(--sub); text-transform: uppercase; }
  .ue-table tr:last-child td { border-bottom: none; }
  .ue-table tr.ue-total td { background: rgba(212,175,55,0.06); font-family: 'Geist Mono', monospace; font-weight: 800; color: var(--brass-2); }
  .ue-table td:not(:first-child) { font-family: 'Geist Mono', monospace; font-size: 12.5px; }

  .ue-formula { padding: 14px 18px; background: rgba(33,85,205,0.05); border-left: 3px solid var(--royal); border-radius: 4px; font-family: 'Geist Mono', monospace; font-size: 14px; color: var(--text); line-height: 1.6; margin-bottom: 16px; }
  .ue-formula b { color: var(--royal); font-weight: 800; }

  .ue-note { padding: 12px 16px; background: rgba(212,175,55,0.05); border-left: 3px solid var(--brass); border-radius: 4px; font-size: 13px; color: var(--sub); line-height: 1.6; margin-top: 12px; }
  .ue-note b { color: var(--text); font-weight: 800; }

  .ue-margin-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media(max-width:720px){ .ue-margin-grid { grid-template-columns: repeat(2, 1fr); } }
  .ue-margin-cell { padding: 14px 16px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  .ue-margin-cell.brass { border-left: 3px solid var(--brass); }
  .ue-margin-lbl { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 0.9px; color: var(--sub); text-transform: uppercase; margin-bottom: 6px; }
  .ue-margin-val { font-family: 'Geist Mono', monospace; font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 6px; }
  .ue-margin-cell.brass .ue-margin-val { color: var(--brass); }
  .ue-margin-note { font-size: 11px; color: var(--sub); line-height: 1.45; }

  .ue-cta-block { padding: 30px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; margin-top: 32px; }
  .ue-cta-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .ue-cta-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 20px; max-width: 500px; margin-left: auto; margin-right: auto; }
  .ue-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .ue-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .ue-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .ue-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
