import { useState, useEffect } from "react";
import { trackWelcomeModalAction } from "../lib/analytics.js";

/**
 * WelcomeModal — first-visit onboarding overlay on /property.
 *
 * Fires exactly once per browser (persists dismissal in localStorage). Shows:
 *   • The 5-free-lookup value proposition
 *   • Three concrete "try this" chips (real Canadian addresses)
 *   • The three-step workflow (address → verdicts → save)
 *
 * Dismissal is tracked via `localStorage.rde_onboarding_shown = "1"`.
 * Clicking a demo address populates the search input via the onDemoAddress
 * callback and closes the modal.
 *
 * Not shown to:
 *   • Users who've already dismissed it
 *   • Users hitting /property with an ?addr= query param (deep-link — they
 *     already know what they want)
 */

const DEMO_ADDRESSES = [
  { addr: "2424 Westmount Rd NW, Calgary AB",       tag: "R-C1 · Duplex candidate" },
  { addr: "17 Sunrise Blvd, Toronto ON",            tag: "RD · Multiplex zone (2023 bylaw)" },
  { addr: "310 Kingsway, Vancouver BC",             tag: "C-2 · Mixed-use" },
];

export default function WelcomeModal({ onDemoAddress }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const shown = localStorage.getItem("rde_onboarding_shown") === "1";
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const hasQuery = params.has("addr");
      // Also suppress on referral / campaign traffic — those users landed
      // with intent (share link, paid ad, email); interrupting them with a
      // welcome modal tanks conversion. Also skip when a share hash is set
      // (e.g. /verdict#deal-xxx).
      const isReferral = params.has("utm_source")
        || params.has("utm_campaign")
        || params.has("ref")
        || (document.referrer && !document.referrer.includes(window.location.host));
      const hasHash = window.location.hash && window.location.hash.length > 1;
      if (!shown && !hasQuery && !isReferral && !hasHash) {
        setOpen(true);
        trackWelcomeModalAction("shown");
      }
    } catch {}
  }, []);

  const dismiss = () => {
    try { localStorage.setItem("rde_onboarding_shown", "1"); } catch {}
    trackWelcomeModalAction("dismissed");
    setOpen(false);
  };

  const pickDemo = (addr) => {
    try { localStorage.setItem("rde_onboarding_shown", "1"); } catch {}
    trackWelcomeModalAction("example_click");
    setOpen(false);
    if (typeof onDemoAddress === "function") onDemoAddress(addr);
  };

  if (!open) return null;

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed", inset: 0, zIndex: 10600,
        background: "rgba(10, 17, 40, 0.68)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, animation: "rde-welcome-in 240ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <style>{`
        @keyframes rde-welcome-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rde-welcome-card-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rde-welcome-demo {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px;
          background: rgba(212,175,55,0.06);
          border: 1px solid rgba(212,175,55,0.22);
          border-radius: 8px;
          cursor: pointer; text-align: left;
          font-family: inherit;
          transition: border-color 160ms, transform 160ms, background 160ms;
          width: 100%;
        }
        .rde-welcome-demo:hover {
          border-color: var(--brass);
          background: rgba(212,175,55,0.10);
          transform: translateX(2px);
        }
        .rde-welcome-demo-addr {
          font-family: 'Geist Mono', monospace;
          font-size: 12.5px; font-weight: 700; color: var(--text);
          margin-bottom: 2px;
        }
        .rde-welcome-demo-tag {
          font-family: 'Geist Mono', monospace;
          font-size: 10px; color: var(--brass-2);
          letter-spacing: 0.4px; text-transform: uppercase;
        }
        .rde-welcome-demo-arrow { margin-left: auto; color: var(--dim); font-size: 14px; }
        .rde-welcome-demo:hover .rde-welcome-demo-arrow { color: var(--brass); }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          maxWidth: 520,
          width: "100%",
          padding: "32px 30px 26px",
          boxShadow: "0 40px 100px -20px rgba(15,23,42,0.4)",
          border: "1px solid rgba(15,23,42,0.06)",
          position: "relative",
          animation: "rde-welcome-card-in 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            position: "absolute", top: 12, right: 12,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 22, color: "var(--dim)", padding: 4, lineHeight: 1,
          }}
        >
          ×
        </button>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "5px 12px",
          background: "rgba(212,175,55,0.10)",
          border: "1px solid rgba(212,175,55,0.30)",
          borderRadius: 4,
          fontFamily: "'Geist Mono', monospace",
          fontSize: 10, fontWeight: 700, color: "var(--brass-2)",
          letterSpacing: 1.4, textTransform: "uppercase",
          marginBottom: 16,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--brass)", boxShadow: "0 0 8px var(--brass)",
          }} />
          Welcome to RizeAI
        </div>

        <h2 style={{
          fontSize: 24, fontWeight: 800, color: "var(--text)",
          letterSpacing: "-0.6px", lineHeight: 1.15, marginBottom: 8,
        }}>
          Insider access. <span style={{ color: "var(--brass)", fontStyle: "italic", fontWeight: 700 }}>Starts now.</span>
        </h2>
        <p style={{
          fontSize: 14, color: "var(--sub)", lineHeight: 1.55, marginBottom: 22,
        }}>
          You get <strong style={{ color: "var(--text)" }}>5 free property lookups this month</strong> — no credit card, no signup wall. Try a real address to see the four-strategy verdict + zoning specs + AI thesis.
        </p>

        <div style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: 10, fontWeight: 700, color: "var(--sub)",
          letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10,
        }}>
          ▸ Try one of these
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
          {DEMO_ADDRESSES.map((d) => (
            <button
              key={d.addr}
              className="rde-welcome-demo"
              onClick={() => pickDemo(d.addr)}
              type="button"
            >
              <span>
                <div className="rde-welcome-demo-addr">{d.addr}</div>
                <div className="rde-welcome-demo-tag">{d.tag}</div>
              </span>
              <span className="rde-welcome-demo-arrow">→</span>
            </button>
          ))}
        </div>

        <div style={{
          padding: "12px 14px",
          background: "rgba(33,85,205,0.05)",
          border: "1px solid rgba(33,85,205,0.15)",
          borderRadius: 6,
          fontSize: 12, color: "var(--sub)", lineHeight: 1.55,
        }}>
          <strong style={{ color: "var(--royal)", fontFamily: "'Geist Mono', monospace", fontSize: 10.5, letterSpacing: 0.6, textTransform: "uppercase", marginRight: 6 }}>Workflow</strong>
          Type address → see the 4-strategy verdict → open any strategy in its full calculator (BRRRR / Flip / Hold / MF) — pre-populated.
        </div>

        <button
          onClick={dismiss}
          style={{
            width: "100%",
            marginTop: 14,
            padding: "10px 14px",
            background: "transparent",
            border: "1px solid var(--borderf)",
            borderRadius: 6,
            fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
            color: "var(--sub)",
            cursor: "pointer",
          }}
        >
          Skip — I'll type my own address
        </button>
      </div>
    </div>
  );
}
