import { useNavigate } from "react-router-dom";
import { useFreeTier } from "../lib/freeTier.js";
import { trackUpgradeCtaClick } from "../lib/analytics.js";

/**
 * FreeTierBanner — a compact pill shown at the top of /property that reports
 * how many free lookups the current user has left this month. Hidden for
 * Pro / Scale users. Clicks route to /pricing for the upgrade path.
 *
 * Colors:
 *   remaining >= 3 → subtle brass ("plenty left")
 *   remaining 1-2  → amber warning
 *   remaining 0    → red block (paired with the modal in PropertyIntelligence)
 */
export function FreeTierBanner() {
  const navigate = useNavigate();
  const { isPaid, loading, count, remaining, limit } = useFreeTier();

  if (loading || isPaid) return null;

  const isBlocked = remaining === 0;
  const isWarning = remaining <= 2 && remaining > 0;

  const bg = isBlocked
    ? "rgba(220,38,38,0.08)"
    : isWarning
      ? "rgba(234,179,8,0.08)"
      : "rgba(212,175,55,0.06)";
  const border = isBlocked
    ? "rgba(220,38,38,0.30)"
    : isWarning
      ? "rgba(234,179,8,0.30)"
      : "rgba(212,175,55,0.22)";
  const dot = isBlocked ? "#dc2626" : isWarning ? "#eab308" : "var(--brass)";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
      margin: "10px auto 0", maxWidth: 720,
      padding: "8px 14px",
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 8,
      fontSize: 12.5,
      fontFamily: "'Geist Mono', monospace",
      letterSpacing: 0.3,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: dot, boxShadow: `0 0 8px ${dot}`,
      }} />
      <span style={{ color: "var(--text)", fontWeight: 700 }}>
        {isBlocked
          ? "You've used all 5 free lookups this month"
          : `${remaining} of ${limit} free lookup${remaining === 1 ? "" : "s"} left this month`}
      </span>
      <button
        onClick={() => { trackUpgradeCtaClick("banner"); navigate("/pricing"); }}
        style={{
          marginLeft: 8,
          padding: "4px 10px",
          borderRadius: 4,
          border: "1px solid var(--brass)",
          background: "var(--brass)",
          color: "#fff",
          fontFamily: "'Geist Mono', monospace",
          fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8,
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        Upgrade →
      </button>
    </div>
  );
}

/**
 * FreeTierUpgradeModal — full-screen overlay shown when a free user tries
 * to do a 6th lookup, hits save, or tries to export a PDF. Explains what
 * Pro unlocks and provides a single primary CTA to /pricing.
 */
export function FreeTierUpgradeModal({ open, onClose, reason }) {
  const navigate = useNavigate();
  if (!open) return null;

  const headlines = {
    lookup: "You've reached this month's 5 free lookups.",
    save:   "Save to Dashboard is a Pro feature.",
    pdf:    "PDF export is a Pro feature.",
    rentroll: "The rent roll parser is a Scale feature.",
  };
  const subs = {
    lookup: "Free tier resets on the 1st of every month. Upgrade for unlimited property lookups + saves + PDF exports.",
    save:   "Free tier can view unlimited verdicts, but saving to Dashboard requires Pro.",
    pdf:    "Investor PDF, IC memo, and lender package all require Pro.",
    rentroll: "The LTL parser (rent roll upload) is a Scale-tier feature. Available on the $299/mo plan.",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 10500,
        background: "rgba(10, 17, 40, 0.62)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, animation: "rde-modal-in 220ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <style>{`@keyframes rde-modal-in { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 14,
          maxWidth: 480,
          width: "100%",
          padding: "28px 28px 22px",
          boxShadow: "0 40px 100px -20px rgba(15,23,42,0.4)",
          border: "1px solid rgba(15,23,42,0.06)",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Dismiss"
          style={{
            position: "absolute", top: 12, right: 12,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 20, color: "var(--dim)", padding: 4, lineHeight: 1,
          }}
        >
          ×
        </button>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "5px 10px",
          background: "rgba(212,175,55,0.10)",
          border: "1px solid rgba(212,175,55,0.30)",
          borderRadius: 4,
          fontFamily: "'Geist Mono', monospace",
          fontSize: 10, fontWeight: 700, color: "var(--brass-2)",
          letterSpacing: 1.4, textTransform: "uppercase",
          marginBottom: 14,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--brass)", boxShadow: "0 0 8px var(--brass)",
          }} />
          Upgrade Required
        </div>

        <h2 style={{
          fontSize: 22, fontWeight: 800, color: "var(--text)",
          letterSpacing: "-0.5px", lineHeight: 1.2, marginBottom: 10,
        }}>
          {headlines[reason] || headlines.lookup}
        </h2>
        <p style={{
          fontSize: 14, color: "var(--sub)", lineHeight: 1.55, marginBottom: 20,
        }}>
          {subs[reason] || subs.lookup}
        </p>

        <div style={{
          padding: 14,
          background: "rgba(33,85,205,0.05)",
          border: "1px solid rgba(33,85,205,0.15)",
          borderRadius: 8,
          marginBottom: 18,
        }}>
          <div style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 10, fontWeight: 700, color: "var(--royal)",
            letterSpacing: 1, textTransform: "uppercase", marginBottom: 8,
          }}>
            ▸ Pro · $99/mo
          </div>
          <ul style={{
            listStyle: "none", padding: 0, margin: 0,
            fontSize: 13, color: "var(--text)", lineHeight: 1.7,
          }}>
            <li>✓ Unlimited /property lookups</li>
            <li>✓ Save deals to Dashboard</li>
            <li>✓ Export investor PDF + lender package</li>
            <li>✓ AI Buddy Read on every deal</li>
            <li>✓ 7 Canadian cities · CMHC-anchored rent · 37 zoning codes</li>
          </ul>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 14px",
              background: "transparent",
              border: "1px solid var(--borderf)",
              borderRadius: 6,
              fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              color: "var(--sub)",
              cursor: "pointer",
            }}
          >
            Not now
          </button>
          <button
            onClick={() => { trackUpgradeCtaClick("modal"); onClose(); navigate("/pricing"); }}
            style={{
              flex: 2,
              padding: "10px 14px",
              background: "var(--brass)",
              border: "1px solid var(--brass)",
              borderRadius: 6,
              fontFamily: "inherit", fontSize: 13, fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              letterSpacing: 0.3,
            }}
          >
            See plans →
          </button>
        </div>
      </div>
    </div>
  );
}
