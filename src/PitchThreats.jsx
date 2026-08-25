import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import { bookingHref, BOOKING_LABEL } from "./lib/booking";

/**
 * PitchThreats — /pitch/threats risk analysis for VCs.
 *
 * Naming your own risks unprompted is one of the strongest signals of
 * founder honesty + operational maturity. VCs pattern-match hard on it.
 * The play here is: enumerate 8 real threats + our specific mitigation
 * for each, sorted by severity + likelihood.
 */
const PITCH_CODE = "rzai-insider-2026";

const THREATS = [
  {
    id: "01",
    tag: "COMPETITIVE · HIGH SEVERITY · MEDIUM LIKELIHOOD",
    severity: "high",
    likelihood: "medium",
    title: "BiggerPockets adds Canadian zoning support.",
    scenario: "US-based BiggerPockets ($390/yr) decides Canada is worth the engineering. They ship a Toronto + Vancouver bylaw layer + CMHC rent anchors within 18 months.",
    why: "They're profitable, they have brand, and Canadian users are a natural expansion market. If they wanted to, they could.",
    mitigation: "Speed. We ship city adapters + bylaw math faster than a public company can approve procurement. By the time BP catches up on 7 cities, we're in 15. Firm-tier (Scale) accounts create switching costs BP's consumer model can't touch — a Toronto brokerage with 30 agents on our API can't rip out and switch. Also: BP's business is content + community, not workflow — the incentives point them elsewhere.",
    residual: "Real but manageable. Even in the pessimistic case, market fragments — brokers use both. Our margin per user still supports the model.",
  },
  {
    id: "02",
    tag: "TECHNOLOGY · HIGH SEVERITY · LOW LIKELIHOOD",
    severity: "high",
    likelihood: "low",
    title: "Anthropic 10× the API price.",
    scenario: "our AI pricing rises from $0.80/M tokens to $8/M. Our marginal cost per verdict jumps from $0.001 → $0.010.",
    why: "Frontier labs are still figuring out unit economics. GPU capacity crunches happen. Any cloud-AI dependency is exposed.",
    mitigation: "Gross margin at 10× cost is still ~99% — a $99/mo Pro user costs us $0.50/mo instead of $0.05. We'd survive it. Also: we're not locked to one provider. The 4-strategy math engine is provider-agnostic — Gemini, Llama, Mistral open-weight alternatives all match AI's task quality within 20% today. Migration is a 2-week engineering effort, not existential.",
    residual: "Not existential. Would compress margin from 99.8% to 96%. Still a great business.",
  },
  {
    id: "03",
    tag: "MARKET · MEDIUM SEVERITY · MEDIUM LIKELIHOOD",
    severity: "medium",
    likelihood: "medium",
    title: "Canadian residential recession extends through 2027.",
    scenario: "Volume stays down 20-30% YoY. Brokers exit the industry. Fewer deals means fewer underwriting queries — even if we grow share, the pie shrinks.",
    why: "Interest rates, mortgage renewal cliff, condo oversupply — the macro can stay bad longer than we expect.",
    mitigation: "Counter-cyclical positioning. When volume drops, brokers who survive get more selective. Underwriting matters more when every deal has to count — the tool becomes MORE valuable, not less. Also: we serve investors (BRRRR + multiplex build), not just brokers on straight transactions. Investor demand is inversely correlated with retail demand (distressed sellers = investor upside).",
    residual: "Manageable. Model survives 30% volume compression by growing broker penetration + investor mix.",
  },
  {
    id: "04",
    tag: "FOUNDER · HIGH SEVERITY · LOW LIKELIHOOD",
    severity: "high",
    likelihood: "low",
    title: "Solo founder gets hit by a bus (or burns out).",
    scenario: "Sunni becomes unavailable — health, family emergency, burnout. Product freezes; investors stuck.",
    why: "Solo builds carry key-person risk. It's real. Ignoring it doesn't fix it.",
    mitigation: "Two hires within 30 days of round close (senior engineer + GTM Lead) explicitly reduce this. Code is documented, deployed, and running — a competent replacement engineer could carry it. Product IP is fully assigned to the corporate entity. Post-Series-A, we hire a #2 (CTO or COO) — that's the exit valve. Also: term life + disability insurance on the founder ships pre-close.",
    residual: "Real but reduced. Solo now → 3-person team by month 6 → 5-person by month 12.",
  },
  {
    id: "05",
    tag: "PARTNERSHIP · MEDIUM SEVERITY · MEDIUM LIKELIHOOD",
    severity: "medium",
    likelihood: "medium",
    title: "MLS providers restrict API/data access.",
    scenario: "CREA / TREB / local boards decide third-party data usage requires broker licensure. Our Chrome extension approach gets legal-blocked.",
    why: "MLS boards have historical hostility to third-party UI. Sitzer/Burnett-style rulings force reactive changes.",
    mitigation: "Chrome extension operates on data the user already sees in their browser — legally distinct from API scraping. We're moving to direct MLS partnerships (PropTx / DDF) in Year 1 to sit on the licensed side of the line. Also: our unique value is the verdict math + bylaw layer, not the listing data — even if we lose the extension surface, users type addresses manually and the core loop still works.",
    residual: "Manageable. Product still works without extension; extension is convenience, not core.",
  },
  {
    id: "06",
    tag: "REGULATORY · LOW SEVERITY · LOW LIKELIHOOD",
    severity: "low",
    likelihood: "low",
    title: "AI-generated deal thesis triggers licensure requirements.",
    scenario: "OSFI / provincial regulator decides that AI-generated verdicts constitute investment advice, requiring licensed personnel.",
    why: "US SEC and Canadian regulators are actively working through AI + finance boundaries. Deal thesis output could get pulled into that scope.",
    mitigation: "Product design explicit: RizeAI is a math tool, not investment advice. Every verdict is transparently sourced (zoning + CMHC + math), disclosed in ToS as informational. The four strategies are labeled STRONG/GO/CAUTION/PASS — not BUY/SELL. Regulatory frame we could always fall behind: 'calculator, not advisor.' Also: Canada has 12+ Canadian FinTech companies operating similar AI + finance workflows without issue.",
    residual: "Low. Would require ToS + label adjustments, not product overhaul.",
  },
  {
    id: "07",
    tag: "GTM · MEDIUM SEVERITY · MEDIUM LIKELIHOOD",
    severity: "medium",
    likelihood: "medium",
    title: "Broker sales cycle is longer than modeled.",
    scenario: "Individual brokers convert to Pro fine, but firm-tier (Scale) sales cycles take 6+ months instead of the 2-3 we've modeled. MRR ramp slows.",
    why: "Broker firms are conservative. Procurement, IT, compliance layers slow enterprise deals.",
    mitigation: "Pro tier ($99/mo) doesn't require firm approval — individual broker signs up with credit card. We ramp on individual brokers first, then use their internal advocacy to push Scale to their firm. Also: our GTM Lead hire post-close specifically shortens firm sales cycles — that's the role's Day 1 KPI.",
    residual: "Model holds even at 6-mo firm sales cycles because Pro is the volume engine.",
  },
  {
    id: "08",
    tag: "FINANCING · LOW SEVERITY · LOW LIKELIHOOD",
    severity: "low",
    likelihood: "low",
    title: "Pre-seed round doesn't close at $1.5M target.",
    scenario: "We only close $750K. Runway becomes 12 months instead of 21.",
    why: "Fundraise timing is unpredictable. Market volatility matters.",
    mitigation: "First close threshold is 50% commit ($750K) — that alone gets us to $30K MRR runway. We can operate on that. Scale hire delayed; product roadmap prioritizes revenue over expansion. Series-A conversation opens at $30K MRR regardless of pre-seed size closed.",
    residual: "Manageable. Would compress ambition but not survival.",
  },
];

