import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";

/**
 * PitchWhyNow — /pitch/why-now macro thesis one-pager.
 *
 * Answers the VC question every investor asks: "why is this the right time?"
 * The 5 macro forces that make this window open in 2026 specifically:
 * (1) Canadian multiplex bylaw wave (2023-2025)
 * (2) LLM pricing collapse (2024-2026)
 * (3) MLS provider consolidation + API opening
 * (4) Broker economic pressure (2024 fee compression)
 * (5) CMHC + government housing supply mandate
 *
 * Same PITCH_CODE gate as /pitch.
 */
const PITCH_CODE = "rzai-insider-2026";

export default function PitchWhyNow() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);

  useDocMeta({
    title: "RizeAI · Why Now (Confidential)",
    description: "The 5 macro forces that make Canadian broker underwriting an open window in 2026.",
  });

  useEffect(() => {
    const p = params.get("p") || "";
    let stored = "";
    try { stored = sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch {}
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) track("pitch_whynow_view");
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    }
  }, [params, unlocked]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1128", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#d4af37", letterSpacing: 1.4, marginBottom: 12 }}>▸ CONFIDENTIAL · WHY NOW</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Access via /pitch first.</div>
          <button onClick={() => navigate("/pitch")} style={{ padding: "10px 20px", borderRadius: 6, background: "#d4af37", color: "#0a1128", border: "1px solid #d4af37", fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", cursor: "pointer" }}>
            Go to /pitch →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pn-wrap">
      <style>{CSS}</style>

      <div className="pn-topbar">
        <a href="/pitch" className="pn-logo">Real <span>Deal</span></a>
        <span className="pn-tag">▸ WHY NOW · CONFIDENTIAL</span>
        <button className="pn-topbar-btn" onClick={() => navigate("/pitch")}>← /pitch</button>
      </div>

      <div className="pn-body">
        <div className="pn-header">
          <div className="pn-eyebrow">
            <span className="pn-eyebrow-dot" />
            THE 2026 WINDOW
          </div>
          <h1 className="pn-h1">Five forces. <span>All converging in 2026.</span></h1>
          <p className="pn-sub">
            The best startup timing questions aren't <em>"is this a good idea?"</em> — they're <em>"why couldn't this exist 5 years ago, and why won't it be commoditized in 5 more?"</em> Here's what changed in the last 24 months that opened the door to RizeAI, and why the window closes in ~36 months.
          </p>
        </div>

        <Force
          n="01"
          tag="ZONING · SUPPLY-SIDE"
          h="Canadian cities rewrote residential zoning between 2023 and 2025."
          strut={[
            { k: "Toronto", v: "2023 Multiplex Bylaw — 4 units as-of-right on every RD lot, city-wide" },
            { k: "Edmonton", v: "Bylaw 20001 (2024) — 8 units as-of-right on every RS lot" },
            { k: "Calgary", v: "R-CG rezoning (2024) — up to 4 units on inner-city lots" },
            { k: "Vancouver", v: "RS multiplex reforms (2024) — 3-6 units as-of-right in most zones" },
            { k: "Federal", v: "Housing Accelerator Fund (2023-2028) — $4B tied to municipal zoning reform" },
          ]}
          impact="Every broker in Canada now needs to answer: does this SFH support 3-8 units under the new bylaw? Every existing tool (BiggerPockets, DealCheck, Excel) assumes the OLD zoning rules. The knowledge asymmetry is enormous — and 2026 is the year brokers actively look for a tool to close it."
        />

        <Force
          n="02"
          tag="AI · COST COLLAPSE"
          h="LLM inference for a deal memo dropped from $2 to $0.001 in 3 years."
          strut={[
            { k: "Q1 2023", v: "GPT-4 launch — $30 per 1M input tokens · $60 output" },
            { k: "Q3 2024", v: "our AI — $3 in / $15 out — 10× cheaper" },
            { k: "Q2 2025", v: "our AI — $0.80 in / $4 out — 40× cheaper than GPT-4" },
            { k: "Q4 2025", v: "our AI — routing lets us serve verdicts at <$0.002/generation" },
            { k: "2026 forward", v: "Frontier model prices continue to compress ~50%/year — margin structurally expands" },
          ]}
          impact="A tool that runs a 4-strategy deal memo in real-time was economically impossible in 2023. By 2026 the marginal cost per verdict is ~$0.001. That's the enabler for a $99/mo self-serve tier with ~99.8% gross margin. Every incumbent built pre-2024 has a different cost structure — we started here."
        />

        <Force
          n="03"
          tag="MLS · DISTRIBUTION"
          h="Canadian MLS providers are opening APIs for the first time in 20 years."
          strut={[
            { k: "TREB / TRREB", v: "PropTx integration expanded 2024 — real-time listing access via approved API partners" },
            { k: "CREA / REALTOR.ca", v: "Data Distribution Facility (DDF) opening broker-consumer flows through third-party UIs" },
            { k: "HouseSigma", v: "Grew to 6M+ MAU by 2025 — normalized third-party access to Canadian listing data" },
            { k: "MLS® HOME Price Index", v: "Now available quarterly at CMA/hood level — anchor for hyperlocal comps" },
          ]}
          impact="A real-time broker underwriting product needed API access to the source listing data. That access was locked behind brokerage seats until ~2023. Our Chrome extension approach — inject at the listing page — sidesteps the licensing entirely while we build direct MLS partnerships in parallel."
        />

        <Force
          n="04"
          tag="BROKER ECONOMICS · DEMAND-SIDE"
          h="2024 commission compression squeezed every broker's per-deal profit."
          strut={[
            { k: "US Sitzer/Burnett", v: "$1.8B settlement 2024 forced buyer-broker commission decoupling — spillover into Canadian norms" },
            { k: "CREA settlement", v: "Class action ongoing 2025-2026 — expected outcome mirrors US model" },
            { k: "Volume down 22%", v: "CREA data: 2024 Canadian residential transactions -22% YoY vs 2022 peak" },
            { k: "Result", v: "Same brokers competing for fewer deals at compressed fees — they need to underwrite MORE listings in LESS time to survive" },
          ]}
          impact="This is the demand-side match. When brokers had record commissions and record volume (2021-22), they could afford to underwrite by intuition. In 2026 they can't. Every $99/mo tool that helps them convert 10% more calls into deals pays for itself in one commission."
        />

        <Force
          n="05"
          tag="GOVERNMENT · TAILWIND"
          h="Federal + provincial housing supply mandate lasts 5-10 years."
          strut={[
            { k: "Federal target", v: "3.5M new homes by 2031 — CMHC official mandate" },
            { k: "Housing Accelerator Fund", v: "$4B distributed 2023-2028 — municipalities lose the money if they don't hit zoning + supply targets" },
            { k: "Ontario Bill 23", v: "Fast-track approvals + tie provincial funding to housing starts" },
            { k: "BC Housing Statutes", v: "Provincial preemption of municipal zoning — 4 units as-of-right, transit-oriented density" },
          ]}
          impact="The zoning wave isn't a one-time event — it's a policy regime that persists through 2030 minimum. Every municipality has a financial gun to their head to approve density. Every RizeAI dimensional-zoning update stays valuable for the entire investment horizon."
        />

        {/* WINDOW CLOSING */}
        <section className="pn-close">
          <div className="pn-close-tag">▸ AND WHY THE WINDOW CLOSES</div>
          <h2 className="pn-close-h">This is a 36-month window, not a permanent moat.</h2>
          <p className="pn-close-p">
            By 2029, BiggerPockets will have added Canadian bylaw support. CoStar will have compressed its enterprise pricing to attack the mid-market. Some MLS provider will launch a first-party AI verdict feature. That's fine — <b>we don't need forever, we need first</b>.
          </p>
          <p className="pn-close-p">
            The three moats we're building right now (city-specific bylaw data, broker workflow lock-in via Buy Boxes + weekly digests, and firm-level API integrations) are what compound during the window. A broker who's had their firm's IC deck on our infrastructure for 18 months doesn't rip it out to switch to whatever BiggerPockets ships in 2029.
          </p>
          <div className="pn-close-cta">
            <button className="pn-cta" onClick={() => navigate("/pitch/deck")}>See the slide deck →</button>
            <button className="pn-cta ghost" onClick={() => navigate("/pitch")}>Back to /pitch</button>
            <button className="pn-cta ghost" onClick={() => navigate("/pitch/faq")}>FAQ</button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Force({ n, tag, h, strut, impact }) {
  return (
    <section className="pn-force">
      <div className="pn-force-side">
        <div className="pn-force-num">{n}</div>
        <div className="pn-force-tag">{tag}</div>
      </div>
      <div className="pn-force-body">
        <h2 className="pn-force-h">{h}</h2>
        <div className="pn-force-strut">
          {strut.map((s, i) => (
            <div key={i} className="pn-force-strut-row">
              <div className="pn-force-strut-k">{s.k}</div>
              <div className="pn-force-strut-v">{s.v}</div>
            </div>
          ))}
        </div>
        <div className="pn-force-impact">
          <div className="pn-force-impact-tag">▸ WHY IT MATTERS FOR RIZEAI</div>
          <div className="pn-force-impact-body">{impact}</div>
        </div>
      </div>
    </section>
  );
}

const CSS = `
  .pn-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .pn-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 14px; padding: 14px 24px; background: rgba(10,17,40,0.96); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); }
  .pn-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .pn-logo span { color: var(--brass); }
  .pn-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .pn-topbar-btn { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }

  .pn-body { max-width: 940px; margin: 0 auto; padding: 44px 24px 80px; }

  .pn-header { margin-bottom: 44px; text-align: center; padding-bottom: 36px; border-bottom: 1px solid var(--borderf); }
  .pn-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 14px; }
  .pn-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .pn-h1 { font-size: clamp(30px, 4.5vw, 44px); font-weight: 800; color: var(--text); letter-spacing: -1.6px; line-height: 1.1; margin: 0 0 14px; }
  .pn-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .pn-sub { font-size: 15.5px; color: var(--sub); line-height: 1.65; margin: 0 auto; max-width: 720px; }

  .pn-force { display: grid; grid-template-columns: 140px 1fr; gap: 24px; margin-bottom: 40px; padding-bottom: 40px; border-bottom: 1px solid var(--borderf); }
  @media(max-width:720px){ .pn-force { grid-template-columns: 1fr; gap: 12px; } }
  .pn-force-side { }
  .pn-force-num { font-family: 'Geist Mono', monospace; font-size: 56px; font-weight: 800; color: var(--sub); letter-spacing: -3px; line-height: 1; margin-bottom: 4px; }
  .pn-force-tag { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass-2); text-transform: uppercase; line-height: 1.4; }
  .pn-force-body { }
  .pn-force-h { font-size: clamp(20px, 2.8vw, 26px); font-weight: 800; color: var(--text); letter-spacing: -0.6px; line-height: 1.25; margin: 0 0 16px; }
  .pn-force-strut { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; padding: 14px 16px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  .pn-force-strut-row { display: grid; grid-template-columns: 160px 1fr; gap: 12px; padding: 6px 0; border-bottom: 1px dashed var(--borderf); }
  .pn-force-strut-row:last-child { border-bottom: none; }
  @media(max-width:560px){ .pn-force-strut-row { grid-template-columns: 1fr; gap: 3px; } }
  .pn-force-strut-k { font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 800; color: var(--brass-2); letter-spacing: 0.4px; }
  .pn-force-strut-v { font-size: 13px; color: var(--text); line-height: 1.55; }
  .pn-force-impact { padding: 14px 16px; background: rgba(33,85,205,0.05); border-left: 3px solid var(--royal); border-radius: 4px; }
  .pn-force-impact-tag { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.2px; color: var(--royal); text-transform: uppercase; margin-bottom: 6px; }
  .pn-force-impact-body { font-size: 13.5px; color: var(--text); line-height: 1.65; }

  .pn-close { padding: 28px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; }
  .pn-close-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 10px; }
  .pn-close-h { font-size: clamp(22px, 3vw, 28px); font-weight: 800; color: var(--text); letter-spacing: -0.6px; line-height: 1.2; margin: 0 0 14px; }
  .pn-close-p { font-size: 14.5px; color: var(--sub); line-height: 1.7; margin: 0 0 12px; }
  .pn-close-p b { color: var(--text); font-weight: 800; }
  .pn-close-cta { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
  .pn-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; }
  .pn-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .pn-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
