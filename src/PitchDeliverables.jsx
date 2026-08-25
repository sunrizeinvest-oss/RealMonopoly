import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import { bookingHref, BOOKING_LABEL } from "./lib/booking";

/**
 * PitchDeliverables — /pitch/deliverables Series-A readiness milestone map.
 *
 * Different from /pitch/timeline (raise cadence) and /pitch/vision (10yr):
 * this is "what the seed money produces so the Series A raise is teed up
 * automatically." VCs at seed evaluate whether the seed will produce a
 * raise-ready company for the next round.
 */
const PITCH_CODE = "rzai-insider-2026";

const DELIVERABLES = [
  {
    quarter: "Q4 2026",
    month: "Month 1-3",
    tag: "OPERATIONAL",
    h: "Team foundation + first US city.",
    items: [
      "Senior engineer + GTM Lead onboarded (both by end of Month 2)",
      "First US city adapter live (Seattle) — proves US expansion adapter model",
      "First 3 firm-tier (Scale) accounts closed — proves firm-level demand",
      "Real customer case study replaces one composite — /case-studies has 1 real name",
    ],
    proofPoint: "Team + first firm-tier revenue + real customer name = 'this founder ships what they promised.'",
  },
  {
    quarter: "Q1 2027",
    month: "Month 4-6",
    tag: "SCALE",
    h: "First cohort validation.",
    items: [
      "10 firm-tier accounts · $10K firm-tier MRR alone (before Pro tier)",
      "3 US cities live (Seattle + Portland + Denver)",
      "1,000+ paying broker users (Pro tier)",
      "$30K total MRR — the fundraising trigger for CS Lead + Second Engineer hires",
    ],
    proofPoint: "Cohort proves the model. Pro-tier retention data + firm-tier expansion pattern = Series-A metrics baseline.",
  },
  {
    quarter: "Q2 2027",
    month: "Month 7-9",
    tag: "MOMENTUM",
    h: "Product-market fit visible in the metrics.",
    items: [
      "5 US cities live + 3 new CA cities (Winnipeg, Halifax, Victoria)",
      "$50K MRR · 2,500 paying users · 25 firm accounts",
      "Chrome extension 25K+ WAU (weekly active users)",
      "First press mention in TechCrunch or Betakit",
      "First public API paying customer (>$1K/mo)",
    ],
    proofPoint: "Multi-modal traction: paying users, firm accounts, extension usage, API revenue, press proof. Series-A pitches don't need to explain 'is this real.'",
  },
  {
    quarter: "Q3 2027",
    month: "Month 10-12",
    tag: "SERIES-A READY",
    h: "$100K MRR + the Series-A raise materials ready.",
    items: [
      "$100K MRR · $1.2M ARR · 3-month retention data on 6-mo cohort",
      "15+ total cities (CA + US)",
      "Series-A materials updated (deck refresh, financial model, real customer references)",
      "6+ real customer references (replacing all composites)",
      "First Series-A intro conversations open with existing angel network",
    ],
    proofPoint: "The Series-A raise is a *conversation refresh*, not a new pitch. Every seed backer becomes an active supporter.",
  },
];

