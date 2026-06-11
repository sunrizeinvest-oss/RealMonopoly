import { useState, useEffect } from "react";
import ZoningMap from "./ZoningMap";

/**
 * PropertyIntelCard — drop-in zoning + assessment + permits + AI thesis card.
 *
 * Wraps the /api/zoning endpoint and /api/ai-chat?mode=zoning-thesis. Pass an
 * address; the component debounces, fetches, and renders the full intel card
 * the same way PropertyIntelligence.jsx does on /property — so a user
 * doing BRRRR or multifamily underwriting doesn't lose the live-data context.
 *
 * Renders nothing if the address isn't covered (Edmonton + Calgary today).
 * Renders nothing while loading — silent skeleton on first paint.
 */

const currency = n => n != null ? `$${Math.round(n).toLocaleString()}` : "—";

export default function PropertyIntelCard({ address }) {
  const [zoningData, setZoningData] = useState(null);
  const [zoningThesis, setZoningThesis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const addr = (address || "").trim();
    if (!addr || addr.length < 8) {
      setZoningData(null);
      setZoningThesis(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const handle = setTimeout(async () => {
      try {
        const r = await fetch(`/api/zoning?address=${encodeURIComponent(addr)}`);
        if (!r.ok) { setZoningData(null); setZoningThesis(null); return; }
        const data = await r.json();
        if (cancelled) return;
        setZoningData(data);

        if (data?.zoning?.found) {
          // Fire-and-forget AI thesis hint
          fetch(`/api/ai-chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode:       "zoning-thesis",
              zoning:     data.zoning,
              assessment: data.assessment,
              permits:    data.nearbyPermits,
              address:    addr,
            }),
          })
            .then(rr => rr.ok ? rr.json() : null)
            .then(t => { if (!cancelled && t?.thesis) setZoningThesis(t); })
            .catch(() => {});
        }
      } catch {
        if (!cancelled) { setZoningData(null); setZoningThesis(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 800); // debounce — user is likely still typing

    return () => { cancelled = true; clearTimeout(handle); };
  }, [address]);

  if (!zoningData?.zoning?.found) return null;

  const z = zoningData.zoning;
  const a = zoningData.assessment;
  const permits = zoningData.nearbyPermits || [];

  const zoningRows = [
    { lbl: "Zone",        val: `${z.zone}${z.zoneDescription ? ` — ${z.zoneDescription}` : ""}`, mono: false, strong: true },
    { lbl: "Max storeys", val: z.maxStoreys ?? "—", mono: true },
    { lbl: "Max height",  val: z.maxHeightM ? `${z.maxHeightM} m` : "—", mono: true },
    { lbl: "Max FAR",     val: z.maxFAR ?? "—", mono: true },
    { lbl: "Max units",   val: z.maxUnits ? `up to ${z.maxUnits} dwelling${z.maxUnits === 1 ? "" : "s"}` : "—", mono: false, strong: true },
  ];

  const assessmentRows = a ? [
    { lbl: "Assessed value", val: a.assessedValue ? currency(a.assessedValue) : "—", mono: true, strong: true },
    { lbl: "Year built",     val: a.yearBuilt ?? "—", mono: true },
    { lbl: "Neighbourhood",  val: a.neighbourhood ?? "—", mono: false },
    { lbl: "Ward",           val: a.ward ?? "—", mono: false },
    { lbl: "Tax class",      val: a.taxClass ?? a.buildingClass ?? "—", mono: false },
    { lbl: "Garage",         val: a.garage ?? "—", mono: false },
  ] : null;

  // Aggregate redevelopment signal from permit data — total units added + total construction value
  const permitTotals = permits.reduce((acc, p) => {
    const units = parseInt(p.units_added, 10);
    const val   = parseFloat(p.construction_value);
    if (!isNaN(units) && units > 0) acc.units += units;
    if (!isNaN(val)   && val   > 0) acc.value += val;
    if (p.work_type === "(01) Building - New" || /Building - New/i.test(p.work_type || "")) acc.newBuilds++;
    return acc;
  }, { units: 0, value: 0, newBuilds: 0 });

  return (
    <div style={{
      background: "var(--card, #f8fafc)",
      border: "1px solid var(--borderf, rgba(15,23,42,0.05))",
      borderRadius: 6,
      overflow: "hidden",
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px",
        background: "rgba(52,217,138,0.04)",
        borderBottom: "1px solid var(--borderf, rgba(15,23,42,0.05))",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 32, height: 22, border: "1px solid rgba(52,217,138,0.4)",
          borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
          color: "var(--green, #34d98a)", letterSpacing: "0.5px",
        }}>ZON</div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 700,
            color: "var(--green, #34d98a)", letterSpacing: "0.6px",
          }}>
            [ LIVE · {z.city?.toUpperCase()} OPEN DATA ]
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text, #0f172a)", marginTop: 2 }}>
            {z.zone}{z.zoneDescription ? ` — ${z.zoneDescription}` : ""}
          </div>
        </div>
        {z.bylawUrl && (
          <a href={z.bylawUrl} target="_blank" rel="noopener" style={{
            fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10, fontWeight: 600,
            color: "var(--blue, #3b9eff)", textDecoration: "none",
            padding: "4px 8px", border: "1px solid rgba(59,158,255,0.3)", borderRadius: 2,
          }}>BYLAW ↗</a>
        )}
      </div>

      {/* Neighbourhood activity map — pure SVG, no map lib */}
      {zoningData.geocode?.lat && zoningData.geocode?.lng && (
        <div style={{ padding: "1px 0 0", borderBottom: "1px solid var(--borderf, rgba(15,23,42,0.05))" }}>
          <ZoningMap
            center={{ lat: zoningData.geocode.lat, lng: zoningData.geocode.lng }}
            polygon={z.raw?.geometry_multipolygon}
            permits={permits}
            zone={z.zone}
            radiusM={600}
          />
        </div>
      )}

      {/* Two-column body */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 1,
        background: "var(--borderf, rgba(15,23,42,0.05))",
      }}>
        {/* Zoning */}
        <div style={{ background: "var(--card, #f8fafc)", padding: "14px 16px" }}>
          <div style={{
            fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
            color: "var(--green, #34d98a)", letterSpacing: "0.6px", marginBottom: 10,
          }}>▸ ZONING</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12.5 }}>
            {zoningRows.map(({ lbl, val, mono, strong }) => (
              <Row key={lbl} lbl={lbl} val={val} mono={mono} strong={strong} />
            ))}
          </div>
        </div>

        {/* Assessment */}
        <div style={{ background: "var(--card, #f8fafc)", padding: "14px 16px" }}>
          <div style={{
            fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
            color: "var(--amber, #f0a030)", letterSpacing: "0.6px", marginBottom: 10,
          }}>▸ PROPERTY ASSESSMENT</div>
          {assessmentRows ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12.5 }}>
              {assessmentRows.map(({ lbl, val, mono, strong }) => (
                <Row key={lbl} lbl={lbl} val={val} mono={mono} strong={strong} />
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--dim, #94a3b8)", fontStyle: "italic", lineHeight: 1.6, padding: "8px 0" }}>
              Not in residential assessment dataset (likely commercial parcel or address-match failed in city records).
            </div>
          )}
        </div>
      </div>

      {/* Permits */}
      {permits.length > 0 && (
        <div style={{ padding: "12px 16px 14px", borderTop: "1px solid var(--borderf, rgba(15,23,42,0.05))" }}>
          <div style={{
            display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap",
            marginBottom: 10,
          }}>
            <div style={{
              fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
              color: "var(--dim, #94a3b8)", letterSpacing: "0.6px",
            }}>
              ▸ NEARBY DEV PERMITS · {permits.length} IN 1KM / 2YR
            </div>
            {(permitTotals.units > 0 || permitTotals.newBuilds > 0) && (
              <div style={{
                display: "flex", gap: 12, fontFamily: "'Geist Mono',ui-monospace,monospace",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.5px",
              }}>
                {permitTotals.newBuilds > 0 && (
                  <span style={{ color: "var(--green, #34d98a)" }}>
                    ▸ {permitTotals.newBuilds} NEW BUILDS
                  </span>
                )}
                {permitTotals.units > 0 && (
                  <span style={{ color: "var(--green, #34d98a)" }}>
                    ▸ +{permitTotals.units} UNITS
                  </span>
                )}
                {permitTotals.value > 0 && (
                  <span style={{ color: "var(--blue, #3b9eff)" }}>
                    ▸ {currency(permitTotals.value)} CONSTR. VALUE
                  </span>
                )}
              </div>
            )}
          </div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "90px 1.3fr 1.3fr 90px 55px", gap: 8,
            fontSize: 10, fontWeight: 700, color: "var(--dim, #94a3b8)", letterSpacing: "0.5px",
            textTransform: "uppercase", paddingBottom: 6,
            borderBottom: "1px solid var(--borderf, rgba(15,23,42,0.05))",
            fontFamily: "'Geist Mono',ui-monospace,monospace",
            minWidth: 560,
          }}>
            <span>Date</span>
            <span>Work / Type</span>
            <span>Address</span>
            <span style={{ textAlign: "right" }}>Value</span>
            <span style={{ textAlign: "right" }}>Units</span>
          </div>
          <div style={{ maxHeight: 280, overflowY: "auto", minWidth: 560 }}>
            {permits.map((p, i) => {
              const work = p.work_type || p.permit_type || p.work_type_group || "—";
              const bldg = p.building_type ? ` · ${p.building_type.replace(/\s*\(\d+\)\s*/, "")}` : "";
              const value = parseFloat(p.construction_value);
              const units = parseInt(p.units_added, 10);
              return (
                <div
                  key={i}
                  title={p.job_description || ""}
                  style={{
                    display: "grid", gridTemplateColumns: "90px 1.3fr 1.3fr 90px 55px", gap: 8,
                    padding: "6px 0",
                    borderBottom: i < permits.length - 1 ? "1px dashed rgba(15,23,42,0.04)" : "none",
                    fontSize: 11.5, alignItems: "baseline",
                    cursor: p.job_description ? "help" : "default",
                  }}
                >
                  <span style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", color: "var(--dim, #94a3b8)", fontSize: 10.5 }}>
                    {(p.permit_date || p.applieddate || p.issue_date || "").slice(0, 10) || "—"}
                  </span>
                  <span style={{ color: "var(--sub, #475569)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {work}{bldg}
                  </span>
                  <span style={{ color: "var(--text, #0f172a)", fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.address || p.house_number || "—"}
                  </span>
                  <span style={{
                    textAlign: "right", fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10.5,
                    color: !isNaN(value) && value > 0 ? "var(--blue, #3b9eff)" : "var(--dim, #94a3b8)",
                  }}>
                    {!isNaN(value) && value > 0 ? `$${Math.round(value / 1000)}K` : "—"}
                  </span>
                  <span style={{
                    textAlign: "right", fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 11,
                    color: !isNaN(units) && units > 0 ? "var(--green, #34d98a)" : "var(--dim, #94a3b8)",
                    fontWeight: !isNaN(units) && units > 0 ? 700 : 400,
                  }}>
                    {!isNaN(units) && units > 0 ? `+${units}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          </div>
          <div style={{
            marginTop: 6,
            fontFamily: "'Geist Mono',ui-monospace,monospace",
            fontSize: 9.5, color: "var(--dim, #94a3b8)", letterSpacing: "0.4px",
          }}>
            ▸ Hover any row for the full job description
          </div>
        </div>
      )}

      {/* AI Thesis Hint */}
      {zoningThesis?.thesis && (
        <div style={{
          margin: "0 16px 14px",
          padding: "12px 14px",
          background: "rgba(52,217,138,0.06)",
          borderLeft: "3px solid var(--green, #34d98a)",
          borderRadius: "0 4px 4px 0",
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 14, lineHeight: 1.4 }}>🤖</span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
              color: "var(--green, #34d98a)", letterSpacing: "0.7px", marginBottom: 4,
            }}>
              AI THESIS HINT
              {zoningThesis.source && zoningThesis.source !== "template" && (
                <span style={{ color: "var(--dim, #94a3b8)", fontWeight: 500, marginLeft: 6 }}>
                  · {zoningThesis.source}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text, #0f172a)", lineHeight: 1.55 }}>
              {zoningThesis.thesis}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ lbl, val, mono, strong }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      gap: 10, paddingBottom: 5, borderBottom: "1px solid rgba(15,23,42,0.04)",
    }}>
      <span style={{ color: "var(--sub, #475569)", fontSize: 12 }}>{lbl}</span>
      <span style={{
        color: "var(--text, #0f172a)",
        fontWeight: strong ? 700 : 500,
        fontFamily: mono ? "'Geist Mono',ui-monospace,monospace" : "inherit",
        textAlign: "right",
      }}>{val}</span>
    </div>
  );
}
