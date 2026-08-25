import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import { bookingHref, BOOKING_LABEL } from "./lib/booking";

/**
 * PitchDataRoom — /pitch/data-room investor-facing data room index.
 *
 * The "what to expect" page that VCs open right after the deck. Shows every
 * artifact by category with status (READY / IN PREP / ON REQUEST). Even if
 * half the files aren't uploaded yet, listing what's coming signals the
 * founder has thought through diligence.
 *
 * Password-gated (same as /pitch). Never actually links out to files
 * publicly — real files go via 1:1 email once an NDA is countersigned.
 */
const PITCH_CODE = "rzai-insider-2026";

export default function PitchDataRoom() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);

  useDocMeta({
    title: "RizeAI · Data Room (Confidential)",
    description: "RizeAI investor data room index — deck, model, cap table, legal, IP, tech, references.",
  });

  useEffect(() => {
    const p = params.get("p") || "";
    let stored = "";
    try { stored = sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch {}
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) track("pitch_dataroom_view");
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    }
  }, [params, unlocked]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1128", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#d4af37", letterSpacing: 1.4, marginBottom: 12 }}>▸ CONFIDENTIAL · DATA ROOM</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Access via /pitch first.</div>
          <button onClick={() => navigate("/pitch")} style={{ padding: "10px 20px", borderRadius: 6, background: "#d4af37", color: "#0a1128", border: "1px solid #d4af37", fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", cursor: "pointer" }}>Go to /pitch →</button>
        </div>
      </div>
    );
  }

  const SECTIONS = [
    {
      tag: "01 · COMPANY",
      h: "Company overview",
      items: [
        { name: "Investor deck (v3.2)", status: "READY", note: "12 slides · /pitch/deck", href: "/pitch/deck" },
        { name: "1-page investor summary (PDF)", status: "READY", note: "Downloadable from /pitch", href: "/pitch" },
        { name: "Public roadmap", status: "READY", note: "/roadmap", href: "/roadmap" },
        { name: "Founder story + arc", status: "READY", note: "/story", href: "/story" },
        { name: "Team + hiring plan", status: "READY", note: "/pitch/team", href: "/pitch/team" },
        { name: "Why-now macro thesis", status: "READY", note: "/pitch/why-now", href: "/pitch/why-now" },
        { name: "Investor FAQ", status: "READY", note: "/pitch/faq", href: "/pitch/faq" },
      ],
    },
    {
      tag: "02 · TRACTION",
      h: "Live metrics + case studies",
      items: [
        { name: "Real-time metrics dashboard", status: "READY", note: "/live · pulled from prod Supabase", href: "/live" },
        { name: "3 composite case studies", status: "READY", note: "/case-studies", href: "/case-studies" },
        { name: "Product tour (Loom walkthrough)", status: "IN PREP", note: "Founder recording — target ship this week" },
        { name: "Customer testimonial videos", status: "ON REQUEST", note: "Introducing on 1:1 basis post-first-check" },
        { name: "Retention cohort analysis", status: "IN PREP", note: "Live cohort at 12 weeks — Q3 2026 report" },
      ],
    },
    {
      tag: "03 · FINANCIALS",
      h: "Financial model + unit economics",
      items: [
        { name: "Unit economics deep-dive", status: "READY", note: "/pitch/unit-economics · CAC/LTV/burn", href: "/pitch/unit-economics" },
        { name: "3-year P&L forecast (Google Sheets)", status: "ON REQUEST", note: "Shared via view-only link after intro call" },
        { name: "Cash flow projections", status: "ON REQUEST", note: "18-month use-of-funds waterfall" },
        { name: "Comparable exit multiples (real estate SaaS)", status: "ON REQUEST", note: "5-comp benchmark deck" },
        { name: "Current bank statements", status: "ON REQUEST", note: "Available under signed NDA" },
      ],
    },
    {
      tag: "04 · LEGAL + IP",
      h: "Corporate + intellectual property",
      items: [
        { name: "Corporate structure (BC Ltd.)", status: "READY", note: "Sole shareholder · clean cap table" },
        { name: "Cap table (fully-diluted, pre + post round)", status: "ON REQUEST", note: "SAFE + option pool modeling" },
        { name: "Articles + shareholder agreement", status: "ON REQUEST", note: "BC standard-form · counsel review complete" },
        { name: "IP assignment (founder → co)", status: "READY", note: "All product IP owned by BC Ltd." },
        { name: "Trademark applications (RizeAI wordmark)", status: "IN PREP", note: "CIPO filing pending Q3 2026" },
        { name: "Terms of Service + Privacy Policy", status: "READY", note: "/terms · /privacy" },
      ],
    },
    {
      tag: "05 · TECH + DATA",
      h: "Architecture + moat",
      items: [
        { name: "System architecture diagram", status: "IN PREP", note: "Vercel + Supabase + Anthropic — 1-page schematic" },
        { name: "Public API documentation", status: "READY", note: "/api-docs · v1 endpoints live" },
        { name: "Zoning code coverage matrix (7 cities)", status: "READY", note: "37 codes with dimensional specs — CSV on request" },
        { name: "CMHC rent anchor methodology", status: "IN PREP", note: "26 metros · quarterly refresh procedure" },
        { name: "Data provenance audit (source table)", status: "IN PREP", note: "Every dataset with source URL + license terms" },
        { name: "Security posture summary", status: "IN PREP", note: "RLS, Vercel firewall, secrets rotation policy" },
      ],
    },
    {
      tag: "06 · GTM + PIPELINE",
      h: "Go-to-market",
      items: [
        { name: "3-phase GTM plan (in deck)", status: "READY", note: "Slide 7 of /pitch/deck", href: "/pitch/deck" },
        { name: "Broker outreach funnel data", status: "IN PREP", note: "LinkedIn outreach cohort · Q3 2026" },
        { name: "Referral program mechanics", status: "READY", note: "/refer · 30% rev share + free-Pro-for-3", href: "/refer" },
        { name: "Competitive matrix", status: "READY", note: "Live on landing + expanded in FAQ" },
        { name: "Firm-level pipeline (redacted)", status: "ON REQUEST", note: "Named prospects shared after intro call" },
      ],
    },
    {
      tag: "07 · REFERENCES",
      h: "Customer + advisor references",
      items: [
        { name: "Customer references (paying users)", status: "ON REQUEST", note: "Available for term-sheet-stage conversations" },
        { name: "Advisor references (informal today)", status: "IN PREP", note: "Formal advisor agreements executing post-close" },
        { name: "Prior work / employer references", status: "ON REQUEST", note: "Founder background verification" },
        { name: "Anthropic / Vercel platform status", status: "READY", note: "Both partners of record — bill-paying customers" },
      ],
    },
  ];

  return (
    <div className="dr-wrap">
      <style>{CSS}</style>

      <div className="dr-topbar">
        <a href="/pitch" className="dr-logo">Real <span>Deal</span></a>
        <span className="dr-tag">▸ DATA ROOM · CONFIDENTIAL</span>
        <button className="dr-topbar-btn" onClick={() => navigate("/pitch")}>← /pitch</button>
      </div>

      <div className="dr-body">
        <div className="dr-header">
          <div className="dr-eyebrow">
            <span className="dr-eyebrow-dot" />
            INVESTOR DATA ROOM · INDEX
          </div>
          <h1 className="dr-h1">Everything you'll ask for. <span>Organized.</span></h1>
          <p className="dr-sub">
            RizeAI runs a lean data room. Every artifact is tagged{" "}
            <b className="dr-b-ready">READY</b> (live now), <b className="dr-b-prep">IN PREP</b> (shipping this month), or{" "}
            <b className="dr-b-req">ON REQUEST</b> (after intro call). Nothing hidden — just staged.
          </p>
        </div>

        {/* LEGEND */}
        <div className="dr-legend">
          <div className="dr-legend-cell">
            <span className="dr-badge dr-badge-ready">READY</span>
            <span>Live at the linked URL. Access with pitch code.</span>
          </div>
          <div className="dr-legend-cell">
            <span className="dr-badge dr-badge-prep">IN PREP</span>
            <span>Being drafted or refreshed. Available within 30 days.</span>
          </div>
          <div className="dr-legend-cell">
            <span className="dr-badge dr-badge-req">ON REQUEST</span>
            <span>Shared via 1:1 email under mutual NDA or after intro call.</span>
          </div>
        </div>

        {/* SECTIONS */}
        {SECTIONS.map((sec, i) => (
          <section key={i} className="dr-section">
            <div className="dr-section-tag">▸ {sec.tag}</div>
            <h2 className="dr-h2">{sec.h}</h2>
            <div className="dr-items">
              {sec.items.map((it, j) => (
                <div key={j} className="dr-item">
                  <div className="dr-item-body">
                    <div className="dr-item-name">{it.name}</div>
                    <div className="dr-item-note">{it.note}</div>
                  </div>
                  <div className="dr-item-actions">
                    <span className={
                      "dr-badge " +
                      (it.status === "READY" ? "dr-badge-ready" : it.status === "IN PREP" ? "dr-badge-prep" : "dr-badge-req")
                    }>{it.status}</span>
                    {it.href && (
                      <button className="dr-goto" onClick={() => navigate(it.href)}>Open →</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* REQUEST CTA */}
        <div className="dr-request-block">
          <div className="dr-request-h">Requesting an ON REQUEST artifact?</div>
          <div className="dr-request-p">Reply to the pitch intro email or reach out directly. Response within 24h for term-sheet-stage conversations.</div>
          <div className="dr-request-cta-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="dr-cta">
              {BOOKING_LABEL}
            </a>
            <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20-%20Data%20Room%20Request" className="dr-cta ghost">
              Email instead
            </a>
            <button className="dr-cta ghost" onClick={() => navigate("/pitch")}>Back to /pitch</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .dr-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .dr-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 14px; padding: 14px 24px; background: rgba(10,17,40,0.96); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); }
  .dr-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .dr-logo span { color: var(--brass); }
  .dr-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .dr-topbar-btn { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }

  .dr-body { max-width: 940px; margin: 0 auto; padding: 44px 24px 80px; }
  .dr-header { text-align: center; margin-bottom: 34px; padding-bottom: 28px; border-bottom: 1px solid var(--borderf); }
  .dr-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .dr-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .dr-h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: var(--text); letter-spacing: -1.4px; line-height: 1.1; margin: 0 0 12px; }
  .dr-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .dr-sub { font-size: 15px; color: var(--sub); line-height: 1.65; max-width: 640px; margin: 0 auto; }
  .dr-b-ready { color: #16a34a; font-weight: 800; }
  .dr-b-prep { color: #eab308; font-weight: 800; }
  .dr-b-req { color: var(--royal); font-weight: 800; }

  .dr-legend { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 34px; }
  @media(max-width:720px){ .dr-legend { grid-template-columns: 1fr; } }
  .dr-legend-cell { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; font-size: 12px; color: var(--sub); line-height: 1.4; }

  .dr-section { margin-bottom: 34px; }
  .dr-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 6px; text-transform: uppercase; }
  .dr-h2 { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; line-height: 1.2; margin: 0 0 14px; }
  .dr-items { display: flex; flex-direction: column; gap: 8px; }
  .dr-item { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  @media(max-width:640px){ .dr-item { flex-direction: column; align-items: stretch; } }
  .dr-item-body { flex: 1; }
  .dr-item-name { font-size: 14px; font-weight: 700; color: var(--text); letter-spacing: -0.2px; margin-bottom: 3px; }
  .dr-item-note { font-family: 'Geist Mono', monospace; font-size: 11.5px; color: var(--sub); letter-spacing: 0.2px; }
  .dr-item-actions { display: flex; align-items: center; gap: 10px; }
  .dr-badge { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; }
  .dr-badge-ready { background: rgba(22,163,74,0.10); color: #16a34a; border: 1px solid rgba(22,163,74,0.28); }
  .dr-badge-prep { background: rgba(234,179,8,0.10); color: #eab308; border: 1px solid rgba(234,179,8,0.28); }
  .dr-badge-req { background: rgba(33,85,205,0.10); color: var(--royal); border: 1px solid rgba(33,85,205,0.28); }
  .dr-goto { padding: 6px 10px; border-radius: 5px; background: transparent; color: var(--brass-2); border: 1px solid rgba(212,175,55,0.35); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }
  .dr-goto:hover { background: rgba(212,175,55,0.08); color: var(--brass); }

  .dr-request-block { padding: 28px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; margin-top: 32px; }
  .dr-request-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .dr-request-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 18px; max-width: 460px; margin-left: auto; margin-right: auto; }
  .dr-request-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .dr-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .dr-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .dr-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
