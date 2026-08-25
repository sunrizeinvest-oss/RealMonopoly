/**
 * SimilarDealsHint — "I noticed you've analyzed deals like this before"
 * surface that drops below the address field on the calculators.
 *
 * Pulls from the user's saved-deals localStorage (same source as the
 * DealReadout "vs your past deals" comparison) and surfaces 1-3 matches
 * by city + strategy + price band. Each row has a one-click "Use this
 * deal's inputs as defaults" CTA that hands a payload back to the parent.
 *
 * Props:
 *   address       — current address (used to detect city)
 *   strategy      — 'brrrr' | 'multifamily' | 'flip'
 *   purchasePrice — optional, narrows the match by ±25% price band
 *   onApply       — callback(deal) when user clicks "Load this deal"
 *
 * Silent when no matches — never adds noise.
 */

import { useMemo } from "react";
import { findSimilarDeals } from "../lib/dealHistory";

function formatAge(iso) {
  if (!iso) return "earlier";
  const ms = Date.now() - new Date(iso).getTime();
  if (!isFinite(ms) || ms < 0) return "recently";
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days/7)}w ago`;
  if (days < 365) return `${Math.floor(days/30)}mo ago`;
  return `${Math.floor(days/365)}y ago`;
}

export default function SimilarDealsHint({ address, strategy, purchasePrice, onApply }) {
  const matches = useMemo(
    () => findSimilarDeals({ address, strategy, purchasePrice, limit: 3 }),
    [address, strategy, purchasePrice]
  );

  if (!address || matches.length === 0) return null;

  return (
    <div style={{
      marginTop: 10,
      padding: "10px 12px",
      background: "rgba(33,85,205,0.05)",
      border: "1px solid rgba(33,85,205,0.28)",
      borderLeft: "3px solid var(--royal,#2155cd)",
      borderRadius: 6,
    }}>
      <div style={{
        fontFamily: "'Geist Mono',ui-monospace,monospace",
        fontSize: 10.5, fontWeight: 700, letterSpacing: "1.2px",
        color: "var(--royal-2,#5b8eff)", textTransform: "uppercase",
        marginBottom: 8,
      }}>
        ▸ You've analyzed {matches.length} similar deal{matches.length === 1 ? "" : "s"} before
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        {matches.map(m => (
          <div key={m.id} style={{
            display:"flex",alignItems:"center",justifyContent:"space-between",
            gap:10,padding:"7px 10px",
            background:"rgba(0,12,31,0.04)",
            border:"1px solid rgba(255,255,255,0.06)",
            borderRadius:4,flexWrap:"wrap",
          }}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{
                fontSize:12.5,fontWeight:700,color:"var(--text,#0f172a)",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
              }}>
                {m.address}
              </div>
              <div style={{
                fontFamily:"'Geist Mono',ui-monospace,monospace",
                fontSize:10.5,color:"var(--sub,#475569)",
                letterSpacing:"0.2px",marginTop:2,
              }}>
                {m.summary} · {formatAge(m.savedAt)}
              </div>
            </div>
            {onApply && (
              <button
                onClick={() => onApply(m)}
                style={{
                  background:"transparent",
                  color:"var(--royal,#2155cd)",
                  border:"1px solid rgba(33,85,205,0.4)",
                  borderRadius:3,
                  padding:"6px 10px",
                  fontFamily:"'Geist Mono',ui-monospace,monospace",
                  fontSize:10,fontWeight:800,letterSpacing:"0.5px",
                  cursor:"pointer",textTransform:"uppercase",flexShrink:0,
                  transition:"all 0.15s",
                }}
                onMouseOver={e => { e.currentTarget.style.background = "rgba(33,85,205,0.08)"; e.currentTarget.style.borderColor = "var(--royal,#2155cd)"; }}
                onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(33,85,205,0.4)"; }}
              >
                ▸ Load values
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
