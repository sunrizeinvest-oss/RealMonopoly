/**
 * DealReadout — the "real estate buddy" widget for calculator pages.
 *
 * Drops into BRRRR / Commercial / Flip / Property Hub. Takes the current
 * deal context + computed metrics and renders:
 *
 *   - Verdict pill (Strong / OK / Caution / Weak) — at-a-glance read
 *   - 3-5 metric cards with YOUR value vs the city benchmark + a 1-line
 *     plain-English coaching note ("DSCR below 1.20 will fail most banks")
 *   - 3 contextual action buttons (Generate IC memo / Add to pipeline /
 *     Compare to past deals)
 *
 * Complements the existing DealCoach (floating chat panel) — DealCoach is
 * conversational, DealReadout is at-a-glance + actionable.
 *
 * Props:
 *   strategy   — "brrrr" | "multifamily" | "flip" | "rental"
 *   address    — string, used to infer citySlug
 *   metrics    — { dscr, capRate, coc, irr, flipMargin } (whichever apply)
 *   actions    — [{ label, onClick, primary?, icon? }] optional CTAs
 *   compact    — render inline panel (no sticky position) — use on mobile
 *   intro      — optional override for the verdict sub-line
 */

import { useMemo } from "react";
import {
  detectCitySlug,
  getCapRateBenchmark,
  getFlipMarginBenchmark,
  getDscrThresholds,
  getCoCThresholds,
  getIrrThresholds,
  coachingNote,
} from "../lib/benchmarks";

const STRATEGY_LABELS = {
  brrrr:       "BRRRR",
  multifamily: "Multifamily",
  flip:        "Fix & Flip",
  rental:      "Buy & Hold",
};

const TONE_COLORS = {
  great:    { bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.3)",  text: "#16a34a", label: "Excellent" },
  ok:       { bg: "rgba(33,85,205,0.08)",  border: "rgba(33,85,205,0.28)", text: "#2155cd", label: "Solid" },
  caution:  { bg: "rgba(212,175,55,0.10)", border: "rgba(212,175,55,0.35)", text: "#b8941f", label: "Caution" },
  warn:     { bg: "rgba(220,38,38,0.08)",  border: "rgba(220,38,38,0.3)",  text: "#dc2626", label: "Weak" },
  unknown:  { bg: "rgba(148,163,184,0.06)",border: "rgba(148,163,184,0.2)",text: "#94a3b8", label: "—" },
};

function fmtMetric(metric, value) {
  if (value == null || !isFinite(value)) return "—";
  if (metric === "dscr")        return value.toFixed(2);
  if (metric === "capRate")     return `${(value * 100).toFixed(2)}%`;
  if (metric === "coc")         return `${(value * 100).toFixed(1)}%`;
  if (metric === "irr")         return `${(value * 100).toFixed(1)}%`;
  if (metric === "flipMargin")  return `${(value * 100).toFixed(1)}%`;
  return String(value);
}

const METRIC_LABELS = {
  dscr:       "DSCR",
  capRate:    "Cap rate",
  coc:        "Cash-on-Cash",
  irr:        "IRR (5-yr)",
  flipMargin: "Margin on ARV",
};

const METRIC_BENCHMARK_TEXT = {
  dscr:       () => {
    const t = getDscrThresholds();
    return `Lender floor ${t.lenderFloor.toFixed(2)} · target ${t.competitive.toFixed(2)}`;
  },
  capRate:    (ctx) => {
    const b = getCapRateBenchmark(ctx.citySlug, ctx.propertyType);
    return `${ctx.citySlug !== "default" ? ctx.citySlug : "market"}: ${(b.low * 100).toFixed(1)}-${(b.high * 100).toFixed(1)}%`;
  },
  coc:        (ctx) => {
    const t = getCoCThresholds(ctx.strategy);
    return `${ctx.strategy} target ${(t.target * 100).toFixed(0)}%+`;
  },
  irr:        (ctx) => {
    const t = getIrrThresholds(ctx.strategy);
    return `${ctx.strategy} target ${(t.target * 100).toFixed(0)}%+`;
  },
  flipMargin: (ctx) => {
    const b = getFlipMarginBenchmark(ctx.citySlug);
    return `${ctx.citySlug !== "default" ? ctx.citySlug : "market"} target ${(b.target * 100).toFixed(0)}%+`;
  },
};

