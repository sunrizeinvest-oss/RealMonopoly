/**
 * <ZoningPanel address="9121 152 St NW, Edmonton" />
 *
 * Calls /api/zoning and renders a clean property-zoning report.
 * Drop into DealAnalyzer.jsx, PropertyHub.jsx, or anywhere a property is being analyzed.
 */

import { useEffect, useState } from "react";

export default function ZoningPanel({ address }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setError(null);
    fetch(`/api/zoning?address=${encodeURIComponent(address)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        setData(d);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [address]);

  if (!address) return null;
  if (loading) return <div className="zoning-panel loading">Looking up zoning…</div>;
  if (error) return <div className="zoning-panel error">⚠️ {error}</div>;
  if (!data) return null;

  const z = data.zoning;
  const a = data.assessment;
  const permits = data.nearbyPermits || [];

  if (!z || !z.found) {
    return (
      <div className="zoning-panel not-found">
        <h3>📍 Zoning</h3>
        <p>{z?._note || `No zoning data available for ${data.geocode?.city || "this location"}.`}</p>
        {z?.referenceZones && (
          <details>
            <summary>Reference: common zones in this city</summary>
            <ul>
              {Object.entries(z.referenceZones).map(([code, info]) => (
                <li key={code}><strong>{code}</strong> — {info.description}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="zoning-panel">
      <h3>📍 Zoning & Development Potential</h3>
      <table className="zoning-table">
        <tbody>
          <tr><td>Zone</td><td><strong>{z.zone}</strong> — {z.zoneDescription}</td></tr>
          {z.maxStoreys && <tr><td>Max storeys</td><td>{z.maxStoreys}</td></tr>}
          {z.maxHeightM && <tr><td>Max height</td><td>{z.maxHeightM} m</td></tr>}
          {z.maxFAR && <tr><td>Max FAR</td><td>{z.maxFAR}</td></tr>}
          {z.maxUnits && <tr><td>Max units</td><td>up to {z.maxUnits}</td></tr>}
          {z.minLotAreaM2 && <tr><td>Min lot area</td><td>{z.minLotAreaM2} m²</td></tr>}
        </tbody>
      </table>

      {a && (
        <>
          <h3>💰 Property Assessment</h3>
          <table className="zoning-table">
            <tbody>
              {a.assessedValue && <tr><td>Assessed value</td><td>${a.assessedValue.toLocaleString()}</td></tr>}
              {a.assessmentYear && <tr><td>Year</td><td>{a.assessmentYear}</td></tr>}
              {a.yearBuilt && <tr><td>Year built</td><td>{a.yearBuilt}</td></tr>}
              {a.buildingClass && <tr><td>Building class</td><td>{a.buildingClass}</td></tr>}
              {a.lotSizeSqM && <tr><td>Lot size</td><td>{a.lotSizeSqM.toLocaleString()} m²</td></tr>}
            </tbody>
          </table>
        </>
      )}

      {permits.length > 0 && (
        <>
          <h3>🏗 Nearby Development Activity ({permits.length} permits, last 2yr)</h3>
          <details>
            <summary>Show recent permits</summary>
            <ul>
              {permits.slice(0, 10).map((p, i) => (
                <li key={i}>
                  {p.issue_date || p.applieddate || ""} — {p.work_type || p.permittype || ""} — {p.permit_class || ""}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
