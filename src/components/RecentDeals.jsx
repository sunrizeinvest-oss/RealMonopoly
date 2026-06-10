import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * RecentDeals — surfaces the user's last N saved deals across all
 * calculator types so they can resume work without hunting through the
 * dashboard.
 *
 * Reads localStorage keys that the BRRRR / Multifamily calculators write
 * to ("rde_brrrr_deals"). Each entry has the shape:
 *   { id, type, name, address, savedAt, inputs, results, verdict }
 *
 * Clicking a deal navigates to the matching calculator with URL params
 * prefilling the address + purchase price + repair (same contract the
 * Chrome extension and CrossLinkCTA use).
 *
 * Renders nothing if no saved deals — silent empty state.
 */

const ROUTE_MAP = {
  brrrr:       "/brrrr",
  multifamily: "/commercial",
  commercial:  "/commercial",
  flip:        "/app",
};

const TYPE_META = {
  brrrr:       { emoji: "🔄", label: "BRRRR",       color: "var(--purple)" },
  multifamily: { emoji: "🏢", label: "Multifamily", color: "var(--green)"  },
  commercial:  { emoji: "🏢", label: "Multifamily", color: "var(--green)"  },
  flip:        { emoji: "🏚️", label: "Flip",        color: "var(--blue)"   },
};

function timeSince(when) {
  if (!when) return "";
  const t = typeof when === "string" ? new Date(when).getTime() : Number(when);
  if (!t || isNaN(t)) return "";
  const seconds = Math.floor((Date.now() - t) / 1000);
  if (seconds < 60)    return "just now";
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const fmt = n => n != null && n !== "" ? `$${Math.round(Number(n)).toLocaleString()}` : null;

export default function RecentDeals({ limit = 6 }) {
  const [deals, setDeals] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const all = [];
    try {
      const raw = localStorage.getItem("rde_brrrr_deals");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const d of parsed) all.push({ ...d, type: d.type || "brrrr" });
        }
      }
    } catch {}
    all.sort((a, b) => {
      const ta = a.savedAt ? new Date(a.savedAt).getTime() : (a.id || 0);
      const tb = b.savedAt ? new Date(b.savedAt).getTime() : (b.id || 0);
      return tb - ta;
    });
    setDeals(all.slice(0, limit));
  }, [limit]);

  if (deals.length === 0) return null;

  const open = (deal) => {
    const route = ROUTE_MAP[deal.type] || "/brrrr";
    const params = new URLSearchParams();
    if (deal.address)                                            params.set("addr",     deal.address);
    if (deal.inputs?.purchasePrice)                              params.set("purchase", String(deal.inputs.purchasePrice));
    if (deal.inputs?.rehabBudget || deal.inputs?.repairCosts)    params.set("repair",   String(deal.inputs.rehabBudget || deal.inputs.repairCosts));
    const qs = params.toString();
    navigate(qs ? `${route}?${qs}` : route);
  };

  return (
    <div style={{
      maxWidth: 1080, margin: "0 auto 36px", padding: "0 24px",
    }}>
      <div style={{
        display: "flex", alignItems: "baseline", gap: 14, marginBottom: 12, flexWrap: "wrap",
      }}>
        <div style={{
          fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 11.5, fontWeight: 700,
          color: "var(--blue)", letterSpacing: "1.6px",
        }}>
          ▸ RECENT ANALYSES
        </div>
        <div style={{
          fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 600,
          color: "var(--dim)", letterSpacing: "0.6px",
        }}>
          · {deals.length} OF {Math.min(20, deals.length)} SAVED · CLICK TO RESUME
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 10,
      }}>
        {deals.map(d => {
          const meta = TYPE_META[d.type] || TYPE_META.brrrr;
          const profit = d.results?.equityCreated || d.results?.netProfit || d.results?.annualCF || null;
          const profitColor = profit > 0 ? "var(--green)" : profit < 0 ? "var(--red)" : "var(--sub)";
          const dscr = d.results?.dscr;
          return (
            <button
              key={d.id}
              onClick={() => open(d)}
              style={{
                background: "var(--card)",
                border: "1px solid var(--borderf)",
                borderLeft: `3px solid ${meta.color}`,
                borderRadius: 6,
                padding: "12px 14px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex", flexDirection: "column", gap: 6,
                fontFamily: "'Geist',sans-serif",
                transition: "transform 0.15s, border-color 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,0,0,0.45)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{meta.emoji}</span>
                <span style={{
                  fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
                  color: meta.color, letterSpacing: "1px",
                }}>{meta.label.toUpperCase()}</span>
                <span style={{ marginLeft: "auto",
                  fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5,
                  color: "var(--dim)", letterSpacing: "0.4px",
                }}>{timeSince(d.savedAt || d.id)}</span>
              </div>

              <div style={{
                fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.2px",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {d.name || d.address || "Untitled deal"}
              </div>

              {d.address && d.address !== d.name && (
                <div style={{
                  fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 11, color: "var(--sub)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {d.address}
                </div>
              )}

              {(d.verdict || profit != null || dscr != null) && (
                <div style={{
                  display: "flex", gap: 12, alignItems: "baseline",
                  marginTop: 2,
                  fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 11, fontWeight: 700,
                }}>
                  {profit != null && (
                    <span style={{ color: profitColor }}>
                      {profit >= 0 ? "▲" : "▼"} {fmt(Math.abs(profit))}
                    </span>
                  )}
                  {dscr != null && !isNaN(dscr) && (
                    <span style={{ color: dscr >= 1.25 ? "var(--green)" : "var(--amber)" }}>
                      DSCR {Number(dscr).toFixed(2)}x
                    </span>
                  )}
                  {d.verdict && (
                    <span style={{ color: "var(--dim)", fontWeight: 500, marginLeft: "auto", letterSpacing: "0.4px" }}>
                      {String(d.verdict).slice(0, 24)}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
