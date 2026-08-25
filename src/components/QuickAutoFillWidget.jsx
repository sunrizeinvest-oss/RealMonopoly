/**
 * QuickAutoFillWidget — self-contained "type an address → auto-fill known
 * fields" widget for calculators that don't have an address input built
 * into their form (Tax, MortgageQualifier, LoanCompare).
 *
 * Renders a compact card with:
 *   - Address input (its own internal state)
 *   - Loading / success banner via AddressAutoFillBanner
 *   - Caller-supplied onFill(lookupData) → maps the lookup response to the
 *     host calc's state setters
 *
 * Usage:
 *   <QuickAutoFillWidget
 *     hint="Paste an address to auto-fill purchase price + property tax"
 *     onFill={(data) => {
 *       if (data.assessedValue) setPurchasePrice(data.assessedValue);
 *       if (data.propertyTaxes) setPropTax(data.propertyTaxes);
 *     }}
 *   />
 */

import { useState, useMemo } from "react";
import { useAddressAutoFill } from "../lib/addressAutoFill";
import AddressAutoFillBanner from "./AddressAutoFillBanner";

export default function QuickAutoFillWidget({
  hint = "Type an address to auto-fill known values",
  onFill,
  computePatch,  // (lookupData) → patch object; controls what auto-fill button lights up
}) {
  const [address, setAddress] = useState("");
  const lookup = useAddressAutoFill(address, { minLength: 8 });

  // If no computePatch is supplied, default to "always allow fill" by
  // returning a synthetic non-empty object.
  const patch = useMemo(() => {
    if (!lookup.data) return {};
    if (typeof computePatch === "function") return computePatch(lookup.data);
    // Synthetic — makes the banner show "Auto-fill" button as long as data exists
    return { any: 1 };
  }, [lookup.data, computePatch]);

  return (
    <div style={{
      padding:"12px 14px",
      background:"rgba(212,175,55,0.04)",
      border:"1px solid rgba(212,175,55,0.28)",
      borderLeft:"3px solid #d4af37",
      borderRadius:6,
      marginBottom:16,
    }}>
      <div style={{
        fontFamily:"'Geist Mono',ui-monospace,monospace",
        fontSize:10.5,fontWeight:700,letterSpacing:"1.2px",
        color:"#d4af37",textTransform:"uppercase",marginBottom:8,
      }}>
        ▸ Quick auto-fill from address
      </div>
      <div style={{fontSize:12,color:"var(--sub)",marginBottom:8,lineHeight:1.5}}>
        {hint}
      </div>
      <input
        type="text"
        placeholder="e.g. 2424 Westmount Rd NW, Calgary AB"
        value={address}
        onChange={e => setAddress(e.target.value)}
        style={{
          width:"100%",
          background:"rgba(0,0,0,0.15)",color:"var(--text)",
          border:"1px solid var(--borderf)",borderRadius:4,
          padding:"10px 12px",fontFamily:"'Geist',sans-serif",fontSize:13,
          outline:"none",
        }}
      />
      <AddressAutoFillBanner
        loading={lookup.loading}
        data={lookup.data}
        error={lookup.error}
        patch={patch}
        onFill={() => { if (lookup.data && onFill) onFill(lookup.data); }}
      />
    </div>
  );
}
