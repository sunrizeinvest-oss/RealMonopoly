import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import { bookingHref, BOOKING_LABEL } from "./lib/booking";

/**
 * PitchVision — /pitch/vision the 10-year manifesto.
 *
 * Complements the other narrative surfaces:
 *   /story        — how we got here (past)
 *   /pitch/why-now— the 24-month macro window (present)
 *   /roadmap      — next 90 days + 12 months (near-term)
 *   /pitch/vision — 10-year North Star (long-term)
 *
 * VCs at seed evaluating "does this get to $1B" need this arc. Without it,
 * the story tops out at "nice Canadian tool" instead of "default underwriter
 * for Canadian residential, then CRE, then US, then global."
 */
const PITCH_CODE = "rzai-insider-2026";

export default function PitchVision() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);

  useDocMeta({
    title: "RizeAI · Vision (Confidential)",
    description: "The 10-year vision for RizeAI — from Canadian residential underwriter to the default institutional layer for global real estate deal analysis.",
  });

  useEffect(() => {
    const p = params.get("p") || "";
    let stored = "";
    try { stored = sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch {}
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) track("pitch_vision_view");
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    }
  }, [params, unlocked]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1128", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#d4af37", letterSpacing: 1.4, marginBottom: 12 }}>▸ CONFIDENTIAL · VISION</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Access via /pitch first.</div>
          <button onClick={() => navigate("/pitch")} style={{ padding: "10px 20px", borderRadius: 6, background: "#d4af37", color: "#0a1128", border: "1px solid #d4af37", fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", cursor: "pointer" }}>Go to /pitch →</button>
        </div>
      </div>
    );
  }

  const HORIZONS = [
    {
      years: "YEAR 1-2",
      band: "PRE-SEED → SEED",
      revBand: "$0 → $3M ARR",
      h: "Own Canadian residential.",
      arc: "Every Canadian broker underwrites through RizeAI before picking up the phone. 7 cities in production today → 15 cities by end of Year 2 (add Winnipeg, Halifax, Victoria, Kelowna, Quebec metros). 37 zoning codes → 100+. Firm-tier subscriptions (Scale) become the growth engine.",
      metrics: [
        { k: "Cities", v: "7 → 15" },
        { k: "Zoning codes", v: "37 → 100+" },
        { k: "Paying customers", v: "0 → 1,000" },
        { k: "ARR", v: "$0 → $3M" },
        { k: "Team", v: "1 → 5" },
      ],
    },
    {
      years: "YEAR 3-4",
      band: "SERIES A → B",
      revBand: "$3M → $20M ARR",
      h: "Expand to the US pro market.",
      arc: "The Canadian residential product is the moat. US expansion begins with the 20 cities that mirror the Canadian bylaw structure — Seattle, Portland, Denver, Austin, Nashville. Same 4-strategy engine, same speed, same margin. First MLS partnerships execute. Firm-tier accounts become the majority of revenue.",
      metrics: [
        { k: "Cities", v: "15 → 40 (CA + US)" },
        { k: "Firm-tier accounts", v: "50+ multi-agent" },
        { k: "Public API customers", v: "20 institutional" },
        { k: "ARR", v: "$3M → $20M" },
        { k: "Team", v: "5 → 25" },
      ],
    },
    {
      years: "YEAR 5-6",
      band: "SERIES B → C",
      revBand: "$20M → $60M ARR",
      h: "Commercial real estate.",
      arc: "Residential deal-underwriting is table stakes; we're the workflow layer. Commercial follows — small commercial (2-50 units) is the underserved gap CoStar refuses to touch profitably. Same math engine, extended for commercial-specific cap-rate + tenant-mix logic. This is where RizeAI becomes a Bloomberg-scale product.",
      metrics: [
        { k: "Verticals", v: "Residential + Small CRE" },
        { k: "Cities", v: "50+ (CA + US)" },
        { k: "Enterprise accounts", v: "500+ firms" },
        { k: "ARR", v: "$20M → $60M" },
        { k: "Team", v: "25 → 80" },
      ],
    },
    {
      years: "YEAR 7-10",
      band: "IPO WINDOW",
      revBand: "$60M → $200M+ ARR",
      h: "The default global underwriter.",
      arc: "By Year 10, RizeAI ships to every English-speaking real estate market — UK, Australia, New Zealand, Ireland. The 4-strategy engine remains the same; only the zoning-adapter layer changes per jurisdiction. Institutional deployments dominate revenue (firm + API + white-label). IPO becomes viable at $150M+ ARR / 25%+ growth.",
      metrics: [
        { k: "Markets", v: "CA + US + UK + AU + NZ + IE" },
        { k: "Institutional accounts", v: "2,500+ firms" },
        { k: "White-label deployments", v: "100+ brokerages" },
        { k: "ARR", v: "$60M → $200M+" },
        { k: "Team", v: "80 → 250" },
      ],
    },
  ];

  return (
    <div className="vs-wrap">
      <style>{CSS}</style>

      <div className="vs-topbar">
        <a href="/pitch" className="vs-logo">Real <span>Deal</span></a>
        <span className="vs-tag">▸ VISION · CONFIDENTIAL</span>
        <button className="vs-topbar-btn" onClick={() => navigate("/pitch")}>← /pitch</button>
      </div>

      <div className="vs-body">
        {/* HEADER */}
        <div className="vs-header">
          <div className="vs-eyebrow">
            <span className="vs-eyebrow-dot" />
            THE 10-YEAR ARC
          </div>
          <h1 className="vs-h1">
            From Canadian underwriter <span>to global default.</span>
          </h1>
          <p className="vs-sub">
            <em>/story</em> covered how we got here. <em>/pitch/why-now</em> covered the 24-month window. <em>/roadmap</em> covers the next 12 months. This page covers where it ends up.
          </p>
        </div>

        {/* NORTH STAR */}
        <div className="vs-northstar">
          <div className="vs-northstar-tag">▸ THE NORTH STAR</div>
          <h2 className="vs-northstar-h">Every real estate professional in the English-speaking world underwrites through RizeAI before they act.</h2>
          <p className="vs-northstar-p">
            When a broker in Calgary types an address, they get the verdict in 3 seconds. When an investor in Sydney does the same, they get it in the same 3 seconds. When a fund analyst in London runs a portfolio scan, they get it via API. The workflow is universal. The math is institutional. The delivery is instant.
          </p>
          <p className="vs-northstar-p">
            <b>Bloomberg terminals for real estate.</b> That's the endpoint. We don't get there by chasing consumers or ad revenue — we get there by owning the professional workflow, one vertical + geography at a time.
          </p>
        </div>

        {/* HORIZONS */}
        <section className="vs-section">
          <div className="vs-section-tag">▸ THE FOUR HORIZONS</div>
          <h2 className="vs-h2">How we get from $0 to Bloomberg-scale.</h2>
          <div className="vs-horizons">
            {HORIZONS.map((h, i) => (
              <div key={i} className={`vs-horizon ${i === 0 ? "current" : ""}`}>
                <div className="vs-horizon-side">
                  <div className="vs-horizon-years">{h.years}</div>
                  <div className="vs-horizon-band">{h.band}</div>
                  <div className="vs-horizon-rev">{h.revBand}</div>
                </div>
                <div className="vs-horizon-body">
                  <h3 className="vs-horizon-h">{h.h}</h3>
                  <p className="vs-horizon-arc">{h.arc}</p>
                  <div className="vs-horizon-metrics">
                    {h.metrics.map((m, j) => (
                      <div key={j} className="vs-metric">
                        <span className="vs-metric-k">{m.k}</span>
                        <span className="vs-metric-v">{m.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* NON-NEGOTIABLES */}
        <section className="vs-section">
          <div className="vs-section-tag">▸ NON-NEGOTIABLES</div>
          <h2 className="vs-h2">What we won't do to get there.</h2>
          <div className="vs-nono-grid">
            <div className="vs-nono">
              <div className="vs-nono-h">✗ Consumer product</div>
              <div className="vs-nono-p">Zillow won consumer. We don't fight that battle. RizeAI is pro-only — brokers, agents, investors, firms.</div>
            </div>
            <div className="vs-nono">
              <div className="vs-nono-h">✗ Ad-supported revenue</div>
              <div className="vs-nono-p">Ad revenue commands 4× multiples. Subscription commands 8-12×. We stay subscription + API.</div>
            </div>
            <div className="vs-nono">
              <div className="vs-nono-h">✗ Discretionary M&amp;A</div>
              <div className="vs-nono-p">We build the workflow; we don't accumulate adjacent tools. Focus is the moat, not surface area.</div>
            </div>
            <div className="vs-nono">
              <div className="vs-nono-h">✗ Chasing valuation vs revenue</div>
              <div className="vs-nono-p">Every round follows real ARR milestones. No pre-revenue narrative rounds. No board-composition dilution beyond reason.</div>
            </div>
          </div>
        </section>

        {/* WHY US */}
        <section className="vs-section">
          <div className="vs-section-tag">▸ WHY WE'RE THE ONES</div>
          <h2 className="vs-h2">Three structural reasons this ends up in our hands.</h2>
          <div className="vs-why-list">
            <div className="vs-why-item">
              <div className="vs-why-num">01</div>
              <div className="vs-why-body">
                <div className="vs-why-h">First-mover on the Canadian bylaw layer.</div>
                <div className="vs-why-p">37 codes hand-verified against city PDFs. Anyone catching up burns 6+ months on data assembly alone. That gap widens as we ship more cities.</div>
              </div>
            </div>
            <div className="vs-why-item">
              <div className="vs-why-num">02</div>
              <div className="vs-why-body">
                <div className="vs-why-h">Cost structure locked in at 99.8% margin.</div>
                <div className="vs-why-p">Every incumbent (CoStar, PropStream, BiggerPockets) was priced pre-AI. We architected around Anthropic our AI's $0.001/verdict cost from day one — structural advantage that compounds as prices drop.</div>
              </div>
            </div>
            <div className="vs-why-item">
              <div className="vs-why-num">03</div>
              <div className="vs-why-body">
                <div className="vs-why-h">Founder + product velocity.</div>
                <div className="vs-why-p">Solo builder shipping 28 raise surfaces in 8 days. The product hits 3-second verdicts today. Whatever we ship next, we ship faster than the competition. Speed is the compounding advantage nobody talks about — until it's too late to catch.</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="vs-cta-block">
          <div className="vs-cta-h">If this arc lands.</div>
          <div className="vs-cta-p">Book the call. We'll walk through the pre-seed math + how you fit into what comes next.</div>
          <div className="vs-cta-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="vs-cta">{BOOKING_LABEL}</a>
            <button className="vs-cta ghost" onClick={() => navigate("/pitch/timeline")}>Timeline</button>
            <button className="vs-cta ghost" onClick={() => navigate("/pitch/comparables")}>Exit comps</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .vs-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .vs-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 14px; padding: 14px 24px; background: rgba(10,17,40,0.96); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); }
  .vs-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .vs-logo span { color: var(--brass); }
  .vs-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .vs-topbar-btn { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }

  .vs-body { max-width: 1000px; margin: 0 auto; padding: 44px 24px 80px; }
  .vs-header { text-align: center; margin-bottom: 30px; padding-bottom: 26px; border-bottom: 1px solid var(--borderf); }
  .vs-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .vs-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .vs-h1 { font-size: clamp(30px, 4.5vw, 46px); font-weight: 800; color: var(--text); letter-spacing: -1.6px; line-height: 1.05; margin: 0 0 14px; }
  .vs-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .vs-sub { font-size: 15px; color: var(--sub); line-height: 1.65; max-width: 640px; margin: 0 auto; font-family: 'Geist Mono', monospace; letter-spacing: 0.2px; }
  .vs-sub em { color: var(--brass-2); font-style: normal; }

  .vs-northstar { padding: 32px 34px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-left: 4px solid var(--brass); border-radius: 12px; margin-bottom: 44px; }
  .vs-northstar-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 14px; }
  .vs-northstar-h { font-size: clamp(20px, 2.8vw, 26px); font-weight: 800; color: var(--text); letter-spacing: -0.6px; line-height: 1.3; margin: 0 0 16px; }
  .vs-northstar-p { font-size: 14.5px; color: var(--text); line-height: 1.75; margin: 0 0 12px; }
  .vs-northstar-p:last-child { margin-bottom: 0; }
  .vs-northstar-p b { color: var(--brass); font-weight: 800; }

  .vs-section { margin-bottom: 40px; padding-bottom: 32px; border-bottom: 1px solid var(--borderf); }
  .vs-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 10px; text-transform: uppercase; }
  .vs-h2 { font-size: clamp(22px, 3vw, 28px); font-weight: 800; color: var(--text); letter-spacing: -0.6px; line-height: 1.2; margin: 0 0 22px; }

  .vs-horizons { display: flex; flex-direction: column; gap: 12px; }
  .vs-horizon { display: grid; grid-template-columns: 200px 1fr; gap: 20px; padding: 22px 24px; background: var(--card); border: 1px solid var(--borderf); border-radius: 12px; }
  .vs-horizon.current { border-left: 4px solid var(--brass); background: linear-gradient(90deg, rgba(212,175,55,0.04), var(--card)); }
  @media(max-width:720px){ .vs-horizon { grid-template-columns: 1fr; gap: 12px; } }
  .vs-horizon-years { font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 1.2px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 8px; }
  .vs-horizon-band { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--sub); letter-spacing: 0.6px; margin-bottom: 8px; }
  .vs-horizon-rev { font-family: 'Geist Mono', monospace; font-size: 14px; font-weight: 800; color: var(--brass); letter-spacing: -0.3px; }
  .vs-horizon-h { font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; line-height: 1.3; margin: 0 0 10px; }
  .vs-horizon-arc { font-size: 13.5px; color: var(--sub); line-height: 1.7; margin: 0 0 14px; }
  .vs-horizon-metrics { display: flex; flex-wrap: wrap; gap: 6px; }
  .vs-metric { display: inline-flex; gap: 6px; padding: 5px 10px; background: rgba(15,23,42,0.04); border: 1px solid var(--borderf); border-radius: 4px; font-family: 'Geist Mono', monospace; font-size: 11px; }
  .vs-metric-k { color: var(--sub); font-weight: 700; letter-spacing: 0.2px; }
  .vs-metric-v { color: var(--text); font-weight: 800; letter-spacing: -0.2px; }

  .vs-nono-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  @media(max-width:640px){ .vs-nono-grid { grid-template-columns: 1fr; } }
  .vs-nono { padding: 18px 20px; background: rgba(220,38,38,0.04); border: 1px solid rgba(220,38,38,0.18); border-left: 3px solid #dc2626; border-radius: 8px; }
  .vs-nono-h { font-size: 15px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 6px; }
  .vs-nono-p { font-size: 13px; color: var(--sub); line-height: 1.6; }

  .vs-why-list { display: flex; flex-direction: column; gap: 12px; }
  .vs-why-item { display: grid; grid-template-columns: 60px 1fr; gap: 14px; padding: 18px 20px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--royal); border-radius: 8px; }
  .vs-why-num { font-family: 'Geist Mono', monospace; font-size: 26px; font-weight: 800; color: var(--royal); letter-spacing: -1px; line-height: 1; }
  .vs-why-h { font-size: 15.5px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 6px; }
  .vs-why-p { font-size: 13px; color: var(--sub); line-height: 1.65; }

  .vs-cta-block { padding: 30px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.08), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.35); border-radius: 12px; text-align: center; margin-top: 32px; }
  .vs-cta-h { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .vs-cta-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 20px; max-width: 480px; margin-left: auto; margin-right: auto; }
  .vs-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .vs-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .vs-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .vs-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
