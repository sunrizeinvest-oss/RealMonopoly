import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import { bookingHref, BOOKING_LABEL } from "./lib/booking";

/**
 * PitchTeam — /pitch/team investor-facing team page.
 *
 * Password-gated same as /pitch. Shows current team (founder), advisors
 * (placeholder slots), and post-raise hires. VCs pattern-match on founders
 * who have identified critical hires *before* the raise closes.
 *
 * Every card has a TODO tag when info is missing so it's clear what's
 * scaffolding vs real.
 */
const PITCH_CODE = "rzai-insider-2026";

export default function PitchTeam() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);

  useDocMeta({
    title: "RizeAI · Team (Confidential)",
    description: "RizeAI team, advisors, and post-raise hiring plan. Confidential pre-seed materials.",
  });

  useEffect(() => {
    const p = params.get("p") || "";
    let stored = "";
    try { stored = sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch {}
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) track("pitch_team_view");
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    }
  }, [params, unlocked]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1128", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#d4af37", letterSpacing: 1.4, marginBottom: 12 }}>
            ▸ CONFIDENTIAL · TEAM PAGE
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Access via /pitch first.</div>
          <button
            onClick={() => navigate("/pitch")}
            style={{ padding: "10px 20px", borderRadius: 6, background: "#d4af37", color: "#0a1128", border: "1px solid #d4af37", fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", cursor: "pointer" }}
          >
            Go to /pitch →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pmt-wrap">
      <style>{CSS}</style>

      <div className="pmt-topbar">
        <a href="/pitch" className="pmt-logo">Real <span>Deal</span></a>
        <span className="pmt-tag">▸ TEAM · CONFIDENTIAL</span>
        <button className="pmt-topbar-btn" onClick={() => navigate("/pitch")}>← /pitch</button>
      </div>

      <div className="pmt-body">
        <div className="pmt-header">
          <div className="pmt-eyebrow">
            <span className="pmt-eyebrow-dot" />
            RIZEAI · TEAM
          </div>
          <h1 className="pmt-h1">Currently solo. <span>Hiring next.</span></h1>
          <p className="pmt-sub">
            Founder-led today. This page shows current team, active advisors, and the two hires
            that ship on Day 1 post-raise. Investor honesty: RizeAI is a solo build shipping into
            product-market fit search.
          </p>
        </div>

        {/* CURRENT — Founder */}
        <section className="pmt-section">
          <div className="pmt-section-tag">▸ CURRENT</div>
          <h2 className="pmt-h2">Founder</h2>
          <div className="pmt-founder-card">
            <div className="pmt-founder-avatar"><img src="/founder-sunni.jpg" alt="Sunni Yaremchuk" /></div>
            <div className="pmt-founder-body">
              <div className="pmt-founder-name">Sunni Yaremchuk</div>
              <div className="pmt-founder-role">Founder + CEO · Also Founder at Rize Developments (Edmonton multifamily)</div>
              <div className="pmt-founder-bio">
                Active Edmonton multifamily developer with 4 infill projects underway (Rize Developments) — 28 doors across Jasper Park, Allendale, and Mayfield. I wanted to save time on my own deals and be more efficient. There was no solution that fit. So I built one. RizeAI is the tool I use myself every week for my own underwriting — same infrastructure 65,000 Canadian brokers and developers deserve. Operator first, founder second — full details at <a onClick={() => navigate("/founder")} style={{cursor:"pointer",color:"var(--brass-2)"}}>realdealestate.app/founder</a>.
              </div>
              <div className="pmt-founder-links">
                <a href="https://www.linkedin.com/in/sunni-yaremchuk-9b1484222/" target="_blank" rel="noreferrer" className="pmt-link">LinkedIn</a>
                <a href="https://rizedevelopments.com" target="_blank" rel="noreferrer" className="pmt-link">Rize Developments</a>
                <a href="mailto:sunni@rizedevelopments.com" className="pmt-link">Email</a>
                <a href="tel:+15878440420" className="pmt-link">(587) 844-0420</a>
              </div>
            </div>
          </div>
        </section>

        {/* ADVISORS */}
        <section className="pmt-section">
          <div className="pmt-section-tag">▸ ADVISORS</div>
          <h2 className="pmt-h2">Advisory circle.</h2>
          <p className="pmt-p">
            Informal advisors provide domain expertise + broker introductions. Formal advisor
            agreements execute post-raise as part of the seed structure.
          </p>
          <div className="pmt-advisor-grid">
            <AdvisorCard
              slot="Real Estate Brokerage"
              hint="Broker-firm principal or senior broker with 10+ years in Canadian residential. Provides broker outreach warm intros + product feedback."
            />
            <AdvisorCard
              slot="Data / Technical"
              hint="Prior founder or engineering lead at a PropTech/FinTech scale-up. Provides architecture guidance + hiring intros for engineering hires."
            />
            <AdvisorCard
              slot="Capital / Financial"
              hint="Investor or family office partner active in Canadian residential. Provides GTM to institutional buyer side + Scale-tier lead intros."
            />
            <AdvisorCard
              slot="Prior Startup Exit"
              hint="Founder who has exited a similar SaaS company at $10M+ range. Provides raise strategy + fundraise-timing guidance."
            />
          </div>
        </section>

        {/* POST-RAISE HIRES */}
        <section className="pmt-section">
          <div className="pmt-section-tag">▸ POST-RAISE · MONTH 1-3</div>
          <h2 className="pmt-h2">Day-1 hires when the round closes.</h2>
          <p className="pmt-p">
            Two hires ship immediately. Both are pre-identified — reachable within 30 days of round close.
          </p>
          <div className="pmt-hire-grid">
            <HireCard
              role="Senior Full-Stack Engineer"
              salary="$140–$160K CAD"
              focus="US city adapters + MLS integrations + backend scaling"
              impact="Frees founder from 60% of engineering time → founder can run GTM full-time"
              status="Candidate pool identified"
            />
            <HireCard
              role="GTM Lead / Broker Sales"
              salary="$95–$110K + variable"
              focus="Canadian brokerage industry credibility · direct outreach · firm-level sales"
              impact="Scales customer acquisition from 20 DMs/day (founder) to 100+ contacts/week"
              status="Sourcing via LinkedIn"
            />
          </div>
        </section>

        {/* MONTH 6-12 */}
        <section className="pmt-section">
          <div className="pmt-section-tag">▸ POST-RAISE · MONTH 6-12</div>
          <h2 className="pmt-h2">Second wave once metrics prove out.</h2>
          <div className="pmt-hire-grid">
            <HireCard
              role="Second Engineer"
              salary="$120–$140K CAD"
              focus="US expansion focus · BuildFax integration · advanced portfolio analytics"
              impact="Ships the Year-2 US city rollout on schedule"
              status="Hire triggers at $30K MRR"
            />
            <HireCard
              role="Customer Success Lead"
              salary="$80–$95K + variable"
              focus="Onboarding · retention · upsell to Scale tier · case study production"
              impact="Reduces churn to <3%/mo · drives Pro→Scale conversion"
              status="Hire triggers at $30K MRR"
            />
          </div>
        </section>

        {/* CTA */}
        <div className="pmt-cta-block">
          <div className="pmt-cta-h">Want to advise or invest?</div>
          <div className="pmt-cta-p">
            Reach out to explore an advisor role, angel check, or lead-check spot in the round.
          </div>
          <div className="pmt-cta-row">
            <a href={bookingHref()} target="_blank" rel="noreferrer" className="pmt-cta">
              {BOOKING_LABEL}
            </a>
            <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20-%20Advisor%20Interest" className="pmt-cta ghost">
              Email instead
            </a>
            <button className="pmt-cta ghost" onClick={() => navigate("/pitch/deck")}>Slide deck</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdvisorCard({ slot, hint }) {
  return (
    <div className="pmt-advisor">
      <div className="pmt-advisor-slot-badge">▸ ADVISOR SLOT</div>
      <div className="pmt-advisor-slot">{slot}</div>
      <div className="pmt-advisor-hint">{hint}</div>
      <div className="pmt-advisor-status">Open · reach out to nominate</div>
    </div>
  );
}

function HireCard({ role, salary, focus, impact, status }) {
  return (
    <div className="pmt-hire">
      <div className="pmt-hire-role">{role}</div>
      <div className="pmt-hire-salary">{salary}</div>
      <div className="pmt-hire-fields">
        <div className="pmt-hire-field">
          <div className="pmt-hire-lbl">Focus</div>
          <div className="pmt-hire-val">{focus}</div>
        </div>
        <div className="pmt-hire-field">
          <div className="pmt-hire-lbl">Impact</div>
          <div className="pmt-hire-val">{impact}</div>
        </div>
      </div>
      <div className="pmt-hire-status">▸ {status}</div>
    </div>
  );
}

const CSS = `
  .pmt-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .pmt-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 14px; padding: 14px 24px; background: rgba(10,17,40,0.96); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); }
  .pmt-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .pmt-logo span { color: var(--brass); }
  .pmt-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .pmt-topbar-btn { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }

  .pmt-body { max-width: 1000px; margin: 0 auto; padding: 40px 24px 80px; }

  .pmt-header { margin-bottom: 44px; text-align: center; }
  .pmt-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 12px; }
  .pmt-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .pmt-h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: var(--text); letter-spacing: -1.4px; line-height: 1.1; margin: 0 0 14px; }
  .pmt-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .pmt-sub { font-size: 15px; color: var(--sub); line-height: 1.65; margin: 0 auto; max-width: 620px; }

  .pmt-section { margin-bottom: 44px; padding-bottom: 32px; border-bottom: 1px solid var(--borderf); }
  .pmt-section:last-of-type { border-bottom: none; }
  .pmt-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 10px; text-transform: uppercase; }
  .pmt-h2 { font-size: clamp(22px, 3vw, 28px); font-weight: 800; color: var(--text); letter-spacing: -0.8px; line-height: 1.2; margin: 0 0 12px; }
  .pmt-p { font-size: 14.5px; color: var(--sub); line-height: 1.6; margin: 0 0 20px; max-width: 720px; }

  .pmt-founder-card { display: grid; grid-template-columns: 100px 1fr; gap: 24px; padding: 26px; background: var(--card); border: 1px solid var(--borderf); border-left: 4px solid var(--brass); border-radius: 12px; }
  @media (max-width: 640px) { .pmt-founder-card { grid-template-columns: 1fr; text-align: center; } }
  .pmt-founder-avatar { width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, var(--brass), var(--brass-2)); color: #0a1128; display: flex; align-items: center; justify-content: center; font-family: 'Geist Mono', monospace; font-size: 44px; font-weight: 800; margin: 0 auto; overflow: hidden; border: 3px solid var(--brass); }
  .pmt-founder-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .pmt-founder-name { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 4px; }
  .pmt-founder-role { font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 700; color: var(--brass-2); letter-spacing: 0.5px; margin-bottom: 14px; }
  .pmt-founder-bio { padding: 14px; background: rgba(212,175,55,0.05); border-left: 3px solid var(--brass); border-radius: 4px; font-size: 14px; color: var(--sub); line-height: 1.65; margin-bottom: 14px; font-style: italic; }
  .pmt-founder-bio code { font-family: 'Geist Mono', monospace; background: rgba(15,23,42,0.06); padding: 2px 5px; border-radius: 3px; font-size: 12px; color: var(--brass-2); font-style: normal; }
  .pmt-founder-links { display: flex; gap: 12px; flex-wrap: wrap; }
  .pmt-link { padding: 6px 12px; border-radius: 5px; background: rgba(15,23,42,0.04); color: var(--text); text-decoration: none; font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 700; letter-spacing: 0.3px; }
  .pmt-link:hover { background: rgba(212,175,55,0.10); color: var(--brass-2); }

  .pmt-advisor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 640px) { .pmt-advisor-grid { grid-template-columns: 1fr; } }
  .pmt-advisor { padding: 18px 20px; background: var(--card); border: 1px dashed rgba(212,175,55,0.35); border-radius: 10px; }
  .pmt-advisor-slot-badge { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.2px; color: var(--brass-2); margin-bottom: 6px; }
  .pmt-advisor-slot { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 8px; letter-spacing: -0.3px; }
  .pmt-advisor-hint { font-size: 12.5px; color: var(--sub); line-height: 1.55; margin-bottom: 10px; }
  .pmt-advisor-status { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--brass-2); letter-spacing: 0.4px; }

  .pmt-hire-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 640px) { .pmt-hire-grid { grid-template-columns: 1fr; } }
  .pmt-hire { padding: 20px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--royal); border-radius: 10px; }
  .pmt-hire-role { font-size: 16px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; margin-bottom: 4px; }
  .pmt-hire-salary { font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 700; color: var(--royal); letter-spacing: 0.3px; margin-bottom: 12px; }
  .pmt-hire-fields { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px dashed var(--borderf); }
  .pmt-hire-lbl { font-family: 'Geist Mono', monospace; font-size: 9.5px; font-weight: 800; color: var(--sub); letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 3px; }
  .pmt-hire-val { font-size: 12.5px; color: var(--text); line-height: 1.5; }
  .pmt-hire-status { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; color: var(--brass-2); letter-spacing: 0.4px; }

  .pmt-cta-block { padding: 32px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; }
  .pmt-cta-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .pmt-cta-p { font-size: 14px; color: var(--sub); margin-bottom: 20px; max-width: 480px; margin-left: auto; margin-right: auto; }
  .pmt-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .pmt-cta { padding: 10px 18px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 11.5px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .pmt-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .pmt-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
