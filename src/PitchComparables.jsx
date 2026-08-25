import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import { bookingHref, BOOKING_LABEL } from "./lib/booking";

/**
 * PitchComparables — /pitch/comparables exit comps for VC return math.
 *
 * VCs pattern-match every check against 3-5 comps. If you don't hand them
 * the comps, they use whatever's top-of-mind — which usually understates
 * your ceiling. This page pre-loads the argument.
 */
const PITCH_CODE = "rzai-insider-2026";

const EXITS = [
  {
    name: "Zillow Group",
    year: "2011 IPO",
    outcome: "IPO",
    valuation: "$540M IPO · peaked $22B",
    revenue: "$30M ARR at IPO",
    multiple: "18× ARR",
    tag: "Public consumer-side RE",
    story: "Consumer real estate. IPO'd on $30M ARR / 18× multiple at $540M. Peak market cap $22B. The benchmark for anyone underwriting real estate consumer/pro tools.",
    relevance: "Bounds the ceiling for RE-data SaaS in North America. RizeAI ships to the pro side (broker/investor), which historically commands higher multiples than consumer.",
  },
  {
    name: "CoStar Group",
    year: "1998 IPO · still trading",
    outcome: "Public · $30B+ cap",
    valuation: "~$30B market cap",
    revenue: "$2.5B ARR (2024)",
    multiple: "12× ARR",
    tag: "Commercial RE data monopoly",
    story: "Commercial real estate data provider. Public, ~$30B cap on $2.5B ARR (12× multiple). Owns the mid-to-institutional commercial data market with $12K/yr subscriptions.",
    relevance: "The CoStar-for-residential positioning is exactly what RizeAI occupies. CoStar refuses to serve <20-unit residential — that's the gap we fill.",
  },
  {
    name: "PropStream",
    year: "2018 acquisition",
    outcome: "Acquired · undisclosed",
    valuation: "~$150M implied",
    revenue: "~$25M ARR estimated",
    multiple: "~6× ARR",
    tag: "US off-market data + underwriting",
    story: "US off-market real estate data platform for investors. Acquired 2018, ~$150M implied. Now core to Stewart Information's data strategy.",
    relevance: "Closest US analog to RizeAI's investor-side positioning. RizeAI does the underwriting layer PropStream never built — verdict math, not just raw data.",
  },
  {
    name: "Reonomy",
    year: "2020 acquisition (Altus)",
    outcome: "Acquired · $200M",
    valuation: "$200M ($30M ARR)",
    revenue: "~$30M ARR",
    multiple: "6.7× ARR",
    tag: "Commercial RE data",
    story: "NYC-based commercial real estate data + analytics. Acquired by Altus Group for $200M on ~$30M ARR (6.7× multiple) in 2020.",
    relevance: "Direct comp for a data + analytics play in real estate. RizeAI's higher gross margin (~99.8% vs Reonomy's ~85%) supports a premium multiple.",
  },
  {
    name: "Realtor.com (Move Inc.)",
    year: "2014 acquisition (News Corp)",
    outcome: "Acquired · $950M",
    valuation: "$950M",
    revenue: "~$180M ARR",
    multiple: "5.3× ARR",
    tag: "Consumer RE listings",
    story: "US residential real estate portal. Acquired by News Corp for $950M in 2014 on $180M ARR (5.3× multiple).",
    relevance: "Lower multiple than pure-SaaS because ad-driven revenue. RizeAI's subscription revenue commands higher multiples than ad-supported comparables.",
  },
  {
    name: "Doma (formerly States Title)",
    year: "2021 SPAC merger",
    outcome: "Public via SPAC · $3B",
    valuation: "$3B at merger",
    revenue: "$500M+ ARR",
    multiple: "~6× ARR at peak",
    tag: "US title insurance PropTech",
    story: "AI-driven title insurance PropTech. Went public via SPAC 2021 at $3B on $500M+ ARR. Trades much lower now, but the raise-stage comp is real.",
    relevance: "Vertical-SaaS PropTech with recurring revenue. RizeAI is earlier stage but the multiple compression at scale is a warning we've priced into the model.",
  },
  {
    name: "Toast (vertical SaaS analog)",
    year: "2021 IPO",
    outcome: "Public · $30B peak",
    valuation: "$30B peak · $17B today",
    revenue: "$4B ARR (2024)",
    multiple: "4× (mature)",
    tag: "Restaurant vertical SaaS",
    story: "Vertical SaaS for restaurants. IPO'd 2021, peaked $30B, still $17B on $4B ARR. Multiple compressed as scale grew.",
    relevance: "Non-RE but the ANALOGY: vertical SaaS that owns a fragmented pro market. The exit path for RizeAI mirrors this shape — command the vertical, IPO at scale.",
  },
  {
    name: "Procore (vertical SaaS analog)",
    year: "2021 IPO",
    outcome: "Public · $9B market cap",
    valuation: "$9B",
    revenue: "$1B ARR",
    multiple: "9× ARR",
    tag: "Construction vertical SaaS",
    story: "Vertical SaaS for construction. IPO'd 2021 at $9B on $1B ARR (9× multiple). Still trades near IPO multiples.",
    relevance: "Adjacent vertical SaaS in the real estate ecosystem. Direct pattern for RizeAI: pick the pro user, own the workflow, defensible at scale.",
  },
];

