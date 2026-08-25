import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import { bookingHref, BOOKING_LABEL } from "./lib/booking";

/**
 * PitchProductVault — /pitch/product-vault feature-by-feature deep-dive.
 *
 * Answers the "what did you actually build?" VC question comprehensively.
 * 10 features × 4 fields each (what, how built, unlocks, tier) → complete
 * inventory of shipped surface area.
 */
const PITCH_CODE = "rzai-insider-2026";

const FEATURES = [
  {
    id: "01",
    tag: "CORE ENGINE",
    tier: "All tiers",
    name: "4-strategy verdict grid",
    what: "Type an address; get BRRRR, Buy & Hold, Fix & Flip, and Multiplex Build verdicts in parallel with STRONG/GO/CAUTION/PASS labels. Every strategy computes IRR, CoC, cashflow, and 5-year equity independently against the same underlying property data.",
    how: "Custom math engine (strategyMath.js) with 4 parallel scenario simulators. Rent anchored to CMHC. Financing modeled with Canadian mortgage stress-test math (OSFI B-20). Tax treatment respects CCA + provincial land-transfer.",
    unlocks: "Zero-manual-work broker underwriting. The 3-second verdict is the product's core value proposition.",
  },
  {
    id: "02",
    tag: "CORE DATA",
    tier: "All tiers",
    name: "37-code Canadian zoning bylaw layer",
    what: "Real bylaw specs (max height, FAR, coverage, setbacks) for the codes that account for 90% of Canadian residential deals. Calgary R-CG + R-C1/2, Edmonton RS (Bylaw 20001), Toronto RD (2023 Multiplex), Vancouver RS, Ottawa R1-R4, Mississauga R3-R6, Hamilton D3-D6.",
    how: "Manual hand-verification of each code against the actual city bylaw PDF. Every dimensional spec cross-referenced with municipal open data + council amendment history. Refresh cadence quarterly.",
    unlocks: "The 4-plex + multiplex verdicts nobody else runs. This is the moat.",
  },
  {
    id: "03",
    tag: "CORE DATA",
    tier: "All tiers",
    name: "CMHC rent anchor integration",
    what: "Every verdict pulls rent estimates from CMHC's official Rental Market Reports for the specific metro. Anchors to real government data, not scraped comps. Refreshed quarterly.",
    how: "CMHC publishes quarterly rental data at metro + city level. RizeAI ingests, normalizes, and joins to property lookups by CMA/metro code. Fallback to inflation-adjusted trailing 4-quarter median when new data is delayed.",
    unlocks: "Legally defensible rent numbers. Brokers cite CMHC in IC memos and know the number holds up.",
  },
  {
    id: "04",
    tag: "AI LAYER",
    tier: "Pro + Scale",
    name: "AI deal thesis generator",
    what: "Every verdict includes a 3-paragraph AI-generated thesis explaining what the numbers mean, what the risks are, and what would change the verdict. Written in institutional-analyst voice, not chatbot-flavor.",
    how: "our AI for depth on Pro+; routed to our AI for 78% of calls where task quality is equivalent. Prompt-engineered against real IC memo templates. Per-verdict marginal cost: $0.001.",
    unlocks: "Broker delivers report-quality output to client without writing prose. This is what justifies the $99 tier.",
  },
  {
    id: "05",
    tag: "WORKFLOW",
    tier: "Pro + Scale",
    name: "Buy Box saved searches + weekly digest",
    what: "Save a criteria set (city + strategy + price range + unit count + zoning). Every Monday 9am UTC, RizeAI emails matching new listings from your saved boxes with verdicts pre-computed.",
    how: "Supabase table (buy_boxes) + Vercel cron (0 9 * * 1) that iterates saved boxes, fetches new listings by watchlist_addresses, runs verdicts, and pipes results into a Resend transactional email.",
    unlocks: "Passive deal flow. Broker doesn't have to search every day — the deals come to them. Retention driver.",
  },
  {
    id: "06",
    tag: "DISTRIBUTION",
    tier: "All tiers",
    name: "Chrome extension (Realtor.ca + HouseSigma + Zillow + Redfin)",
    what: "One-click verdict on any listing on realtor.ca, housesigma.com, zillow.com, or redfin.com. Injects a RizeAI verdict badge on the listing page.",
    how: "Chrome MV3 extension. Content script parses the listing DOM; background script hits /api/v1/verdict with the extracted address; verdict rendered as an overlay card.",
    unlocks: "Zero-friction adoption. Broker sees a listing → clicks → verdict. No login, no address typing.",
  },
  {
    id: "07",
    tag: "FIRM TIER",
    tier: "Scale only",
    name: "White-label branded PDF reports",
    what: "Scale-tier accounts upload their firm logo + brand colors. Every deal report exports as a firm-branded PDF that looks like it came from the firm, not RizeAI.",
    how: "Supabase Storage bucket (firm-logos) + on-demand jsPDF generation with brand color injection + logo overlay + custom disclaimer footer per firm.",
    unlocks: "Firm-level upmarket motion. Broker principals justify Scale tier because their agents can deliver firm-branded reports.",
  },
  {
    id: "08",
    tag: "FIRM TIER",
    tier: "Scale only",
    name: "Public API for firm integrations",
    what: "Full REST API — /api/v1/verdict + /api/v1/keys — that firms use to embed RizeAI verdicts into their CRM, listing feed, or intranet dashboards.",
    how: "Per-key rate limiting stored in Supabase. Authenticated via X-API-Key header. Response shape matches the internal verdict output for parity. Docs at /api-docs.",
    unlocks: "Firm-level distribution stickiness. Once a brokerage has embedded our API into their CRM, switching costs get real.",
  },
  {
    id: "09",
    tag: "SUPPORTING",
    tier: "All tiers",
    name: "Building Grade — 4-dimension institutional read",
    what: "Every property analysis fires a Building Grade evaluation (Location Quality, Building Fundamentals, Financial Health, Development Potential) that returns a letter grade + supporting narrative.",
    how: "Custom AI prompt evaluating property against 4 dimensions using zoning + assessment + CMHC + Canadian broker heuristics. Cached in component state; refreshes when address changes.",
    unlocks: "Fast institutional-quality reads that broker can hand to a lender or investor without editing.",
  },
  {
    id: "10",
    tag: "PLATFORM",
    tier: "All tiers",
    name: "Public API v1 · Reads + Verdicts",
    what: "Public API endpoints (v1/verdict, v1/keys) documented at /api-docs. External customers get programmatic access to the underwriting layer.",
    how: "Vercel serverless functions consolidated into ai-chat.js under mode routing (to stay under Hobby 12-function cap). Rate-limited per key via Supabase.",
    unlocks: "Enterprise / API tier revenue. Also proves platform-level maturity to VCs — 'they have an API' matters.",
  },
];

