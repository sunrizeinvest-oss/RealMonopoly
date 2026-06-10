import { useNavigate } from "react-router-dom";

/**
 * CrossLinkCTA — "try this same deal as a different strategy" button row.
 *
 * Sits at the bottom of every analyzer's results section. Carries the
 * user's current deal context (address, price, beds/baths, etc.) across
 * to other strategies via URL params (?addr=&purchase=&repair=&...).
 * Removes the "I have to re-type my deal" friction.
 *
 * Props:
 *   strategy: "flip" | "brrrr" | "commercial" | "compare"
 *   deal:     { addr, purchase, repair, sqft, beds, baths }  -- all optional
 *
 * Each strategy's button is dimmed + tagged "YOU ARE HERE" when it matches
 * the current one; otherwise it's a clickable cross-link.
 */

const STRATEGIES = [
  { id: "flip",       label: "Fix & Flip",   icon: "🏚️", route: "/app",        color: "var(--blue)" },
  { id: "brrrr",      label: "BRRRR",        icon: "🔄", route: "/brrrr",      color: "var(--purple)" },
  { id: "commercial", label: "Multifamily",  icon: "🏢", route: "/commercial", color: "var(--green)" },
  { id: "compare",    label: "Compare",      icon: "⚡", route: "/compare",    color: "var(--amber)" },
];

export default function CrossLinkCTA({ strategy, deal = {} }) {
  const navigate = useNavigate();

  // Build the prefill query string from whatever's in the deal
  const params = new URLSearchParams();
  if (deal.addr)     params.set("addr",     String(deal.addr));
  if (deal.purchase) params.set("purchase", String(deal.purchase));
  if (deal.repair)   params.set("repair",   String(deal.repair));
  if (deal.sqft)     params.set("sqft",     String(deal.sqft));
  if (deal.beds)     params.set("beds",     String(deal.beds));
  if (deal.baths)    params.set("baths",    String(deal.baths));
  const qs = params.toString();

  const open = (route) => () => navigate(qs ? `${route}?${qs}` : route);

  // Has the user run a real analysis? If not, the cross-links are less useful
  // (no numbers to carry), so dim the helper text.
  const hasContext = !!(deal.purchase || deal.addr);

  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--borderf)",
      borderRadius: 6,
      padding: "18px 20px",
      marginTop: 18,
    }}>
      <div style={{
        fontFamily: "'Geist Mono',ui-monospace,monospace",
        fontSize: 10.5,
        fontWeight: 700,
        color: "var(--blue)",
        letterSpacing: "1.4px",
        marginBottom: 4,
      }}>
        ▸ TRY THIS DEAL ANOTHER WAY
      </div>
      <div style={{
        fontSize: 13,
        color: "var(--sub)",
        marginBottom: 14,
        lineHeight: 1.5,
      }}>
        {hasContext
          ? "Same address, same numbers — just plugged into a different underwriting model."
          : "Pick a different strategy. The other calculators are one click away."}
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 8,
      }}>
        {STRATEGIES.map(s => {
          const isCurrent = s.id === strategy;
          return (
            <button
              key={s.id}
              disabled={isCurrent}
              onClick={isCurrent ? undefined : open(s.route)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: isCurrent ? "rgba(15,23,42,0.025)" : "var(--card2, #f1f5f9)",
                border: `1px solid ${isCurrent ? "var(--borderf)" : s.color + "55"}`,
                borderLeft: `3px solid ${isCurrent ? "var(--dim)" : s.color}`,
                borderRadius: 5,
                cursor: isCurrent ? "default" : "pointer",
                fontFamily: "'Geist',sans-serif",
                fontSize: 13,
                fontWeight: 700,
                color: isCurrent ? "var(--dim)" : "var(--text)",
                letterSpacing: "-0.2px",
                textAlign: "left",
                transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
                opacity: isCurrent ? 0.55 : 1,
              }}
              onMouseEnter={e => {
                if (!isCurrent) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 8px 22px rgba(0,0,0,0.45)`;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{s.icon}</span>
              <span style={{ flex: 1 }}>{s.label}</span>
              {isCurrent ? (
                <span style={{
                  fontFamily: "'Geist Mono',ui-monospace,monospace",
                  fontSize: 8.5,
                  fontWeight: 700,
                  color: "var(--dim)",
                  letterSpacing: "0.8px",
                  padding: "2px 6px",
                  border: "1px solid var(--borderf)",
                  borderRadius: 3,
                }}>HERE</span>
              ) : (
                <span style={{
                  fontFamily: "'Geist Mono',ui-monospace,monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  color: s.color,
                }}>→</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
