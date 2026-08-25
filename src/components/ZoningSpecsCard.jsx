import { useMemo } from "react";
import { getZoningSpecs, getBylawUrl, estimateBuildableEnvelope } from "../lib/zoningSpecs.js";

/**
 * ZoningSpecsCard — dimensional zoning limits at a glance.
 *
 * Takes a zoning code + city and renders a 6-tile grid showing:
 *   • Max height (m)
 *   • Max FAR
 *   • Max lot coverage %
 *   • Max units per lot
 *   • Min lot area
 *   • Setbacks (front / rear / side)
 *
 * When the code isn't in our registry, shows a placeholder pointing to
 * the official bylaw. Better honest gap than confident hallucination.
 */
export default function ZoningSpecsCard({ code, city, lotSize }) {
  const specs = useMemo(() => getZoningSpecs(code, city), [code, city]);
  const bylawUrl = useMemo(() => getBylawUrl(city), [city]);
  const envelope = useMemo(
    () => estimateBuildableEnvelope(specs, lotSize),
    [specs, lotSize]
  );

  if (!code) return null;

  const fmt = (v, suffix) => (v == null ? "—" : `${v}${suffix || ""}`);
  const fmtPct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);
  const fmtM2 = (v) => (v == null ? "—" : `${v.toLocaleString()} m²`);

  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--borderf)",
      borderRadius: "10px",
      padding: "16px 18px",
      margin: "0 16px 14px",
    }}>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        marginBottom: 12, gap: 10, flexWrap: "wrap",
      }}>
        <div>
          <div style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 9.5, fontWeight: 700, color: "var(--brass)",
            letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 4,
          }}>
            ▸ DIMENSIONAL SPECS · {code}
          </div>
          {specs && (
            <div style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 600 }}>
              {specs.name}
            </div>
          )}
        </div>
        {bylawUrl && (
          <a href={bylawUrl} target="_blank" rel="noopener noreferrer" style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 10.5, color: "var(--sub)", textDecoration: "underline",
            textDecorationColor: "rgba(15,23,42,0.15)", textUnderlineOffset: 2,
          }}>
            View full bylaw ↗
          </a>
        )}
      </div>

      {specs ? (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 10,
            marginBottom: 12,
          }}>
            <SpecTile label="Max height"    value={fmt(specs.maxHeightM, " m")} />
            <SpecTile label="Max FAR"       value={fmt(specs.maxFAR, "×")} />
            <SpecTile label="Max coverage"  value={fmtPct(specs.maxCoverage)} />
            <SpecTile label="Max units/lot" value={fmt(specs.maxUnits)} />
            <SpecTile label="Min lot area"  value={fmtM2(specs.minLotAreaM2)} />
            <SpecTile
              label="Setbacks (F/R/S)"
              value={
                specs.setbacks
                  ? `${specs.setbacks.front}/${specs.setbacks.rear}/${specs.setbacks.side} m`
                  : "—"
              }
            />
          </div>

          {specs.permittedUses && (
            <div style={{
              fontSize: 12, color: "var(--sub)", lineHeight: 1.5,
              padding: "8px 10px",
              background: "rgba(212,175,55,0.05)",
              borderLeft: "3px solid var(--brass)",
              borderRadius: "0 4px 4px 0",
              marginBottom: 10,
            }}>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9.5, fontWeight: 700, color: "var(--brass)", letterSpacing: "0.5px", marginRight: 8 }}>USES</span>
              {specs.permittedUses}
            </div>
          )}

          {envelope && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 10,
              padding: "10px 12px",
              background: "rgba(33,85,205,0.05)",
              border: "1px solid rgba(33,85,205,0.15)",
              borderRadius: 6,
              marginBottom: specs.note ? 10 : 0,
            }}>
              <SpecTile label="Storeys (max)"  value={`${envelope.storeys}`} tone="royal" />
              <SpecTile label="Buildable"     value={`${envelope.buildableSqft.toLocaleString()} ft²`} tone="royal" />
              <SpecTile label="Limited by"    value={envelope.limitedBy} tone="royal" />
            </div>
          )}

          {specs.note && (
            <div style={{
              fontSize: 11.5, color: "var(--sub)", lineHeight: 1.5, fontStyle: "italic",
            }}>
              {specs.note}
            </div>
          )}
        </>
      ) : (
        <div style={{
          padding: "16px 14px",
          background: "rgba(15,23,42,0.03)",
          border: "1px dashed var(--borderf)",
          borderRadius: 6,
          fontSize: 12, color: "var(--sub)", lineHeight: 1.5,
        }}>
          Dimensional specs for <b style={{ color: "var(--text)", fontFamily: "'Geist Mono', monospace" }}>{code}</b> aren't in our verified registry yet.
          {bylawUrl ? (
            <> Check the <a href={bylawUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brass)", fontWeight: 700 }}>full bylaw</a> for max height, FAR, setbacks, and permitted uses.</>
          ) : (
            <> Ask us to add this code — email sunni@rizedevelopments.com.</>
          )}
        </div>
      )}
    </div>
  );
}

function SpecTile({ label, value, tone }) {
  const isRoyal = tone === "royal";
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      padding: "8px 10px",
      background: isRoyal ? "transparent" : "rgba(212,175,55,0.05)",
      borderRadius: 6,
      border: isRoyal ? "none" : "1px solid rgba(212,175,55,0.15)",
    }}>
      <div style={{
        fontFamily: "'Geist Mono', monospace",
        fontSize: 9.5, fontWeight: 700,
        color: isRoyal ? "var(--royal)" : "var(--brass-2)",
        letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Geist Mono', monospace",
        fontSize: 14, fontWeight: 700, color: "var(--text)",
        letterSpacing: "-0.3px",
      }}>
        {value}
      </div>
    </div>
  );
}
