import { useState, useEffect } from "react";

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
    { lbl: "Tax class",      val: a.taxClass ?? a.buildingClass ?? "—", mono: false },
    { lbl: "Garage",         val: a.garage ?? "—", mono: false },
  ] : null;

  return (
    <div style={{
      background: "var(--card, #0d1119)",
      border: "1px solid var(--borderf, rgba(255,255,255,0.05))",
      borderRadius: 6,
      overflow: "hidden",
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px",
        background: "rgba(52,217,138,0.04)",
        borderBottom: "1px solid var(--borderf, rgba(255,255,255,0.05))",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 32, height: 22, border: "1px solid rgba(52,217,138,0.4)",
          borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
          color: "var(--green, #34d98a)", letterSpacing: "0.5px",
        }}>ZON</div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10, fontWeight: 700,
            color: "var(--green, #34d98a)", letterSpacing: "0.6px",
          }}>
            [ LIVE · {z.city?.toUpperCase()} OPEN DATA ]
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text, #dde4ef)", marginTop: 2 }}>
            {z.zone}{z.zoneDescription ? ` — ${z.zoneDescription}` : ""}
          </div>
        </div>
        {z.bylawUrl && (
          <a href={z.bylawUrl} target="_blank" rel="noopener" style={{
            fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 10, fontWeight: 600,
            color: "var(--blue, #3b9eff)", textDecoration: "none",
            padding: "4px 8px", border: "1px solid rgba(59,158,255,0.3)", borderRadius: 2,
          }}>BYLAW ↗</a>
        )}
      </div>

      {/* Two-column body */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 1,
        background: "var(--borderf, rgba(255,255,255,0.05))",
      }}>
        {/* Zoning */}
        <div style={{ background: "var(--card, #0d1119)", padding: "14px 16px" }}>
          <div style={{
            fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
            color: "var(--green, #34d98a)", letterSpacing: "0.6px", marginBottom: 10,
          }}>▸ ZONING</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12.5 }}>
            {zoningRows.map(({ lbl, val, mono, strong }) => (
              <Row key={lbl} lbl={lbl} val={val} mono={mono} strong={strong} />
            ))}
          </div>
        </div>

        {/* Assessment */}
        <div style={{ background: "var(--card, #0d1119)", padding: "14px 16px" }}>
          <div style={{
            fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
            color: "var(--amber, #f0a030)", letterSpacing: "0.6px", marginBottom: 10,
          }}>▸ PROPERTY ASSESSMENT</div>
          {assessmentRows ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12.5 }}>
              {assessmentRows.map(({ lbl, val, mono, strong }) => (
                <Row key={lbl} lbl={lbl} val={val} mono={mono} strong={strong} />
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--dim, #3a4a60)", fontStyle: "italic", lineHeight: 1.6, padding: "8px 0" }}>
              Not in residential assessment dataset (likely commercial parcel or address-match failed in city records).
            </div>
          )}
        </div>
      </div>

      {/* Permits */}
      {permits.length > 0 && (
        <div style={{ padding: "12px 16px 14px", borderTop: "1px solid var(--borderf, rgba(255,255,255,0.05))" }}>
          <div style={{
            fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
            color: "var(--dim, #3a4a60)", letterSpacing: "0.6px", marginBottom: 8,
          }}>
            ▸ NEARBY DEV PERMITS · {permits.length} IN 1KM / 2YR
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "100px 1fr 1.4fr", gap: 8,
            fontSize: 10, fontWeight: 700, color: "var(--dim, #3a4a60)", letterSpacing: "0.5px",
            textTransform: "uppercase", paddingBottom: 6,
            borderBottom: "1px solid var(--borderf, rgba(255,255,255,0.05))",
            fontFamily: "'Fira Code',ui-monospace,monospace",
          }}>
            <span>Date</span><span>Work</span><span>Address</span>
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {permits.map((p, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "100px 1fr 1.4fr", gap: 8,
                padding: "6px 0",
                borderBottom: i < permits.length - 1 ? "1px dashed rgba(255,255,255,0.04)" : "none",
                fontSize: 11.5, alignItems: "baseline",
              }}>
                <span style={{ fontFamily: "'Fira Code',ui-monospace,monospace", color: "var(--dim, #3a4a60)" }}>
                  {(p.permit_date || p.applieddate || "").slice(0, 10) || "—"}
                </span>
                <span style={{ color: "var(--sub, #6b7d96)" }}>
                  {p.work_type || p.permit_type || p.work_type_group || "—"}
                </span>
                <span style={{ color: "var(--text, #dde4ef)", fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 11 }}>
                  {p.address || p.house_number || "—"}
                </span>
              </div>
            ))}
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
              fontFamily: "'Fira Code',ui-monospace,monospace", fontSize: 9.5, fontWeight: 700,
              color: "var(--green, #34d98a)", letterSpacing: "0.7px", marginBottom: 4,
            }}>
              AI THESIS HINT
              {zoningThesis.source && zoningThesis.source !== "template" && (
                <span style={{ color: "var(--dim, #3a4a60)", fontWeight: 500, marginLeft: 6 }}>
                  · {zoningThesis.source}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text, #dde4ef)", lineHeight: 1.55 }}>
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
      gap: 10, paddingBottom: 5, borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <span style={{ color: "var(--sub, #6b7d96)", fontSize: 12 }}>{lbl}</span>
      <span style={{
        color: "var(--text, #dde4ef)",
        fontWeight: strong ? 700 : 500,
        fontFamily: mono ? "'Fira Code',ui-monospace,monospace" : "inherit",
        textAlign: "right",
      }}>{val}</span>
    </div>
  );
}
