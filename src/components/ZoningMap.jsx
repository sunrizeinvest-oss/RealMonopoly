import { useMemo } from "react";

/**
 * ZoningMap — pure-SVG "neighborhood activity" map.
 *
 * Renders a Bloomberg-terminal-style top-down view of the property and the
 * surrounding 1km radius. No external map library, no tile providers, no
 * API key — just SVG over the GeoJSON the /api/zoning endpoint already
 * returns. Falls back to null silently if no usable geometry is present.
 *
 * Plots:
 *   - the property itself as a pulsing green LED
 *   - the zoning district polygon clipped to the viewport (low-opacity fill)
 *   - every nearby development permit as a dot, color-coded by work type
 *     and sized by units_added (a building-new with +8 units is BIG)
 *   - distance scale bar (200 m), compass arrow, coordinate readout
 *
 * Props:
 *   center:    { lat, lng }                  — property lat/lng (required)
 *   polygon:   GeoJSON MultiPolygon          — zoning district boundary (optional)
 *   permits:   array of {latitude,longitude,work_type,units_added,address}
 *                                            — nearby permits (optional)
 *   zone:      string                        — zone code label (e.g. "RS", "R-CG")
 *   radiusM:   number                        — half-width of viewport in metres (default 600)
 */
export default function ZoningMap({ center, polygon, permits = [], zone = "", radiusM = 600 }) {
  if (!center?.lat || !center?.lng) return null;

  // ── Projection — equirectangular is exact at this scale ─────────────────
  // Convert metres to degree offsets at the property's latitude
  const latRad = (center.lat * Math.PI) / 180;
  const mPerDegLat = 111_320;                        // constant
  const mPerDegLng = 111_320 * Math.cos(latRad);     // shrinks with latitude
  const halfLng = radiusM / mPerDegLng;
  const halfLat = radiusM / mPerDegLat;
  const bbox = {
    minLng: center.lng - halfLng, maxLng: center.lng + halfLng,
    minLat: center.lat - halfLat, maxLat: center.lat + halfLat,
  };

  // SVG viewport — 600 × 360, fits the card width
  const VW = 600, VH = 360;
  const project = (lng, lat) => {
    const x = ((lng - bbox.minLng) / (bbox.maxLng - bbox.minLng)) * VW;
    // SVG Y is top-down, so invert
    const y = VH - ((lat - bbox.minLat) / (bbox.maxLat - bbox.minLat)) * VH;
    return [x, y];
  };

  // ── Build zoning polygon path ────────────────────────────────────────────
  const polygonPath = useMemo(() => {
    if (!polygon) return null;
    const rings =
      polygon.type === "MultiPolygon"
        ? polygon.coordinates.flat(1)       // [[ring], [ring], ...]
        : polygon.type === "Polygon"
        ? polygon.coordinates               // [ring, ring, ...]
        : null;
    if (!rings?.length) return null;

    const parts = [];
    for (const ring of rings) {
      if (!Array.isArray(ring) || ring.length < 3) continue;
      const path = ring.map(([lng, lat], i) => {
        const [x, y] = project(lng, lat);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");
      parts.push(path + " Z");
    }
    return parts.join(" ");
  }, [polygon, center.lat, center.lng, radiusM]);

  // ── Filter permits to those inside the viewport ──────────────────────────
  const visiblePermits = useMemo(() => {
    return (permits || [])
      .map(p => {
        const lat = parseFloat(p.latitude);
        const lng = parseFloat(p.longitude);
        if (isNaN(lat) || isNaN(lng)) return null;
        if (lat < bbox.minLat || lat > bbox.maxLat || lng < bbox.minLng || lng > bbox.maxLng) return null;
        const [x, y] = project(lng, lat);
        const units = parseInt(p.units_added, 10) || 0;
        const isNew = /Building - New/i.test(p.work_type || "");
        const isAlt = /Alterations|Reno/i.test(p.work_type || "");
        const color = isNew ? "#34d98a" : isAlt ? "#f0a030" : "#3b9eff";
        const r = isNew ? Math.max(5, Math.min(11, 4 + units * 0.8)) : 4;
        return { x, y, r, color, work: p.work_type, addr: p.address, units, value: parseFloat(p.construction_value) || 0 };
      })
      .filter(Boolean);
  }, [permits, center.lat, center.lng, radiusM]);

  const [propX, propY] = project(center.lng, center.lat);

  // Scale bar: 200 metres in viewport pixels
  const scaleM = 200;
  const scalePx = (scaleM / (radiusM * 2)) * VW;

  return (
    <div style={{
      background: "#040608",
      border: "1px solid var(--borderf, rgba(15,23,42,0.05))",
      borderRadius: 6,
      padding: 0,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Header bar */}
      <div style={{
        position: "absolute", top: 8, left: 12, right: 12, zIndex: 2,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        pointerEvents: "none",
      }}>
        <div style={{
          fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 700,
          color: "var(--green, #34d98a)", letterSpacing: "1.4px",
        }}>
          ▸ NEIGHBOURHOOD MAP{zone ? ` · ZONE ${zone}` : ""}
        </div>
        <div style={{
          fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9, fontWeight: 700,
          color: "var(--dim, #3a4a60)", letterSpacing: "1.2px",
        }}>
          {(radiusM * 2 / 1000).toFixed(1)}KM × {(radiusM * 2 / 1000).toFixed(1)}KM
        </div>
      </div>

      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Grid */}
        <defs>
          <pattern id="zm-grid" width={VW / 10} height={VH / 6} patternUnits="userSpaceOnUse">
            <path d={`M ${VW / 10} 0 L 0 0 0 ${VH / 6}`} fill="none" stroke="rgba(15,23,42,0.04)" strokeWidth="1"/>
          </pattern>
          <radialGradient id="zm-prop-glow">
            <stop offset="0%"  stopColor="#34d98a" stopOpacity="0.9"/>
            <stop offset="50%" stopColor="#34d98a" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#34d98a" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect width={VW} height={VH} fill="url(#zm-grid)"/>

        {/* Zoning district polygon */}
        {polygonPath && (
          <>
            <path d={polygonPath} fill="rgba(52,217,138,0.06)" stroke="rgba(52,217,138,0.4)" strokeWidth="1.2" fillRule="evenodd"/>
            <path d={polygonPath} fill="none" stroke="rgba(52,217,138,0.25)" strokeWidth="3" fillRule="evenodd" style={{ mixBlendMode: "screen" }}/>
          </>
        )}

        {/* Permit dots */}
        {visiblePermits.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={p.r * 1.6} fill={p.color} opacity={0.18}/>
            <circle cx={p.x} cy={p.y} r={p.r}       fill={p.color} opacity={0.95}>
              <title>{[p.work, p.addr, p.units ? `+${p.units} units` : null, p.value ? `$${Math.round(p.value/1000)}K value` : null].filter(Boolean).join(" · ")}</title>
            </circle>
          </g>
        ))}

        {/* Property — big glowing LED */}
        <circle cx={propX} cy={propY} r={32} fill="url(#zm-prop-glow)"/>
        <circle cx={propX} cy={propY} r={9}  fill="#34d98a" stroke="#ffffff" strokeWidth="2"/>
        <circle cx={propX} cy={propY} r={4}  fill="#fff"/>
        {/* Cross-hair */}
        <line x1={propX - 18} y1={propY} x2={propX - 12} y2={propY} stroke="#34d98a" strokeWidth="1.4"/>
        <line x1={propX + 12} y1={propY} x2={propX + 18} y2={propY} stroke="#34d98a" strokeWidth="1.4"/>
        <line x1={propX} y1={propY - 18} x2={propX} y2={propY - 12} stroke="#34d98a" strokeWidth="1.4"/>
        <line x1={propX} y1={propY + 12} x2={propX} y2={propY + 18} stroke="#34d98a" strokeWidth="1.4"/>

        {/* Compass — top-right of map */}
        <g transform={`translate(${VW - 38}, 40)`}>
          <circle r={16} fill="rgba(0,0,0,0.55)" stroke="rgba(15,23,42,0.08)" strokeWidth="1"/>
          <polygon points="0,-10 4,2 0,-2 -4,2" fill="#34d98a"/>
          <polygon points="0,10  4,-2 0,2  -4,-2" fill="rgba(255,255,255,0.2)"/>
          <text x="0" y="-19" textAnchor="middle" fill="#34d98a"
                style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 8, fontWeight: 700, letterSpacing: 1 }}>N</text>
        </g>

        {/* Scale bar — bottom-left */}
        <g transform={`translate(20, ${VH - 26})`}>
          <line x1={0} y1={0} x2={scalePx} y2={0} stroke="rgba(255,255,255,0.55)" strokeWidth="1.6"/>
          <line x1={0} y1={-3} x2={0} y2={3} stroke="rgba(255,255,255,0.55)" strokeWidth="1.6"/>
          <line x1={scalePx} y1={-3} x2={scalePx} y2={3} stroke="rgba(255,255,255,0.55)" strokeWidth="1.6"/>
          <text x={scalePx / 2} y={14} textAnchor="middle" fill="rgba(255,255,255,0.55)"
                style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9, fontWeight: 700, letterSpacing: 0.8 }}>
            {scaleM} m
          </text>
        </g>

        {/* Coordinate readout — bottom-right */}
        <text x={VW - 12} y={VH - 12} textAnchor="end" fill="rgba(255,255,255,0.35)"
              style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9, fontWeight: 700, letterSpacing: 0.6 }}>
          {center.lat.toFixed(4)}°{center.lat >= 0 ? "N" : "S"} · {Math.abs(center.lng).toFixed(4)}°{center.lng >= 0 ? "E" : "W"}
        </text>
      </svg>

      {/* Legend */}
      <div style={{
        padding: "8px 14px",
        background: "rgba(0,0,0,0.45)",
        borderTop: "1px solid var(--borderf, rgba(15,23,42,0.05))",
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.8px", color: "var(--sub, #6b7d96)",
      }}>
        <LegendDot color="#34d98a" label="NEW BUILD"/>
        <LegendDot color="#f0a030" label="RENO"/>
        <LegendDot color="#3b9eff" label="OTHER"/>
        <span style={{ marginLeft: "auto", color: "var(--dim, #3a4a60)" }}>
          DOT SIZE = UNITS ADDED · {visiblePermits.length} PERMITS VISIBLE
        </span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: color, boxShadow: `0 0 6px ${color}80`,
      }}/>
      <span style={{ color }}>{label}</span>
    </span>
  );
}
