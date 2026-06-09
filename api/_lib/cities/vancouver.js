/**
 * Vancouver city adapter — Opendatasoft API at opendata.vancouver.ca.
 *
 * Datasets:
 *   - zoning-districts-and-labels  → district polygons with ZONE code
 *   - property-tax-report          → assessed value (best-effort lookup)
 *   - issued-building-permits      → recent permits in radius
 *
 * The Opendatasoft v2 explore API uses ODSQL. For point-in-polygon
 * intersection we ask the server to evaluate a within_distance against
 * a POINT geometry — equivalent to "this point sits inside this polygon".
 *
 * All fetches wrapped in try/catch so any failure (network, schema drift,
 * dataset rename) gracefully degrades to {found:false} — same behaviour
 * as the original stub.
 */

const ODS_BASE = "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets";

async function fetchODS(dataset, params) {
  const u = new URL(`${ODS_BASE}/${dataset}/records`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u.toString(), { signal: AbortSignal.timeout(7000) });
  if (!r.ok) throw new Error(`${dataset} fetch failed: ${r.status}`);
  return r.json();
}

export async function getZoning({ lat, lng, address }) {
  try {
    // ODSQL spatial: within_distance(geo_field, geom, distance). 1m ≈ point-in-polygon.
    const data = await fetchODS("zoning-districts-and-labels", {
      where: `within_distance(geom, GEOMFROMTEXT('POINT(${lng} ${lat})'), 1m)`,
      limit: 1,
    });
    const rec = data?.results?.[0];
    if (!rec) return { city: "vancouver", found: false, address };

    // Vancouver's zoning fields vary by dataset version; try the common ones.
    const zone =
      rec.zone_category ||
      rec.zoning_district ||
      rec.zone_name ||
      rec.zone_code ||
      rec.zoning_district_name ||
      null;
    if (!zone) return { city: "vancouver", found: false, address };

    const info = ZONE_INFO[zone] || matchPrefix(zone) || {};
    return {
      city: "vancouver",
      found: true,
      address,
      zone,
      zoneDescription: info.description || rec.descriptive_text || null,
      permittedUses: [],
      maxHeightM: info.maxHeightM || null,
      maxStoreys: info.maxStoreys || null,
      maxFAR: info.maxFAR || null,
      maxUnits: info.maxUnits || null,
      minLotAreaM2: info.minLotAreaM2 || null,
      setbacks: { frontM: null, rearM: null, sideM: null },
      bylawUrl: "https://vancouver.ca/your-government/zoning-and-land-use-policy-research-tool.aspx",
      raw: rec,
    };
  } catch (e) {
    console.warn("[vancouver/zoning]", e.message);
    return { city: "vancouver", found: false, address, _error: e.message };
  }
}

export async function getAssessment({ address }) {
  if (!address) return null;
  try {
    const m = /^\s*(\d+)\s+(.+?)(?:,|$)/.exec((address || "").toUpperCase());
    if (!m) return null;
    const street = m[2].trim();
    const data = await fetchODS("property-tax-report", {
      where: `to_civic_number='${m[1]}' AND street_name LIKE '%${street.replace(/'/g, "''").slice(0, 30)}%'`,
      limit: 1,
    });
    const r = data?.results?.[0];
    if (!r) return null;
    return {
      assessedValue:  parseFloat(r.current_land_value || r.current_improvement_value || 0) || null,
      assessmentYear: r.report_year || null,
      taxClass:       r.tax_class || r.zoning_classification || null,
      neighbourhood:  r.neighbourhood_code || null,
      ward:           null,
      yearBuilt:      r.year_built || null,
      raw: r,
    };
  } catch (e) {
    console.warn("[vancouver/assessment]", e.message);
    return null;
  }
}

export async function getPermits({ lat, lng, radiusMeters = 1000 }) {
  try {
    const km = radiusMeters / 1000;
    const data = await fetchODS("issued-building-permits", {
      where: `within_distance(geom, GEOMFROMTEXT('POINT(${lng} ${lat})'), ${km}km)`,
      order_by: "issuedate DESC",
      limit: 20,
    });
    return (data?.results || []).map(r => ({
      permit_date:        r.issuedate || r.applieddate || null,
      issue_date:         r.issuedate || null,
      work_type:          r.typeofwork || r.permit_type || null,
      job_description:    r.projectdescription || r.workdescription || null,
      construction_value: r.projectvalue || r.constructionvalue || null,
      units_added:        r.units || null,
      building_type:      r.building_category || null,
      address:            r.address || r.street || null,
      latitude:           r.geom?.coordinates?.[1] ?? null,
      longitude:          r.geom?.coordinates?.[0] ?? null,
      neighbourhood:      r.neighbourhood_name || null,
    }));
  } catch (e) {
    console.warn("[vancouver/permits]", e.message);
    return [];
  }
}

// Match common Vancouver zone prefixes (RS-1, RM-3A, C-2, FM-1, etc.)
function matchPrefix(zone) {
  if (!zone) return null;
  const upper = String(zone).toUpperCase();
  for (const prefix of Object.keys(ZONE_INFO)) {
    if (upper.startsWith(prefix.toUpperCase())) return ZONE_INFO[prefix];
  }
  return null;
}

// Vancouver Zoning By-law 3575 — quick reference for common districts.
const ZONE_INFO = {
  "RS":   { description: "One-Family Dwelling",            maxHeightM: 10.7, maxStoreys: 2.5, maxFAR: 0.7,  maxUnits: 2,    minLotAreaM2: 306 },
  "RT":   { description: "Two-Family Dwelling",            maxHeightM: 10.7, maxStoreys: 2.5, maxFAR: 0.75, maxUnits: 2,    minLotAreaM2: 306 },
  "RM":   { description: "Multiple Dwelling",              maxHeightM: 15.2, maxStoreys: 4,   maxFAR: 1.20, maxUnits: null, minLotAreaM2: null },
  "RA":   { description: "Apartment / Mid-Rise",           maxHeightM: 36,   maxStoreys: 12,  maxFAR: 2.50, maxUnits: null, minLotAreaM2: null },
  "FM":   { description: "First Shaughnessy",              maxHeightM: 10.7, maxStoreys: 2,   maxFAR: 0.60, maxUnits: 1,    minLotAreaM2: 745 },
  "C":    { description: "Commercial",                     maxHeightM: 18,   maxStoreys: 5,   maxFAR: 3.00, maxUnits: null, minLotAreaM2: null },
  "CD":   { description: "Comprehensive Development",      maxHeightM: 91,   maxStoreys: 30,  maxFAR: 6.00, maxUnits: null, minLotAreaM2: null },
  "DD":   { description: "Downtown District",              maxHeightM: 91,   maxStoreys: 30,  maxFAR: 7.00, maxUnits: null, minLotAreaM2: null },
  "DEOD": { description: "Downtown Eastside Oppenheimer",  maxHeightM: 23,   maxStoreys: 7,   maxFAR: 3.00, maxUnits: null, minLotAreaM2: null },
  "I":    { description: "Industrial",                     maxHeightM: 18,   maxStoreys: 5,   maxFAR: 3.00, maxUnits: null, minLotAreaM2: null },
  "M":    { description: "Light Industrial",               maxHeightM: 15,   maxStoreys: 4,   maxFAR: 1.50, maxUnits: null, minLotAreaM2: null },
  "HA":   { description: "Historic Area",                  maxHeightM: 23,   maxStoreys: 6,   maxFAR: 3.00, maxUnits: null, minLotAreaM2: null },
};