export default function DealReadout({
  strategy = "rental",
  address = "",
  metrics = {},
  actions = [],
  compact = false,
  intro = null,
  history = null,        // optional { count, rows, summary } from compareToHistory()
}) {
  const citySlug = useMemo(() => detectCitySlug(address), [address]);
  const propertyType = strategy === "flip"
    ? "flip"
    : strategy === "multifamily"
      ? "multifamily"
      : "rental";

  const metricRows = useMemo(() => {
    const ctx = { citySlug, strategy, propertyType };
    const rows = [];
    const keysInOrder = ["dscr", "capRate", "coc", "flipMargin", "irr"];
    for (const key of keysInOrder) {
      if (metrics[key] == null || !isFinite(metrics[key])) continue;
      const note = coachingNote(key, metrics[key], ctx);
      rows.push({
        key,
        label:      METRIC_LABELS[key],
        value:      fmtMetric(key, metrics[key]),
        benchmark:  METRIC_BENCHMARK_TEXT[key]?.(ctx) || "",
        note,
        tone:       note?.tone || "unknown",
      });
    }
    return rows;
  }, [metrics, citySlug, strategy, propertyType]);

  // Overall verdict — weakest metric wins. If 4 are great and 1 is weak,
  // the deal is weak. That's the truthful read.
  const overallTone = useMemo(() => {
    const ordered = ["warn", "caution", "ok", "great"];
    let worst = "great";
    for (const r of metricRows) {
      if (r.tone === "unknown") continue;
      if (ordered.indexOf(r.tone) < ordered.indexOf(worst)) worst = r.tone;
    }
    return metricRows.length === 0 ? "unknown" : worst;
  }, [metricRows]);

  const verdictColor = TONE_COLORS[overallTone] || TONE_COLORS.unknown;
  const verdictHeadline = {
    great:   "This is a strong deal.",
    ok:      "Looks solid.",
    caution: "Some metrics need attention.",
    warn:    "Several metrics are weak.",
    unknown: "Enter your deal details to see the read.",
  }[overallTone];

  const wrapStyle = compact
    ? { position: "static", width: "100%", maxWidth: "100%" }
    : { position: "sticky", top: 80, maxWidth: 340 };

  return (
    <div className="deal-readout" style={{
      ...wrapStyle,
      background: "linear-gradient(180deg,rgba(0,12,31,0.04),rgba(212,175,55,0.04) 100%)",
      border: "1px solid rgba(212,175,55,0.28)",
      borderLeft: `3px solid ${verdictColor.text}`,
      borderRadius: 8,
      padding: "18px 18px 14px",
      fontFamily: "'Geist',sans-serif",
    }}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,gap:10,flexWrap:"wrap"}}>
        <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:10,fontWeight:700,letterSpacing:"1.4px",color:"var(--brass,#d4af37)",textTransform:"uppercase"}}>
          ▸ Buddy Read
        </div>
        <span style={{
          fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:9.5,fontWeight:800,
          letterSpacing:"1px",textTransform:"uppercase",
          color:verdictColor.text,
          background:verdictColor.bg,
          border:`1px solid ${verdictColor.border}`,
          padding:"3px 8px",borderRadius:3,
        }}>
          {verdictColor.label}
        </span>
      </div>

      {/* Verdict line */}
      <div style={{fontSize:14.5,fontWeight:700,color:"var(--text,#0f172a)",letterSpacing:"-0.2px",lineHeight:1.4,marginBottom:6}}>
        {verdictHeadline}
      </div>
      <div style={{fontSize:12.5,color:"var(--sub,#475569)",lineHeight:1.6,marginBottom:14}}>
        {intro || (
          <>
            <strong style={{color:"var(--text,#0f172a)"}}>{STRATEGY_LABELS[strategy] || strategy}</strong>
            {address && <> · <span title={address}>{address.length > 36 ? address.slice(0, 36) + "…" : address}</span></>}
            {citySlug && citySlug !== "default" && <> · <span style={{color:"var(--brass,#d4af37)",fontWeight:700,textTransform:"capitalize"}}>{citySlug}</span> benchmarks</>}
          </>
        )}
      </div>

      {/* Metric rows */}
      {metricRows.length > 0 ? (
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {metricRows.map(row => {
            const tone = TONE_COLORS[row.tone] || TONE_COLORS.unknown;
            return (
              <div key={row.key} style={{
                background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(148,163,184,0.18)",
                borderLeft:`2px solid ${tone.text}`,
                borderRadius:5,
                padding:"10px 12px",
              }}>
                <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8,marginBottom:3}}>
                  <span style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:10.5,fontWeight:700,color:"var(--sub,#475569)",letterSpacing:"0.5px",textTransform:"uppercase"}}>
                    {row.label}
                  </span>
                  <span style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:14,fontWeight:800,color:tone.text,letterSpacing:"-0.3px"}}>
                    {row.value}
                  </span>
                </div>
                {row.benchmark && (
                  <div style={{fontSize:10,color:"var(--dim,#94a3b8)",fontFamily:"'Geist Mono',ui-monospace,monospace",letterSpacing:"0.2px",marginBottom:5}}>
                    {row.benchmark}
                  </div>
                )}
                {row.note && (
                  <div style={{fontSize:11.5,color:"var(--sub,#475569)",lineHeight:1.5}}>
                    {row.note.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{fontSize:12.5,color:"var(--dim,#94a3b8)",fontStyle:"italic",marginBottom:14,padding:"10px 0"}}>
          As you fill in deal details, this panel will show how your numbers compare to {citySlug !== "default" ? citySlug : "the market"} benchmarks.
        </div>
      )}

      {/* History comparison — only renders when caller passed a populated
          history object (user has 2+ past deals of this strategy). Shows
          how the current deal stacks vs the user's median past performance. */}
      {history?.rows?.length > 0 && (
        <div style={{
          marginBottom:14,
          padding:"10px 12px",
          background:"rgba(33,85,205,0.05)",
          border:"1px solid rgba(33,85,205,0.22)",
          borderLeft:"2px solid #2155cd",
          borderRadius:5,
        }}>
          <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:9.5,fontWeight:700,letterSpacing:"1.2px",color:"#2155cd",textTransform:"uppercase",marginBottom:8}}>
            ▸ {history.summary}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {history.rows.slice(0, 3).map(r => {
              const arrow = r.delta >= 0 ? "▲" : "▼";
              const arrowColor = r.tone === "great" ? "#16a34a" : "#b8941f";
              return (
                <div key={r.metric} style={{fontSize:11.5,color:"var(--sub,#475569)",lineHeight:1.5,display:"flex",alignItems:"baseline",gap:8}}>
                  <span style={{color:arrowColor,fontWeight:800,flexShrink:0,fontFamily:"'Geist Mono',ui-monospace,monospace"}}>{arrow}</span>
                  <span><strong style={{color:"var(--text,#0f172a)"}}>{r.label}:</strong> {r.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {actions.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:6,paddingTop:10,borderTop:"1px solid rgba(212,175,55,0.18)"}}>
          <div style={{fontFamily:"'Geist Mono',ui-monospace,monospace",fontSize:9.5,fontWeight:700,letterSpacing:"1.2px",color:"var(--dim,#94a3b8)",textTransform:"uppercase",marginBottom:4}}>
            What you can do next
          </div>
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              style={{
                display:"flex",alignItems:"center",gap:8,
                background: a.primary ? "#d4af37" : "transparent",
                color:      a.primary ? "#0a1128" : "var(--text,#0f172a)",
                border:     a.primary ? "none"   : "1px solid rgba(148,163,184,0.25)",
                borderRadius:5,
                padding:"9px 12px",
                fontFamily:"'Geist Mono',ui-monospace,monospace",
                fontSize:11,fontWeight:700,letterSpacing:"0.4px",
                cursor:"pointer",
                textAlign:"left",
                width:"100%",
                transition:"all 0.15s",
              }}
              onMouseOver={e => {
                if (a.primary) e.currentTarget.style.background = "#e6c252";
                else e.currentTarget.style.background = "rgba(212,175,55,0.06)";
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = a.primary ? "#d4af37" : "transparent";
              }}
            >
              {a.icon && <span style={{fontSize:13}}>{a.icon}</span>}
              <span style={{flex:1}}>{a.label}</span>
              <span style={{opacity:0.6}}>→</span>
            </button>
          ))}
        </div>
      )}

      {/* Foot */}
      <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid rgba(212,175,55,0.18)",fontSize:11,color:"var(--dim,#94a3b8)",fontFamily:"'Geist Mono',ui-monospace,monospace",letterSpacing:"0.2px",lineHeight:1.5}}>
        Benchmarks from CBRE + CMHC. Educational — verify with your lender + accountant.
      </div>
    </div>
  );
}
