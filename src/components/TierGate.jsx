import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { tierMeets, TIER, TIER_LABEL, TIER_COLOR, TIER_PRICE_LABEL } from "../lib/tiers";

/**
 * TierGate — wrap any feature that requires a paid tier.
 *
 *   <TierGate tier="scale" feature="AI Document Drop"
 *             description="Drop a PDF and the calculator autofills">
 *     <AIDocumentDrop ... />
 *   </TierGate>
 *
 * If the signed-in user's tier meets the requirement, children render.
 * Otherwise an upgrade paywall card renders in their place — same dark
 * terminal aesthetic, accent color matching the required tier.
 *
 * Logged-out visitors see the paywall too, with a "Sign in" CTA.
 */
export default function TierGate({
  tier = "scale",
  feature,
  description,
  children,
}) {
  const navigate = useNavigate();
  const { user, userTier } = useAuth() || {};

  const meets = tierMeets(userTier || "free", tier);
  if (meets) return children;

  const isSignedIn = !!user;
  const color = TIER_COLOR[tier];
  const tierLabel = TIER_LABEL[tier];
  const priceLabel = TIER_PRICE_LABEL[tier];

  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--borderf)",
      borderLeft: `3px solid ${color}`,
      borderRadius: 6,
      padding: 20,
      marginBottom: 16,
    }}>
      <div style={{
        display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10, flexWrap: "wrap",
      }}>
        <span style={{
          fontFamily: "'Geist Mono',ui-monospace,monospace",
          fontSize: 10.5, fontWeight: 700,
          padding: "3px 8px",
          background: `${color}18`,
          color,
          border: `1px solid ${color}`,
          borderRadius: 3,
          letterSpacing: "1.2px",
        }}>
          🔒 {tierLabel.toUpperCase()} · {priceLabel}
        </span>
        {feature && (
          <span style={{
            fontFamily: "'Geist',sans-serif", fontSize: 16, fontWeight: 700,
            color: "var(--text)", letterSpacing: "-0.3px",
          }}>
            {feature}
          </span>
        )}
      </div>

      {description && (
        <div style={{
          fontSize: 13.5, color: "var(--sub)", lineHeight: 1.55, marginBottom: 14,
        }}>
          {description}
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: isSignedIn ? "1fr 1fr" : "1fr 1fr",
        gap: 8,
      }}>
        <button
          onClick={() => navigate("/pricing")}
          style={{
            background: color, color: "#ffffff",
            border: "none", borderRadius: 5,
            padding: "11px 18px",
            fontFamily: "'Geist Mono',ui-monospace,monospace",
            fontSize: 11.5, fontWeight: 700, letterSpacing: "1.2px",
            cursor: "pointer",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 8px 22px ${color}55`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
        >
          ▶ UPGRADE TO {tierLabel.toUpperCase()}
        </button>
        <button
          onClick={() => navigate(isSignedIn ? "/pricing" : "/login")}
          style={{
            background: "transparent", color: "var(--sub)",
            border: "1px solid var(--borderf)", borderRadius: 5,
            padding: "11px 18px",
            fontFamily: "'Geist Mono',ui-monospace,monospace",
            fontSize: 11.5, fontWeight: 700, letterSpacing: "1.2px",
            cursor: "pointer",
          }}
        >
          {isSignedIn ? "SEE ALL TIERS" : "SIGN IN"}
        </button>
      </div>

      <div style={{
        marginTop: 12, paddingTop: 12,
        borderTop: "1px solid var(--borderf)",
        fontFamily: "'Geist Mono',ui-monospace,monospace",
        fontSize: 10, color: "var(--dim)", letterSpacing: "0.6px",
        lineHeight: 1.5,
      }}>
        ▸ {tier === TIER.SCALE
          ? "Scale unlocks every Tier 2 feature: AI Document Drop, Risk Simulator, Lease Matrix, Market Triggers, advanced city zoning."
          : "Pro unlocks unlimited deals, all calculators, PDF exports, predict-rent."}
      </div>
    </div>
  );
}