export default function PitchProductVault() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);

  useDocMeta({
    title: "RizeAI · Product Vault (Confidential)",
    description: "Every feature RizeAI has shipped, how it was built, and what it unlocks. 10 features across core engine, data, AI, workflow, distribution, and firm tier.",
  });

  useEffect(() => {
    const p = params.get("p") || "";
    let stored = "";
    try { stored = sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch {}
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) track("pitch_product_vault_view");
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    }
  }, [params, unlocked]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1128", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#d4af37", letterSpacing: 1.4, marginBottom: 12 }}>▸ CONFIDENTIAL · PRODUCT VAULT</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Access via /pitch first.</div>
          <button onClick={() => navigate("/pitch")} style={{ padding: "10px 20px", borderRadius: 6, background: "#d4af37", color: "#0a1128", border: "1px solid #d4af37", fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", cursor: "pointer" }}>Go to /pitch →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pv-wrap">
      <style>{CSS}</style>

      <div className="pv-topbar">
        <a href="/pitch" className="pv-logo">Real <span>Deal</span></a>
        <span className="pv-tag">▸ PRODUCT VAULT · CONFIDENTIAL</span>
        <button className="pv-topbar-btn" onClick={() => navigate("/pitch")}>← /pitch</button>
      </div>

      <div className="pv-body">
        {/* HEADER */}
        <div className="pv-header">
          <div className="pv-eyebrow">
            <span className="pv-eyebrow-dot" />
            10 SHIPPED FEATURES
          </div>
          <h1 className="pv-h1">What we actually built. <span>Feature by feature.</span></h1>
          <p className="pv-sub">
            Every VC asks "what did you actually ship?" Here's the answer, one card per feature. What it does, how it was built, what tier unlocks it, and what business outcome it drives.
          </p>
        </div>

        {/* SUMMARY */}
        <div className="pv-summary-grid">
          <div className="pv-summary-cell">
            <div className="pv-summary-val">10</div>
            <div className="pv-summary-lbl">Features shipped</div>
          </div>
          <div className="pv-summary-cell brass">
            <div className="pv-summary-val">7</div>
            <div className="pv-summary-lbl">In all tiers (free tier included)</div>
          </div>
          <div className="pv-summary-cell">
            <div className="pv-summary-val">2</div>
            <div className="pv-summary-lbl">Pro tier only</div>
          </div>
          <div className="pv-summary-cell">
            <div className="pv-summary-val">2</div>
            <div className="pv-summary-lbl">Scale (firm) tier only</div>
          </div>
        </div>

        {/* FEATURES */}
        <section className="pv-section">
          <div className="pv-section-tag">▸ THE FEATURE INVENTORY</div>
          {FEATURES.map((f) => (
            <article key={f.id} className="pv-feature">
              <div className="pv-feature-head">
                <div className="pv-feature-num">{f.id}</div>
                <div className="pv-feature-header-body">
                  <div className="pv-feature-tag">{f.tag}</div>
                  <h3 className="pv-feature-name">{f.name}</h3>
                </div>
                <div className={`pv-feature-tier tier-${(f.tier || "").split(" ")[0].toLowerCase()}`}>{f.tier}</div>
              </div>
              <div className="pv-feature-body">
                <PvBlock lbl="WHAT IT DOES"       text={f.what} />
                <PvBlock lbl="HOW IT WAS BUILT"    text={f.how} accent="royal" />
                <PvBlock lbl="WHAT IT UNLOCKS"     text={f.unlocks} accent="brass" />
              </div>
            </article>
          ))}
        </section>

        {/* CTA */}
        <div className="pv-cta-block">
          <div className="pv-cta-h">Want a live walkthrough?</div>
          <div className="pv-cta-p">Any feature above · 20-minute demo · founder answers "how does that actually work?" in real time.</div>
          <div className="pv-cta-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="pv-cta">{BOOKING_LABEL}</a>
            <button className="pv-cta ghost" onClick={() => navigate("/property?addr=2424+Westmount+Rd+NW%2C+Calgary+AB")}>Try it yourself</button>
            <button className="pv-cta ghost" onClick={() => navigate("/pitch/data-room")}>Data room</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PvBlock({ lbl, text, accent }) {
  return (
    <div className={`pv-block ${accent ? `accent-${accent}` : ""}`}>
      <div className="pv-block-lbl">▸ {lbl}</div>
      <div className="pv-block-text">{text}</div>
    </div>
  );
}

const CSS = `
  .pv-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .pv-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 14px; padding: 14px 24px; background: rgba(10,17,40,0.96); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); }
  .pv-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .pv-logo span { color: var(--brass); }
  .pv-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .pv-topbar-btn { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }

  .pv-body { max-width: 940px; margin: 0 auto; padding: 44px 24px 80px; }
  .pv-header { text-align: center; margin-bottom: 30px; padding-bottom: 26px; border-bottom: 1px solid var(--borderf); }
  .pv-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .pv-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .pv-h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: var(--text); letter-spacing: -1.4px; line-height: 1.1; margin: 0 0 12px; }
  .pv-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .pv-sub { font-size: 15px; color: var(--sub); line-height: 1.65; max-width: 660px; margin: 0 auto; }

  .pv-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 40px; }
  @media(max-width:640px){ .pv-summary-grid { grid-template-columns: repeat(2, 1fr); } }
  .pv-summary-cell { padding: 14px 16px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; text-align: center; }
  .pv-summary-cell.brass { border-left: 3px solid var(--brass); background: linear-gradient(90deg, rgba(212,175,55,0.05), var(--card)); }
  .pv-summary-val { font-family: 'Geist Mono', monospace; font-size: 32px; font-weight: 800; color: var(--text); letter-spacing: -1px; line-height: 1; margin-bottom: 4px; }
  .pv-summary-cell.brass .pv-summary-val { color: var(--brass); }
  .pv-summary-lbl { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--sub); letter-spacing: 0.4px; }

  .pv-section { margin-bottom: 40px; }
  .pv-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 14px; text-transform: uppercase; }

  .pv-feature { padding: 22px 26px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--brass); border-radius: 10px; margin-bottom: 12px; }
  .pv-feature-head { display: grid; grid-template-columns: 50px 1fr auto; gap: 14px; align-items: flex-start; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px dashed var(--borderf); }
  @media(max-width:640px){ .pv-feature-head { grid-template-columns: 40px 1fr; } .pv-feature-tier { grid-column: 2; margin-top: 6px; justify-self: start; } }
  .pv-feature-num { font-family: 'Geist Mono', monospace; font-size: 24px; font-weight: 800; color: var(--sub); letter-spacing: -0.6px; line-height: 1; }
  .pv-feature-tag { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.2px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 6px; }
  .pv-feature-name { font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; line-height: 1.3; margin: 0; }
  .pv-feature-tier { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 0.9px; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; white-space: nowrap; border: 1px solid; }
  .pv-feature-tier.tier-all { background: rgba(22,163,74,0.08); color: #16a34a; border-color: rgba(22,163,74,0.28); }
  .pv-feature-tier.tier-pro { background: rgba(33,85,205,0.08); color: var(--royal); border-color: rgba(33,85,205,0.28); }
  .pv-feature-tier.tier-scale { background: rgba(212,175,55,0.08); color: var(--brass); border-color: rgba(212,175,55,0.28); }

  .pv-feature-body { display: flex; flex-direction: column; gap: 10px; }
  .pv-block { padding: 10px 14px; background: rgba(15,23,42,0.03); border-left: 2px solid var(--borderf); border-radius: 4px; }
  .pv-block.accent-royal { background: rgba(33,85,205,0.04); border-left-color: var(--royal); }
  .pv-block.accent-brass { background: rgba(212,175,55,0.05); border-left-color: var(--brass); }
  .pv-block-lbl { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; color: var(--sub); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
  .pv-block.accent-royal .pv-block-lbl { color: var(--royal); }
  .pv-block.accent-brass .pv-block-lbl { color: var(--brass-2); }
  .pv-block-text { font-size: 13px; color: var(--text); line-height: 1.65; }

  .pv-cta-block { padding: 28px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; margin-top: 20px; }
  .pv-cta-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .pv-cta-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 18px; max-width: 500px; margin-left: auto; margin-right: auto; }
  .pv-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .pv-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .pv-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .pv-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