export default function PitchComparables() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);

  useDocMeta({
    title: "RizeAI · Exit Comparables (Confidential)",
    description: "PropTech and vertical-SaaS exit comparables — revenue multiples, valuations, and return math for RizeAI.",
  });

  useEffect(() => {
    const p = params.get("p") || "";
    let stored = "";
    try { stored = sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch {}
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) track("pitch_comparables_view");
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    }
  }, [params, unlocked]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1128", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#d4af37", letterSpacing: 1.4, marginBottom: 12 }}>▸ CONFIDENTIAL · COMPS</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Access via /pitch first.</div>
          <button onClick={() => navigate("/pitch")} style={{ padding: "10px 20px", borderRadius: 6, background: "#d4af37", color: "#0a1128", border: "1px solid #d4af37", fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", cursor: "pointer" }}>Go to /pitch →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-wrap">
      <style>{CSS}</style>

      <div className="cp-topbar">
        <a href="/pitch" className="cp-logo">Real <span>Deal</span></a>
        <span className="cp-tag">▸ EXIT COMPS · CONFIDENTIAL</span>
        <button className="cp-topbar-btn" onClick={() => navigate("/pitch")}>← /pitch</button>
      </div>

      <div className="cp-body">
        {/* HEADER */}
        <div className="cp-header">
          <div className="cp-eyebrow">
            <span className="cp-eyebrow-dot" />
            EXIT COMPS · THE RETURN MATH
          </div>
          <h1 className="cp-h1">What the exit could look like. <span>Comps + multiples.</span></h1>
          <p className="cp-sub">
            VCs pattern-match every check against 3-5 comps. If you don't hand them the comps, they use whatever's top-of-mind. Here are ours.
          </p>
        </div>

        {/* HEADLINE MATH */}
        <div className="cp-math-block">
          <div className="cp-math-tag">▸ THE RETURN MATH (WORKING HYPOTHESIS)</div>
          <div className="cp-math-grid">
            <div className="cp-math-cell">
              <div className="cp-math-lbl">RizeAI target ARR at Series A</div>
              <div className="cp-math-val">$3M</div>
              <div className="cp-math-note">Month 24 · $250K MRR × 12</div>
            </div>
            <div className="cp-math-cell">
              <div className="cp-math-lbl">Comp multiple range</div>
              <div className="cp-math-val">6–12×</div>
              <div className="cp-math-note">Vertical SaaS + PropTech data</div>
            </div>
            <div className="cp-math-cell brass">
              <div className="cp-math-lbl">Implied Series A valuation</div>
              <div className="cp-math-val">$18–36M</div>
              <div className="cp-math-note">On $3M ARR at Series A stage</div>
            </div>
            <div className="cp-math-cell">
              <div className="cp-math-lbl">Pre-seed → Series A multiple</div>
              <div className="cp-math-val">4–8×</div>
              <div className="cp-math-note">$1.5M pre-seed at ~$8M post → $18–36M Series A</div>
            </div>
          </div>
          <p className="cp-math-caveat">
            <b>Reality check:</b> these are working ranges, not promises. The bottom of the range is fine. The top is the Procore/Toast trajectory that requires the founder + team to execute for 5+ years. RizeAI's structural advantages (99.8% margins, low CAC, 3-second value delivery) support the upper half of the range if execution holds.
          </p>
        </div>

        {/* COMPS */}
        <section className="cp-section">
          <div className="cp-section-tag">▸ THE COMPARABLE SET</div>
          <h2 className="cp-h2">Eight companies. Five direct comps, three vertical-SaaS pattern-matches.</h2>
          <div className="cp-comps">
            {EXITS.map((e, i) => (
              <div key={i} className="cp-comp">
                <div className="cp-comp-head">
                  <div>
                    <div className="cp-comp-name">{e.name}</div>
                    <div className="cp-comp-tag">{e.tag}</div>
                  </div>
                  <div className="cp-comp-outcome">
                    <div className="cp-comp-year">{e.year}</div>
                    <div className="cp-comp-outcome-val">{e.outcome}</div>
                  </div>
                </div>
                <div className="cp-comp-stats">
                  <div className="cp-comp-stat">
                    <div className="cp-comp-stat-lbl">Valuation</div>
                    <div className="cp-comp-stat-val">{e.valuation}</div>
                  </div>
                  <div className="cp-comp-stat">
                    <div className="cp-comp-stat-lbl">Revenue</div>
                    <div className="cp-comp-stat-val">{e.revenue}</div>
                  </div>
                  <div className="cp-comp-stat brass">
                    <div className="cp-comp-stat-lbl">Multiple</div>
                    <div className="cp-comp-stat-val">{e.multiple}</div>
                  </div>
                </div>
                <div className="cp-comp-story">{e.story}</div>
                <div className="cp-comp-relevance">
                  <div className="cp-comp-relevance-tag">▸ RELEVANCE TO RIZEAI</div>
                  <div className="cp-comp-relevance-body">{e.relevance}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SUMMARY */}
        <section className="cp-summary">
          <div className="cp-summary-tag">▸ ANCHORS SUMMARY</div>
          <h2 className="cp-h2">The multiple story in one paragraph.</h2>
          <p className="cp-p">
            <b>Direct PropTech data comps trade at 6–12× ARR at exit</b> — Reonomy (6.7×), PropStream (~6×), CoStar (12× public). <b>Vertical SaaS pattern-matches at 4–9×</b> — Procore (9×), Toast (4× mature). <b>Consumer real estate is capped lower</b> at 4–5× (Realtor.com, Zillow later years) because ad revenue commands lower multiples than subscription.
          </p>
          <p className="cp-p">
            RizeAI sits in the sweet spot: <b>subscription SaaS + PropTech data + vertical pro market</b>. The base-case exit at $30M ARR at 8× = <b>$240M valuation</b>. The upside case at $100M ARR at 10× = <b>$1B valuation</b>. Neither is guaranteed. Both are realistic given the comp set.
          </p>
        </section>

        {/* CTA */}
        <div className="cp-cta-block">
          <div className="cp-cta-h">Want to stress-test the multiples?</div>
          <div className="cp-cta-p">The full comparable analysis with sensitivity tables (revenue multiple × exit-year × growth-rate) is available on 1:1 request.</div>
          <div className="cp-cta-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="cp-cta">{BOOKING_LABEL}</a>
            <button className="cp-cta ghost" onClick={() => navigate("/pitch/unit-economics")}>Unit economics</button>
            <button className="cp-cta ghost" onClick={() => navigate("/pitch/timeline")}>Timeline</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .cp-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .cp-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 14px; padding: 14px 24px; background: rgba(10,17,40,0.96); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); }
  .cp-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .cp-logo span { color: var(--brass); }
  .cp-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .cp-topbar-btn { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }

  .cp-body { max-width: 1000px; margin: 0 auto; padding: 44px 24px 80px; }
  .cp-header { text-align: center; margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px solid var(--borderf); }
  .cp-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .cp-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .cp-h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: var(--text); letter-spacing: -1.4px; line-height: 1.1; margin: 0 0 12px; }
  .cp-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .cp-sub { font-size: 15px; color: var(--sub); line-height: 1.65; max-width: 640px; margin: 0 auto; }

  .cp-math-block { padding: 26px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; margin-bottom: 40px; }
  .cp-math-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 14px; }
  .cp-math-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
  @media(max-width:720px){ .cp-math-grid { grid-template-columns: 1fr 1fr; } }
  @media(max-width:480px){ .cp-math-grid { grid-template-columns: 1fr; } }
  .cp-math-cell { padding: 14px 16px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  .cp-math-cell.brass { border-left: 3px solid var(--brass); background: linear-gradient(90deg, rgba(212,175,55,0.06), var(--card)); }
  .cp-math-lbl { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1px; color: var(--sub); text-transform: uppercase; margin-bottom: 6px; }
  .cp-math-val { font-family: 'Geist Mono', monospace; font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.6px; line-height: 1; margin-bottom: 5px; }
  .cp-math-cell.brass .cp-math-val { color: var(--brass); }
  .cp-math-note { font-size: 11px; color: var(--sub); line-height: 1.4; }
  .cp-math-caveat { font-size: 13px; color: var(--sub); line-height: 1.65; margin: 6px 0 0; padding: 12px 14px; background: rgba(220,38,38,0.04); border-left: 3px solid #dc2626; border-radius: 4px; }
  .cp-math-caveat b { color: #dc2626; font-weight: 800; }

  .cp-section { margin-bottom: 40px; padding-bottom: 32px; border-bottom: 1px solid var(--borderf); }
  .cp-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 8px; text-transform: uppercase; }
  .cp-h2 { font-size: clamp(20px, 2.8vw, 26px); font-weight: 800; color: var(--text); letter-spacing: -0.6px; line-height: 1.25; margin: 0 0 22px; }

  .cp-comps { display: flex; flex-direction: column; gap: 14px; }
  .cp-comp { padding: 22px 24px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; }
  .cp-comp-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; padding-bottom: 12px; border-bottom: 1px dashed var(--borderf); }
  .cp-comp-name { font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; margin-bottom: 3px; }
  .cp-comp-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--brass-2); letter-spacing: 0.4px; text-transform: uppercase; }
  .cp-comp-outcome { text-align: right; }
  .cp-comp-year { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--sub); letter-spacing: 0.4px; margin-bottom: 3px; }
  .cp-comp-outcome-val { font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; }

  .cp-comp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
  @media(max-width:480px){ .cp-comp-stats { grid-template-columns: 1fr; } }
  .cp-comp-stat { padding: 10px 12px; background: rgba(15,23,42,0.03); border: 1px solid var(--borderf); border-radius: 6px; }
  .cp-comp-stat.brass { border-left: 2px solid var(--brass); }
  .cp-comp-stat-lbl { font-family: 'Geist Mono', monospace; font-size: 9.5px; font-weight: 800; letter-spacing: 0.9px; color: var(--sub); text-transform: uppercase; margin-bottom: 3px; }
  .cp-comp-stat-val { font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 800; color: var(--text); letter-spacing: -0.2px; }
  .cp-comp-stat.brass .cp-comp-stat-val { color: var(--brass); }

  .cp-comp-story { font-size: 13.5px; color: var(--text); line-height: 1.65; margin-bottom: 12px; }
  .cp-comp-relevance { padding: 12px 14px; background: rgba(33,85,205,0.05); border-left: 3px solid var(--royal); border-radius: 4px; }
  .cp-comp-relevance-tag { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.2px; color: var(--royal); text-transform: uppercase; margin-bottom: 4px; }
  .cp-comp-relevance-body { font-size: 12.5px; color: var(--text); line-height: 1.6; }

  .cp-summary { padding: 26px 26px; background: var(--card); border: 1px solid var(--borderf); border-radius: 12px; margin-bottom: 32px; }
  .cp-summary-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 8px; }
  .cp-p { font-size: 14px; color: var(--text); line-height: 1.7; margin: 0 0 12px; }
  .cp-p b { color: var(--brass-2); font-weight: 800; }

  .cp-cta-block { padding: 30px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; }
  .cp-cta-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .cp-cta-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 18px; max-width: 500px; margin-left: auto; margin-right: auto; }
  .cp-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .cp-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .cp-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .cp-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
