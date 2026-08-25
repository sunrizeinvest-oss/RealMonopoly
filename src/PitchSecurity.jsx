import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";

/**
 * PitchSecurity — /pitch/security investor-facing security + compliance posture.
 *
 * VCs at seed care mostly about: is the data protected, is the founder aware
 * of what they don't know, and what's the SOC 2 / GDPR posture. This page
 * answers all three honestly — including "not SOC 2 yet, here's the plan."
 */
const PITCH_CODE = "rzai-insider-2026";

export default function PitchSecurity() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unlocked, setUnlocked] = useState(false);

  useDocMeta({
    title: "RizeAI · Security (Confidential)",
    description: "Security posture, data protection, compliance readiness for RizeAI.",
  });

  useEffect(() => {
    const p = params.get("p") || "";
    let stored = "";
    try { stored = sessionStorage.getItem("rde_pitch_unlocked") || ""; } catch {}
    if (p === PITCH_CODE || stored === PITCH_CODE) {
      if (!unlocked) track("pitch_security_view");
      setUnlocked(true);
      try { sessionStorage.setItem("rde_pitch_unlocked", PITCH_CODE); } catch {}
    }
  }, [params, unlocked]);

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1128", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#d4af37", letterSpacing: 1.4, marginBottom: 12 }}>▸ CONFIDENTIAL · SECURITY</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Access via /pitch first.</div>
          <button onClick={() => navigate("/pitch")} style={{ padding: "10px 20px", borderRadius: 6, background: "#d4af37", color: "#0a1128", border: "1px solid #d4af37", fontFamily: "'Geist Mono', monospace", fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", cursor: "pointer" }}>Go to /pitch →</button>
        </div>
      </div>
    );
  }

  const CONTROLS = [
    {
      cat: "Data at rest",
      items: [
        { name: "PostgreSQL encryption (AES-256)", status: "LIVE", note: "Managed by Supabase infrastructure · not user-managed keys" },
        { name: "Row Level Security (RLS) on every table", status: "LIVE", note: "Every user table has RLS enforcing auth.uid() ownership checks — verified in 011 + 012 migrations" },
        { name: "Encrypted backups (7-day PITR)", status: "LIVE", note: "Supabase Pro-tier point-in-time recovery" },
        { name: "Secrets stored in Vercel env vars only", status: "LIVE", note: "Never in code · rotated on team-membership change" },
      ],
    },
    {
      cat: "Data in transit",
      items: [
        { name: "HTTPS everywhere (Vercel edge)", status: "LIVE", note: "TLS 1.3 · HSTS · auto-renewing certs" },
        { name: "Authenticated API calls (JWT bearer)", status: "LIVE", note: "Supabase-issued JWTs · 60-min lifetime · refresh token flow" },
        { name: "CORS locked to known origins", status: "LIVE", note: "Vercel functions reject cross-origin browser calls except from realdealestate.app + localhost" },
        { name: "Public API rate limiting", status: "LIVE", note: "Per-key quota enforcement in ai-chat.js v1 handlers" },
      ],
    },
    {
      cat: "Authentication",
      items: [
        { name: "Supabase Auth (email + Google OAuth)", status: "LIVE", note: "Email verification enforced · magic-link fallback" },
        { name: "Password strength enforcement", status: "LIVE", note: "12-char minimum · Supabase default policy" },
        { name: "Admin allowlist (ADMIN_EMAILS env)", status: "LIVE", note: "/admin gated at server level · JWT email match" },
        { name: "MFA / TOTP for admin", status: "PLANNED", note: "Enable post-first-hire — currently sole-admin doesn't need it" },
      ],
    },
    {
      cat: "Data collection",
      items: [
        { name: "Minimal PII collection", status: "LIVE", note: "Email + optional name only · no SSN/SIN/financial IDs stored" },
        { name: "Deal data ownership", status: "LIVE", note: "Users own their saved deals · RLS enforces read/write ownership" },
        { name: "Property addresses (public data)", status: "LIVE", note: "MLS-derived · not PII · aggregated for zoning/market queries" },
        { name: "Analytics: Vercel + our own tracker", status: "LIVE", note: "Client-side event tracking · no session recording · no third-party tracking pixels" },
      ],
    },
    {
      cat: "Third parties",
      items: [
        { name: "Anthropic (AI API)", status: "LIVE", note: "SOC 2 Type II · GDPR + CCPA compliant · zero data retention on API calls per DPA" },
        { name: "Supabase (Postgres + Auth)", status: "LIVE", note: "SOC 2 Type II · HIPAA optional · US region: us-east-1" },
        { name: "Vercel (compute + edge)", status: "LIVE", note: "SOC 2 Type II · ISO 27001" },
        { name: "Resend (transactional email)", status: "LIVE", note: "SOC 2 Type II · used for verification + alerts only" },
        { name: "Stripe (payments)", status: "LIVE", note: "PCI DSS Level 1 · we never touch card data (Stripe Checkout redirect)" },
      ],
    },
    {
      cat: "Incident response",
      items: [
        { name: "24h founder response window", status: "LIVE", note: "Founder is on-call · pageable via sunni@rizedevelopments.com" },
        { name: "Rollback plan (Vercel Preview Deployments)", status: "LIVE", note: "Every deploy has instant rollback via Vercel dashboard" },
        { name: "Error monitoring (custom + Vercel logs)", status: "LIVE", note: "Client-side JS errors logged to Supabase · surfaced on /admin" },
        { name: "Formal incident playbook + IR partner", status: "PLANNED", note: "Post-Series-A · defensible incident response engagement" },
      ],
    },
    {
      cat: "Compliance",
      items: [
        { name: "Privacy Policy + Terms of Service", status: "LIVE", note: "/privacy · /terms · reviewed by counsel" },
        { name: "PIPEDA (Canada) compliant", status: "LIVE", note: "Data collection + consent flows match federal privacy legislation" },
        { name: "GDPR compliance", status: "PARTIAL", note: "Data deletion + export flows planned · manual honor for now" },
        { name: "SOC 2 Type II", status: "PLANNED", note: "Post-first-enterprise-customer · target Year 2 · Vanta partnership" },
        { name: "HIPAA / PHI", status: "N/A", note: "We do not touch health information — deliberately out of scope" },
      ],
    },
  ];

  return (
    <div className="ps-wrap">
      <style>{CSS}</style>

      <div className="ps-topbar">
        <a href="/pitch" className="ps-logo">Real <span>Deal</span></a>
        <span className="ps-tag">▸ SECURITY · CONFIDENTIAL</span>
        <button className="ps-topbar-btn" onClick={() => navigate("/pitch")}>← /pitch</button>
      </div>

      <div className="ps-body">
        {/* HEADER */}
        <div className="ps-header">
          <div className="ps-eyebrow">
            <span className="ps-eyebrow-dot" />
            SECURITY POSTURE
          </div>
          <h1 className="ps-h1">Security we <span>actually built.</span></h1>
          <p className="ps-sub">
            Everything below is either live now, planned with a specific trigger event, or explicitly out of scope. No SOC 2 sticker with an empty room behind it.
          </p>
        </div>

        {/* HEADLINE */}
        <div className="ps-headline">
          <div className="ps-headline-cell">
            <div className="ps-headline-num">100%</div>
            <div className="ps-headline-lbl">Row Level Security coverage on user data</div>
          </div>
          <div className="ps-headline-cell">
            <div className="ps-headline-num">5/5</div>
            <div className="ps-headline-lbl">Third-party providers with SOC 2 Type II</div>
          </div>
          <div className="ps-headline-cell">
            <div className="ps-headline-num">0</div>
            <div className="ps-headline-lbl">Security incidents to date</div>
          </div>
          <div className="ps-headline-cell brass">
            <div className="ps-headline-num">$0</div>
            <div className="ps-headline-lbl">PII exposure (deliberately minimal collection)</div>
          </div>
        </div>

        {/* CONTROL SECTIONS */}
        {CONTROLS.map((cat, i) => (
          <section key={i} className="ps-section">
            <div className="ps-section-tag">▸ {String(i + 1).padStart(2, "0")} · {cat.cat.toUpperCase()}</div>
            <div className="ps-items">
              {cat.items.map((item, j) => (
                <div key={j} className="ps-item">
                  <div className="ps-item-body">
                    <div className="ps-item-name">{item.name}</div>
                    <div className="ps-item-note">{item.note}</div>
                  </div>
                  <span className={
                    "ps-badge " +
                    (item.status === "LIVE" ? "ps-badge-live" :
                     item.status === "PLANNED" ? "ps-badge-plan" :
                     item.status === "PARTIAL" ? "ps-badge-part" :
                     "ps-badge-na")
                  }>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* HONEST ASSESSMENT */}
        <section className="ps-honest">
          <div className="ps-honest-tag">▸ HONEST ASSESSMENT</div>
          <h2 className="ps-honest-h">What we're deliberately not doing yet.</h2>
          <p className="ps-p">
            <b>SOC 2 Type II is not signed.</b> The audit costs ~$40K and takes 6-12 months of controls history. We ship it after the first enterprise customer needs it — currently we serve broker self-serve tier. Timing target: Year 2.
          </p>
          <p className="ps-p">
            <b>MFA on user accounts is not enforced yet.</b> Supabase Auth supports it — we haven't turned it on because our current user base is brokers self-serving, not enterprise IT-controlled. Enforced by policy once we sign our first firm-tier account.
          </p>
          <p className="ps-p">
            <b>Formal pen test hasn't run.</b> We rely on the OWASP top-10 defenses baked into Supabase RLS + Vercel edge + our code review discipline. First formal pen test scheduled Year 1 post-seed close — sourced via Cure53 or Trail of Bits.
          </p>
          <p className="ps-p">
            <b>What we won't do:</b> touch health data (HIPAA), store payment card data (PCI), or collect SIN/SSN. These are deliberately out of scope — the moment we need one of these, we plan for it before we build.
          </p>
        </section>

        {/* CTA */}
        <div className="ps-cta-block">
          <div className="ps-cta-h">Security question not answered here?</div>
          <div className="ps-cta-p">The detailed security policy and vendor risk assessment are available on 1:1 request.</div>
          <div className="ps-cta-row">
            <a href="mailto:sunni@rizedevelopments.com?subject=RizeAI%20-%20Security%20Question" className="ps-cta">Email security question →</a>
            <button className="ps-cta ghost" onClick={() => navigate("/pitch/data-room")}>Data room</button>
            <button className="ps-cta ghost" onClick={() => navigate("/pitch")}>Back to /pitch</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
  .ps-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .ps-topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 14px; padding: 14px 24px; background: rgba(10,17,40,0.96); border-bottom: 1px solid rgba(212,175,55,0.15); backdrop-filter: blur(20px); }
  .ps-logo { font-size: 15px; font-weight: 800; color: #fff; text-decoration: none; letter-spacing: -0.3px; }
  .ps-logo span { color: var(--brass); }
  .ps-tag { flex: 1; font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; color: var(--brass); }
  .ps-topbar-btn { padding: 6px 12px; border-radius: 5px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; cursor: pointer; }

  .ps-body { max-width: 940px; margin: 0 auto; padding: 44px 24px 80px; }
  .ps-header { text-align: center; margin-bottom: 30px; padding-bottom: 26px; border-bottom: 1px solid var(--borderf); }
  .ps-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 14px; }
  .ps-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .ps-h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: var(--text); letter-spacing: -1.4px; line-height: 1.1; margin: 0 0 12px; }
  .ps-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .ps-sub { font-size: 15px; color: var(--sub); line-height: 1.65; max-width: 620px; margin: 0 auto; }

  .ps-headline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 40px; }
  @media(max-width:720px){ .ps-headline { grid-template-columns: repeat(2, 1fr); } }
  @media(max-width:480px){ .ps-headline { grid-template-columns: 1fr; } }
  .ps-headline-cell { padding: 16px 18px; background: var(--card); border: 1px solid var(--borderf); border-radius: 10px; }
  .ps-headline-cell.brass { border-left: 3px solid var(--brass); }
  .ps-headline-num { font-family: 'Geist Mono', monospace; font-size: 26px; font-weight: 800; color: var(--text); letter-spacing: -0.8px; line-height: 1; margin-bottom: 6px; }
  .ps-headline-cell.brass .ps-headline-num { color: var(--brass); }
  .ps-headline-lbl { font-size: 11.5px; color: var(--sub); line-height: 1.4; }

  .ps-section { margin-bottom: 26px; padding-bottom: 24px; border-bottom: 1px solid var(--borderf); }
  .ps-section-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.6px; color: var(--brass-2); margin-bottom: 10px; text-transform: uppercase; }
  .ps-items { display: flex; flex-direction: column; gap: 6px; }
  .ps-item { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 14px; background: var(--card); border: 1px solid var(--borderf); border-radius: 6px; }
  @media(max-width:640px){ .ps-item { flex-direction: column; align-items: stretch; } }
  .ps-item-body { flex: 1; }
  .ps-item-name { font-size: 13.5px; font-weight: 700; color: var(--text); letter-spacing: -0.2px; margin-bottom: 3px; }
  .ps-item-note { font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--sub); line-height: 1.45; letter-spacing: 0.2px; }
  .ps-badge { font-family: 'Geist Mono', monospace; font-size: 10px; font-weight: 800; letter-spacing: 1px; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; white-space: nowrap; }
  .ps-badge-live { background: rgba(22,163,74,0.10); color: #16a34a; border: 1px solid rgba(22,163,74,0.28); }
  .ps-badge-plan { background: rgba(33,85,205,0.10); color: var(--royal); border: 1px solid rgba(33,85,205,0.28); }
  .ps-badge-part { background: rgba(234,179,8,0.10); color: #eab308; border: 1px solid rgba(234,179,8,0.28); }
  .ps-badge-na { background: rgba(100,116,139,0.10); color: var(--sub); border: 1px solid var(--borderf); }

  .ps-honest { padding: 26px 24px; background: rgba(220,38,38,0.03); border: 1px solid rgba(220,38,38,0.15); border-left: 3px solid #dc2626; border-radius: 8px; margin-top: 24px; margin-bottom: 26px; }
  .ps-honest-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; color: #dc2626; text-transform: uppercase; margin-bottom: 10px; }
  .ps-honest-h { font-size: clamp(20px, 2.8vw, 26px); font-weight: 800; color: var(--text); letter-spacing: -0.5px; line-height: 1.2; margin: 0 0 14px; }
  .ps-p { font-size: 14px; color: var(--text); line-height: 1.65; margin: 0 0 12px; }
  .ps-p b { color: #dc2626; font-weight: 800; }

  .ps-cta-block { padding: 28px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; }
  .ps-cta-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 8px; }
  .ps-cta-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 18px; max-width: 480px; margin-left: auto; margin-right: auto; }
  .ps-cta-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .ps-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; text-decoration: none; display: inline-block; }
  .ps-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .ps-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