export default function PitchDeliverables() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);

  useDocMeta({
    title: "RizeAI · Series-A Deliverables (Confidential)",
    description: "What the pre-seed $1.5M produces — the 12-month milestone map that teams up the Series-A raise.",
  });

  useEffect(() => {
    const p = params.get("p") || "";
    let stored = "";
    try { stored = sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch {}
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) track("pitch_deliverables_view");
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    }
  }, [params, unlocked]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1128", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#d4af37", letterSpacing: 1.4, marginBottom: 12 }}>▸ CONFIDENTIAL · DELIVERABLES</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Access via /pitch first.</div>
          <button onClick={() => navigate("/pitch")} style={{ padding: "10px 20px", borderRadius: 6, background: "#d4af37", color: "#0a1128", border: "1px solid #d4af37", fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", cursor: "pointer" }}>Go to /pitch →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dl-wrap">
      <style>{CSS}</style>

      <div className="dl-topbar">
        <a href="/pitch" className="dl-logo">Real <span>Deal</span></a>
        <span className="dl-tag">▸ DELIVERABLES · CONFIDENTIAL</span>
        <button className="dl-topbar-btn" onClick={() => navigate("/pitch")}>← /pitch</button>
      </div>

      <div className="dl-body">
        {/* HEADER */}
        <div className="dl-header">
          <div className="dl-eyebrow">
            <span className="dl-eyebrow-dot" />
            THE SEED → SERIES A BRIDGE
          </div>
          <h1 className="dl-h1">
            What your $1.5M produces. <span>By quarter.</span>
          </h1>
          <p className="dl-sub">
            Every seed backer's real question isn't "does this ship?" — it's "does this ship a raise-ready Series A?" This page maps the pre-seed money to specific quarterly deliverables that make the Series A automatic.
          </p>
        </div>

        {/* THE ARGUMENT */}
        <div className="dl-argument">
          <div className="dl-argument-tag">▸ THE ARGUMENT IN ONE LINE</div>
          <p className="dl-argument-p">
            <b>Every quarter produces one artifact that de-risks the Series A raise.</b> By Month 12 there's nothing new to pitch — just <em>more</em> of what already worked. That's how compounding companies raise A rounds.
          </p>
        </div>

        {/* DELIVERABLES */}
        <section className="dl-section">
          {DELIVERABLES.map((d, i) => (
            <div key={i} className={`dl-quarter ${i === DELIVERABLES.length - 1 ? "final" : ""}`}>
              <div className="dl-quarter-side">
                <div className="dl-quarter-q">{d.quarter}</div>
                <div className="dl-quarter-month">{d.month}</div>
                <div className="dl-quarter-tag">{d.tag}</div>
              </div>
              <div className="dl-quarter-body">
                <h3 className="dl-quarter-h">{d.h}</h3>
                <ul className="dl-quarter-items">
                  {d.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
                <div className="dl-quarter-proof">
                  <div className="dl-quarter-proof-tag">▸ WHY THIS TEES UP SERIES A</div>
                  <div className="dl-quarter-proof-body">{d.proofPoint}</div>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* SERIES A MATH */}
        <section className="dl-math">
          <div className="dl-math-tag">▸ THE SERIES A ARITHMETIC</div>
          <h2 className="dl-math-h">What that produces on the raise.</h2>
          <div className="dl-math-grid">
            <div className="dl-math-cell">
              <div className="dl-math-lbl">ARR at Series A</div>
              <div className="dl-math-val">$1.2M+</div>
              <div className="dl-math-note">$100K MRR × 12 · Q3 2027 baseline</div>
            </div>
            <div className="dl-math-cell">
              <div className="dl-math-lbl">Series A multiple</div>
              <div className="dl-math-val">15–25×</div>
              <div className="dl-math-note">Vertical SaaS · A-round premium</div>
            </div>
            <div className="dl-math-cell brass">
              <div className="dl-math-lbl">Implied Series A valuation</div>
              <div className="dl-math-val">$18–30M</div>
              <div className="dl-math-note">Pre-money · plausible range</div>
            </div>
            <div className="dl-math-cell">
              <div className="dl-math-lbl">Pre-seed → A step-up</div>
              <div className="dl-math-val">3–6×</div>
              <div className="dl-math-note">$1.5M at $8M post → $18–30M A</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="dl-cta-block">
          <div className="dl-cta-h">The seed check funds this bridge.</div>
          <div className="dl-cta-p">Every quarter above ships regardless of round size — but $1.5M vs $750K compresses the timeline by ~6 months.</div>
          <div className="dl-cta-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="dl-cta">{BOOKING_LABEL}</a>
            <button className="dl-cta ghost" onClick={() => navigate("/pitch/timeline")}>Raise timeline</button>
            <button className="dl-cta ghost" onClick={() => navigate("/pitch/comparables")}>Exit comps</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .dl-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .dl-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 14px; padding: 14px 24px; background: rgba(10,17,40,0.96); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); }
  .dl-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .dl-logo span { color: var(--brass); }
  .dl-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .dl-topbar-btn { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }

  .dl-body { max-width: 1000px; margin: 0 auto; padding: 44px 24px 80px; }
  .dl-header { text-align: center; margin-bottom: 30px; padding-bottom: 28px; border-bottom: 1px solid var(--borderf); }
  .dl-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .dl-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .dl-h1 { font-size: clamp(30px, 4.5vw, 44px); font-weight: 800; color: var(--text); letter-spacing: -1.6px; line-height: 1.1; margin: 0 0 14px; }
  .dl-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .dl-sub { font-size: 15px; color: var(--sub); line-height: 1.65; max-width: 660px; margin: 0 auto; }

  .dl-argument { padding: 22px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-left: 4px solid var(--brass); border-radius: 12px; margin-bottom: 40px; }
  .dl-argument-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 10px; }
  .dl-argument-p { font-size: 15px; color: var(--text); line-height: 1.7; margin: 0; }
  .dl-argument-p b { color: var(--brass); font-weight: 800; }
  .dl-argument-p em { color: var(--brass-2); font-style: italic; font-weight: 700; }

  .dl-section { display: flex; flex-direction: column; gap: 12px; margin-bottom: 40px; }
  .dl-quarter { display: grid; grid-template-columns: 160px 1fr; gap: 22px; padding: 22px 26px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--brass); border-radius: 10px; }
  .dl-quarter.final { border-left-width: 4px; background: linear-gradient(90deg, rgba(212,175,55,0.04), var(--card)); }
  @media(max-width:720px){ .dl-quarter { grid-template-columns: 1fr; gap: 12px; } }
  .dl-quarter-q { font-family: 'Geist Mono', monospace; font-size: 16px; font-weight: 800; color: var(--brass); letter-spacing: -0.4px; margin-bottom: 4px; }
  .dl-quarter-month { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: var(--sub); letter-spacing: 0.3px; margin-bottom: 8px; }
  .dl-quarter-tag { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1px; color: var(--brass-2); text-transform: uppercase; padding: 3px 8px; background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); border-radius: 3px; display: inline-block; }
  .dl-quarter-h { font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; line-height: 1.3; margin: 0 0 12px; }
  .dl-quarter-items { list-style: none; padding: 0; margin: 0 0 14px; display: flex; flex-direction: column; gap: 5px; }
  .dl-quarter-items li { position: relative; padding-left: 16px; font-size: 13.5px; color: var(--text); line-height: 1.6; }
  .dl-quarter-items li::before { content: "▸"; position: absolute; left: 0; color: var(--brass); font-weight: 800; }
  .dl-quarter-proof { padding: 12px 14px; background: rgba(33,85,205,0.05); border-left: 3px solid var(--royal); border-radius: 4px; }
  .dl-quarter-proof-tag { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.2px; color: var(--royal); text-transform: uppercase; margin-bottom: 4px; }
  .dl-quarter-proof-body { font-size: 12.5px; color: var(--text); line-height: 1.65; }

  .dl-math { padding: 26px 28px; background: var(--card); border: 1px solid var(--borderf); border-radius: 12px; margin-bottom: 32px; }
  .dl-math-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 10px; }
  .dl-math-h { font-size: clamp(20px, 2.8vw, 26px); font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin: 0 0 18px; }
  .dl-math-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media(max-width:720px){ .dl-math-grid { grid-template-columns: repeat(2, 1fr); } }
  @media(max-width:480px){ .dl-math-grid { grid-template-columns: 1fr; } }
  .dl-math-cell { padding: 14px 16px; background: rgba(15,23,42,0.03); border: 1px solid var(--borderf); border-radius: 8px; }
  .dl-math-cell.brass { border-left: 3px solid var(--brass); background: linear-gradient(90deg, rgba(212,175,55,0.06), rgba(15,23,42,0.03)); }
  .dl-math-lbl { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; color: var(--sub); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
  .dl-math-val { font-family: 'Geist Mono', monospace; font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.6px; margin-bottom: 5px; }
  .dl-math-cell.brass .dl-math-val { color: var(--brass); }
  .dl-math-note { font-size: 11.5px; color: var(--sub); line-height: 1.5; }

  .dl-cta-block { padding: 30px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.08), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.35); border-radius: 12px; text-align: center; }
  .dl-cta-h { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .dl-cta-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 20px; max-width: 520px; margin-left: auto; margin-right: auto; }
  .dl-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .dl-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .dl-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .dl-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
