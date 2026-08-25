/**
 * AddressAutoFillBanner — small info card that shows what public-record
 * data was found for a typed address, and (when clicked) auto-fills any
 * empty form fields with values from open data.
 *
 * Props:
 *   loading — true while /api/property-lookup is in flight
 *   data    — the lookup response (or null)
 *   error   — string if the lookup failed (or null)
 *   onFill  — callback to apply the derived patch to the caller's form
 *   patch   — precomputed patch (from derivePatch) — pass this so the
 *             banner can show what will be filled + how many fields
 *
 * Behavior:
 *   - Hidden if no address / no data / no fillable fields
 *   - Shows a "Loading public records…" state while the lookup runs
 *   - When data lands, shows a summary with a "▸ Auto-fill N fields" button
 *   - Ghost/dismissible — the user can ignore it and keep typing
 */

import { useState } from "react";
import BuddyLoading from "./BuddyLoading";

function fmt$(n) {
  if (n == null) return "—";
  return `$${Math.round(Number(n)).toLocaleString()}`;
}

export default function AddressAutoFillBanner({ loading, data, error, patch, onFill, city }) {
  const [dismissed, setDismissed] = useState(false);
  const [filled, setFilled] = useState(false);

  if (dismissed) return null;

  // Loading state — shared BuddyLoading primitive
  if (loading && !data) {
    return (
      <div style={{
        marginTop:8,padding:"7px 12px",
        background:"rgba(33,85,205,0.04)",
        border:"1px solid rgba(33,85,205,0.18)",
        borderLeft:"2px solid var(--royal,#2155cd)",
        borderRadius:4,
      }}>
        <BuddyLoading label="looking up public records" tone="royal" />
      </div>
    );
  }

  if (error) return null;
  if (!data) return null;

  const fillableCount = Object.keys(patch || {}).length;
  if (fillableCount === 0 && !filled) {
    // Nothing to fill (fields already have values) — hide silently
    return null;
  }

  const bits = [];
  if (data.yearBuilt)      bits.push(`built ${data.yearBuilt}`);
  if (data.squareFootage)  bits.push(`${Number(data.squareFootage).toLocaleString()} sqft`);
  if (data.bedrooms)       bits.push(`${data.bedrooms}bd`);
  if (data.assessedValue)  bits.push(`assessed ${fmt$(data.assessedValue)}`);
  if (data.rentEstimate)   bits.push(`~${fmt$(data.rentEstimate)}/mo rent`);
  if (data.zoning?.code)   bits.push(`zoning ${data.zoning.code}`);

  return (
    <div style={{
      marginTop:8,padding:"10px 12px",
      background:"rgba(34,197,94,0.05)",
      border:"1px solid rgba(34,197,94,0.28)",
      borderLeft:"3px solid var(--green-2,#22c55e)",
      borderRadius:5,
      display:"flex",alignItems:"center",justifyContent:"space-between",
      gap:12,flexWrap:"wrap",
    }}>
      <div style={{flex:1,minWidth:200}}>
        <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:10,fontWeight:700,letterSpacing:"1.2px",color:"var(--green,#16a34a)",textTransform:"uppercase",marginBottom:4}}>
          ▸ Found public records{data.source ? ` · ${String(data.source).slice(0,30)}` : ""}
        </div>
        <div style={{fontSize:12.5,color:"var(--sub)",lineHeight:1.5}}>
          {bits.length > 0 ? bits.slice(0, 5).join(" · ") : "Data available"}
        </div>
      </div>
      {filled ? (
        <span style={{
          fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:10.5,fontWeight:800,
          color:"var(--green,#16a34a)",letterSpacing:"0.6px",textTransform:"uppercase",flexShrink:0,
        }}>
          ✓ Applied
        </span>
      ) : fillableCount > 0 ? (
        <button
          onClick={() => { onFill(); setFilled(true); }}
          style={{
            background:"var(--green-2,#22c55e)",color:"#0a1128",border:"none",borderRadius:4,
            padding:"7px 12px",
            fontFamily:"'Geist Mono',ui-monospace,monospace",
            fontSize:10.5,fontWeight:800,letterSpacing:"0.5px",cursor:"pointer",
            textTransform:"uppercase",flexShrink:0,
          }}
        >
          ▸ Auto-fill {fillableCount} field{fillableCount === 1 ? "" : "s"}
        </button>
      ) : null}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background:"transparent",border:"none",color:"var(--dim)",cursor:"pointer",
          fontSize:16,lineHeight:1,padding:"4px 6px",flexShrink:0,
        }}
      >×</button>
    </div>
  );
}
