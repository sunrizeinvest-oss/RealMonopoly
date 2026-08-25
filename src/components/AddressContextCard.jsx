/**
 * AddressContextCard — one unified "what we know about this address" panel.
 *
 * Consolidates what used to be 2 separate stacked cards (AddressAutoFillBanner
 * + inline SmartDefaults) into a single card with two clearly-labeled
 * subsections. Same brass border, same header, same dismiss button — just
 * one place for the user to look.
 *
 * Props:
 *   address        — string, the current address value
 *   strategy       — 'brrrr' | 'multifamily' | 'flip' | 'rental'
 *   lookup         — { data, loading, error } from useAddressAutoFill
 *   patch          — patch object from derivePatch()
 *   onApplyLookup  — callback to apply the auto-fill patch
 *   defaults       — { cityLabel, previewText } for the smart-defaults section
 *   onApplyDefaults — callback to apply the smart defaults
 *
 * Silent when nothing to show. Renders progressive detail as lookup lands.
 */

import { useState } from "react";
import BuddyLoading from "./BuddyLoading";

function fmt$(n) {
  if (n == null) return "—";
  return `$${Math.round(Number(n)).toLocaleString()}`;
}

export default function AddressContextCard({
  address,
  strategy,
  lookup,
  patch,
  onApplyLookup,
  defaults,
  onApplyDefaults,
}) {
  const [dismissed, setDismissed] = useState(false);
  const [appliedLookup, setAppliedLookup] = useState(false);
  const [appliedDefaults, setAppliedDefaults] = useState(false);

  if (dismissed) return null;

  const showLoading = !!(lookup?.loading && !lookup?.data);
  const data        = lookup?.data;
  const fillable    = Object.keys(patch || {}).length;
  const showLookup  = !!data && !lookup?.error;
  const showDefaults = !!defaults?.cityLabel;

  // Nothing to show — silent.
  if (!showLoading && !showLookup && !showDefaults) return null;

  // Build the found-data bullet list from what the lookup returned
  const bits = [];
  if (data?.yearBuilt)      bits.push(`built ${data.yearBuilt}`);
  if (data?.squareFootage)  bits.push(`${Number(data.squareFootage).toLocaleString()} sqft`);
  if (data?.bedrooms)       bits.push(`${data.bedrooms}bd`);
  if (data?.assessedValue)  bits.push(`assessed ${fmt$(data.assessedValue)}`);
  if (data?.rentEstimate)   bits.push(`~${fmt$(data.rentEstimate)}/mo rent`);
  if (data?.zoning?.code)   bits.push(`zoning ${data.zoning.code}`);

  return (
    <div style={{
      marginTop: 12,
      padding: "14px 16px",
      background: "linear-gradient(180deg,rgba(212,175,55,0.06),rgba(0,12,31,0.02))",
      border: "1px solid rgba(212,175,55,0.32)",
      borderLeft: "3px solid var(--brass,#d4af37)",
      borderRadius: 6,
      position: "relative",
    }}>
      {/* Header — always visible */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, marginBottom: 12, flexWrap: "wrap",
      }}>
        <div style={{
          fontFamily: "'Geist Mono',ui-monospace,monospace",
          fontSize: 10.5, fontWeight: 700, letterSpacing: "1.3px",
          color: "var(--brass,#d4af37)", textTransform: "uppercase",
        }}>
          ▸ Address context{defaults?.cityLabel && defaults.cityLabel !== "Canadian" ? ` · ${defaults.cityLabel}` : ""}
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss address context"
          style={{
            background: "transparent", border: "none", color: "var(--dim,#94a3b8)",
            cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "2px 6px",
          }}
        >×</button>
      </div>

      {/* Loading state — shared BuddyLoading primitive */}
      {showLoading && (
        <div style={{padding:"4px 0"}}>
          <BuddyLoading label="looking up public records" tone="sub" />
        </div>
      )}

      {/* Public records subsection */}
      {showLookup && (
        <div style={{
          padding: "10px 12px",
          background: "rgba(34,197,94,0.05)",
          border: "1px solid rgba(34,197,94,0.28)",
          borderLeft: "2px solid var(--green-2,#22c55e)",
          borderRadius: 4,
          marginBottom: showDefaults ? 8 : 0,
        }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:6}}>
            <div style={{
              fontFamily: "'Geist Mono',ui-monospace,monospace",
              fontSize: 9.5, fontWeight: 700, letterSpacing: "1.1px",
              color: "var(--green,#16a34a)", textTransform: "uppercase",
            }}>
              ▸ Public records{data.source ? ` · ${String(data.source).slice(0, 24)}` : ""}
            </div>
            {appliedLookup ? (
              <span style={{
                fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 800,
                color: "var(--green,#16a34a)", letterSpacing: "0.5px", textTransform: "uppercase",
              }}>✓ Applied</span>
            ) : fillable > 0 ? (
              <button
                onClick={() => { onApplyLookup?.(); setAppliedLookup(true); }}
                style={{
                  background: "var(--green-2,#22c55e)", color: "#0a1128", border: "none",
                  borderRadius: 3, padding: "6px 10px",
                  fontFamily: "'Geist Mono',ui-monospace,monospace",
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.5px", cursor: "pointer",
                  textTransform: "uppercase", flexShrink: 0,
                }}
              >
                ▸ Auto-fill {fillable}
              </button>
            ) : null}
          </div>
          <div style={{fontSize: 12, color: "var(--sub,#475569)", lineHeight: 1.5}}>
            {bits.length > 0 ? bits.slice(0, 6).join(" · ") : "Data available"}
          </div>
        </div>
      )}

      {/* Smart defaults subsection */}
      {showDefaults && (
        <div style={{
          padding: "10px 12px",
          background: "rgba(212,175,55,0.06)",
          border: "1px solid rgba(212,175,55,0.28)",
          borderLeft: "2px solid var(--brass,#d4af37)",
          borderRadius: 4,
        }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginBottom:6}}>
            <div style={{
              fontFamily: "'Geist Mono',ui-monospace,monospace",
              fontSize: 9.5, fontWeight: 700, letterSpacing: "1.1px",
              color: "var(--brass,#d4af37)", textTransform: "uppercase",
            }}>
              ▸ {defaults.cityLabel} starter values
            </div>
            {appliedDefaults ? (
              <span style={{
                fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 800,
                color: "var(--brass,#d4af37)", letterSpacing: "0.5px", textTransform: "uppercase",
              }}>✓ Applied</span>
            ) : (
              <button
                onClick={() => { onApplyDefaults?.(); setAppliedDefaults(true); }}
                style={{
                  background: "var(--brass,#d4af37)", color: "#0a1128", border: "none",
                  borderRadius: 3, padding: "6px 10px",
                  fontFamily: "'Geist Mono',ui-monospace,monospace",
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.5px", cursor: "pointer",
                  textTransform: "uppercase", flexShrink: 0,
                }}
              >
                ▸ Apply defaults
              </button>
            )}
          </div>
          <div style={{fontSize: 12, color: "var(--sub,#475569)", lineHeight: 1.5}}>
            {defaults.previewText}
          </div>
        </div>
      )}
    </div>
  );
}