export default function PitchThreats() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);

  useDocMeta({
    title: "RizeAI · Risk Analysis (Confidential)",
    description: "Threats to the RizeAI thesis and the specific mitigations for each. Honest downside enumeration.",
  });

  useEffect(() => {
    const p = params.get("p") || "";
    let stored = "";
    try { stored = sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch {}
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) track("pitch_threats_view");
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    }
  }, [params, unlocked]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1128", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#d4af37", letterSpacing: 1.4, marginBottom: 12 }}>▸ CONFIDENTIAL · RISK</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Access via /pitch first.</div>
          <button onClick={() => navigate("/pitch")} style={{ padding: "10px 20px", borderRadius: 6, background: "#d4af37", color: "#0a1128", border: "1px solid #d4af37", fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", cursor: "pointer" }}>Go to /pitch →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="th-wrap">
      <style>{CSS}</style>

      <div className="th-topbar">
        <a href="/pitch" className="th-logo">Real <span>Deal</span></a>
        <span className="th-tag">▸ RISK ANALYSIS · CONFIDENTIAL</span>
        <button className="th-topbar-btn" onClick={() => navigate("/pitch")}>← /pitch</button>
      </div>

      <div className="th-body">
        {/* HEADER */}
        <div className="th-header">
          <div className="th-eyebrow">
            <span className="th-eyebrow-dot" />
            HOW THIS FAILS
          </div>
          <h1 className="th-h1">The 8 real threats. <span>Named unprompted.</span></h1>
          <p className="th-sub">
            Every seed pitch enumerates risks. Most do it defensively. This page does it because we've thought about how this fails before we thought about how it wins. Rated by severity × likelihood, each with our specific mitigation.
          </p>
        </div>

        {/* MATRIX SUMMARY */}
        <div className="th-matrix">
          <div className="th-matrix-tag">▸ SEVERITY × LIKELIHOOD MATRIX</div>
          <div className="th-matrix-grid">
            <div className="th-matrix-cell high-high">
              <div className="th-matrix-lbl">HIGH × HIGH</div>
              <div className="th-matrix-count">0</div>
              <div className="th-matrix-note">No existential + likely threats</div>
            </div>
            <div className="th-matrix-cell high-med">
              <div className="th-matrix-lbl">HIGH × MED</div>
              <div className="th-matrix-count">1</div>
              <div className="th-matrix-note">Competitive (#01)</div>
            </div>
            <div className="th-matrix-cell med-med">
              <div className="th-matrix-lbl">MED × MED</div>
              <div className="th-matrix-count">3</div>
              <div className="th-matrix-note">Market, MLS, GTM</div>
            </div>
            <div className="th-matrix-cell high-low">
              <div className="th-matrix-lbl">HIGH × LOW</div>
              <div className="th-matrix-count">2</div>
              <div className="th-matrix-note">Anthropic, founder</div>
            </div>
            <div className="th-matrix-cell low-low">
              <div className="th-matrix-lbl">LOW × LOW</div>
              <div className="th-matrix-count">2</div>
              <div className="th-matrix-note">Regulatory, financing</div>
            </div>
          </div>
        </div>

        {/* THREATS */}
        <section className="th-section">
          <div className="th-section-tag">▸ THE ENUMERATION</div>
          <div className="th-threats">
            {THREATS.map((t) => (
              <div key={t.id} className={`th-threat sev-${t.severity}`}>
                <div className="th-threat-head">
                  <div className="th-threat-id">{t.id}</div>
                  <div className="th-threat-header-body">
                    <div className="th-threat-tag">{t.tag}</div>
                    <h3 className="th-threat-title">{t.title}</h3>
                  </div>
                </div>
                <div className="th-threat-body">
                  <ThreatField label="SCENARIO"   text={t.scenario} />
                  <ThreatField label="WHY REAL"   text={t.why} />
                  <ThreatField label="MITIGATION" text={t.mitigation} accent="brass" />
                  <ThreatField label="RESIDUAL"   text={t.residual} accent="royal" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SUMMARY */}
        <section className="th-summary">
          <div className="th-summary-tag">▸ THE HONEST READ</div>
          <h2 className="th-h2">Zero existential + likely threats. Two existential-if-they-happen. Six manageable.</h2>
          <p className="th-p">
            The bull case is that we execute, incumbents don't catch up, and the market rewards vertical SaaS at 8-12× ARR. The bear case is #01 (BiggerPockets catches up) + #04 (founder unavailability) — <b>both mitigated by shipping speed + Day-1 post-close hiring</b>.
          </p>
          <p className="th-p">
            <b>What this document does not cover:</b> risks we haven't thought of. If you see one below the ones enumerated, that's exactly the intro-call conversation we want.
          </p>
        </section>

        {/* CTA */}
        <div className="th-cta-block">
          <div className="th-cta-h">Have a risk we missed?</div>
          <div className="th-cta-p">Best raise conversations are the ones where the VC identifies a risk the founder hasn't. Book below.</div>
          <div className="th-cta-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="th-cta">{BOOKING_LABEL}</a>
            <button className="th-cta ghost" onClick={() => navigate("/pitch/why-now")}>Why now</button>
            <button className="th-cta ghost" onClick={() => navigate("/pitch/vision")}>Vision</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreatField({ label, text, accent }) {
  return (
    <div className={`th-field ${accent ? `accent-${accent}` : ""}`}>
      <div className="th-field-lbl">▸ {label}</div>
      <div className="th-field-text">{text}</div>
    </div>
  );
}

const CSS = `
  .th-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .th-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 14px; padding: 14px 24px; background: rgba(10,17,40,0.96); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); }
  .th-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .th-logo span { color: var(--brass); }
  .th-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .th-topbar-btn { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }

  .th-body { max-width: 940px; margin: 0 auto; padding: 44px 24px 80px; }
  .th-header { text-align: center; margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px solid var(--borderf); }
  .th-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .th-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .th-h1 { font-size: clamp(28px, 4vw, 42px); font-weight: 800; color: var(--text); letter-spacing: -1.5px; line-height: 1.1; margin: 0 0 14px; }
  .th-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .th-sub { font-size: 15px; color: var(--sub); line-height: 1.65; max-width: 660px; margin: 0 auto; }

  .th-matrix { padding: 22px 24px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; margin-bottom: 40px; }
  .th-matrix-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 14px; }
  .th-matrix-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  @media(max-width:720px){ .th-matrix-grid { grid-template-columns: repeat(2, 1fr); } }
  .th-matrix-cell { padding: 12px 14px; border-radius: 6px; text-align: center; border: 1px solid; }
  .th-matrix-cell.high-high { background: rgba(220,38,38,0.08); border-color: rgba(220,38,38,0.30); color: #dc2626; }
  .th-matrix-cell.high-med { background: rgba(234,88,12,0.08); border-color: rgba(234,88,12,0.30); color: #ea580c; }
  .th-matrix-cell.med-med { background: rgba(234,179,8,0.08); border-color: rgba(234,179,8,0.30); color: #eab308; }
  .th-matrix-cell.high-low { background: rgba(234,88,12,0.05); border-color: rgba(234,88,12,0.22); color: #ea580c; }
  .th-matrix-cell.low-low { background: rgba(22,163,74,0.06); border-color: rgba(22,163,74,0.28); color: #16a34a; }
  .th-matrix-lbl { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px; }
  .th-matrix-count { font-family: 'Geist Mono', monospace; font-size: 28px; font-weight: 800; letter-spacing: -0.8px; line-height: 1; margin-bottom: 6px; }
  .th-matrix-note { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px; opacity: 0.9; }

  .th-section { margin-bottom: 36px; }
  .th-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 12px; text-transform: uppercase; }

  .th-threats { display: flex; flex-direction: column; gap: 14px; }
  .th-threat { padding: 22px 24px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; }
  .th-threat.sev-high { border-left: 3px solid #dc2626; }
  .th-threat.sev-medium { border-left: 3px solid #eab308; }
  .th-threat.sev-low { border-left: 3px solid #16a34a; }
  .th-threat-head { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px dashed var(--borderf); }
  .th-threat-id { font-family: 'Geist Mono', monospace; font-size: 24px; font-weight: 800; color: var(--sub); letter-spacing: -0.8px; line-height: 1; }
  .th-threat-tag { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.2px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 6px; }
  .th-threat-title { font-size: 16px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; line-height: 1.3; margin: 0; }
  .th-threat-body { display: flex; flex-direction: column; gap: 10px; }
  .th-field { padding: 10px 14px; background: rgba(15,23,42,0.03); border-left: 2px solid var(--borderf); border-radius: 4px; }
  .th-field.accent-brass { background: rgba(212,175,55,0.05); border-left-color: var(--brass); }
  .th-field.accent-royal { background: rgba(33,85,205,0.04); border-left-color: var(--royal); }
  .th-field-lbl { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; color: var(--sub); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
  .th-field.accent-brass .th-field-lbl { color: var(--brass-2); }
  .th-field.accent-royal .th-field-lbl { color: var(--royal); }
  .th-field-text { font-size: 13px; color: var(--text); line-height: 1.65; }

  .th-summary { padding: 26px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.05), rgba(33,85,205,0.03)); border: 1px solid rgba(212,175,55,0.24); border-radius: 12px; margin-bottom: 30px; }
  .th-summary-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass-2); text-transform: uppercase; margin-bottom: 8px; }
  .th-h2 { font-size: clamp(20px, 2.8vw, 26px); font-weight: 800; color: var(--text); letter-spacing: -0.6px; line-height: 1.25; margin: 0 0 14px; }
  .th-p { font-size: 14px; color: var(--text); line-height: 1.7; margin: 0 0 12px; }
  .th-p b { color: var(--brass-2); font-weight: 800; }

  .th-cta-block { padding: 28px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; }
  .th-cta-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .th-cta-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 18px; max-width: 500px; margin-left: auto; margin-right: auto; }
  .th-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .th-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .th-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .th-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
