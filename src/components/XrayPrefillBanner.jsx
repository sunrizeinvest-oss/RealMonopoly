/**
 * XrayPrefillBanner — small dismissible banner shown on calculator pages
 * when an X-Ray scan ran on the landing within the last 30 minutes.
 *
 * "From your X-Ray scan on 2424 Westmount Rd NW · 2m ago [✕ clear]"
 *
 * Props:
 *   data:      the prefill payload from getXrayPrefill()
 *   onClear:   () => void — fired when the user dismisses (or auto-dismiss)
 */

import { formatAge } from "../lib/xrayPrefill";

export default function XrayPrefillBanner({ data, onClear }) {
  if (!data?.address) return null;
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:12, flexWrap:"wrap",
      padding:"10px 14px",
      background:"linear-gradient(90deg,rgba(212,175,55,0.08) 0%,rgba(0,102,204,0.04) 100%)",
      border:"1px solid rgba(212,175,55,0.32)",
      borderLeft:"3px solid #d4af37",
      borderRadius:6,
      marginBottom:14,
      fontFamily:"'Geist',sans-serif",
    }}>
      <div style={{fontSize:16}}>🎯</div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:10,fontWeight:700,letterSpacing:"1.2px",color:"#d4af37",textTransform:"uppercase",marginBottom:2}}>
          ▸ From your X-Ray scan · {formatAge(data.ts)}
        </div>
        <div style={{fontSize:13,color:"#0f172a",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          <strong>{data.address}</strong>
          {data.zoning?.code && <span style={{color:"#475569",marginLeft:8}}>· {data.zoning.code}</span>}
          {data.yearBuilt   && <span style={{color:"#475569",marginLeft:8}}>· Built {Math.floor(parseFloat(data.yearBuilt))}</span>}
          {data.assessedValue && <span style={{color:"#475569",marginLeft:8}}>· ${Math.round(data.assessedValue).toLocaleString()}</span>}
        </div>
      </div>
      <button
        onClick={onClear}
        title="Clear prefill"
        style={{
          background:"transparent", border:"none",
          fontFamily:"'Geist Mono',ui-monospace,monospace",
          fontSize:10, fontWeight:700, letterSpacing:"1px",
          color:"#475569", cursor:"pointer", padding:"4px 8px",
          borderRadius:3,
        }}
        onMouseOver={e => { e.currentTarget.style.background="rgba(15,23,42,0.06)"; }}
        onMouseOut={e  => { e.currentTarget.style.background="transparent"; }}
      >
        ✕ CLEAR
      </button>
    </div>
  );
}
