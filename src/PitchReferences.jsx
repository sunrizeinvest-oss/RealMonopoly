import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import { bookingHref, BOOKING_LABEL } from "./lib/booking";

/**
 * PitchReferences — /pitch/references scaffolded reference list.
 *
 * Every VC at term-sheet stage asks for references. This page shows the
 * shape of what's available (customer, advisor, prior work, provider) even
 * when not all slots are filled yet. Real contact info is not exposed —
 * you introduce via email once the VC hits term-sheet stage.
 *
 * Password-gated same as /pitch.
 */
const PITCH_CODE = "rzai-insider-2026";

export default function PitchReferences() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);

  useDocMeta({
    title: "RizeAI · References (Confidential)",
    description: "Customer, advisor, and third-party references for RizeAI. Available at term-sheet stage.",
  });

  useEffect(() => {
    const p = params.get("p") || "";
    let stored = "";
    try { stored = sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch {}
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) track("pitch_references_view");
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    }
  }, [params, unlocked]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1128", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#d4af37", letterSpacing: 1.4, marginBottom: 12 }}>▸ CONFIDENTIAL · REFERENCES</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Access via /pitch first.</div>
          <button onClick={() => navigate("/pitch")} style={{ padding: "10px 20px", borderRadius: 6, background: "#d4af37", color: "#0a1128", border: "1px solid #d4af37", fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", cursor: "pointer" }}>Go to /pitch →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rf-wrap">
      <style>{CSS}</style>

      <div className="rf-topbar">
        <a href="/pitch" className="rf-logo">Real <span>Deal</span></a>
        <span className="rf-tag">▸ REFERENCES · CONFIDENTIAL</span>
        <button className="rf-topbar-btn" onClick={() => navigate("/pitch")}>← /pitch</button>
      </div>

      <div className="rf-body">
        {/* HEADER */}
        <div className="rf-header">
          <div className="rf-eyebrow">
            <span className="rf-eyebrow-dot" />
            REFERENCES · TERM-SHEET STAGE
          </div>
          <h1 className="rf-h1">Who to call. <span>What they'll say.</span></h1>
          <p className="rf-sub">
            All references are furnished on 1:1 request. Direct contact goes via warm intro from the founder — you get name, firm, and role here so you know what to expect. Introductions execute within 24 hours of request.
          </p>
        </div>

        {/* CUSTOMER REFERENCES */}
        <section className="rf-section">
          <div className="rf-section-tag">▸ 01 · CUSTOMER REFERENCES</div>
          <p className="rf-p">
            Furnished at term-sheet stage. Currently referring composite case studies while paying-customer names are being locked in — first real customer reference lands in the next update cycle.
          </p>
          <div className="rf-slots">
            <RefSlot
              role="Calgary R-CG Broker"
              context="Case study: fourplex conversion · $602K acquisition"
              status="PIPELINE"
              note="Real broker · onboarded via LinkedIn outreach · ~14 days from paying → willing reference"
              intro="Warm intro on request after signed term sheet"
            />
            <RefSlot
              role="Toronto RD Agent"
              context="Case study: RD-lot multiplex · $1.4M asking"
              status="PIPELINE"
              note="Real agent · using product weekly · reference-ready pending case-study finalization"
              intro="Warm intro on request after signed term sheet"
            />
            <RefSlot
              role="Edmonton Multiplex Broker"
              context="Case study: 8-plex build · RS lot · $685K"
              status="OUTREACH"
              note="Cold-outreach in progress · target reference by end of raise"
              intro="Warm intro conditional on signed relationship"
            />
          </div>
        </section>

        {/* ADVISOR REFERENCES */}
        <section className="rf-section">
          <div className="rf-section-tag">▸ 02 · ADVISOR REFERENCES</div>
          <p className="rf-p">
            Informal advisors today; formal advisor agreements execute post-close. These references speak to founder judgment + product direction, not product usage.
          </p>
          <div className="rf-slots">
            <RefSlot
              role="Real estate brokerage principal"
              context="Provides broker network + product feedback"
              status="COMMITTED"
              note="Verbal advisor commitment · formal agreement post-close"
              intro="Direct intro available on request"
            />
            <RefSlot
              role="Prior founder · PropTech exit"
              context="Raise strategy + hiring guidance"
              status="COMMITTED"
              note="Verbal advisor commitment · reference on founder's operating pattern"
              intro="Direct intro available on request"
            />
            <RefSlot
              role="Data engineering senior lead"
              context="Architecture guidance + technical hiring intros"
              status="ONGOING"
              note="Regular informal feedback · reference on technical judgment"
              intro="Available on request"
            />
          </div>
        </section>

        {/* PRIOR WORK / EMPLOYER */}
        <section className="rf-section">
          <div className="rf-section-tag">▸ 03 · FOUNDER BACKGROUND</div>
          <p className="rf-p">
            References who worked with the founder pre-RizeAI. Speak to work ethic, technical depth, judgment under uncertainty.
          </p>
          <div className="rf-slots">
            <RefSlot
              role="Prior engineering peer"
              context="Worked directly with founder · shipped multiple products together"
              status="AVAILABLE"
              note="Name + firm available at term-sheet stage under signed NDA"
              intro="Contact info available on request"
            />
            <RefSlot
              role="Prior technical manager"
              context="Reference on execution + delivery under real deadlines"
              status="AVAILABLE"
              note="Name + firm available at term-sheet stage under signed NDA"
              intro="Contact info available on request"
            />
          </div>
        </section>

        {/* THIRD-PARTY PROVIDERS */}
        <section className="rf-section">
          <div className="rf-section-tag">▸ 04 · THIRD-PARTY PROVIDERS</div>
          <p className="rf-p">
            RizeAI is a bill-paying customer of record at each of these providers. Their account teams confirm platform status + billing history if a VC does verification.
          </p>
          <div className="rf-providers-grid">
            <ProviderCard name="Anthropic" role="AI API · our AI" status="Active · 2024→" />
            <ProviderCard name="Vercel" role="Compute + edge + Analytics" status="Active · 2024→" />
            <ProviderCard name="Supabase" role="Postgres + Auth + Storage" status="Active · 2024→" />
            <ProviderCard name="Resend" role="Transactional email" status="Active · 2025→" />
            <ProviderCard name="Stripe" role="Payments infrastructure" status="Active · 2025→" />
            <ProviderCard name="CMHC" role="Rent anchor data · quarterly refresh" status="Public data · attributed" />
          </div>
        </section>

        {/* HOW TO REQUEST */}
        <section className="rf-honest">
          <div className="rf-honest-tag">▸ HOW REFERENCES ACTUALLY WORK</div>
          <div className="rf-honest-body">
            <p className="rf-p">
              <b>At intro-call stage:</b> we don't hand out references. Founders reserve them for actual pipeline moves, not tire-kicking. Read the deck, ask questions, look at /pitch/data-room.
            </p>
            <p className="rf-p">
              <b>At deep-dive stage:</b> we furnish provider references (Anthropic, Vercel, Supabase) so you can verify platform stability without needing a warm intro. These calls are pre-cleared.
            </p>
            <p className="rf-p">
              <b>At term-sheet stage:</b> we open the whole list. Customer references, advisor references, prior-work references — all named, warm-intro'd, and on a scheduled call within 5 business days. This is where reference calls happen.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="rf-cta-block">
          <div className="rf-cta-h">Ready to hit term-sheet stage?</div>
          <div className="rf-cta-p">Book an intro call and we'll fast-track diligence including reference introductions.</div>
          <div className="rf-cta-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="rf-cta">{BOOKING_LABEL}</a>
            <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20-%20Reference%20Request" className="rf-cta ghost">
              Request specific reference
            </a>
            <button className="rf-cta ghost" onClick={() => navigate("/pitch/data-room")}>Data room</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RefSlot({ role, context, status, note, intro }) {
  const map = {
    COMMITTED: { bg: "rgba(22,163,74,0.10)", color: "#16a34a", border: "rgba(22,163,74,0.28)" },
    AVAILABLE: { bg: "rgba(22,163,74,0.10)", color: "#16a34a", border: "rgba(22,163,74,0.28)" },
    PIPELINE:  { bg: "rgba(234,179,8,0.10)", color: "#eab308", border: "rgba(234,179,8,0.28)" },
    OUTREACH:  { bg: "rgba(234,179,8,0.10)", color: "#eab308", border: "rgba(234,179,8,0.28)" },
    ONGOING:   { bg: "rgba(33,85,205,0.10)", color: "var(--royal)", border: "rgba(33,85,205,0.28)" },
  };
  const s = map[status] || map.PIPELINE;
  return (
    <div className="rf-slot">
      <div className="rf-slot-head">
        <div>
          <div className="rf-slot-role">{role}</div>
          <div className="rf-slot-context">{context}</div>
        </div>
        <span className="rf-badge" style={{ background: s.bg, color: s.color, borderColor: s.border }}>{status}</span>
      </div>
      <div className="rf-slot-note">{note}</div>
      <div className="rf-slot-intro">▸ {intro}</div>
    </div>
  );
}

function ProviderCard({ name, role, status }) {
  return (
    <div className="rf-provider">
      <div className="rf-provider-name">{name}</div>
      <div className="rf-provider-role">{role}</div>
      <div className="rf-provider-status">{status}</div>
    </div>
  );
}

const CSS = `
  .rf-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .rf-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 14px; padding: 14px 24px; background: rgba(10,17,40,0.96); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); }
  .rf-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .rf-logo span { color: var(--brass); }
  .rf-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .rf-topbar-btn { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }

  .rf-body { max-width: 940px; margin: 0 auto; padding: 44px 24px 80px; }
  .rf-header { text-align: center; margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px solid var(--borderf); }
  .rf-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .rf-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .rf-h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: var(--text); letter-spacing: -1.4px; line-height: 1.1; margin: 0 0 12px; }
  .rf-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .rf-sub { font-size: 15px; color: var(--sub); line-height: 1.65; max-width: 640px; margin: 0 auto; }

  .rf-section { margin-bottom: 34px; padding-bottom: 28px; border-bottom: 1px solid var(--borderf); }
  .rf-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 10px; text-transform: uppercase; }
  .rf-p { font-size: 13.5px; color: var(--sub); line-height: 1.65; margin: 0 0 14px; }
  .rf-p b { color: var(--text); font-weight: 800; }

  .rf-slots { display: flex; flex-direction: column; gap: 10px; }
  .rf-slot { padding: 16px 18px; background: var(--card); border: 1px solid var(--borderf); border-radius: 8px; }
  .rf-slot-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed var(--borderf); flex-wrap: wrap; }
  .rf-slot-role { font-size: 14.5px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 3px; }
  .rf-slot-context { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: var(--brass-2); letter-spacing: 0.3px; }
  .rf-slot-note { font-size: 12.5px; color: var(--sub); line-height: 1.6; margin-bottom: 8px; }
  .rf-slot-intro { font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; color: var(--brass-2); letter-spacing: 0.4px; }
  .rf-badge { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; white-space: nowrap; border: 1px solid; }

  .rf-providers-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  @media(max-width:720px){ .rf-providers-grid { grid-template-columns: 1fr 1fr; } }
  @media(max-width:480px){ .rf-providers-grid { grid-template-columns: 1fr; } }
  .rf-provider { padding: 12px 14px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--royal); border-radius: 6px; }
  .rf-provider-name { font-size: 14px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 3px; }
  .rf-provider-role { font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--sub); letter-spacing: 0.3px; margin-bottom: 4px; }
  .rf-provider-status { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--royal); letter-spacing: 0.3px; }

  .rf-honest { padding: 22px 24px; background: rgba(33,85,205,0.04); border: 1px solid rgba(33,85,205,0.20); border-left: 3px solid var(--royal); border-radius: 8px; margin-top: 20px; }
  .rf-honest-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: var(--royal); text-transform: uppercase; margin-bottom: 10px; }
  .rf-honest-body .rf-p { color: var(--text); }

  .rf-cta-block { padding: 28px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; margin-top: 32px; }
  .rf-cta-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .rf-cta-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 18px; max-width: 480px; margin-left: auto; margin-right: auto; }
  .rf-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .rf-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .rf-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .rf-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
